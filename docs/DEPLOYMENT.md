# Развертывание

Этот документ описывает развертывание Messenger на self-hosted Linux-сервере без знания внутренней структуры проекта. Здесь есть быстрый запуск для разработки, production-like запуск через Docker Compose, настройка `.env`, режимы storage, health checks и troubleshooting.

Для повседневной эксплуатации используйте `scripts/messengerctl.sh`; подробности в [OPERATIONS.md](OPERATIONS.md).

## Требования к серверу

Целевая платформа:

- Linux x86_64;
- Docker Engine;
- Docker Compose plugin (`docker compose`, не legacy `docker-compose`);
- Git;
- `openssl`;
- `curl` или `wget`;
- `tar` и `gzip`;
- для операций с дисками: util-linux tools `lsblk`, `findmnt`, `mount`, `umount`;
- для форматирования диска: `mkfs.ext4` или `mkfs.xfs`.

Проверка хоста:

```bash
docker version
docker compose version
git --version
openssl version
curl --version || wget --version
tar --version
lsblk --version
```

## Быстрый запуск для разработки

Клонировать проект и запустить полный dev-стек:

```bash
git clone https://github.com/Variel42k/messenger.git
cd messenger
docker compose up -d --build
```

После запуска доступны:

- Backend API: http://localhost:8080
- Backend health: http://localhost:8080/actuator/health
- Swagger UI: http://localhost:8080/swagger-ui/index.html
- Web client: http://localhost:3001
- LocalStack S3 endpoint: http://localhost:4566
- MailHog UI: http://localhost:8025

Для локальной разработки приложения, когда только инфраструктура работает в Docker:

```bash
docker compose up -d postgres redis localstack mailhog

cd server
./mvnw spring-boot:run

cd ../web-client
npm install
npm start
```

Если backend запускается на host machine, а не внутри Compose, используйте `S3_ENDPOINT=http://localhost:4566`.

## Production-like запуск через Docker Compose

Production-like сценарий сохраняет текущую Compose-архитектуру, но требует сильных секретов:

```bash
git clone https://github.com/Variel42k/messenger.git
cd messenger
cp .env.example .env
openssl rand -base64 64
```

Отредактируйте `.env`, замените dev credentials и запустите:

```bash
./scripts/messengerctl.sh install
```

Ручной эквивалент:

```bash
docker compose build
docker compose up -d
docker compose ps
```

Скрипт предпочтительнее, потому что он генерирует `JWT_SECRET`, если найдено example/dev значение, и выполняет проверки после запуска.

Для публичного production используйте отдельный шаблон `docker-compose.production.yml.example`; см. [PRODUCTION.md](PRODUCTION.md).

## Подготовка `.env`

Создайте `.env` из example-файла:

```bash
cp .env.example .env
```

Не коммитьте `.env`. Считайте этот файл секретным и храните защищённую копию для disaster recovery.

## Генерация `JWT_SECRET`

Сгенерируйте сильный secret:

```bash
openssl rand -base64 64
```

Укажите его в `.env`:

```dotenv
JWT_SECRET=<generated-value>
```

`scripts/messengerctl.sh install` автоматически заменяет example/dev значения `JWT_SECRET`.

## Важные переменные окружения

