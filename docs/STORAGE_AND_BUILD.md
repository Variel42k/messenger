# Сборка и выбор хранилища (основной режим: локальный S3)

## 1. Что считается основным сценарием

Основной и рекомендуемый сценарий для локального развёртывания Messenger:

- `docker compose up -d --build`
- файловое хранилище: **S3-совместимое через LocalStack**
- `STORAGE_PROVIDER=s3`

Режим `disk` поддерживается, но считается альтернативным и используется только при необходимости.

## 2. Предварительные требования

- Docker Engine 27+ и Docker Compose v2
- Java 17 (для локальной сборки/запуска backend вне Docker)
- Node.js 18+ (для локального запуска web-клиента вне Docker)

Проверка:

```bash
docker version
docker compose version
```

## 3. Быстрый старт (Docker Compose + LocalStack S3)

### Шаг 1. Подготовить `.env` (опционально)

Можно запускать и без `.env`, так как `docker-compose.yml` содержит безопасные dev-значения по умолчанию.
Если нужен явный контроль значений, создайте `.env` в корне репозитория:

```dotenv
POSTGRES_DB=messenger
POSTGRES_USER=postgres
POSTGRES_PASSWORD=password

STORAGE_PROVIDER=s3
S3_ENDPOINT=http://localstack:4566
S3_ACCESS_KEY=test
S3_SECRET_KEY=test
S3_BUCKET_NAME=messenger-files
S3_REGION=us-east-1
S3_PATH_STYLE_ACCESS_ENABLED=true
S3_AUTO_CREATE_BUCKET=true

JWT_SECRET=mySecretKeyForDevelopmentOnlyMustBe256Bits!!
```

Важно:

- для контейнера `server` endpoint должен быть `http://localstack:4566`
- с хоста LocalStack доступен по `http://localhost:4566`

### Шаг 2. Запустить стек

```bash
docker compose up -d --build
```

### Шаг 3. Проверить, что сервисы готовы

```bash
docker compose ps
docker logs messenger-server --tail 100
docker logs messenger-localstack --tail 50
```

Ожидаемые признаки готовности:

- у `messenger-localstack` статус `healthy`
- в логе backend есть строка `Started MessengerApplication`
- в логе backend нет ошибок подключения к S3 после старта

### Шаг 4. Проверить endpoint’ы

```bash
curl -I http://localhost:8080/actuator/health
curl -I http://localhost:8080/swagger-ui/index.html
curl -I http://localhost:3001
```

### Шаг 5. Проверить S3-бакет в LocalStack

```bash
docker exec messenger-localstack awslocal s3 ls
```

Ожидается бакет `messenger-files` (создаётся автоматически при `S3_AUTO_CREATE_BUCKET=true`).

## 4. Локальный запуск backend/web без контейнеризации приложения

Инфраструктуру (PostgreSQL, Redis, LocalStack) оставляем в Docker, приложение запускаем локально.

### Шаг 1. Поднять только инфраструктуру

```bash
docker compose up -d postgres redis localstack
```

### Шаг 2. Запустить backend

Linux/macOS:

```bash
cd server
./mvnw spring-boot:run
```

Windows PowerShell:

```powershell
cd server
.\mvnw.cmd spring-boot:run
```

Если backend запускается на хосте (не в контейнере), используйте:

- `S3_ENDPOINT=http://localhost:4566`

### Шаг 3. Запустить web-клиент

```bash
cd web-client
npm install
npm start
```

## 5. Альтернативный режим `disk` (не основной)

Используйте только если S3 не требуется.

1. Скопируйте шаблон override:

```bash
cp docker-compose.override.yml.example docker-compose.override.yml
```

2. Убедитесь, что путь для bind-mount существует и доступен контейнеру.
3. Перезапустите стек:

```bash
docker compose up -d --build
```

В этом режиме:

- `STORAGE_PROVIDER=disk`
- файлы хранятся в смонтированном каталоге, а не в S3

## 6. Production-рекомендации по S3

Для production используйте внешний S3 (AWS S3, Ceph, Wasabi и т.д.) и отдельные credentials:

- `STORAGE_PROVIDER=s3`
- `S3_AUTO_CREATE_BUCKET=false`
- заранее созданный бакет и минимально необходимые IAM-права
- отдельный endpoint/region под production

## 7. Сборка backend (Maven Wrapper)

Сборка без запуска тестов:

Linux/macOS:

```bash
cd server
./mvnw clean package -DskipTests
```

Windows PowerShell:

```powershell
cd server
.\mvnw.cmd clean package -DskipTests
```

Проверка версии wrapper:

```bash
cd server
./mvnw -v
```
