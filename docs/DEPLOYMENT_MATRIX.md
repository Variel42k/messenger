# Матрица развертывания

Документ сравнивает поддерживаемые пути запуска Messenger: Docker Compose, Podman Compose и Kubernetes Helm. Все команды предполагают запуск из корня репозитория.

## Как выбрать runtime

```mermaid
flowchart TD
    A[Нужно развернуть Messenger] --> B{Один сервер?}
    B -->|Да| C{Нужен rootless/Podman policy?}
    C -->|Да| D[Podman Compose]
    C -->|Нет| E[Docker Compose]
    B -->|Нет, нужен кластер| F[Kubernetes Helm]
    D --> G[./scripts/messengerctl.sh install --runtime podman --profile production]
    E --> H[./scripts/messengerctl.sh install --runtime docker --profile production]
    F --> I[./scripts/messengerctl.sh install --runtime kubernetes --namespace messenger --release messenger]
```

## Сравнение

| Критерий | Docker Compose | Podman Compose | Kubernetes Helm |
| --- | --- | --- | --- |
| Основной сценарий | single-host dev/prod-like | single-host prod/rootless-friendly | multi-node/cluster |
| Production template | `docker-compose.production.yml.example` | `podman-compose.production.yml.example` | `helm/values-production.example.yaml` |
| Запуск через скрипт | `--runtime docker` | `--runtime podman` | `--runtime kubernetes` |
| Reverse proxy | host Nginx/Caddy | host Nginx/Caddy | Ingress |
| Storage | Docker volumes, bind mount, S3 | Podman volumes, bind mount, S3 | PVC/external DB/Redis/S3 |
| Disk operations | `disk-*` commands | `disk-*` commands | через StorageClass/PV, не через host disk commands |
| Federation inventory | `deploy/federation/*.yml` | `deploy/federation/*.yml` | Helm values + inventory |
| Rollback | backup + previous compose/images | backup + previous compose/images | `helm rollback` + backup restore |

## Общий граф deployment

```mermaid
flowchart LR
    Admin[Администратор] --> CLI[messengerctl.sh]
    CLI --> Docker[Docker Compose]
    CLI --> Podman[Podman Compose]
    CLI --> Helm[Helm/Kubernetes]
    Docker --> App1[server + worker + web-client]
    Podman --> App2[server + worker + web-client]
    Helm --> App3[Deployment + Service + Ingress]
    App1 --> PG[(PostgreSQL)]
    App1 --> Redis[(Redis)]
    App1 --> S3[(S3/MinIO)]
    App2 --> PG
    App2 --> Redis
    App2 --> S3
    App3 --> PG
    App3 --> Redis
    App3 --> S3
```

## Flow установки

```mermaid
flowchart TD
    A[install] --> B[detect_project_dir]
    B --> C[runtime-doctor]
    C --> D{runtime}
    D -->|docker| E[docker compose build/up]
    D -->|podman| F[podman compose build/up]
    D -->|kubernetes| G[helm upgrade --install]
    E --> H[health checks]
    F --> H
    G --> I[kubectl/helm status]
    H --> J[URL сервисов]
```

## Flow backup/restore

```mermaid
flowchart TD
    A[backup] --> B[pg_dump PostgreSQL]
    B --> C[archive files_data/uploads]
    C --> D[archive redis_data/localstack_data]
    D --> E[copy compose/env metadata]
    E --> F[messenger-backup-YYYYmmdd-HHMMSS.tar.gz]
    G[restore] --> H[stop services]
    H --> I[restore PostgreSQL]
    I --> J[restore uploads]
    J --> K[start services]
    K --> L[health checks]
```

## Flow disk add/remove

```mermaid
flowchart TD
    A[disk-add] --> B[lsblk/findmnt checks]
    B --> C{--force + confirm?}
    C -->|Нет| D[stop, no changes]
    C -->|Да| E[mkfs ext4/xfs]
    E --> F[mount + fstab by UUID]
    F --> G[write docker-compose.disk.yml]
    G --> H[set STORAGE_PROVIDER=disk]
    H --> I[restart server/worker]
    J[disk-remove] --> K[stop services]
    K --> L[backup uploads]
    L --> M[disable docker-compose.disk.yml]
    M --> N[comment fstab + umount]
```

## Federation topology

```mermaid
flowchart LR
    A[Cluster A inventory] --> V[federation-validate]
    B[Cluster B inventory] --> V
    C[Cluster C inventory] --> V
    V --> H1[GET /actuator/health A]
    V --> H2[GET /actuator/health B]
    V --> H3[GET /actuator/health C]
    V --> Note[Topology/trust inventory only, no backend message federation protocol]
```

## Команды

```bash
./scripts/messengerctl.sh install --runtime docker --profile production
./scripts/messengerctl.sh install --runtime podman --profile production
./scripts/messengerctl.sh install --runtime kubernetes --namespace messenger --release messenger --values helm/values-production.example.yaml
./scripts/messengerctl.sh federation-validate
```