| Переменная | Назначение | Dev default |
| --- | --- | --- |
| `POSTGRES_DB` | База, создаваемая PostgreSQL container | `messenger` |
| `POSTGRES_USER` | Пользователь PostgreSQL для local container | `postgres` |
| `POSTGRES_PASSWORD` | Пароль PostgreSQL | `password` |
| `DB_NAME` | Имя базы для backend | `messenger` |
| `DB_USERNAME` | Пользователь базы для backend | `postgres` |
| `DB_PASSWORD` | Пароль базы для backend | `password` |
| `REDIS_HOST` | Redis hostname для backend | `redis` |
| `REDIS_PORT` | Redis port | `6379` |
| `JWT_SECRET` | Secret для подписи JWT | example value, заменить |
| `JWT_ACCESS_TOKEN_EXPIRATION` | TTL access token в миллисекундах | `900000` |
| `JWT_REFRESH_TOKEN_EXPIRATION` | TTL refresh token в миллисекундах | `604800000` |
| `STORAGE_PROVIDER` | `s3` или `disk` | `s3` |
| `STORAGE_DISK_PATH` | Путь в container для disk uploads | `/data/uploads` |
| `S3_ENDPOINT` | S3-compatible endpoint из backend container | `http://localstack:4566` |
| `S3_ACCESS_KEY` | S3 access key | `test` |
| `S3_SECRET_KEY` | S3 secret key | `test` |
| `S3_BUCKET_NAME` | S3 bucket | `messenger-files` |
| `S3_REGION` | S3 region | `us-east-1` |
| `S3_PATH_STYLE_ACCESS_ENABLED` | Path-style S3 URLs | `true` |
| `S3_AUTO_CREATE_BUCKET` | Автоматическое создание bucket | `true` для dev |
| `CORS_ALLOWED_ORIGINS` | Разрешённые HTTP frontend origins | localhost list |
| `WS_ALLOWED_ORIGINS` | Разрешённые WebSocket origins | localhost list |
| `MAIL_HOST` | SMTP host | `mailhog` |
| `MAIL_PORT` | SMTP port | `1025` |
| `MAIL_WEB_URL` | MailHog UI URL | `http://localhost:8025` |

Для публичного production замените database passwords, S3 credentials и origins. Используйте HTTPS origins:

```dotenv
CORS_ALLOWED_ORIGINS=https://chat.example.com
WS_ALLOWED_ORIGINS=https://chat.example.com
```

## Запуск сервисов

Через скрипт:

```bash
./scripts/messengerctl.sh install
```

Через Docker Compose:

```bash
docker compose up -d --build
```

Если disk storage настроен скриптом, будет создан `docker-compose.disk.yml`. Для ручного запуска укажите оба compose-файла:

```bash
docker compose -f docker-compose.yml -f docker-compose.disk.yml up -d
```

## Проверка статуса

```bash
./scripts/messengerctl.sh status
docker compose ps
```

Ожидаемые основные контейнеры:

- `messenger-postgres`
- `messenger-redis`
- `messenger-localstack`
- `messenger-mailhog`
- `messenger-server`
- `messenger-worker`
- `messenger-web-client`

## Проверка backend health endpoint

```bash
curl -fsS http://localhost:8080/actuator/health
```

Ожидаемый результат содержит `UP`.

## Проверка web-client

```bash
curl -I http://localhost:3001
```

Ожидается успешный HTTP response от web-client container.

## Проверка PostgreSQL

```bash
docker exec messenger-postgres pg_isready -U postgres -d messenger
```

Ожидаемый результат содержит `accepting connections`.

## Проверка Redis

```bash
docker exec messenger-redis redis-cli ping
```

Ожидаемый результат:

```text
PONG
```

## Проверка LocalStack / S3

```bash
docker exec messenger-localstack awslocal s3 ls
curl -fsS http://localhost:4566/_localstack/health
```

Если `S3_AUTO_CREATE_BUCKET=true`, bucket `messenger-files` должен создаться автоматически после startup backend.

## Включение disk storage

В основном Compose-файле уже есть named Docker volume `files_data`, смонтированный в `/data/uploads` для `server` и `worker`. Чтобы использовать disk provider без отдельного host disk:

```dotenv
STORAGE_PROVIDER=disk
STORAGE_DISK_PATH=/data/uploads
```

Перезапуск:

```bash
docker compose up -d
```

Для выделенного host disk используйте:

```bash
./scripts/messengerctl.sh disk-install --device /dev/sdb --mount-point /srv/messenger/uploads --fs ext4 --force
```

