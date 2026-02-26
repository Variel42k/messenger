# Анализ проекта Messenger

## Обзор проекта

Проект Messenger — полнофункциональная платформа для обмена сообщениями в реальном времени. Backend на Java Spring Boot (Spring MVC), веб-клиент на React, десктоп-клиент на JavaFX. Проект поддерживает обмен сообщениями, файлами, шифрование и JWT-аутентификацию.

## Архитектура

- **Серверная часть**: Java 17 + Spring Boot 3.x (Spring MVC, **не** WebFlux)
- **Веб-клиент**: React SPA, контейнеризован через Nginx
- **Десктоп-клиент**: JavaFX-приложение
- **База данных**: PostgreSQL 15, Flyway-миграции, `ddl-auto: validate`
- **Кэш**: Redis 7
- **Хранилище файлов**: MinIO (S3-совместимое)
- **Реальное время**: WebSocket/STOMP
- **Аутентификация**: JWT (access + refresh), IDOR-защита

## Структура проекта

```
messenger/
├── server/          # Spring Boot backend
│   ├── controller/  # REST API + GlobalExceptionHandler
│   ├── dto/         # DTO с Jakarta Validation
│   ├── service/     # @Transactional бизнес-логика
│   ├── repository/  # JPA-репозитории
│   ├── config/      # SecurityConfig, WebSocketConfig
│   ├── model/       # JPA-сущности
│   └── security/    # JWT-фильтр и провайдер
├── web-client/      # React SPA (порт 3001)
├── client/          # JavaFX desktop (Maven)
├── docker-compose.yml
├── .env
├── helm/            # Kubernetes Helm-чарт
└── k8s/             # Kubernetes-манифесты
```

## Текущее состояние

- **Серверная часть** — полностью реализована, прошла аудит безопасности
- **Веб-клиент** — реализован, работает в Docker (порт 3001)
- **Десктоп-клиент** — реализован (JavaFX), требует Java 17
- **Инфраструктура** — Docker Compose (PostgreSQL, Redis, MinIO, Server, Web-client)
- **Безопасность** — IDOR-защита, Path Traversal, @Valid, CORS из конфига

## Ключевые особенности реализации

1. **DTO валидация** — все входные данные API проходят через DTO с аннотациями `@Valid`
2. **IDOR-защита** — userId/senderId извлекаются из JWT, не из параметров запроса
3. **Транзакционность** — `@Transactional` на всех мутирующих операциях
4. **Constructor injection** — используется вместо `@Autowired` во всех компонентах
5. **SLF4J Logger** — вместо `System.err.println` во всех сервисах
6. **Flyway** — 6 миграций, `ddl-auto: validate`
7. **Шифрование** — AES-шифрование сообщений с автоматической генерацией ключей