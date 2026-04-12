# Сборка и выбор хранилища (S3 / Disk)

## 1. Maven Wrapper

В репозитории добавлен Maven Wrapper, поэтому локально можно запускать сервер без отдельной установки Maven.
Рекомендуемая версия JDK для проекта: **17**.

- Linux/macOS:

```bash
cd server
./mvnw spring-boot:run
```

- Windows:

```powershell
cd server
.\mvnw.cmd spring-boot:run
```

Проверка версии:

```bash
./mvnw -v
```

## 2. Выбор провайдера хранилища

Сервер поддерживает два режима:

- `STORAGE_PROVIDER=disk` - локальная файловая система (смонтированный диск).
- `STORAGE_PROVIDER=s3` - S3-совместимое хранилище.

Основные переменные:

| Переменная | Описание |
|---|---|
| `STORAGE_PROVIDER` | `disk` или `s3` |
| `STORAGE_DISK_PATH` | Путь для файлов внутри контейнера при `disk` |
| `S3_ENDPOINT` | Endpoint S3 API |
| `S3_ACCESS_KEY` | Access key |
| `S3_SECRET_KEY` | Secret key |
| `S3_BUCKET_NAME` | Имя бакета |
| `S3_REGION` | Регион S3 |
| `S3_PATH_STYLE_ACCESS_ENABLED` | `true/false` для path-style |
| `S3_AUTO_CREATE_BUCKET` | Автосоздание бакета (`true/false`) |

## 3. Docker Compose: режимы запуска

### По умолчанию (S3)

`docker-compose.yml` использует `localstack` для dev-режима S3.
MinIO больше не используется в актуальной конфигурации.

```bash
docker compose up -d --build
```

Если ранее запускался старый compose со службой `minio`, очистить orphan-контейнеры:

```bash
docker compose up -d --remove-orphans
```

### Linux: хранение на смонтированном диске

В репозитории добавлен шаблон:

- `docker-compose.override.yml.example`

Инструкция:

```bash
cp docker-compose.override.yml.example docker-compose.override.yml
sudo mkdir -p /mnt/messenger/uploads
sudo chown -R 1000:1000 /mnt/messenger/uploads
docker compose up -d --build
```

В этом сценарии сервер работает с:

- `STORAGE_PROVIDER=disk`
- `STORAGE_DISK_PATH=/data/uploads-host`
- bind mount `/mnt/messenger/uploads:/data/uploads-host`

## 4. Продакшен S3

Для production рекомендуется внешний S3 (AWS S3, Ceph, Wasabi и т.д.) и значения:

- `STORAGE_PROVIDER=s3`
- `S3_AUTO_CREATE_BUCKET=false`
- отдельные IAM credentials с минимально необходимыми правами.
