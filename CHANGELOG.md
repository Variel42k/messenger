# Changelog

Все значимые изменения проекта документируются в этом файле.

## [1.1.0] — 2026-02-27

### Безопасность
- **IDOR-защита**: userId/senderId извлекаются из JWT (`@AuthenticationPrincipal`) вместо query-параметров
- **Path Traversal**: добавлена проверка `filePath.startsWith(uploadDir)` в FileController
- **Валидация**: DTO с Jakarta Validation (`@Valid`, `@NotBlank`, `@Size`, `@Email`)
- **GlobalExceptionHandler**: ошибки валидации возвращают HTTP 400 с деталями
- **CORS**: origins из `application.yml` вместо wildcard `*`
- **WebSocket origins**: из конфигурации вместо wildcard
- **Креды**: вынесены из docker-compose.yml в `.env`
- **JWT secret**: тестовый ключ увеличен до 256+ бит

### Архитектура
- **@Transactional**: добавлен на все мутирующие методы ChatService/MessageService
- **SLF4J Logger**: заменены все `System.err.println` на SLF4J
- **Constructor injection**: используется вместо `@Autowired` (FileService, SecurityPoliciesController)
- **DTO слой**: 5 DTO в отдельном пакете `com.messenger.dto`
- **JSON escape**: `Map.of()` вместо строковой конкатенации в LdapSettingsController

### Конфигурация
- **ddl-auto**: `update` → `validate` (Hibernate не меняет схему, Flyway управляет)
- **validate-on-migrate**: включен для проверки миграций
- **Swagger**: добавлен в `permitAll()` (доступен без JWT)

### API изменения
- `GET /api/messages/{chatId}` → `GET /api/messages/chat/{chatId}`
- `POST /api/messages` → удалён (использовать `POST /api/messages/create`)
- `GET /api/chats` — userId из JWT, query-параметр необязателен
- `POST /api/chats` — userId из JWT, тело запроса через DTO

### Удалено
- Зависимость `reactor-test` из pom.xml (проект не использует WebFlux)
- Закомментированный сервис `client` из docker-compose.yml
- Inline DTO классы из AuthController (вынесены в `dto/`)

### Документация
- Обновлены все 10 md-файлов (WebFlux→MVC, RustFS→MinIO, актуальные API)
- Создан CHANGELOG.md, STATUS.md, TODO.md

### Исправления
- Правильный bcrypt-хеш для admin-пользователя в V2-миграции

---

## [1.0.0] — 2026-02-19

### Добавлено
- Серверная часть на Spring Boot 3.x
- JWT-аутентификация (access + refresh токены)
- WebSocket/STOMP для сообщений реального времени
- PostgreSQL 15 с Flyway-миграциями (V1–V6)
- Redis для кэширования и pub/sub
- MinIO (S3-совместимое хранилище файлов)
- Сквозное шифрование сообщений (AES)
- Веб-клиент React (порт 3001)
- Десктоп-клиент JavaFX
- Docker Compose оркестрация (5 контейнеров)
- Kubernetes Helm-чарт
- LDAP-интеграция (настройки)
- Политики безопасности (DataPurgeService)
- Мультиязычность (EN, RU, ES)
- Swagger UI
