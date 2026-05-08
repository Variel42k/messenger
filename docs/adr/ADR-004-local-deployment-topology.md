# ADR-004 Local Deployment Topology

Status: Accepted

Date: 2026-05-07

## Context

Local production-grade testing needs app, database, Redis, realtime, object storage, mail catcher,
worker, seed/init, healthchecks, logs, metrics, and trace id propagation.

## Decision

Use `docker-compose.yml` as the local topology:

- `server`: Spring Boot API and STOMP realtime endpoint.
- `web-client`: React client.
- `worker`: same server artifact on an internal port for worker/scheduled-job evolution.
- `postgres`: PostgreSQL 15 with Flyway migrations and seed data.
- `redis`: Redis 7.
- `localstack`: S3-compatible object storage for local file flows.
- `mailhog`: local SMTP and web UI.
- `seed-init`: one-shot seed verification after server health is green.

Healthchecks gate service startup. Spring Actuator exposes health, metrics, and Prometheus endpoints.
`TraceIdFilter` injects or propagates `X-Trace-Id` and writes it to log MDC.

## Rollback

Remove the added compose services and healthcheck blocks. Application code does not depend on MailHog
or the worker service being present.
