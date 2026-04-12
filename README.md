# Messenger — Платформа для обмена сообщениями в реальном времени

Полнофункциональная платформа для обмена сообщениями с сервером на Java Spring Boot, веб-клиентом на React и десктоп-клиентом JavaFX. Поддержка реального времени, обмена файлами, сквозного шифрования и аутентификации пользователей.

## Общая архитектура

- **Backend**: Java 17 + Spring Boot 3.x (Spring MVC)
- **Frontend**: Веб-клиент React + десктоп-клиент JavaFX
- **База данных**: PostgreSQL 15 с Flyway-миграциями
- **Кэш**: Redis 7 для онлайн-статусов, pub/sub
- **Хранилище файлов**: S3-совместимое (`localstack` в dev, внешний S3 в production) или `disk` (локальный/смонтированный диск)
- **Dev S3 стек**: `localstack` (MinIO исключен из актуального `docker-compose.yml`)
- **Реальное время**: WebSocket с протоколом STOMP
- **Аутентификация**: JWT (access + refresh токены) с ролевым доступом
- **Валидация**: Jakarta Validation (DTO с аннотациями @Valid)
- **Безопасность**: IDOR-защита (userId из JWT), Path Traversal-защита, CORS из конфигурации

## Функции

- Обмен сообщениями в реальном времени через WebSocket/STOMP
- JWT-аутентификация с обновлением токенов
- Вложения файлов с загрузкой/скачиванием
- Сквозное шифрование (AES) с визуальной индикацией уровня безопасности
- Отслеживание онлайн-статуса
- Контроль доступа на основе ролей (USER / ADMIN)
- Управление участниками чата и назначение модераторов
- Поддержка нескольких языков (EN, RU, ES)
- Swagger UI для документации API
- Автоматическая очистка устаревших данных (DataPurgeService)

## Структура проекта

```
messenger/
├── server/                     # Backend (Spring Boot)
│   ├── src/main/java/
│   │   ├── controller/         # REST-контроллеры
│   │   ├── dto/                # DTO с валидацией
│   │   ├── service/            # Бизнес-логика
│   │   ├── repository/         # JPA-репозитории
│   │   ├── config/             # Конфигурация (Security, WebSocket, CORS)
│   │   ├── model/              # JPA-сущности
│   │   └── security/           # JWT-фильтр, провайдер
│   ├── src/main/resources/
│   │   ├── application.yml     # Настройки приложения
│   │   └── db/migration/       # Flyway-миграции (V1–V6)
│   ├── Dockerfile
│   └── pom.xml
├── web-client/                 # Frontend (React)
│   ├── src/
│   │   ├── components/         # React-компоненты
│   │   └── i18n/               # Мультиязычность
│   ├── Dockerfile
│   └── package.json
├── client/                     # Desktop-клиент (JavaFX)
│   └── pom.xml
├── docker-compose.yml          # Оркестрация контейнеров
├── .env                        # Переменные окружения (не в git)
├── helm/                       # Helm-чарт для Kubernetes
└── k8s/                        # Kubernetes-манифесты
```

## Предварительные требования

- Docker & Docker Compose (основной способ запуска)
- Java 17 (для локальной разработки)
- Maven 3.8+ (для локальной разработки)

## Установка и запуск

### Docker Compose (рекомендуемый способ)

```bash
cd messenger

# Запуск всех сервисов одной командой
docker-compose up -d --build

# Проверка статуса
docker-compose ps

# Просмотр логов сервера
docker logs messenger-server -f
```

После запуска:
- **API сервер**: http://localhost:8080
- **Swagger UI**: http://localhost:8080/swagger-ui/index.html
- **Веб-клиент**: http://localhost:3001
- **LocalStack S3 endpoint**: http://localhost:4566

### Локальная разработка (без Docker)

1. Запустить инфраструктуру:
```bash
docker-compose up -d postgres redis localstack
```

2. Запустить сервер:
```bash
cd server
mvn spring-boot:run
```

3. Запустить веб-клиент:
```bash
cd web-client
npm install && npm start
```

### Kubernetes (Helm)

```bash
helm repo add bitnami https://charts.bitnami.com/bitnami
helm repo update
helm install messenger ./helm
```

## Конфигурация

### Переменные окружения (.env)

