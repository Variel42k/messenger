# Messenger

[![CI](https://github.com/Variel42k/messenger/actions/workflows/ci.yml/badge.svg)](https://github.com/Variel42k/messenger/actions/workflows/ci.yml)
[![License: AGPL-3.0](https://img.shields.io/badge/License-AGPL--3.0-blue.svg)](LICENSE)

Messenger - open-source self-hosted мессенджер для команд, сообществ и организаций, которым важен контроль над своими данными и инфраструктурой.

## Возможности

- Self-hosted deployment через Docker Compose и базовую Helm-структуру.
- Real-time messaging через WebSocket/STOMP.
- File uploads через S3-compatible storage или disk storage.
- PostgreSQL и Redis.
- JWT authentication с access и refresh tokens.
- Role-based сценарии для пользователей и администрирования.
- Web client на React и desktop client на JavaFX.
- Swagger API docs и Spring Actuator health checks.

## Быстрый запуск

```bash
git clone https://github.com/Variel42k/messenger.git
cd messenger
docker compose up -d --build
```

После запуска:

- API server: http://localhost:8080
- Swagger UI: http://localhost:8080/swagger-ui/index.html
- Web client: http://localhost:3001
- LocalStack S3 endpoint: http://localhost:4566
- Health check: http://localhost:8080/actuator/health

## Скрипт установки и эксплуатации

`scripts/messengerctl.sh` - основная точка управления self-hosted установкой. Скрипт проверяет зависимости, подготавливает `.env`, генерирует `JWT_SECRET` при необходимости, собирает и запускает сервисы, создаёт backups, восстанавливает backups, управляет disk storage и выполняет диагностику.

Примеры:

```bash
./scripts/messengerctl.sh install
./scripts/messengerctl.sh update
./scripts/messengerctl.sh backup
./scripts/messengerctl.sh restore --file backups/messenger-backup-20260531-120000.tar.gz
./scripts/messengerctl.sh uninstall
./scripts/messengerctl.sh disk-install --device /dev/sdb --mount-point /srv/messenger/uploads --fs ext4 --force
./scripts/messengerctl.sh disk-remove --mount-point /srv/messenger/uploads
```

Показать все команды:

```bash
./scripts/messengerctl.sh help
```

## Локальная разработка

Запустить инфраструктуру в Docker, а приложения локально:

```bash
docker compose up -d postgres redis localstack

cd server
./mvnw spring-boot:run

cd ../web-client
npm install
npm start
```

Для backend в Windows PowerShell:

```powershell
cd server
.\mvnw.cmd spring-boot:run
```

## Документация

- [Развертывание](docs/DEPLOYMENT.md): требования к серверу, `.env`, Docker Compose deployment, health checks, storage modes, logs и troubleshooting.
- [Матрица развертывания](docs/DEPLOYMENT_MATRIX.md): сравнение Docker Compose, Podman Compose и Kubernetes Helm с Mermaid-графами.
- [Podman](docs/PODMAN.md): production-like запуск через Podman Compose, rootless/SELinux notes и systemd.
- [Kubernetes](docs/KUBERNETES.md): Helm deployment, production values, update и rollback.
- [Эксплуатация](docs/OPERATIONS.md): install, update, stop, restart, uninstall, purge, rollback, диагностика и операции с дисками через скрипт.
- [Backup и restore](docs/BACKUP_RESTORE.md): состав backup, ручной backup, backup через скрипт, восстановление и проверка целостности.
- [Disk storage](docs/DISK_STORAGE.md): выделенный диск под uploads, mount, `/etc/fstab`, Docker Compose bind mount и безопасное отключение.
- [Production](docs/PRODUCTION.md): production-аудит, HTTPS/TLS, reverse proxy, backup retention, systemd, log rotation, monitoring, S3/MinIO, migrations, rollback, Compose hardening и production templates.
- [Архитектура](docs/ARCHITECTURE.md): обзор backend, clients и infrastructure.
- [Groups and Channels API](docs/API_GROUPS_CHANNELS.md): контракты groups/channels.
- [Storage and Build Notes](docs/STORAGE_AND_BUILD.md): заметки по build и storage.
- [Testing](docs/TESTING.md): тестирование проекта.

## Development credentials по умолчанию

Эти значения предназначены только для локальной разработки:

| Сервис | Логин | Пароль |
| --- | --- | --- |
| Application admin | `admin` | `admin123` |
| PostgreSQL | `postgres` | `password` |
| LocalStack S3 | `test` | `test` |

Перед production-like deployment замените dev secrets и credentials. Начните с [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) и [docs/PRODUCTION.md](docs/PRODUCTION.md).

## Production templates

Production-примеры являются opt-in и не влияют на default development stack:

- `docker-compose.production.yml.example`
- `podman-compose.production.yml.example`
- `.env.production.example`
- `helm/values-production.example.yaml`
- `helm/values-federation.example.yaml`
- `deploy/federation/*.example.yml`
- `deploy/nginx/messenger.conf.example`
- `deploy/caddy/Caddyfile.example`
- `deploy/systemd/*.example`
- `deploy/prometheus/prometheus.yml.example`

## Технологический стек

- Backend: Java 17, Spring Boot 3.x, Spring MVC, Spring Security, WebSocket/STOMP, Spring Actuator.
- Database: PostgreSQL 15, Flyway migrations, JPA/Hibernate.
- Cache/coordination: Redis 7.
- File storage: S3-compatible storage через LocalStack/dev или external S3/production; optional disk storage.
- Web client: React и Webpack.
- Desktop client: JavaFX.
- Infrastructure: Docker Compose и базовый Helm chart.

## Лицензия / commercial use

Messenger Community Edition распространяется под GNU Affero General Public License v3.0. Полный текст лицензии находится в [LICENSE](LICENSE), дополнительные notices - в [NOTICE](NOTICE).
