# Messenger - Платформа для полнодуплексного обмена сообщениями

Это полноценная платформа для обмена сообщениями в реальном времени с сервером на Java Spring Boot, клиентом JavaFX и веб-клиентом, поддерживающая обмен сообщениями в реальном времени, обмен файлами и аутентификацию пользователей.

## Общая архитектура

- **Backend**: Java 17 + Spring Boot 3.x с WebFlux (реактивный)
- **Frontend**: Desktop-клиент JavaFX (с опциональным веб-клиентом)
- **База данных**: PostgreSQL для основного хранения данных
- **Кэш**: Redis для онлайн-статусов, распределенных блокировок, pub/sub
- **Хранилище файлов**: RustFS (совместимое с S3) для вложений
- **Реальное время**: WebSocket с протоколом STOMP
- **Аутентификация**: JWT (токены доступа и обновления) с ролевым доступом

## Функции

- Обмен сообщениями в реальном времени через WebSocket/STOMP
- Аутентификация на основе JWT с процессом обновления токенов
- Вложения файлов с потоковой передачей загрузки/скачивания
- Отслеживание онлайн-статуса
- Подтверждения доставки сообщений
- Контроль доступа на основе ролей (пользователь/администратор)
- Распределенная архитектура с Redis pub/sub
- Поддержка нескольких языков (Английский, Русский, Испанский)
- Раздел справки с инструкциями по настройке
- Веб-клиент с интеграцией React и WebSocket

## Структура проекта

```
messenger/
├── server/
│   ├── src/main/java/
│   │   ├── controller/
│   │   ├── service/
│   │   ├── repository/
│   │   ├── config/
│   │   ├── model/
│   │   └── security/
│   ├── src/main/resources/
│   │   ├── application.yml
│   │   ├── db/migration/
│   │   └── static/
│   └── pom.xml
├── client/          # Desktop-клиент JavaFX
│   ├── src/main/java/
│   ├── src/main/resources/
│   │   ├── fxml/
│   │   └── css/
│   └── pom.xml
├── web-client/      # Веб-клиент на React
│   ├── src/
│   │   ├── components/
│   │   ├── i18n/
│   │   └── App.js
│   ├── public/
│   ├── package.json
│   └── webpack.config.js
├── docker-compose.yml
├── Dockerfile
├── k8s/
│   └── manifests.yml
└── README.md
```

```

## Предварительные требования

- Java 17
- Docker & Docker Compose
- Maven 3.8+

## Установка и запуск

### Локальный запуск с помощью Docker Compose

1. Запустить инфраструктурные сервисы:
```bash
docker-compose up -d
```

2. Собрать и запустить сервер:
```bash
cd server
mvn clean install
mvn spring-boot:run
```

3. Собрать и запустить JavaFX клиент:
```bash
cd client
mvn clean install
mvn javafx:run
```

4. Собрать и запустить веб-клиент:
```bash
cd web-client
npm install
npm start
```

### Запуск в Kubernetes с помощью Helm

1. Установить Helm chart:
```bash
# Добавить репозитории для зависимостей
helm repo add bitnami https://charts.bitnami.com/bitnami
helm repo update

# Установить chart
helm install messenger ./helm
```

2. Для настройки параметров развертывания создайте собственный values файл:
```bash
# Создать файл настроек
cat <<EOF > my-values.yaml
# Настройки репликации
replicaCount: 1

# Настройки ресурсов
resources:
  limits:
    cpu: 500m
    memory: 1Gi
  requests:
    cpu: 250m
    memory: 512Mi

# Настройки базы данных
postgresql:
  auth:
    postgresPassword: "mypass"
    database: "messenger"

# Настройки Redis
redis:
  auth:
    enabled: false

# Настройки MinIO
minio:
  auth:
    rootUser: "minioadmin"
    rootPassword: "minioadmin"

# Настройки JWT
env:
  JWT_SECRET: "your-secure-jwt-secret"
EOF

