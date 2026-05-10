# Mobile Testing / Мобильное тестирование

## Русский

### Docker-only commands
Foundation + mobile unit + build:

```bash
docker run --rm -v "$PWD/web-client:/app" -w /app node:18-alpine sh -c "npm ci && npm run test:foundation && npm run test:mobile && npm run build"
```

Mobile E2E:

```bash
docker run --rm -v "$PWD/web-client:/app" -w /app mcr.microsoft.com/playwright:v1.49.1-jammy sh -c "npm ci && npm run test:e2e:mobile"
```

### Viewport matrix
- `360x740`
- `390x844`
- `414x896`
- `768x1024`

### E2E scenarios
- Open app on mobile and see group list.
- Group list -> channel list -> channel.
- Send message with optimistic reconciliation.
- Composer remains visible in mobile viewport.
- Message actions bottom sheet opens and closes by Escape.
- Readonly channel disables composer.
- Members and admin users screens are reachable.
- No horizontal scroll on mobile viewport.

### Manual QA checklist
- Browser back: channel -> channel list -> group list.
- Mobile back button mirrors route parent.
- Long group/channel names wrap without horizontal scroll.
- Bottom sheet locks background scroll.
- Touch targets are at least `44x44px`.
- Dialogs restore focus after close.
- Access revoked screen appears after realtime removal/deactivation.

### iOS Safari checklist
- Safe area top/bottom is respected.
- Composer is visible when keyboard opens.
- No `100vh` jump on address bar collapse.
- Bottom sheet content scrolls internally.

### Android Chrome checklist
- Composer remains visible with keyboard.
- Scroll remains smooth with message list.
- Browser back does not close the app unexpectedly.
- Tap targets are comfortable at `360px` width.

## English

### Docker-only commands
Foundation + mobile unit + build:

```bash
docker run --rm -v "$PWD/web-client:/app" -w /app node:18-alpine sh -c "npm ci && npm run test:foundation && npm run test:mobile && npm run build"
```

Mobile E2E:

```bash
docker run --rm -v "$PWD/web-client:/app" -w /app mcr.microsoft.com/playwright:v1.49.1-jammy sh -c "npm ci && npm run test:e2e:mobile"
```

### Viewport matrix
- `360x740`
- `390x844`
- `414x896`
- `768x1024`

### E2E scenarios
- Open app on mobile and see group list.
- Group list -> channel list -> channel.
- Send message with optimistic reconciliation.
- Composer remains visible in mobile viewport.
- Message actions bottom sheet opens and closes by Escape.
- Readonly channel disables composer.
- Members and admin users screens are reachable.
- No horizontal scroll on mobile viewport.

### Manual QA checklist
- Browser back: channel -> channel list -> group list.
- Mobile back button mirrors route parent.
- Long group/channel names wrap without horizontal scroll.
- Bottom sheet locks background scroll.
- Touch targets are at least `44x44px`.
- Dialogs restore focus after close.
- Access revoked screen appears after realtime removal/deactivation.

### iOS Safari checklist
- Safe area top/bottom is respected.
- Composer is visible when keyboard opens.
- No `100vh` jump on address bar collapse.
- Bottom sheet content scrolls internally.

### Android Chrome checklist
- Composer remains visible with keyboard.
- Scroll remains smooth with message list.
- Browser back does not close the app unexpectedly.
- Tap targets are comfortable at `360px` width.
