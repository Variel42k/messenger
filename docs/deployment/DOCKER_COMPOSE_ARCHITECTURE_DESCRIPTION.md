# Архитектура мессенджера для Docker Compose

## Обзор

Архитектура мессенджера для Docker Compose состоит из 5 контейнеров, работающих в одной сети (`messenger-network`):

- **PostgreSQL 15** — реляционная база данных (пользователи, чаты, сообщения, файлы)
- **Redis 7** — кэширование и онлайн-статусы, pub/sub
- **MinIO** — S3-совместимое объектное хранилище файлов
- **Messenger Server** — Spring Boot API (порт 8080)
- **Web Client** — React SPA через Nginx (порт 3001)

## Связи между компонентами

- Server подключается к PostgreSQL для хранения данных (Flyway-миграции)
- Server использует Redis для кэширования и pub/sub
- Server взаимодействует с MinIO для хранения файлов (TODO: интеграция)
- Web Client соединяется с Server через REST API и WebSocket
- Десктоп-клиент (JavaFX) — запускается отдельно, не в Docker

## Инфраструктурные особенности

- Все контейнеры работают в одной Docker-сети (`messenger-network`)
- Именованные volumes для PostgreSQL, Redis, MinIO
- Креды хранятся в `.env` (не захардкожены в docker-compose.yml)
- Flyway выполняет миграции при старте сервера
- `ddl-auto: validate` — Hibernate не изменяет схему БД
- Server зависит от postgres, redis, minio (depends_on)
- Web Client зависит от server (depends_on)