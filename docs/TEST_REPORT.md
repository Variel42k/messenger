# Отчёт о проверке работоспособности Messenger

- Дата проверки: **2026-04-12**
- Режим развёртывания: **Docker Compose + LocalStack (локальный S3)**
- Репозиторий: `messenger`

## 1. Окружение проверки

- Docker Engine: `27.0.3`
- Docker Compose: `v2.28.1-desktop.1`
- Запущенные сервисы:
  - `messenger-postgres`
  - `messenger-redis`
  - `messenger-localstack` (status: healthy)
  - `messenger-server`
  - `messenger-web-client`

## 2. Результаты автоматизированных тестов backend

Команда:

```powershell
cd server
.\mvnw.cmd test
```

Результат:

- `BUILD SUCCESS`
- тестов выполнено: **18**
- падений: **0**
- ошибок: **0**

## 3. Результаты интеграционного smoke-теста

Проверки выполнялись на поднятом `docker compose` окружении.

### 3.1 Доступность сервисов

- `GET http://localhost:8080/actuator/health` -> `200`
- `GET http://localhost:8080/swagger-ui/index.html` -> `200`
- `GET http://localhost:3001` -> `200`

### 3.2 Базовые API-сценарии

Проверено успешно:

1. Регистрация пользователя (`/api/auth/register`)
2. Логин и получение access token (`/api/auth/login`)
3. Создание чата (`/api/chats`)
4. Отправка сообщения (`/api/messages/create`)
5. Получение сообщений чата (`/api/messages/chat/{chatId}`)
6. Загрузка файла (`/api/files/upload`)
7. Скачивание файла (`/api/files/{fileId}`)

Фактические идентификаторы прогона:

- `chatId=1`
- `messageId=1`
- `fileId=1`

### 3.3 Проверка локального S3 (LocalStack)

Команда:

```powershell
docker exec messenger-localstack awslocal s3api list-objects-v2 --bucket messenger-files --query "Contents[].Key" --output json
```

Результат: в бакете обнаружен загруженный объект, например:

```json
[
  "ab1a76a4-e118-489f-a50c-b2093cc177e4.txt"
]
```

Это подтверждает, что upload действительно работает через локальное S3-хранилище.

## 4. Итог

Текущая версия Messenger **работоспособна** в основном сценарии развёртывания:

- backend и web-клиент доступны
- ключевые API-функции работают
- файловые операции корректно интегрированы с **LocalStack S3**

Рекомендация: использовать `docs/TESTING_INSTRUCTIONS.md` как основной пошаговый регламент регрессионной проверки после изменений backend/storage.
