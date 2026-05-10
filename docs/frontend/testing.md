# Frontend Testing / Тестирование фронтенда

## Русский

### Rule
Все frontend tests и build checks запускать только в Docker.

### Foundation
```bash
docker run --rm -v "$PWD/web-client:/app" -w /app node:18-alpine sh -c "npm ci && npm run test:foundation"
```

### Mobile
```bash
docker run --rm -v "$PWD/web-client:/app" -w /app node:18-alpine sh -c "npm ci && npm run test:mobile"
```

### Mobile E2E
```bash
docker run --rm -v "$PWD/web-client:/app" -w /app mcr.microsoft.com/playwright:v1.49.1-jammy sh -c "npm ci && npm run test:e2e:mobile"
```

### Build
```bash
docker run --rm -v "$PWD/web-client:/app" -w /app node:18-alpine sh -c "npm ci && npm run build"
```

### Combined CI-equivalent
```bash
docker run --rm -v "$PWD/web-client:/app" -w /app node:18-alpine sh -c "npm ci && npm run test:foundation && npm run test:mobile && npm run build"
```

### Next Tests
- Component tests for permission-aware rendering.
- Integration tests for API error handling and realtime resync.
- E2E tests for admin create group/channel, member send message, readonly realtime block, ban access revocation, deactivate access revocation and mobile navigation.
- Accessibility tests for keyboard flow, focus trap and ARIA labels.

## English

### Rule
Run all frontend tests and build checks only in Docker.

### Foundation
```bash
docker run --rm -v "$PWD/web-client:/app" -w /app node:18-alpine sh -c "npm ci && npm run test:foundation"
```

### Mobile
```bash
docker run --rm -v "$PWD/web-client:/app" -w /app node:18-alpine sh -c "npm ci && npm run test:mobile"
```

### Mobile E2E
```bash
docker run --rm -v "$PWD/web-client:/app" -w /app mcr.microsoft.com/playwright:v1.49.1-jammy sh -c "npm ci && npm run test:e2e:mobile"
```

### Build
```bash
docker run --rm -v "$PWD/web-client:/app" -w /app node:18-alpine sh -c "npm ci && npm run build"
```

### Combined CI-equivalent
```bash
docker run --rm -v "$PWD/web-client:/app" -w /app node:18-alpine sh -c "npm ci && npm run test:foundation && npm run test:mobile && npm run build"
```

### Next Tests
- Component tests for permission-aware rendering.
- Integration tests for API error handling and realtime resync.
- E2E tests for admin create group/channel, member send message, readonly realtime block, ban access revocation, deactivate access revocation and mobile navigation.
- Accessibility tests for keyboard flow, focus trap and ARIA labels.
