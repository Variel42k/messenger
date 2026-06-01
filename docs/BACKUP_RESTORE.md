# Резервное копирование и восстановление

Этот документ описывает, что нужно сохранять в backup и как восстановить Messenger после сбоя, обновления или переноса на другой сервер.

## Что нужно бэкапить

Обязательно сохраняйте:

- базу данных PostgreSQL;
- volume Redis, если Redis persistence важен для вашей эксплуатации;
- Docker volume `files_data` или внешний disk storage с uploads;
- `localstack_data`, если dev LocalStack S3 используется как фактическое хранилище файлов;
- `.env`, хранить безопасно и не публиковать;
- `.env.redacted`, безопасную копию для диагностики без секретов;
- `docker-compose.yml`;
- `docker-compose.override.yml`, если он существует;
- `docker-compose.disk.yml`, если включён отдельный диск под uploads.

PostgreSQL хранит метаданные и прикладные данные. Загруженные файлы находятся в S3-compatible storage или disk storage. Для полноценного восстановления нужны и база, и файлы.

## Ручное создание backup

Создать dump PostgreSQL:

```bash
docker exec -e PGPASSWORD=password messenger-postgres \
  pg_dump -U postgres -d messenger > postgres.sql
```

Сохранить uploads из Docker volume:

```bash
docker run --rm \
  -v messenger_files_data:/data:ro \
  -v "$PWD:/backup" \
  alpine:3.20 sh -c 'cd /data && tar -czf /backup/files_data.tar.gz .'
```

Сохранить Redis persistence, если он используется:

```bash
docker run --rm \
  -v messenger_redis_data:/data:ro \
  -v "$PWD:/backup" \
  alpine:3.20 sh -c 'cd /data && tar -czf /backup/redis_data.tar.gz .'
```

Сохранить uploads с отдельного диска:

```bash
tar -czf files_data.tar.gz -C /srv/messenger/uploads .
```

Скопировать Compose и environment-файлы:

```bash
cp docker-compose.yml backup/
cp docker-compose.override.yml backup/ 2>/dev/null || true
cp docker-compose.disk.yml backup/ 2>/dev/null || true
cp .env backup/
```

Создать `.env.redacted` без раскрытия секретов:

```bash
sed -E 's/^((.*PASSWORD|.*SECRET|.*TOKEN|S3_SECRET_KEY|JWT_SECRET)=).*/\1<redacted>/I' .env > backup/.env.redacted
```

Создать архив:

```bash
tar -czf messenger-backup-$(date +%Y%m%d-%H%M%S).tar.gz backup
```

## Backup через скрипт

```bash
./scripts/messengerctl.sh backup
```

Указать отдельную директорию:

```bash
./scripts/messengerctl.sh backup --backup-dir /srv/backups/messenger
```

Имя архива:

```text
messenger-backup-YYYYmmdd-HHMMSS.tar.gz
```

После создания скрипт выводит путь к архиву и размер.

## Восстановление PostgreSQL

Через скрипт:

```bash
./scripts/messengerctl.sh restore --file backups/messenger-backup-20260531-120000.tar.gz
```

Ручное восстановление:

```bash
docker compose stop server worker web-client
docker compose up -d postgres
docker exec -e PGPASSWORD=password messenger-postgres dropdb -U postgres --if-exists messenger
docker exec -e PGPASSWORD=password messenger-postgres createdb -U postgres messenger
docker exec -i -e PGPASSWORD=password messenger-postgres \
  psql -U postgres -d messenger -v ON_ERROR_STOP=1 < postgres.sql
```

Используйте имя базы, пользователя и пароль из вашего `.env`.

## Восстановление uploads

Для отдельного disk storage:

```bash
tar -xzf files_data.tar.gz -C /srv/messenger/uploads
```

Для стандартного Docker volume:

```bash
docker run --rm \
  -v messenger_files_data:/data \
  -v "$PWD:/backup" \
  alpine:3.20 sh -c 'rm -rf /data/* /data/.[!.]* /data/..?* 2>/dev/null || true; tar -xzf /backup/files_data.tar.gz -C /data'
```

Имя volume зависит от имени Compose-проекта. Если директория репозитория называется не `messenger`, проверьте фактическое имя:

```bash
docker volume ls | grep files_data
```

## Восстановление volumes

Восстанавливайте `localstack_data` только если LocalStack действительно был хранилищем файлов в этом окружении:

```bash
docker run --rm \
  -v messenger_localstack_data:/data \
  -v "$PWD:/backup" \
  alpine:3.20 sh -c 'rm -rf /data/* /data/.[!.]* /data/..?* 2>/dev/null || true; tar -xzf /backup/localstack_data.tar.gz -C /data'
```

Redis persistence обычно менее критичен, чем PostgreSQL. Если ваша эксплуатация зависит от долговременных данных Redis, восстанавливайте `redis_data` аналогично.

## Проверка восстановления

Запустите сервисы и проверьте состояние:

```bash
docker compose up -d
docker compose ps
curl -fsS http://localhost:8080/actuator/health
curl -I http://localhost:3001
docker exec messenger-postgres pg_isready -U postgres -d messenger
docker exec messenger-redis redis-cli ping
```

Затем войдите в приложение, проверьте историю сообщений и скачивание загруженных файлов.

## Проверка целостности backup

```bash
tar -tzf backups/messenger-backup-20260531-120000.tar.gz >/dev/null
tar -tzf backups/messenger-backup-20260531-120000.tar.gz | sort
```

При необходимости распакуйте архив во временную директорию и проверьте `metadata.txt`, `.env.redacted`, `postgres.sql` и вложенные архивы uploads.

## Что сделать перед update

Перед обновлением:

```bash
./scripts/messengerctl.sh backup
./scripts/messengerctl.sh doctor
```

Проверьте:

- backup-архив читается через `tar -tzf`;
- на диске достаточно места для нового backup;
- `.env` доступен и хранится безопасно;
- mount point для disk storage действительно смонтирован;
- текущий Git commit известен:

```bash
git rev-parse HEAD
```

После этого запускайте:

```bash
./scripts/messengerctl.sh update
```
