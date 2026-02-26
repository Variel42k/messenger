# Инструкции по тестированию Messenger

## Подготовка

### Требования
- Docker & Docker Compose (основной способ)
- Java 17 + Maven 3.8+ (для локальной разработки)

## Запуск с Docker (рекомендуемый)

```bash
cd messenger

# Запуск всех сервисов
docker-compose up -d --build

# Проверка запуска
docker-compose ps
docker logs messenger-server --tail 30

# Ожидание строки "Started MessengerApplication in X seconds"
```

Сервисы после запуска:
- API: http://localhost:8080
- Swagger UI: http://localhost:8080/swagger-ui/index.html
- Web-client: http://localhost:3001
- MinIO Console: http://localhost:9001

## Тестирование API (curl)

### 1. Регистрация
```bash
curl -X POST http://localhost:8080/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","email":"test@example.com","password":"Strong1!"}'
```

### 2. Вход
```bash
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","password":"Strong1!"}'
# → {"accessToken":"...", "refreshToken":"...", "tokenType":"Bearer"}
```

### 3. Создание чата (userId из JWT)
```bash
TOKEN="<accessToken из шага 2>"

curl -X POST http://localhost:8080/api/chats \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Chat","type":"GROUP"}'
```

### 4. Получение чатов (userId из JWT)
```bash
curl -X GET http://localhost:8080/api/chats \
  -H "Authorization: Bearer $TOKEN"
```

### 5. Отправка сообщения (senderId из JWT)
```bash
curl -X POST "http://localhost:8080/api/messages/create?chatId=1&content=Hello" \
  -H "Authorization: Bearer $TOKEN"
```

### 6. Получение сообщений
```bash
curl -X GET http://localhost:8080/api/messages/chat/1 \
  -H "Authorization: Bearer $TOKEN"
```

### 7. Обновление токена
```bash
curl -X POST http://localhost:8080/api/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{"refreshToken":"<refreshToken из шага 2>"}'
```

### 8. Валидация (ожидается 400)
```bash
curl -X POST http://localhost:8080/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"x","email":"bad","password":"1"}'
# → 400 {"errors":{"username":"...","email":"...","password":"..."},"message":"Validation failed"}
```

## Тестирование функциональности

### Аутентификация
1. Зарегистрировать пользователя → ожидать 200
2. Войти → получить access+refresh токены
3. Отправить запрос с невалидными данными → ожидать 400
4. Войти с неверным паролем → ожидать 401

### Чаты
1. Создать чат → проверить id, name в ответе
2. Получить чаты → проверить список (userId из JWT, не из параметра)
3. Добавить/удалить участника

### Сообщения
1. Отправить сообщение → проверить id, content
2. Получить сообщения чата → проверить список

### Безопасность
1. Запрос без токена на защищённый endpoint → 401/403
2. Swagger UI без токена → 200 (открытый)
3. Невалидный JWT → 401

## Логи

```bash
# Логи сервера
docker logs messenger-server -f

# Логи БД
docker logs messenger-postgres --tail 20

# Все логи
docker-compose logs -f
```

## Остановка

```bash
# Остановка без удаления данных
docker-compose down

# Полная очистка (с удалением данных)
docker-compose down -v
```