Скрипт пишет `docker-compose.disk.yml`, а не меняет `docker-compose.override.yml`. Это безопаснее, потому что сохраняет пользовательские override-настройки. Скрипт управления автоматически использует `docker-compose.disk.yml`; для ручных команд нужны оба `-f`.

Подробнее: [DISK_STORAGE.md](DISK_STORAGE.md).

## Включение S3-compatible storage

Для LocalStack/dev:

```dotenv
STORAGE_PROVIDER=s3
S3_ENDPOINT=http://localstack:4566
S3_ACCESS_KEY=test
S3_SECRET_KEY=test
S3_BUCKET_NAME=messenger-files
S3_REGION=us-east-1
S3_PATH_STYLE_ACCESS_ENABLED=true
S3_AUTO_CREATE_BUCKET=true
```

Для production S3-compatible storage:

```dotenv
STORAGE_PROVIDER=s3
S3_ENDPOINT=https://s3.example.com
S3_ACCESS_KEY=<access-key>
S3_SECRET_KEY=<secret-key>
S3_BUCKET_NAME=messenger-files
S3_REGION=us-east-1
S3_PATH_STYLE_ACCESS_ENABLED=true
S3_AUTO_CREATE_BUCKET=false
```

Создайте bucket до startup и выдайте credentials только с необходимыми permissions.

## Логи и диагностика

Через скрипт:

```bash
./scripts/messengerctl.sh logs --service server --tail 200
./scripts/messengerctl.sh doctor
```

Через Docker Compose:

```bash
docker compose logs --tail 200 server
docker compose logs --tail 200 postgres
docker compose logs --tail 200 redis
docker compose logs --tail 200 localstack
docker compose logs --tail 200 web-client
```

Сбор базовой диагностики:

```bash
mkdir -p diagnostics
docker compose ps > diagnostics/compose-ps.txt
docker compose logs --tail 500 > diagnostics/compose-logs.txt
docker compose config > diagnostics/compose-config.yml
tar -czf diagnostics/messenger-diagnostics-$(date +%Y%m%d-%H%M%S).tar.gz diagnostics
```

## Типовые ошибки и решения

Backend health недоступен:

- проверьте логи: `./scripts/messengerctl.sh logs --service server --tail 200`;
- проверьте PostgreSQL: `docker exec messenger-postgres pg_isready -U postgres -d messenger`;
- проверьте Redis: `docker exec messenger-redis redis-cli ping`;
- убедитесь, что `JWT_SECRET` не example/dev и имеет длину не меньше 32 bytes.

Web client не открывается:

- проверьте `docker compose ps`;
- проверьте логи: `./scripts/messengerctl.sh logs --service web-client --tail 200`;
- убедитесь, что port `3001` свободен на host.

PostgreSQL не готов:

- проверьте `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD`;
- посмотрите логи: `./scripts/messengerctl.sh logs --service postgres --tail 200`;
- не удаляйте `postgres_data` без проверенного backup.

Redis ping не проходит:

- проверьте логи: `./scripts/messengerctl.sh logs --service redis --tail 200`;
- убедитесь, что container запущен и не уходит в restart loop.

LocalStack/S3 errors:

- для backend внутри Compose используйте `S3_ENDPOINT=http://localstack:4566`;
- для backend на host используйте `S3_ENDPOINT=http://localhost:4566`;
- проверьте bucket и credentials.

Disk storage errors:

- проверьте mount: `findmnt /srv/messenger/uploads`;
- проверьте Compose-файл: `cat docker-compose.disk.yml`;
- проверьте `.env`: `STORAGE_PROVIDER=disk` и `STORAGE_DISK_PATH=/data/uploads`;
- не форматируйте, не отмонтируйте и не удаляйте диск без backup.

Ошибка legacy `docker-compose`:

- установите Docker Compose plugin и используйте `docker compose`;
- скрипт управления намеренно не использует старую standalone-команду `docker-compose`.