| Переменная | Описание | По умолчанию |
|-----------|----------|-------------|
| `POSTGRES_DB` | Имя базы данных | messenger |
| `POSTGRES_USER` | Пользователь БД | postgres |
| `POSTGRES_PASSWORD` | Пароль БД | postgres |
| `STORAGE_PROVIDER` | Провайдер хранилища (`s3` или `disk`) | s3 |
| `STORAGE_DISK_PATH` | Путь внутри контейнера для `disk` режима | /data/uploads |
| `S3_ENDPOINT` | S3 endpoint (dev: LocalStack) | http://localhost:4566 |
| `S3_ACCESS_KEY` | S3 access key | test |
| `S3_SECRET_KEY` | S3 secret key | test |
| `S3_BUCKET_NAME` | Имя бакета | messenger-files |
| `S3_AUTO_CREATE_BUCKET` | Автосоздание бакета (`true/false`) | true |
| `JWT_SECRET` | Секрет JWT | (из application.yml) |

### Миграции базы данных

Flyway управляет миграциями автоматически. Файлы миграций: `server/src/main/resources/db/migration/V[N]__[description].sql`.

| Миграция | Описание |
|----------|----------|
| V1 | Создание таблиц (users, chats, messages, files, user_settings) |
| V2 | Добавление admin-пользователя |
| V3 | LDAP-настройки |
| V4 | Политики безопасности |
| V5 | Поля шифрования (encrypted, encryption_key, encryption_algorithm, security_level) |
| V6 | Таблицы файлов и связей message_files |

## Конечные точки API

### Аутентификация
| Метод | Путь | Описание | Auth |
|-------|------|----------|------|
| POST | `/api/auth/register` | Регистрация пользователя | ❌ |
| POST | `/api/auth/login` | Вход пользователя | ❌ |
| POST | `/api/auth/refresh` | Обновление токена | ❌ |

### Чаты (userId извлекается из JWT)
| Метод | Путь | Описание | Auth |
|-------|------|----------|------|
| GET | `/api/chats` | Чаты текущего пользователя | ✅ |
| POST | `/api/chats` | Создать чат | ✅ |
| GET | `/api/chats/{chatId}` | Получить чат по ID | ✅ |
| POST | `/api/chats/{chatId}/members` | Добавить участника | ✅ |
| DELETE | `/api/chats/{chatId}/members/{userId}` | Удалить участника | ✅ |
| PUT | `/api/chats/{chatId}/type` | Изменить тип чата | ✅ |
| PUT | `/api/chats/{chatId}/encryption` | Настройки шифрования | ✅ |
| PUT | `/api/chats/{chatId}/moderator` | Назначить модератора | ✅ |

### Сообщения (senderId извлекается из JWT)
| Метод | Путь | Описание | Auth |
|-------|------|----------|------|
| GET | `/api/messages/chat/{chatId}` | Сообщения чата | ✅ |
| POST | `/api/messages/create` | Отправить сообщение | ✅ |

### Файлы
| Метод | Путь | Описание | Auth |
|-------|------|----------|------|
| POST | `/api/files/upload` | Загрузить файл | ✅ |
| GET | `/api/files/{fileId}` | Скачать файл | ✅ |

Правила доступа к файлам:

- `ADMIN` может скачать любой файл.
- Владелец (`uploaded_by`) может скачать свой файл даже без привязки к сообщению.
- Остальные пользователи получают доступ только если файл прикреплен к сообщению в чате, где они состоят.

### WebSocket
| Путь | Описание |
|------|----------|
| `/ws` | Точка подключения WebSocket |
| `/app/chat.send` | Отправка сообщения |
| `/app/chat.join` | Присоединение к чату |
| `/app/chat.leave` | Выход из чата |
| `/user/queue/messages` | Приватные сообщения |
| `/topic/chat.{chatId}` | Сообщения чата |

## Безопасность

- JWT-токены с access/refresh механизмом
- IDOR-защита: userId/senderId извлекаются из JWT (`@AuthenticationPrincipal`)
- Path Traversal защита в FileController
- Валидация входных данных через DTO (@Valid, @NotBlank, @Size, @Email)
- GlobalExceptionHandler для унифицированных ответов об ошибках
- CORS из конфигурации (не wildcard)
- WebSocket origins из конфигурации
- Пароли хешируются BCrypt
- Транзакционность (@Transactional) в сервисном слое
- SLF4J-логирование (без System.err)
- Креды в .env, не в docker-compose.yml

## Мониторинг

- Spring Actuator: `/actuator/health`, `/actuator/info`
- Swagger UI: `/swagger-ui/index.html`
- Структурированное логирование через SLF4J

## Учётные данные по умолчанию

| Сервис | Логин | Пароль |
|--------|-------|--------|
| Приложение (admin) | admin | admin123 |
| PostgreSQL | postgres | postgres |
| LocalStack (S3 dev) | test | test |

## Storage and Build Notes

Подробные инструкции по Maven Wrapper и выбору хранилища (`disk`/`s3`) находятся в:

- `docs/STORAGE_AND_BUILD.md`
- `docker-compose.override.yml.example` (пример для Linux и смонтированного диска)
