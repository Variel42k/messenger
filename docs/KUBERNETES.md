# Развертывание в Kubernetes через Helm

Kubernetes deployment является основным multi-node/cluster вариантом для Messenger. В этом проекте delivery строится вокруг существующего Helm chart в `helm/`.

## Требования

- Kubernetes cluster.
- `kubectl` с доступом к целевому cluster.
- `helm`.
- Ingress controller для HTTPS traffic.
- External PostgreSQL, Redis и S3/MinIO для production.
- Backup/restore strategy для database и object storage.

Проверка:

```bash
kubectl version --client
helm version
./scripts/messengerctl.sh runtime-doctor --runtime kubernetes --namespace messenger --release messenger --values helm/values-production.example.yaml
```

## Topology

```mermaid
flowchart TD
    User[Пользователь] --> Ingress[Ingress TLS]
    Ingress --> Service[Messenger Service]
    Service --> Pod1[Messenger Pod]
    Service --> Pod2[Messenger Pod]
    Pod1 --> PG[(External PostgreSQL)]
    Pod1 --> Redis[(External Redis)]
    Pod1 --> S3[(External S3/MinIO)]
    Pod2 --> PG
    Pod2 --> Redis
    Pod2 --> S3
    Prom[Prometheus] --> Metrics[/actuator/prometheus]
```

## Production values

Скопируйте template:

```bash
cp helm/values-production.example.yaml helm/values-production.yaml
```

Замените:

- `image.repository` и `image.tag`;
- `ingress.hosts`, `ingress.tls`;
- `env.DB_HOST`, `env.DB_USERNAME`, `env.DB_PASSWORD`;
- `env.REDIS_HOST`;
- `env.S3_ENDPOINT`, `env.S3_ACCESS_KEY`, `env.S3_SECRET_KEY`;
- `env.JWT_SECRET`;
- `CORS_ALLOWED_ORIGINS`, `WS_ALLOWED_ORIGINS`.

Не храните реальные secrets в Git. Для production лучше использовать external secret manager или Kubernetes Secrets, адаптировав chart отдельно.

## Установка

Через скрипт:

```bash
./scripts/messengerctl.sh install \
  --runtime kubernetes \
  --namespace messenger \
  --release messenger \
  --values helm/values-production.yaml
```

Ручной Helm:

```bash
kubectl create namespace messenger --dry-run=client -o yaml | kubectl apply -f -
helm upgrade --install messenger ./helm -n messenger -f helm/values-production.yaml
```

## Обновление

```bash
./scripts/messengerctl.sh update \
  --runtime kubernetes \
  --namespace messenger \
  --release messenger \
  --values helm/values-production.yaml
```

Перед update:

```bash
./scripts/messengerctl.sh doctor --runtime kubernetes --namespace messenger --release messenger --values helm/values-production.yaml
helm history messenger -n messenger
```

Backup Kubernetes окружения зависит от того, где находятся PostgreSQL, Redis и S3/MinIO. Скрипт не делает универсальный cluster backup.

## Rollback

```bash
./scripts/messengerctl.sh k8s-rollback --namespace messenger --release messenger
```

Ручной вариант:

```bash
helm history messenger -n messenger
helm rollback messenger <REVISION> -n messenger
```

Если update включал destructive database migration, Helm rollback недостаточен. Используйте pre-update backup database/object storage.

## Federation values

Federation values добавляют только topology metadata:

```bash
helm upgrade --install messenger ./helm -n messenger \
  -f helm/values-production.yaml \
  -f helm/values-federation.example.yaml
```

Это не включает межкластерную доставку сообщений. Для проверки inventory используйте:

```bash
./scripts/messengerctl.sh federation-validate
```

## Проверка

```bash
kubectl get pods,svc,ingress -n messenger
helm status messenger -n messenger
kubectl logs -n messenger -l app.kubernetes.io/instance=messenger --tail=200
```

Проверьте:

- `/actuator/health`;
- web login;
- WebSocket;
- upload/download файлов;
- metrics `/actuator/prometheus`, если endpoint доступен Prometheus.
