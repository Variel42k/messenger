# Deployment

Документ описывает практический запуск Messenger для локальной разработки и Docker Compose окружения.

## Local Development

Основной локальный сценарий: инфраструктура работает в Docker, backend и web-client можно запускать отдельно.

```bash
docker compose up -d postgres redis localstack
```

Backend:

```bash
cd server
./mvnw spring-boot:run
```

Windows PowerShell:

```powershell
cd server
.\mvnw.cmd spring-boot:run
```

Web client:

```bash
cd web-client
npm install
npm start
```

По умолчанию backend слушает `http://localhost:8080`, web-client — `http://localhost:3001`.

## Docker Compose Quick Start

```bash
docker compose up -d --build
docker compose ps
```

Основные сервисы:

- `messenger-postgres` — PostgreSQL 15
- `messenger-redis` — Redis 7
- `messenger-localstack` — LocalStack S3 для dev
- `messenger-mailhog` — local SMTP catcher and web UI on `http://localhost:8025`
- `messenger-server` — Spring Boot backend
- `messenger-worker` — worker topology placeholder running the server artifact on an internal port
- `messenger-seed-init` — one-shot seed verification after Flyway migrations
- `messenger-web-client` — React web client

Copy `.env.example` to `.env` for local overrides. All core services define healthchecks, and the
server emits/propagates `X-Trace-Id` in logs and responses.

Полезные команды:

```bash
docker logs messenger-server --tail 100
docker logs messenger-localstack --tail 50
docker compose down
```

## Environment Variables

Основные переменные окружения:

| Переменная | Назначение | Dev default |
| --- | --- | --- |
| `POSTGRES_DB` | Имя базы данных | `messenger` |
| `POSTGRES_USER` | Пользователь PostgreSQL | `postgres` |
| `POSTGRES_PASSWORD` | Пароль PostgreSQL | `password` |
| `DB_HOST` | Host backend-подключения к PostgreSQL | `postgres` в Compose |
| `DB_PORT` | PostgreSQL port | `5432` |
| `DB_NAME` | Имя базы для backend | `messenger` |
| `DB_USERNAME` | Пользователь БД для backend | `postgres` |
| `DB_PASSWORD` | Пароль БД для backend | `password` |
| `REDIS_HOST` | Redis host | `redis` в Compose |
| `REDIS_PORT` | Redis port | `6379` |
| `STORAGE_PROVIDER` | `s3`, `disk` или `local` | `s3` в Compose |
| `STORAGE_DISK_PATH` | Путь для disk storage | `/data/uploads` |
| `S3_ENDPOINT` | S3 endpoint | `http://localstack:4566` в Compose |
| `S3_ACCESS_KEY` | S3 access key | `test` |
| `S3_SECRET_KEY` | S3 secret key | `test` |
| `S3_BUCKET_NAME` | S3 bucket | `messenger-files` |
| `S3_REGION` | S3 region | `us-east-1` |
| `S3_PATH_STYLE_ACCESS_ENABLED` | Path-style S3 access | `true` |
| `S3_AUTO_CREATE_BUCKET` | Автосоздание bucket | `true` в dev |
| `JWT_SECRET` | JWT signing secret | dev-only значение |
| `CORS_ALLOWED_ORIGINS` | HTTP CORS origins | localhost origins |
| `WS_ALLOWED_ORIGINS` | WebSocket origins | localhost origins |

Создавайте `.env` в корне репозитория только для локальных значений. Файл `.env` исключён из Git.

## PostgreSQL

Compose поднимает PostgreSQL 15 и сохраняет данные в volume `postgres_data`. Backend использует Flyway migrations из `server/src/main/resources/db/migration`.

Проверка:

```bash
docker logs messenger-postgres --tail 50
docker exec -it messenger-postgres psql -U postgres -d messenger
```

## Redis

Redis используется для инфраструктурных сценариев приложения, включая online-status/pub-sub логику. В Compose включён append-only mode.

Проверка:

```bash
docker exec -it messenger-redis redis-cli ping
```

Ожидаемый ответ: `PONG`.

## LocalStack S3

В dev-окружении S3-compatible storage реализован через LocalStack.

- Из контейнера backend endpoint: `http://localstack:4566`
- С host machine endpoint: `http://localhost:4566`
- Bucket по умолчанию: `messenger-files`

Проверка bucket:

```bash
docker exec messenger-localstack awslocal s3 ls
```

## Disk Storage Mode

Если S3 не нужен, можно использовать disk storage:

```dotenv
STORAGE_PROVIDER=disk
STORAGE_DISK_PATH=/data/uploads
```

В Docker Compose volume `files_data` уже монтируется в `/data/uploads` для server container. Для bind mount можно использовать локальный `docker-compose.override.yml`, созданный на основе `docker-compose.override.yml.example`.

## Health Checks

Backend health endpoint:

```bash
curl -i http://localhost:8080/actuator/health
```

Actuator также публикует `info`, `metrics` и `prometheus` согласно `application.yml`.

## Swagger UI

Swagger UI доступен локально:

```text
http://localhost:8080/swagger-ui/index.html
```

OpenAPI JSON:

```text
http://localhost:8080/v3/api-docs
```

## Troubleshooting

- Backend не подключается к PostgreSQL: проверьте `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USERNAME`, `DB_PASSWORD` и статус `messenger-postgres`.
- Backend не подключается к Redis: проверьте `REDIS_HOST`, `REDIS_PORT` и `docker exec -it messenger-redis redis-cli ping`.
- Ошибки S3: для контейнера backend используйте `S3_ENDPOINT=http://localstack:4566`, для запуска backend на host machine — `http://localhost:4566`.
- Web client не открывается: проверьте `docker logs messenger-web-client --tail 100` или локальный `npm start`.
- JWT startup error: убедитесь, что `JWT_SECRET` не пустой и имеет минимум 32 bytes.
- CORS/WebSocket ошибки: добавьте frontend origin в `CORS_ALLOWED_ORIGINS` и `WS_ALLOWED_ORIGINS`.
