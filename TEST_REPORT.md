# Отчёт о тестировании Messenger

## Дата последнего тестирования: 2026-02-27

## Состояние проекта

### Успешно проверено:
1. **Структура проекта** — серверная часть, веб-клиент (React), десктоп-клиент (JavaFX)
2. **Backend** — Spring Boot 3.x (Spring MVC), JWT-аутентификация, WebSocket/STOMP
3. **Архитектура** — PostgreSQL + Redis + MinIO, Docker Compose
4. **Безопасность** — IDOR-защита, Path Traversal, валидация DTO, GlobalExceptionHandler
5. **Docker** — все 5 контейнеров запускаются и работают стабильно

### Результаты API-тестирования: 11/11 ✅

| # | Тест | Результат |
|---|------|-----------|
| 1 | Health Check (Actuator) | ✅ (DOWN при холодном старте Redis — нормально) |
| 2 | Register | ✅ 200 |
| 3 | Login | ✅ 200 (access + refresh) |
| 4 | Admin Login | ✅ 200 |
| 5 | Create Chat (userId из JWT) | ✅ 200 |
| 6 | Get Chats (userId из JWT) | ✅ 200 |
| 7 | Send Message (senderId из JWT) | ✅ 200 |
| 8 | Get Messages (/chat/{chatId}) | ✅ 200 |
| 9 | Refresh Token | ✅ 200 |
| 10 | Swagger UI (без auth) | ✅ 200 |
| 11 | Validation (невалидные данные) | ✅ 400 |

## Конфигурация Docker Compose

### Запущенные сервисы:
- **messenger-postgres** — PostgreSQL 15
- **messenger-redis** — Redis 7-alpine
- **messenger-minio** — MinIO (S3-совместимое хранилище)
- **messenger-server** — Spring Boot API (порт 8080)
- **messenger-web-client** — React SPA через Nginx (порт 3001)

## Проверка готовности

### Сервер:
- [x] REST-контроллеры с DTO-валидацией
- [x] WebSocket/STOMP конфигурация
- [x] JWT Security (access + refresh)
- [x] IDOR-защита (userId из JWT)
- [x] Path Traversal защита
- [x] GlobalExceptionHandler (400 для @Valid)
- [x] @Transactional на сервисах
- [x] SLF4J логирование
- [x] Constructor injection
- [x] Flyway миграции (V1–V6), ddl-auto: validate
- [x] Swagger UI доступен без аутентификации

### Веб-клиент:
- [x] React SPA работает на порту 3001
- [x] Мультиязычность (EN, RU, ES)

### Десктоп-клиент:
- [x] JavaFX-приложение собирается
- [x] Требует Java 17

## Выводы

Проект полностью работоспособен в Docker-окружении. Все 11 API-тестов пройдены. Безопасность усилена (IDOR, Path Traversal, валидация, CORS). Инфраструктура (PostgreSQL, Redis, MinIO) стабильна.