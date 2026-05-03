# Production

Этот документ описывает рекомендации для production-развёртывания Messenger. Он не заменяет полноценный security review конкретной инфраструктуры.

## Secrets

Никогда не используйте default dev secrets и dev credentials в production.

JWT secret должен быть длинным, случайным и храниться вне репозитория:

```bash
openssl rand -base64 64
```

Передавайте secrets через environment variables, Kubernetes Secrets, Docker secrets или внешний secret manager. Не храните production secrets в `docker-compose.yml`, Helm values в открытом репозитории или shell history.

## JWT_SECRET

Production backend должен запускаться с `SPRING_PROFILES_ACTIVE=prod` и сильным `JWT_SECRET`.

Минимальные требования приложения:

- secret не пустой;
- secret минимум 32 bytes для HS256;
- известные dev/test secrets запрещены при активном `prod` profile.

Рекомендуется регулярно пересматривать процедуру ротации JWT secret и понимать, что смена signing secret инвалидирует ранее выпущенные токены.

## External PostgreSQL

Для production используйте внешний управляемый или отдельно администрируемый PostgreSQL:

- отдельные credentials и database;
- TLS, если база находится за пределами доверенной private network;
- регулярные backups и проверенные restore procedures;
- мониторинг storage, connections, locks, replication lag;
- Flyway migrations с `FLYWAY_VALIDATE_ON_MIGRATE=true`.

## External Redis

Redis в production лучше запускать как внешний managed/service deployment:

- ограничить сетевой доступ только backend-сервисами;
- включить authentication/TLS, если применимо;
- мониторить latency, memory, evictions и restarts;
- настроить persistence только если она нужна выбранному режиму эксплуатации.

## External S3-Compatible Storage

Для файлов используйте внешний S3-compatible storage: AWS S3, Ceph, MinIO, Wasabi или аналогичный сервис.

Рекомендации:

- `STORAGE_PROVIDER=s3`;
- `S3_AUTO_CREATE_BUCKET=false`;
- bucket создаётся заранее;
- credentials имеют минимально необходимые права;
- включены lifecycle/retention policies, если они нужны организации;
- backups и disaster recovery покрывают и database metadata, и object storage.

Disk storage mode допустим только если инфраструктура гарантирует persistent volume, backups и понятный restore process.

## Backups

Production backups должны покрывать:

- PostgreSQL database;
- S3/object storage с загруженными файлами;
- конфигурацию deployment и secrets recovery process;
- Helm values или инфраструктурные манифесты без раскрытия secret values.

Периодически проверяйте восстановление на отдельном окружении. Backup без проверенного restore process не считается надёжной защитой.

## HTTPS / Reverse Proxy

Публикуйте Messenger через HTTPS reverse proxy или ingress controller:

- TLS certificate от доверенного CA;
- редирект HTTP на HTTPS;
- корректные `X-Forwarded-*` headers;
- request/body size limits, совместимые с лимитом загрузки файлов;
- отдельные правила для WebSocket upgrade.

## CORS Configuration

Не используйте wildcard origins для production. Укажите только реальные frontend origins:

```dotenv
CORS_ALLOWED_ORIGINS=https://chat.example.com
```

Если используются несколько доменов, перечислите их через запятую.

## WebSocket Origins

WebSocket origins настраиваются отдельно:

```dotenv
WS_ALLOWED_ORIGINS=https://chat.example.com
```

Значения должны соответствовать публичным доменам web-client или desktop/web integrations, которым разрешено подключение.

## Log Management

Логи должны попадать в централизованную систему: journald, Docker logging driver, ELK/OpenSearch, Loki, CloudWatch или аналог.

Рекомендации:

- не логировать tokens, passwords, S3 secret keys и персональные данные без необходимости;
- настроить retention;
- добавить alerts на repeated authentication failures, startup failures, database errors и S3 errors.

## Health Checks and Monitoring

Spring Actuator endpoints:

- `/actuator/health`
- `/actuator/info`
- `/actuator/metrics`
- `/actuator/prometheus`

Используйте health checks для load balancer, orchestrator probes и alerting. Метрики можно собирать Prometheus-compatible стеком.

## Container Restart Policies

Для Docker Compose production-like окружений используйте restart policies и внешние volumes. Для Kubernetes настройте:

- readiness/liveness probes;
- resource requests/limits;
- rolling updates;
- PodDisruptionBudget, если требуется высокая доступность;
- отдельные Secrets/ConfigMaps для конфигурации.

## Swagger in Public Production

Swagger UI удобен для development и внутренней интеграции. В публичном production deployment защитите или отключите Swagger, если политика безопасности организации этого требует.

Минимальный вариант — не публиковать `/swagger-ui/**` и `/v3/api-docs/**` через public reverse proxy. Более строгий вариант — ограничить доступ на уровне Spring Security или отдельного gateway.

## Production Checklist

- `SPRING_PROFILES_ACTIVE=prod`
- сильный `JWT_SECRET`
- external PostgreSQL
- external Redis
- external S3-compatible storage
- configured backups and restore test
- HTTPS reverse proxy or ingress
- explicit `CORS_ALLOWED_ORIGINS`
- explicit `WS_ALLOWED_ORIGINS`
- centralized logs
- Actuator health checks and metrics
- restart policies/probes
- secrets injected via environment/secret manager
- Swagger protected or disabled for public access when needed
