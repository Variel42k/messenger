# Инструкции по тестированию Messenger (основной сценарий с локальным S3)

Документ описывает проверку работоспособности Messenger в локальном окружении с **LocalStack S3**.

## 1. Что проверяем

- запуск всех сервисов через Docker Compose
- доступность backend, Swagger и web-клиента
- базовые API-сценарии:
  - регистрация
  - вход
  - создание чата
  - отправка и чтение сообщений
  - загрузка/скачивание файла
- факт сохранения файла в локальном S3 (LocalStack)

## 2. Предварительные требования

- Docker + Docker Compose
- PowerShell 5.1+ (для скрипта ниже)

Проверка:

```powershell
docker version
docker compose version
```

## 3. Подготовка окружения

В корне репозитория выполните:

```powershell
docker compose up -d --build
docker compose ps
```

Убедитесь, что сервисы запущены:

- `messenger-postgres`
- `messenger-redis`
- `messenger-localstack`
- `messenger-server`
- `messenger-web-client`

И что у LocalStack статус `healthy`.

## 4. Проверка доступности endpoint’ов

```powershell
curl.exe -sS -o NUL -w "%{http_code}`n" http://localhost:8080/actuator/health
curl.exe -sS -o NUL -w "%{http_code}`n" http://localhost:8080/swagger-ui/index.html
curl.exe -sS -o NUL -w "%{http_code}`n" http://localhost:3001
```

Ожидается `200` для всех трёх URL.

## 5. Smoke-тест API + проверка Local S3

Запустите в PowerShell:

```powershell
$ErrorActionPreference='Stop'
$base='http://localhost:8080'
$ts=Get-Date -Format 'yyyyMMddHHmmss'
$username="smoke_$ts"
$email="$username@example.com"
$password='StrongPass123'

$regBody = @{ username=$username; email=$email; password=$password } | ConvertTo-Json
Invoke-RestMethod -Method Post -Uri "$base/api/auth/register" -ContentType 'application/json' -Body $regBody | Out-Null

$loginBody = @{ username=$username; password=$password } | ConvertTo-Json
$login = Invoke-RestMethod -Method Post -Uri "$base/api/auth/login" -ContentType 'application/json' -Body $loginBody
$token = $login.accessToken
if(-not $token){ throw 'No access token from login' }
$headers=@{ Authorization = "Bearer $token" }

$chatBody = @{ name = "Smoke Chat $ts"; type = 'GROUP' } | ConvertTo-Json
$chat = Invoke-RestMethod -Method Post -Uri "$base/api/chats" -Headers $headers -ContentType 'application/json' -Body $chatBody
$chatId = $chat.id
if(-not $chatId){ throw 'Chat was not created' }

$message = Invoke-RestMethod -Method Post -Uri "$base/api/messages/create?chatId=$chatId&content=hello-smoke-$ts" -Headers $headers
if(-not $message.id){ throw 'Message was not created' }

Invoke-RestMethod -Method Get -Uri "$base/api/messages/chat/$chatId" -Headers $headers | Out-Null

$tempFile = Join-Path $env:TEMP "smoke-$ts.txt"
"smoke-file-$ts" | Set-Content -Path $tempFile -Encoding UTF8

$uploadTmp = New-TemporaryFile
try {
  $uploadStatus = & curl.exe -sS -o $uploadTmp.FullName -w '%{http_code}' -X POST -H "Authorization: Bearer $token" -F "file=@$tempFile;type=text/plain" "$base/api/files/upload?chatId=$chatId"
  $uploadBody = Get-Content -Path $uploadTmp.FullName -Raw
} finally {
  Remove-Item -Path $uploadTmp.FullName -Force -ErrorAction SilentlyContinue
}
if([int]$uploadStatus -ne 200){ throw "Upload failed: HTTP $uploadStatus BODY $uploadBody" }
$upload = $uploadBody | ConvertFrom-Json
$fileId = $upload.fileId
if(-not $fileId){ throw 'No fileId in upload response' }

$downloadPath = Join-Path $env:TEMP "smoke-down-$ts.txt"
$downloadStatus = & curl.exe -sS -o $downloadPath -w '%{http_code}' -H "Authorization: Bearer $token" "$base/api/files/$fileId"
if([int]$downloadStatus -ne 200){ throw "Download failed: HTTP $downloadStatus" }
$downloadText = Get-Content -Path $downloadPath -Raw
if($downloadText -notmatch "smoke-file-$ts"){ throw 'Downloaded file content mismatch' }

$s3Keys = docker exec messenger-localstack awslocal s3api list-objects-v2 --bucket messenger-files --query "Contents[].Key" --output json
if(-not $s3Keys){ throw 'Unable to read objects from LocalStack S3' }

Write-Host "Smoke test passed."
Write-Host "chatId=$chatId messageId=$($message.id) fileId=$fileId"
Write-Host "S3 keys: $s3Keys"
```

Ожидаемый результат:

- скрипт завершается без ошибок
- получены `chatId`, `messageId`, `fileId`
- в `S3 keys` присутствует хотя бы один ключ объекта

## 6. Негативные проверки (рекомендуются)

### 6.1 Доступ без токена

```powershell
curl.exe -sS -o NUL -w "%{http_code}`n" http://localhost:8080/api/chats
```

Ожидается: `401` или `403`.

### 6.2 Ошибка валидации регистрации

```powershell
curl.exe -sS -X POST http://localhost:8080/api/auth/register `
  -H "Content-Type: application/json" `
  -d "{`"username`":`"x`",`"email`":`"bad`",`"password`":`"1`"}"
```

Ожидается: `400`.

## 7. Диагностика при сбоях

```powershell
docker compose ps
docker logs messenger-server --tail 200
docker logs messenger-localstack --tail 200
docker logs messenger-postgres --tail 100
docker logs messenger-redis --tail 100
```

Что проверять в первую очередь:

- есть ли `Started MessengerApplication` в логе backend
- healthy ли LocalStack
- корректен ли `S3_ENDPOINT`:
  - `http://localstack:4566` для контейнера backend
  - `http://localhost:4566` при запуске backend с хоста

## 8. Остановка и очистка

Остановить без удаления данных:

```powershell
docker compose down
```

Полная очистка (включая volumes):

```powershell
docker compose down -v
```
