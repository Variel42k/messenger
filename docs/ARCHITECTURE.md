# Архитектура проекта Messenger

## Общая архитектура

```
┌──────────────────────────────────────────────────────────────┐
│                     Клиентская часть                         │
│  ┌─────────────────┐  ┌─────────────────┐                   │
│  │   Web Client    │  │   JavaFX Client │                   │
│  │   (React)       │  │   (Desktop)     │                   │
│  └────────┬────────┘  └────────┬────────┘                   │
│           │  REST + WebSocket  │                             │
└───────────┼────────────────────┼─────────────────────────────┘
            │                    │
            ▼                    ▼
┌──────────────────────────────────────────────────────────────┐
│                     Серверная часть (Spring Boot 3.x)        │
│  ┌─────────────────┐  ┌─────────────────┐  ┌──────────────┐ │
│  │   WebSocket     │  │   REST API      │  │  Security    │ │
│  │   (STOMP)       │  │   (Spring MVC)  │  │  (JWT)       │ │
│  └─────────────────┘  └─────────────────┘  └──────────────┘ │
│  ┌─────────────────┐  ┌─────────────────┐  ┌──────────────┐ │
│  │   DTO Layer     │  │   Service       │  │  Repository  │ │
│  │   (@Valid)       │  │   (@Transactional)│ │  (JPA)       │ │
│  └─────────────────┘  └─────────────────┘  └──────────────┘ │
│  ┌─────────────────┐  ┌─────────────────┐                   │
│  │   GlobalExc.    │  │   Config        │                   │
│  │   Handler       │  │   (Security,    │                   │
│  │                 │  │    CORS, WS)    │                   │
│  └─────────────────┘  └─────────────────┘                   │
└──────────────────────────────────────────────────────────────┘
                            │
            ┌───────────────┼───────────────┐
            ▼               ▼               ▼
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│   PostgreSQL 15 │ │   Redis 7       │ │   MinIO         │
│   (Users, Chats,│ │   (Online       │ │   (S3 File      │
│   Messages)     │ │   Status,       │ │   Storage)      │
│                 │ │   Pub/Sub)      │ │                 │
└─────────────────┘ └─────────────────┘ └─────────────────┘
```

## Компоненты системы

### 1. Веб-клиент (React)
- SPA на React с Webpack
- WebSocket-клиент для сообщений реального времени
- HTTP-клиент для REST API
- Мультиязычность (EN, RU, ES)
- Контейнеризация через Nginx (порт 3001)

### 2. Десктоп-клиент (JavaFX)
- UI: FXML для разметки, CSS для стилизации
- Контроллеры: обработка событий интерфейса
- WebSocket-клиент: STOMP-протокол
- HTTP-клиент: REST API

### 3. Серверная часть (Spring Boot 3.x)

- **Web-слой**:
  - REST-контроллеры (Spring MVC)
  - WebSocket/STOMP для реального времени
  - DTO с Jakarta Validation (`@Valid`, `@NotBlank`, `@Size`, `@Email`)
  - GlobalExceptionHandler для унифицированных ответов

- **Слой безопасности**:
  - JWT access/refresh токены
  - IDOR-защита: userId из `@AuthenticationPrincipal`
  - Path Traversal защита в FileController
  - CORS и WebSocket origins из application.yml

- **Сервисный слой**:
  - Бизнес-логика с `@Transactional`
  - SLF4J-логирование
  - Constructor injection (без `@Autowired`)

- **Слой доступа к данным**:
  - JPA/Hibernate репозитории
  - Flyway-миграции (V1–V6)
  - `ddl-auto: validate` (Hibernate не меняет схему)

### 4. Инфраструктура
- **PostgreSQL 15**: основная реляционная БД
- **Redis 7**: кэширование, онлайн-статусы, pub/sub
- **MinIO**: S3-совместимое объектное хранилище (файлы)

## Потоки данных

### 1. Аутентификация
```
Client → POST /api/auth/login → AuthController(@Valid) → UserService → JWT tokens
```

### 2. Отправка сообщения
```
Client → WebSocket /app/chat.send → MessageService(@Transactional) → PostgreSQL
  → WebSocket /topic/chat.{chatId} → Other clients
```

### 3. Создание чата (IDOR-safe)
```
Client → POST /api/chats (JWT) → ChatController(@AuthenticationPrincipal)
  → ChatService(@Transactional) → Chat + UserChat(OWNER) → PostgreSQL
```

### 4. Загрузка файла
```
Client → POST /api/files/upload → FileController(Path Traversal check)
  → FileService → Local storage → PostgreSQL (metadata)
```

## Технологический стек

| Уровень | Технологии |
|---------|------------|
| Web-клиент | React, Webpack, Nginx |
| Desktop-клиент | JavaFX, FXML, CSS |
| Сервер | Java 17, Spring Boot 3.x, Spring MVC, WebSocket/STOMP |
| Валидация | Jakarta Validation, DTO, GlobalExceptionHandler |
| БД | PostgreSQL 15, JPA/Hibernate, Flyway |
| Кэш | Redis 7 |
| Файлы | MinIO (S3-совместимый) |
| Безопасность | JWT, Spring Security, BCrypt |
| Контейнеризация | Docker, Docker Compose |
| Оркестрация | Kubernetes, Helm |
| Сборка | Maven (server), npm (web-client) |