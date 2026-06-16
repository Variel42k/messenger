# Messenger

[![CI](https://github.com/Variel42k/messenger/actions/workflows/ci.yml/badge.svg)](https://github.com/Variel42k/messenger/actions/workflows/ci.yml)
[![License: AGPL-3.0](https://img.shields.io/badge/License-AGPL--3.0-blue.svg)](LICENSE)

Messenger — open-source self-hosted мессенджер для команд, сообществ и организаций, которым важен контроль над своими данными и инфраструктурой.

## Возможности

- Self-hosted развёртывание: Docker Compose, Podman Compose, Kubernetes/Helm
- Real-time сообщения через WebSocket/STOMP
- Загрузка файлов: S3-compatible storage или disk storage с монтированием произвольных папок/дисков
- PostgreSQL и Redis
- JWT-аутентификация с access/refresh токенами
- LDAP / Active Directory интеграция
- OIDC / SSO через ADFS, Azure AD, Keycloak
- Role-based доступ для пользователей и администраторов
- Web-клиент на React, desktop-клиент на JavaFX
- Swagger API docs и Spring Actuator health checks

---

## Quick Start

Выберите ваш сценарий:

### Интерактивная установка (рекомендуется)

Мастер установки задаст вопросы и настроит всё автоматически — runtime, хранилище, домен, email:

```bash
git clone https://github.com/Variel42k/messenger.git
cd messenger
bash scripts/install-wizard.sh
```

Для мгновенного запуска dev-окружения без вопросов:

```bash
bash scripts/install-wizard.sh --quick
```

---

### Локальная разработка (Docker, 1 команда)

```bash
git clone https://github.com/Variel42k/messenger.git && cd messenger
docker compose up -d --build
```

| Сервис | URL |
|--------|-----|
| Web-клиент | http://localhost:3001 |
| API | http://localhost:8080 |
| Swagger UI | http://localhost:8080/swagger-ui/index.html |
| MailHog (fake email) | http://localhost:8025 |
| Health | http://localhost:8080/actuator/health |

Учётные данные: `admin` / `admin123` (только для dev!)

---

### Production — Docker Compose

```bash
git clone https://github.com/Variel42k/messenger.git && cd messenger
cp .env.production.example .env
# Отредактируйте .env: пароли, JWT_SECRET, S3 или disk, ваш домен
./scripts/messengerctl.sh install --runtime docker --profile production
```

После установки настройте reverse proxy:

```bash
sudo cp deploy/nginx/messenger.conf.example /etc/nginx/conf.d/messenger.conf
# Замените chat.example.com на ваш домен
sudo nginx -t && sudo systemctl reload nginx
```

Подробности: [docs/INSTALL.md](docs/INSTALL.md#quick-start-production-docker-compose)

---

### Production — Podman (rootless)

```bash
git clone https://github.com/Variel42k/messenger.git && cd messenger
cp .env.production.example .env
# Отредактируйте .env
./scripts/messengerctl.sh install --runtime podman --profile production
```

Подробности: [docs/PODMAN.md](docs/PODMAN.md)

---

### Production — Kubernetes / Helm

```bash
git clone https://github.com/Variel42k/messenger.git && cd messenger
cp helm/values-production.example.yaml helm/values-production.yaml
# Отредактируйте values-production.yaml: ingress, БД, S3, secrets
./scripts/messengerctl.sh install \
  --runtime kubernetes \
  --namespace messenger \
  --release messenger \
  --values helm/values-production.yaml
```

Подробности: [docs/KUBERNETES.md](docs/KUBERNETES.md)

---

## Хранилище файлов

Messenger хранит загруженные файлы в S3-compatible storage или на диске.

```dotenv
# В .env:

# Вариант 1: S3 / MinIO
STORAGE_PROVIDER=s3
S3_ENDPOINT=https://minio.internal.company.com
S3_ACCESS_KEY=your-key
S3_SECRET_KEY=your-secret

# Вариант 2: Диск — Docker volume (данные в /var/lib/docker/volumes/)
STORAGE_PROVIDER=disk

# Вариант 3: Диск — конкретная папка на хосте (через docker-compose.override.yml)
STORAGE_PROVIDER=disk
# + создайте docker-compose.override.yml с bind mount вашей папки

# Вариант 4: Отдельный блочный диск
sudo ./scripts/messengerctl.sh disk-install --device /dev/sdb --mount-point /srv/messenger/uploads --fs ext4 --force
```

Подробности о монтировании папок и дисков: [docs/INSTALL.md#монтирование-папок-и-дисков](docs/INSTALL.md#монтирование-папок-и-дисков)

---

## Active Directory и LDAP

Настройка LDAP/AD через Admin API после установки:

```bash
# 1. Включить LDAP (добавить в .env или docker-compose.override.yml)
APP_LDAP_ENABLED=true

# 2. Настроить через API
curl -X POST http://localhost:8080/api/admin/ldap-settings \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "ldapUrl": "ldap://dc01.company.com:389",
    "baseDn": "DC=company,DC=com",
    "userDnPattern": "CN={0},OU=Users,DC=company,DC=com",
    "managerDn": "CN=svc-ldap,OU=ServiceAccounts,DC=company,DC=com",
    "managerPassword": "Password"
  }'

# 3. Тест подключения
curl -X POST http://localhost:8080/api/admin/ldap-test-connection \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

Для нескольких доменов — используйте AD Global Catalog (порт 3268) или Keycloak как LDAP-агрегатор.

Для OIDC (ADFS / Azure AD / Keycloak):

```bash
curl -X PUT http://localhost:8080/api/admin/oidc/provider \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "enabled": true,
    "providerName": "adfs",
    "issuerUri": "https://adfs.company.com/adfs",
    "authorizationUri": "https://adfs.company.com/adfs/oauth2/authorize",
    "tokenUri": "https://adfs.company.com/adfs/oauth2/token",
    "userInfoUri": "https://adfs.company.com/adfs/userinfo",
    "jwksUri": "https://adfs.company.com/adfs/discovery/keys",
    "clientId": "YOUR_CLIENT_ID",
    "clientSecret": "YOUR_CLIENT_SECRET",
    "redirectUri": "https://chat.company.com/api/auth/oidc/callback",
    "scopes": "openid profile email",
    "autoProvisionUsers": true
  }'
```

Полное руководство с пошаговым тестированием: [docs/AD_LDAP_TESTING.md](docs/AD_LDAP_TESTING.md)

---

## Скрипт управления

`scripts/messengerctl.sh` — основная точка управления:

```bash
./scripts/messengerctl.sh install    # установка
./scripts/messengerctl.sh update     # обновление с backup
./scripts/messengerctl.sh backup     # создать backup
./scripts/messengerctl.sh restore --file backups/messenger-backup-20260531-120000.tar.gz
./scripts/messengerctl.sh status     # статус сервисов
./scripts/messengerctl.sh logs --service server --tail 200
./scripts/messengerctl.sh disk-install --device /dev/sdb --mount-point /srv/messenger/uploads --fs ext4 --force
./scripts/messengerctl.sh help       # все команды
```

---

## Документация

| Документ | Содержание |
|----------|-----------|
| [docs/INSTALL.md](docs/INSTALL.md) | **Полное руководство по установке** — все варианты, quick start, хранилище, сеть |
| [docs/AD_LDAP_TESTING.md](docs/AD_LDAP_TESTING.md) | **LDAP/AD и OIDC** — настройка, тестирование, multi-domain |
| [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) | Требования, .env, storage, health checks, troubleshooting |
| [docs/DEPLOYMENT_MATRIX.md](docs/DEPLOYMENT_MATRIX.md) | Сравнение Docker / Podman / Kubernetes |
| [docs/PODMAN.md](docs/PODMAN.md) | Podman Compose, rootless, SELinux, systemd |
| [docs/KUBERNETES.md](docs/KUBERNETES.md) | Helm, production values, rollback |
| [docs/OPERATIONS.md](docs/OPERATIONS.md) | Ежедневная эксплуатация через messengerctl.sh |
| [docs/BACKUP_RESTORE.md](docs/BACKUP_RESTORE.md) | Backup, restore, проверка целостности |
| [docs/DISK_STORAGE.md](docs/DISK_STORAGE.md) | Диски, mount, fstab, docker-compose override |
| [docs/PRODUCTION.md](docs/PRODUCTION.md) | Hardening, TLS, reverse proxy, monitoring |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Архитектура системы |

---

## Учётные данные по умолчанию

Только для локальной разработки:

| Сервис | Логин | Пароль |
|--------|-------|--------|
| Application admin | `admin` | `admin123` |
| PostgreSQL | `postgres` | `password` |
| LocalStack S3 | `test` | `test` |

Перед production-развёртыванием обязательно смените credentials. Начните с [docs/INSTALL.md](docs/INSTALL.md) и [docs/PRODUCTION.md](docs/PRODUCTION.md).

---

## Production шаблоны

Production-конфигурации являются opt-in и не влияют на dev-стек:

- `docker-compose.production.yml.example`
- `podman-compose.production.yml.example`
- `.env.production.example`
- `helm/values-production.example.yaml`
- `deploy/nginx/messenger.conf.example`
- `deploy/caddy/Caddyfile.example`
- `deploy/systemd/*.example`
- `deploy/prometheus/prometheus.yml.example`

---

## Технологический стек

- **Backend**: Java 17, Spring Boot 3.x, Spring Security, WebSocket/STOMP
- **Database**: PostgreSQL 15, Flyway migrations, JPA/Hibernate
- **Cache**: Redis 7
- **Storage**: S3-compatible (LocalStack/MinIO/AWS) или disk
- **Auth**: JWT, LDAP, OIDC
- **Web-клиент**: React, Webpack
- **Desktop-клиент**: JavaFX
- **Infrastructure**: Docker Compose, Podman Compose, Kubernetes/Helm

## Лицензия

Messenger Community Edition распространяется под GNU Affero General Public License v3.0. Полный текст: [LICENSE](LICENSE), дополнительные notices: [NOTICE](NOTICE).