# Установить с настройками
helm install messenger ./helm -f my-values.yaml
```

3. Для обновления развертывания:
```bash
helm upgrade messenger ./helm -f my-values.yaml
```

4. Для удаления:
```bash
helm uninstall messenger
```

### Продуктовое развертывание

1. Собрать Docker-образы:
```bash
mvn clean install
docker build -t messenger-server .
```

2. Развернуть с помощью Kubernetes:
```bash
kubectl apply -f k8s/manifests.yml
```

## Конфигурация

### Переменные окружения

- `DB_HOST`: Хост PostgreSQL (по умолчанию: localhost)
- `DB_PORT`: Порт PostgreSQL (по умолчанию: 5432)
- `DB_NAME`: Имя базы данных (по умолчанию: messenger)
- `REDIS_HOST`: Хост Redis (по умолчанию: localhost)
- `RUSTFS_ENDPOINT`: Совместимая с S3 конечная точка RustFS
- `JWT_SECRET`: Секретный ключ для подписи JWT
- `JWT_ACCESS_TOKEN_EXPIRATION`: Время жизни токена доступа (по умолчанию: 15м)
- `JWT_REFRESH_TOKEN_EXPIRATION`: Время жизни токена обновления (по умолчанию: 7д)

### Миграция базы данных

Flyway используется для миграций базы данных. Новые миграции должны добавляться в `server/src/main/resources/db/migration/` в формате `V[version]__[description].sql`.

## Конечные точки API

### REST API
- `POST /api/auth/login` - Вход пользователя
- `POST /api/auth/register` - Регистрация пользователя
- `POST /api/auth/refresh` - Обновление токена
- `GET /api/users/me` - Получить текущего пользователя
- `GET /api/chats` - Получить чаты пользователя
- `GET /api/messages/{chatId}` - Получить сообщения чата
- `POST /api/files/upload` - Загрузить файл с предварительно подписанным URL
- `GET /api/files/{fileId}` - Скачать файл

### WebSocket конечные точки
- `/ws` - Конечная точка подключения WebSocket
- `/app/chat.send` - Отправить сообщение
- `/app/chat.join` - Присоединиться к чату
- `/app/chat.leave` - Покинуть чат
- `/user/queue/messages` - Приватные сообщения пользователя
- `/topic/chat.{chatId}` - Широковещательные сообщения чата

## Безопасность

- JWT токены для аутентификации
- HTTPS/WSS для безопасной связи
- CORS настроен для веб-клиента
- Реализовано ограничение скорости запросов
- Учетные данные S3 должным образом защищены
- Следование рекомендациям безопасности OWASP

## Мониторинг

- Spring Actuator для проверки состояния и метрик
- Структурированный JSON-логгинг
- Интеграция с Prometheus для сбора метрик
- Предопределенная конфигурация панели Grafana

## Тестирование

- Модульные тесты для сервисов и репозиториев
- Интеграционные тесты для контроллеров
- Нагрузочное тестирование WebSocket сценарием JMeter/Locust
- Тесты безопасности для процесса аутентификации

## Рекомендации по масштабированию

- Использовать sticky-сессии или stateless-WebSocket с Redis pub/sub
- Разделение таблицы сообщений по дате/пользователю
- Репликация и стратегия резервного копирования PostgreSQL
- Redis Sentinel/Cluster для высокой доступности
- Горизонтальное масштабирование подов в Kubernetes

## Замена RustFS на MinIO/AWS S3

Для переключения с RustFS на MinIO или AWS S3:

1. Обновите конечную точку S3 в `application.yml`:
```yaml
s3:
  endpoint: "https://s3.amazonaws.com" # Для AWS S3
  # или
  endpoint: "http://minio:9000" # Для MinIO
```

2. Обновите учетные данные соответствующим образом в переменных окружения или конфигурации
3. Совместимый с S3 API означает, что изменения в коде не требуются

## Известные замечания по безопасности

- Регулярно отслеживайте CVE и патчи безопасности для RustFS
- Обеспечьте правильную изоляцию сети для внутренних сервисов
- Регулярные аудиты безопасности реализации JWT
- Безопасная обработка токенов обновления в Redis