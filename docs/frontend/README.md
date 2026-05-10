# Frontend Architecture / Архитектура фронтенда

## Русский

### Overview
Frontend остаётся React-приложением на webpack. Foundation добавлен как совместимый слой поверх существующих экранов, чтобы можно было постепенно мигрировать messenger к production-grade группам, каналам, ролям, realtime и moderation UI.

### Routes
Route adapter находится в `web-client/src/routes`.

Целевые routes:
- `/app`
- `/app/groups`
- `/app/groups/:groupId`
- `/app/groups/:groupId/settings`
- `/app/groups/:groupId/members`
- `/app/channels/:channelId`
- `/app/channels/:channelId/settings`
- `/app/channels/:channelId/members`
- `/app/admin/users`
- `/app/admin/audit`
- `/app/profile/:userId`

Legacy mapping сохраняет текущие экраны: chat, admin, help, security.

### State Management
Normalized store находится в `web-client/src/store`.

Slices:
- `session`
- `users`
- `groups`
- `channels`
- `memberships`
- `messages`
- `presence`
- `ui`
- `audit`
- `realtime`

Store хранит permission snapshots от backend. Клиент может скрывать или disabled UI-действия, но server-side rejection остаётся обязательным.

### API Client
API facade находится в `web-client/src/api`. Он централизует:
- JSON request/response handling
- auth header injection
- `401`, `403`, `409`, `422` error states
- AbortController support
- safe GET retry
- target endpoint methods for groups, channels, messages, admin users, audit and realtime bootstrap

### Realtime Flow
Realtime adapter находится в `web-client/src/realtime`. Он нормализует target envelope, dedupe events by `event_id`, reconnects with exponential backoff and requests resync after reconnect.

### Local Development
Development server:

```bash
docker run --rm -it -p 3000:3000 -v "$PWD/web-client:/app" -w /app node:18-alpine sh -c "npm ci && npm start"
```

Tests and build:

```bash
docker run --rm -v "$PWD/web-client:/app" -w /app node:18-alpine sh -c "npm ci && npm run test:foundation && npm run build"
```

Mobile docs:
- `docs/frontend/mobile.md`
- `docs/frontend/mobile-testing.md`
- `docs/frontend/mobile-pr-checklist.md`

## English

### Overview
The frontend remains a React application built with webpack. The foundation was added as a compatible layer over existing screens so the messenger can be migrated gradually toward production-grade groups, channels, roles, realtime and moderation UI.

### Routes
The route adapter lives in `web-client/src/routes`.

Target routes:
- `/app`
- `/app/groups`
- `/app/groups/:groupId`
- `/app/groups/:groupId/settings`
- `/app/groups/:groupId/members`
- `/app/channels/:channelId`
- `/app/channels/:channelId/settings`
- `/app/channels/:channelId/members`
- `/app/admin/users`
- `/app/admin/audit`
- `/app/profile/:userId`

Legacy mapping preserves the current chat, admin, help and security screens.

### State Management
The normalized store lives in `web-client/src/store`.

Slices:
- `session`
- `users`
- `groups`
- `channels`
- `memberships`
- `messages`
- `presence`
- `ui`
- `audit`
- `realtime`

The store keeps backend-provided permission snapshots. The client may hide or disable UI actions, but server-side rejection remains mandatory.

### API Client
The API facade lives in `web-client/src/api`. It centralizes:
- JSON request/response handling
- auth header injection
- `401`, `403`, `409`, `422` error states
- AbortController support
- safe GET retry
- target endpoint methods for groups, channels, messages, admin users, audit and realtime bootstrap

### Realtime Flow
The realtime adapter lives in `web-client/src/realtime`. It normalizes the target envelope, dedupes events by `event_id`, reconnects with exponential backoff and requests resync after reconnect.

### Local Development
Development server:

```bash
docker run --rm -it -p 3000:3000 -v "$PWD/web-client:/app" -w /app node:18-alpine sh -c "npm ci && npm start"
```

Tests and build:

```bash
docker run --rm -v "$PWD/web-client:/app" -w /app node:18-alpine sh -c "npm ci && npm run test:foundation && npm run build"
```

Mobile docs:
- `docs/frontend/mobile.md`
- `docs/frontend/mobile-testing.md`
- `docs/frontend/mobile-pr-checklist.md`
