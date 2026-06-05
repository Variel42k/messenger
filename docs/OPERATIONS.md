# Эксплуатация

Этот документ описывает типовые действия администратора при эксплуатации self-hosted установки Messenger.

## Управление установкой через скрипт

Единая точка управления из корня репозитория:

```bash
./scripts/messengerctl.sh help
```

Скрипт использует `docker compose`, по умолчанию не удаляет Docker volumes, запрашивает подтверждение для опасных операций и создаёт `docker-compose.disk.yml` для выделенного disk storage вместо изменения пользовательского `docker-compose.override.yml`.

Скрипт также поддерживает runtime abstraction:

```bash
./scripts/messengerctl.sh runtime-doctor --runtime docker
./scripts/messengerctl.sh runtime-doctor --runtime podman --profile production
./scripts/messengerctl.sh runtime-doctor --runtime kubernetes --namespace messenger --release messenger --values helm/values-production.example.yaml
```

Сравнение Docker Compose, Podman Compose и Kubernetes Helm описано в [DEPLOYMENT_MATRIX.md](DEPLOYMENT_MATRIX.md).

## Установка

```bash
./scripts/messengerctl.sh install
```

Команда проверяет зависимости, создаёт `.env` из `.env.example`, если файла нет, генерирует `JWT_SECRET`, если текущее значение похоже на example/dev, собирает образы, запускает сервисы и проверяет backend, web-client, PostgreSQL, Redis и LocalStack/S3.

## Обновление

```bash
./scripts/messengerctl.sh update
```

Команда создаёт backup, выполняет `git pull`, если директория является Git-репозиторием, пересобирает контейнеры, запускает стек и выполняет health checks. Volumes не удаляются.

Пропустить автоматический backup:

```bash
./scripts/messengerctl.sh update --no-backup
```

Используйте это только если уже есть другой проверенный backup.

## Остановка

```bash
./scripts/messengerctl.sh stop
```

Контейнеры останавливаются, данные в volumes сохраняются.

## Запуск

```bash
./scripts/messengerctl.sh start
```

Сервисы запускаются, затем выполняются health checks.

## Перезапуск

```bash
./scripts/messengerctl.sh restart
```

Сервисы перезапускаются, затем выполняются health checks.

## Удаление без удаления данных

```bash
./scripts/messengerctl.sh uninstall
```

Команда останавливает и удаляет контейнеры и стандартную Compose network. Docker volumes остаются. Перед удалением скрипт предлагает создать backup.

Non-interactive режим:

```bash
./scripts/messengerctl.sh uninstall --yes
```

## Полное удаление с удалением данных

```bash
./scripts/messengerctl.sh purge --force
```

`purge` удаляет контейнеры, networks и volumes. Команда требует `--force` и интерактивного подтверждения, если не передан `--yes`. По умолчанию перед purge создаётся backup.

Пропустить backup можно только при наличии проверенной внешней копии:

```bash
./scripts/messengerctl.sh purge --force --no-backup
```

## Резервное копирование

```bash
./scripts/messengerctl.sh backup
```

По умолчанию архивы создаются в `backups/`:

```text
messenger-backup-YYYYmmdd-HHMMSS.tar.gz
```

Указать отдельную директорию:

```bash
./scripts/messengerctl.sh backup --backup-dir /srv/backups/messenger
```

Backup включает PostgreSQL dump, Compose-файлы, `.env`, `.env.redacted`, uploads/files volume, Redis volume, LocalStack data при наличии и metadata.

## Восстановление из backup

```bash
./scripts/messengerctl.sh restore --file backups/messenger-backup-20260531-120000.tar.gz
```

Команда останавливает контейнеры, восстанавливает PostgreSQL, восстанавливает uploads, восстанавливает Compose override-файлы при наличии, спрашивает перед перезаписью `.env`, запускает стек и выполняет health checks.

Восстановление перезаписывает текущую базу и uploads. Перед restore поверх живой установки создайте свежий backup.

## Проверка целостности backup

Проверить, что архив читается:

```bash
tar -tzf backups/messenger-backup-20260531-120000.tar.gz >/dev/null
```

Посмотреть содержимое:

```bash
tar -tzf backups/messenger-backup-20260531-120000.tar.gz | sort
```

Ожидаемые файлы:

- `postgres.sql`
- `files_data.tar.gz`
- `redis_data.tar.gz`
- `docker-compose.yml`
- `.env.redacted`
- `metadata.txt`

## Работа с дисками

Операции с дисками требуют Linux block-device tools и обычно `sudo`.

Посмотреть диски:

```bash
lsblk -o NAME,SIZE,TYPE,FSTYPE,MOUNTPOINT,MODEL
```

## Подключение отдельного диска под uploads

```bash
./scripts/messengerctl.sh disk-list
./scripts/messengerctl.sh disk-install --device /dev/sdb --mount-point /srv/messenger/uploads --fs ext4 --force
./scripts/messengerctl.sh disk-status
```

Команда показывает диски, проверяет устройство, отказывается форматировать без `--force`, запрашивает подтверждение, создаёт файловую систему, монтирует диск, добавляет `/etc/fstab` по UUID, создаёт `docker-compose.disk.yml`, обновляет `.env`, перезапускает `server` и `worker`, затем проверяет backend health.

## Отключение диска

```bash
./scripts/messengerctl.sh disk-remove --mount-point /srv/messenger/uploads
```

Команда останавливает контейнеры, создаёт backup uploads, отключает `docker-compose.disk.yml` через переименование, комментирует соответствующую строку `/etc/fstab`, отмонтирует диск, запускает Compose и проверяет health. Диск не форматируется.

## Rollback после неудачного обновления

1. Посмотрите ошибку и логи сервиса:

```bash
./scripts/messengerctl.sh logs --service server --tail 300
docker compose ps
```

2. Восстановите backup, созданный перед update:

```bash
./scripts/messengerctl.sh restore --file backups/messenger-backup-YYYYmmdd-HHMMSS.tar.gz
```

3. Если после `git pull` нужно вернуть код, вручную выберите предыдущий commit и перезапустите:

```bash
git log --oneline -5
git reset --hard <previous-commit>
./scripts/messengerctl.sh start
```

Не запускайте `git reset --hard`, пока не понимаете состояние локальных изменений.

## Проверка состояния контейнеров

```bash
./scripts/messengerctl.sh status
docker compose ps
docker compose logs --tail 100
```

## Сбор диагностического архива

Сначала создайте backup:

```bash
./scripts/messengerctl.sh backup
```

Соберите диагностику:

```bash
mkdir -p diagnostics
docker compose ps > diagnostics/compose-ps.txt
docker compose config > diagnostics/compose-config.yml
docker compose logs --tail 500 > diagnostics/compose-logs.txt
./scripts/messengerctl.sh doctor > diagnostics/doctor.txt 2>&1
tar -czf diagnostics/messenger-diagnostics-$(date +%Y%m%d-%H%M%S).tar.gz diagnostics
```

Перед передачей архива наружу проверьте содержимое. Логи и `.env` могут содержать чувствительные данные.

## Federation inventory

Federation-команды управляют только topology/trust inventory и health validation. Они не реализуют backend federation protocol и не включают межкластерную доставку сообщений.

```bash
./scripts/messengerctl.sh federation-init --cluster-id cluster-a --cluster-url https://chat-a.example.com
./scripts/messengerctl.sh federation-add-peer --cluster-id cluster-b --cluster-url https://chat-b.example.com
./scripts/messengerctl.sh federation-status
./scripts/messengerctl.sh federation-validate
./scripts/messengerctl.sh federation-export
```
