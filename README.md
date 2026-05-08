# Messenger

[![CI](https://github.com/Variel42k/messenger/actions/workflows/ci.yml/badge.svg)](https://github.com/Variel42k/messenger/actions/workflows/ci.yml)
[![License: AGPL-3.0](https://img.shields.io/badge/License-AGPL--3.0-blue.svg)](LICENSE)

Self-hosted open-source messenger for teams and communities.

Messenger — open-source self-hosted messaging platform for teams, communities and organizations that want control over their data. Проект подходит для частных рабочих пространств, внутренних сообществ, образовательных и организационных сред, где важно управлять инфраструктурой, хранением файлов и доступом пользователей самостоятельно.

## Ключевые возможности

- Self-hosted deployment через Docker Compose, Kubernetes и Helm foundation
- Real-time messaging через WebSocket/STOMP
- File sharing с S3-compatible storage или disk storage mode
- PostgreSQL + Redis для данных, статусов и вспомогательной инфраструктуры
- JWT authentication с access/refresh токенами
- Role-based access для пользовательских и административных сценариев
- Web client на React
- Desktop client на JavaFX
- Swagger API docs и Spring Actuator health checks

## Quick Start

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

Для локальной разработки backend/web без контейнеризации приложения:

```bash
docker compose up -d postgres redis localstack

cd server
./mvnw spring-boot:run

cd ../web-client
npm install
npm start
```

На Windows PowerShell для backend используйте `.\mvnw.cmd spring-boot:run`.

## Документация

- [Deployment](docs/DEPLOYMENT.md) — локальный запуск, Docker Compose, переменные окружения, PostgreSQL, Redis, LocalStack S3, disk storage, health checks, Swagger UI и troubleshooting.
- [Production](docs/PRODUCTION.md) — рекомендации для production: secrets, внешние сервисы, HTTPS, CORS/WebSocket origins, backups, monitoring и Swagger.
- [Architecture](docs/ARCHITECTURE.md) — обзор архитектуры backend, клиентов и инфраструктуры.
- [Groups and Channels API](docs/API_GROUPS_CHANNELS.md) — production-grade group/channel, membership, message, and moderation contracts.
- [Groups/Channels Gap Analysis](docs/GROUPS_CHANNELS_GAP_ANALYSIS.md) — audit, target model, missing work, rollback, and PR notes.
- [QA Matrix](docs/QA_GROUPS_CHANNELS_TEST_MATRIX.md) — API, realtime, responsive, accessibility, and regression checklist.
- [ADR Index](docs/adr) — domain model, realtime envelope, deactivation/ban policy, and local topology decisions.
- [Storage and Build Notes](docs/STORAGE_AND_BUILD.md) — дополнительные заметки по сборке и режимам хранения.
- [Testing](docs/TESTING.md) — тестирование проекта.

## Why Messenger?

Messenger is for teams, communities and organizations that want a private, self-hosted chat platform without depending on external messaging providers.

Ключевые преимущества:

- Self-hosted deployment
- Real-time messaging
- File sharing
- PostgreSQL + Redis
- S3-compatible storage
- JWT authentication
- Role-based access
- WebSocket/STOMP
- Web client
- Desktop client
- Docker Compose
- Kubernetes/Helm foundation
- Swagger API docs

## Screenshots

> Screenshots and demo GIFs will be added soon.

## Community and Enterprise

Messenger Community Edition остаётся open-source self-hosted версией и распространяется под AGPL-3.0.

Commercial / Enterprise направление может включать коммерческую лицензию, поддержку, managed hosting, private deployment assistance, SLA и enterprise-функции, например SSO, audit logs и advanced admin capabilities.

Эти enterprise-фичи сейчас только документируются как возможное направление развития и не считаются реализованными возможностями текущей Community Edition.

## License / Commercial Use

Messenger Community Edition распространяется под GNU Affero General Public License v3.0. Полный текст лицензии находится в [LICENSE](LICENSE), дополнительная информация — в [NOTICE](NOTICE).

Commercial licensing options may be available for organizations that need different licensing terms, enterprise support, private deployment assistance, or managed hosting.

## Recommended GitHub Topics

`messenger` `chat` `real-time-chat` `self-hosted` `team-chat` `spring-boot` `react` `postgresql` `redis` `websocket` `stomp` `docker` `kubernetes` `helm` `s3` `java` `open-source`

## Технологический стек

- Backend: Java 17, Spring Boot 3.x, Spring MVC, Spring Security, WebSocket/STOMP, Spring Actuator
- Database: PostgreSQL 15, Flyway migrations, JPA/Hibernate
- Cache/coordination: Redis 7
- File storage: S3-compatible storage через LocalStack в dev или внешний S3 в production; альтернативно disk storage
- Web client: React, Webpack
- Desktop client: JavaFX
- Infrastructure: Docker Compose, Helm chart foundation

## Default Development Credentials

Эти значения предназначены только для локальной разработки:

| Сервис | Логин | Пароль |
| --- | --- | --- |
| Приложение (admin) | `admin` | `admin123` |
| PostgreSQL | `postgres` | `password` |
| LocalStack S3 | `test` | `test` |

Перед production-запуском обязательно замените dev-секреты и credentials. Минимальные рекомендации описаны в [docs/PRODUCTION.md](docs/PRODUCTION.md).
