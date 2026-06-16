# Установка Messenger — полное руководство

Этот документ описывает все варианты развёртывания Messenger: от локальной разработки до production-кластера. Для каждого варианта есть раздел Quick Start — минимум команд для быстрого старта.

## Содержание

- [Выбор варианта развёртывания](#выбор-варианта-развёртывания)
- [Quick Start: интерактивный мастер](#quick-start-интерактивный-мастер)
- [Quick Start: локальная разработка (Docker)](#quick-start-локальная-разработка)
- [Quick Start: production (Docker Compose)](#quick-start-production-docker-compose)
- [Quick Start: production (Podman)](#quick-start-production-podman)
- [Quick Start: production (Kubernetes/Helm)](#quick-start-kubernetes-helm)
- [Подробная настройка](#подробная-настройка)
  - [Конфигурация .env](#конфигурация-env)
  - [Хранилище файлов](#хранилище-файлов)
  - [Монтирование папок и дисков](#монтирование-папок-и-дисков)
  - [Сеть и домен](#сеть-и-домен)
  - [Email](#email)
- [Проверка работоспособности](#проверка-работоспособности)
- [Аутентификация и Active Directory](#аутентификация-и-active-directory)
- [Следующие шаги](#следующие-шаги)

---

## Выбор варианта развёртывания

| Вариант | Для чего | Runtime | Когда использовать |
|---------|----------|---------|-------------------|
| **Development** | Локальная разработка и тестирование | Docker Compose | Разработчики, CI, тестовые стенды |
| **Production (Docker)** | Один сервер, Linux | Docker Compose | Большинство production-случаев |
| **Production (Podman)** | Один сервер, rootless | Podman Compose | RHEL/Rocky, запрет root-демонов |
| **Production (Kubernetes)** | Кластер | Helm + kubectl | HA, CI/CD, несколько узлов |

### Чем dev отличается от production

| | Dev | Production |
|-|-----|------------|
| S3 / хранилище файлов | LocalStack (fake S3, встроен в Compose) | Реальный S3, MinIO или диск |
| Email | MailHog (fake SMTP, веб-UI на порту 8025) | Реальный SMTP-сервер |
| Пароли | Слабые, захардкожены в `.env.example` | Генерируются автоматически или вводятся |
| Swagger UI | Открыт публично | Скрыт через reverse proxy |
| TLS | Не нужен | Обязателен через Nginx/Caddy |
| PostgreSQL/Redis порты | Открыты на хосте | Закрыты, только внутри Docker network |
| Подходит для интернета | **Нет** | Да |

---

## Quick Start: интерактивный мастер

Универсальный способ — запустить мастер установки. Он задаст вопросы и настроит всё за вас:

```bash
git clone https://github.com/Variel42k/messenger.git
cd messenger
bash scripts/install-wizard.sh
```

Для быстрого запуска dev-окружения без вопросов:

```bash
bash scripts/install-wizard.sh --quick
```

Мастер настраивает:
- runtime (Docker / Podman / Kubernetes)
- профиль (dev / production)
- хранилище файлов (S3, Docker volume, host-папка, отдельный диск)
- домен и CORS
- email
- автогенерацию секретов
- и запускает `messengerctl.sh install`

---

## Quick Start: локальная разработка

Требования: Linux/macOS/WSL2, Docker Engine, Docker Compose plugin, Git.

```bash
git clone https://github.com/Variel42k/messenger.git
cd messenger
docker compose up -d --build
```

После запуска (подождите ~30 сек для инициализации БД):

| Сервис | URL |
|--------|-----|
| API сервер | http://localhost:8080 |
| Swagger UI | http://localhost:8080/swagger-ui/index.html |
| Web-клиент | http://localhost:3001 |
| MailHog (fake email) | http://localhost:8025 |
| LocalStack S3 | http://localhost:4566 |
| Health check | http://localhost:8080/actuator/health |

Учётные данные по умолчанию:

| Сервис | Логин | Пароль |
|--------|-------|--------|
| Admin | `admin` | `admin123` |
| PostgreSQL | `postgres` | `password` |
| LocalStack | `test` | `test` |

> **Для разработки backend локально** (без контейнера), запустите только инфраструктуру:
> ```bash
> docker compose up -d postgres redis localstack mailhog
> cd server && ./mvnw spring-boot:run
> ```

---

## Quick Start: production (Docker Compose)

Требования: Linux x86_64, Docker Engine 24+, Docker Compose plugin v2+, Git, openssl.

### 1. Клонировать репозиторий

```bash
git clone https://github.com/Variel42k/messenger.git
cd messenger
```

### 2. Подготовить .env

```bash
cp .env.production.example .env
```

Отредактировать `.env` — минимально необходимые изменения:

```dotenv
POSTGRES_PASSWORD=<сильный_пароль>
DB_PASSWORD=<тот_же_пароль>
JWT_SECRET=<openssl rand -base64 64>

# Хранилище: выберите S3 или disk (см. раздел Хранилище)
STORAGE_PROVIDER=s3
S3_ENDPOINT=https://your-minio.example.com
S3_ACCESS_KEY=<ключ>
S3_SECRET_KEY=<секрет>

# Ваш домен
CORS_ALLOWED_ORIGINS=https://chat.example.com
WS_ALLOWED_ORIGINS=https://chat.example.com

# Реальный SMTP
MAIL_HOST=smtp.example.com
MAIL_PORT=587
```

Сгенерировать JWT_SECRET:

```bash
openssl rand -base64 64
```

### 3. Запустить через скрипт

```bash
./scripts/messengerctl.sh install --runtime docker --profile production
```

> Скрипт проверит зависимости, пересгенерирует JWT_SECRET если найдёт dev-значение, соберёт образы и выполнит health checks.

### 4. Настроить reverse proxy

Скопируйте шаблон и настройте домен:

```bash
sudo cp deploy/nginx/messenger.conf.example /etc/nginx/conf.d/messenger.conf
sudo nano /etc/nginx/conf.d/messenger.conf  # заменить chat.example.com
sudo nginx -t && sudo systemctl reload nginx
```

### 5. Настроить TLS

Используйте Let's Encrypt (certbot) или корпоративный сертификат. Подробности в [PRODUCTION.md](PRODUCTION.md).

---

## Quick Start: production (Podman)

Требования: Linux x86_64, Podman 4+, podman-compose, Git, openssl.

```bash
git clone https://github.com/Variel42k/messenger.git
cd messenger
cp .env.production.example .env
# Отредактируйте .env (см. раздел выше)
./scripts/messengerctl.sh install --runtime podman --profile production
```

Особенности Podman:
- Rootless: контейнеры запускаются без root
- SELinux: если монтируете host-директорию, добавьте `:Z` к volumes в compose-файле
- Privileged ports: порты < 1024 требуют `net.ipv4.ip_unprivileged_port_start`

Подробности: [PODMAN.md](PODMAN.md).

---

## Quick Start: Kubernetes / Helm

Требования: Kubernetes cluster, kubectl, Helm 3, внешние PostgreSQL/Redis/S3.

```bash
git clone https://github.com/Variel42k/messenger.git
cd messenger

# 1. Подготовить values
cp helm/values-production.example.yaml helm/values-production.yaml
nano helm/values-production.yaml  # настройте ingress, БД, S3, secrets

# 2. Установить через мастер скрипта
./scripts/messengerctl.sh install \
  --runtime kubernetes \
  --namespace messenger \
  --release messenger \
  --values helm/values-production.yaml
```

Или вручную через Helm:

```bash
kubectl create namespace messenger
helm upgrade --install messenger ./helm \
  --namespace messenger \
  --values helm/values-production.yaml
kubectl get pods -n messenger
```

Подробности: [KUBERNETES.md](KUBERNETES.md).

---

## Подробная настройка

### Конфигурация .env

Полный список переменных окружения:

| Переменная | Описание | Dev default | Production |
|------------|----------|-------------|------------|
| `POSTGRES_DB` | Имя БД | `messenger` | `messenger` |
| `POSTGRES_USER` | Пользователь PostgreSQL | `postgres` | `messenger` |
| `POSTGRES_PASSWORD` | Пароль PostgreSQL | `password` | **сгенерировать** |
| `DB_NAME` | Имя БД для backend | `messenger` | `messenger` |
| `DB_USERNAME` | Пользователь БД для backend | `postgres` | `messenger` |
| `DB_PASSWORD` | Пароль БД для backend | `password` | **совпадает с POSTGRES_PASSWORD** |
| `REDIS_HOST` | Redis hostname | `redis` | `redis` |
| `REDIS_PORT` | Redis порт | `6379` | `6379` |
| `REDIS_PASSWORD` | Redis пароль | `` (пусто) | установить для безопасности |
| `JWT_SECRET` | Секрет для JWT подписи | dev placeholder | **сгенерировать: `openssl rand -base64 64`** |
| `JWT_ACCESS_TOKEN_EXPIRATION` | TTL access token (мс) | `900000` (15 мин) | по политике |
| `JWT_REFRESH_TOKEN_EXPIRATION` | TTL refresh token (мс) | `604800000` (7 дней) | по политике |
| `STORAGE_PROVIDER` | `s3` или `disk` | `s3` | зависит от выбора |
| `STORAGE_DISK_PATH` | Путь внутри контейнера | `/data/uploads` | `/data/uploads` |
| `S3_ENDPOINT` | URL S3-compatible storage | `http://localstack:4566` | URL вашего MinIO/S3 |
| `S3_ACCESS_KEY` | S3 access key | `test` | **реальный ключ** |
| `S3_SECRET_KEY` | S3 secret key | `test` | **реальный секрет** |
| `S3_BUCKET_NAME` | Имя S3 bucket | `messenger-files` | `messenger-files` |
| `S3_REGION` | S3 region | `us-east-1` | ваш регион |
| `S3_PATH_STYLE_ACCESS_ENABLED` | Path-style URLs | `true` | `true` для MinIO, `false` для AWS |
| `S3_AUTO_CREATE_BUCKET` | Автосоздание bucket | `true` | `false` (создайте заранее) |
| `CORS_ALLOWED_ORIGINS` | Разрешённые HTTP origins | localhost | `https://chat.example.com` |
| `WS_ALLOWED_ORIGINS` | Разрешённые WebSocket origins | localhost | `https://chat.example.com` |
| `MAIL_HOST` | SMTP хост | `mailhog` | `smtp.example.com` |
| `MAIL_PORT` | SMTP порт | `1025` | `587` |
| `MAIL_USERNAME` | SMTP логин | `` | SMTP пользователь |
| `MAIL_PASSWORD` | SMTP пароль | `` | SMTP пароль |

---

### Хранилище файлов

Messenger поддерживает два провайдера хранилища файлов, управляемых переменной `STORAGE_PROVIDER`.

#### S3-compatible storage (рекомендуется для production)

```dotenv
STORAGE_PROVIDER=s3
S3_ENDPOINT=https://s3.amazonaws.com      # или URL вашего MinIO/Ceph/R2
S3_ACCESS_KEY=AKIA...
S3_SECRET_KEY=wJalr...
S3_BUCKET_NAME=messenger-files
S3_REGION=us-east-1
S3_PATH_STYLE_ACCESS_ENABLED=false        # true для MinIO и большинства S3-compatible
S3_AUTO_CREATE_BUCKET=false               # создайте bucket вручную до запуска
```

Для MinIO (типичная корпоративная установка):

```dotenv
STORAGE_PROVIDER=s3
S3_ENDPOINT=https://minio.internal.company.com
S3_ACCESS_KEY=<minioadmin_key>
S3_SECRET_KEY=<minioadmin_secret>
S3_BUCKET_NAME=messenger-files
S3_REGION=us-east-1
S3_PATH_STYLE_ACCESS_ENABLED=true
S3_AUTO_CREATE_BUCKET=false
```

Создайте bucket до старта (через mc или веб-консоль MinIO):

```bash
mc alias set myminio https://minio.internal.company.com KEY SECRET
mc mb myminio/messenger-files
mc policy set private myminio/messenger-files
```

#### Disk storage (файловая система)

```dotenv
STORAGE_PROVIDER=disk
STORAGE_DISK_PATH=/data/uploads
```

Путь `/data/uploads` — это путь **внутри контейнера**. Реальное размещение данных зависит от того, как вы монтируете том (см. следующий раздел).

---

### Монтирование папок и дисков

#### Вариант 1: Docker named volume (default)

По умолчанию `docker-compose.yml` создаёт именованный volume `files_data`, смонтированный в `/data/uploads`.

```yaml
# уже настроено в docker-compose.yml
volumes:
  - files_data:/data/uploads
```

Данные хранятся в `/var/lib/docker/volumes/messenger_files_data/_data/` на хосте. Ничего настраивать не нужно.

#### Вариант 2: Host-директория

Создайте `docker-compose.override.yml` (или используйте мастер установки):

```yaml
services:
  server:
    environment:
      STORAGE_PROVIDER: disk
      STORAGE_DISK_PATH: /data/uploads
    volumes:
      - /mnt/nas/messenger:/data/uploads    # любой путь на хосте

  worker:
    environment:
      STORAGE_PROVIDER: disk
      STORAGE_DISK_PATH: /data/uploads
    volumes:
      - /mnt/nas/messenger:/data/uploads
```

Подготовьте директорию (backend работает от UID 1000):

```bash
sudo mkdir -p /mnt/nas/messenger
sudo chown -R 1000:1000 /mnt/nas/messenger
```

Подходит для:
- NFS/CIFS примонтированного как `/mnt/nas/messenger`
- Заранее подготовленного раздела
- Любой папки на хосте

#### Вариант 3: Отдельный блочный диск

Скрипт управления форматирует, монтирует и регистрирует диск в `/etc/fstab`:

```bash
# Посмотреть доступные диски
lsblk -o NAME,SIZE,TYPE,FSTYPE,MOUNTPOINT,MODEL

# Установить диск (внимание: форматирование уничтожает данные!)
sudo ./scripts/messengerctl.sh disk-install \
  --device /dev/sdb \
  --mount-point /srv/messenger/uploads \
  --fs ext4 \
  --force
```

Что делает команда:
1. Форматирует `/dev/sdb` как ext4
2. Монтирует в `/srv/messenger/uploads`
3. Добавляет UUID-запись в `/etc/fstab` (устойчиво к переименованию)
4. Создаёт `docker-compose.disk.yml` с bind mount
5. Обновляет `.env` (`STORAGE_PROVIDER=disk`)
6. Перезапускает `server` и `worker`

Запустить Compose вручную с disk override:

```bash
docker compose -f docker-compose.yml -f docker-compose.disk.yml up -d
```

Скрипт `messengerctl.sh` автоматически подключает `docker-compose.disk.yml` при его наличии.

Безопасно отключить диск:

```bash
./scripts/messengerctl.sh disk-remove --mount-point /srv/messenger/uploads
```

Подробности: [DISK_STORAGE.md](DISK_STORAGE.md).

#### Сравнение вариантов хранилища

| Вариант | Сложность | Масштабируемость | Backup | Когда использовать |
|---------|-----------|-----------------|--------|-------------------|
| S3 / MinIO | Средняя | Высокая | Встроенный | Production, multi-node |
| Docker volume | Низкая | Нет | Ручной | Dev, simple prod |
| Host-директория | Средняя | Нет | Ручной | NFS, подготовленный раздел |
| Отдельный диск | Высокая | Нет | Ручной | Выделенный физический диск |

---

### Сеть и домен

#### Dev (localhost)

```dotenv
CORS_ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001,http://localhost:8080
WS_ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001,http://localhost:8080
```

#### Production (с доменом)

```dotenv
CORS_ALLOWED_ORIGINS=https://chat.example.com
WS_ALLOWED_ORIGINS=https://chat.example.com
```

Если нужен доступ с нескольких источников:

```dotenv
CORS_ALLOWED_ORIGINS=https://chat.example.com,https://staging.example.com
WS_ALLOWED_ORIGINS=https://chat.example.com,https://staging.example.com
```

#### Reverse proxy

Шаблоны конфигурации:

```bash
# Nginx
deploy/nginx/messenger.conf.example

# Caddy
deploy/caddy/Caddyfile.example
```

Архитектура с reverse proxy:

```
Internet → Nginx (443/TLS) → localhost:3001 (web-client)
                           → localhost:8080/api/ (backend)
                           → localhost:8080/ws/  (WebSocket)
```

---

### Email

#### Dev: MailHog

```dotenv
MAIL_HOST=mailhog
MAIL_PORT=1025
```

MailHog перехватывает все письма. Веб-интерфейс: http://localhost:8025.

#### Production: SMTP

```dotenv
MAIL_HOST=smtp.company.com
MAIL_PORT=587
MAIL_USERNAME=messenger@company.com
MAIL_PASSWORD=<пароль>
```

Для Gmail (только для тестирования):

```dotenv
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USERNAME=your@gmail.com
MAIL_PASSWORD=<app-password>  # не обычный пароль — App Password в настройках Google
```

---

## Проверка работоспособности

После запуска проверьте все сервисы:

```bash
# Статус контейнеров
docker compose ps

# Backend health
curl -fsS http://localhost:8080/actuator/health
# Ожидается: {"status":"UP",...}

# Web-клиент
curl -I http://localhost:3001
# Ожидается: HTTP/1.1 200 OK

# PostgreSQL
docker exec messenger-postgres pg_isready -U postgres -d messenger
# Ожидается: messenger:5432 - accepting connections

# Redis
docker exec messenger-redis redis-cli ping
# Ожидается: PONG

# LocalStack S3 (только dev)
curl -fsS http://localhost:4566/_localstack/health
docker exec messenger-localstack awslocal s3 ls
```

Через скрипт:

```bash
./scripts/messengerctl.sh status
./scripts/messengerctl.sh doctor
```

---

## Аутентификация и Active Directory

Messenger поддерживает три механизма аутентификации:

1. **Локальная аутентификация** — включена по умолчанию. Логин/пароль хранятся в PostgreSQL.

2. **LDAP / Active Directory** — прямое подключение к LDAP-серверу домена Windows AD или OpenLDAP. Включается через Admin API. Поддерживает один домен (или forest через Global Catalog).

3. **OIDC (Single Sign-On)** — подключение через ADFS, Azure AD, Keycloak или другой OpenID Connect провайдер. Включается через Admin API. Поддерживает один провайдер.

Подробная инструкция по настройке и тестированию LDAP/AD и OIDC — в [AD_LDAP_TESTING.md](AD_LDAP_TESTING.md).

---

## Следующие шаги

После базовой установки:

| Задача | Документ |
|--------|----------|
| Настройка TLS и reverse proxy | [PRODUCTION.md](PRODUCTION.md) |
| Настройка LDAP / Active Directory | [AD_LDAP_TESTING.md](AD_LDAP_TESTING.md) |
| Настройка дисков и хранилища | [DISK_STORAGE.md](DISK_STORAGE.md) |
| Backup и restore | [BACKUP_RESTORE.md](BACKUP_RESTORE.md) |
| Обновление, мониторинг, rollback | [OPERATIONS.md](OPERATIONS.md) |
| Kubernetes и Helm | [KUBERNETES.md](KUBERNETES.md) |
| Архитектура системы | [ARCHITECTURE.md](ARCHITECTURE.md) |
