# Disk storage

Этот документ описывает использование локального или выделенного диска для uploads в Messenger.

## Чем S3 storage отличается от disk storage

S3 storage хранит загруженные файлы в S3-compatible object storage: AWS S3, MinIO, Ceph, Wasabi или LocalStack для разработки. Это предпочтительный production-вариант, если доступны object storage, lifecycle policies и независимые backups.

Disk storage хранит загруженные файлы на файловой системе, смонтированной в backend-контейнеры по пути `/data/uploads`. Это проще, но ответственность за диск, backup и восстановление полностью лежит на администраторе сервера.

## Когда использовать disk storage

Используйте disk storage, если:

- установка небольшая или single-node;
- есть надёжный persistent disk;
- настроен регулярный backup диска;
- не нужны object storage lifecycle policies;
- понятен процесс совместного восстановления PostgreSQL и файлов.

Используйте S3-compatible storage, если нужны масштабирование, managed durability или multi-node deployment.

## Риски disk storage

- отказ диска может уничтожить загруженные файлы;
- повреждение файловой системы может затронуть все uploads;
- backups базы и файлов должны быть согласованы для восстановления;
- случайное форматирование, отмонтирование или удаление mount point может привести к потере данных;
- bind mount на пустую директорию может создать впечатление, что существующие данные volume исчезли.

## Как выбрать диск

Лучше использовать выделенный диск, не занятый ОС. Не используйте раздел с данными без проверенного backup.

Посмотреть диски:

```bash
lsblk -o NAME,SIZE,TYPE,FSTYPE,MOUNTPOINT,MODEL
```

Ищите устройство без mount point, например `/dev/sdb`. В cloud-средах имена устройств могут измениться после reboot, поэтому в `/etc/fstab` нужно использовать UUID.

## Как создать файловую систему

Форматирование уничтожает данные. Сначала перепроверьте имя устройства.

```bash
sudo mkfs.ext4 -F /dev/sdb
```

Или XFS:

```bash
sudo mkfs.xfs -f /dev/sdb
```

Скрипт управления не форматирует диск без `--force` и отдельного подтверждения:

```bash
./scripts/messengerctl.sh disk-install --device /dev/sdb --mount-point /srv/messenger/uploads --fs ext4 --force
```

## Как смонтировать диск

Ручной mount:

```bash
sudo mkdir -p /srv/messenger/uploads
sudo mount /dev/sdb /srv/messenger/uploads
findmnt /srv/messenger/uploads
```

## Как добавить запись в `/etc/fstab`

Получить UUID:

```bash
sudo blkid /dev/sdb
```

Добавить строку:

```text
UUID=<uuid> /srv/messenger/uploads ext4 defaults,nofail 0 2
```

Проверить:

```bash
sudo mount -a
findmnt /srv/messenger/uploads
```

## Как подключить mount point в Docker Compose

Безопасный вариант в проекте - отдельный файл `docker-compose.disk.yml`:

```yaml
services:
  server:
    volumes:
      - /srv/messenger/uploads:/data/uploads
  worker:
    volumes:
      - /srv/messenger/uploads:/data/uploads
```

Такой подход не перезаписывает пользовательский `docker-compose.override.yml`.

Ручной запуск:

```bash
docker compose -f docker-compose.yml -f docker-compose.disk.yml up -d
```

Скрипт `scripts/messengerctl.sh` автоматически подключает `docker-compose.disk.yml`, если файл существует.

Настройки `.env`:

```dotenv
STORAGE_PROVIDER=disk
STORAGE_DISK_PATH=/data/uploads
```

## Как безопасно отключить диск

Используйте скрипт:

```bash
./scripts/messengerctl.sh disk-remove --mount-point /srv/messenger/uploads
```

Ручная последовательность:

```bash
./scripts/messengerctl.sh backup
docker compose stop
sudo umount /srv/messenger/uploads
```

После этого закомментируйте соответствующую строку в `/etc/fstab`. Не форматируйте диск.

## Как избежать потери данных

- Всегда запускайте `./scripts/messengerctl.sh backup` перед изменениями диска.
- Проверяйте архив через `tar -tzf`.
- Проверяйте mount через `findmnt`.
- Храните backup PostgreSQL и uploads за близкий момент времени.
- Ведите учёт дисков в инфраструктурной документации.
- Не считайте непустую директорию mount point доказательством, что диск смонтирован.

## Что нельзя делать без backup

- Не запускайте `mkfs.*` на диске, где могут быть uploads.
- Не удаляйте Docker volumes через `docker compose down -v`.
- Не удаляйте `/srv/messenger/uploads` рекурсивно.
- Не меняйте `docker-compose.disk.yml` на новый пустой host path без миграции данных.
- Не восстанавливайте database dump от одного момента времени вместе с файлами от другого момента, если не принимаете риск битых ссылок на файлы.
