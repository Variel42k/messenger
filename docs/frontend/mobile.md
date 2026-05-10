# Mobile Web Architecture / Мобильная web-архитектура

## Русский

### Architecture
Mobile UI добавлен как отдельный слой `web-client/src/mobile` поверх existing foundation. Desktop `ChatWindow` и `AdminPanel` не переписаны и продолжают использоваться на ширине `1280px+`; mobile/tablet foundation shell активен до `1279px`.

### Breakpoints
- Mobile: `0px - 767px`
- Tablet: `768px - 1279px`
- Desktop: `1280px+`

### Routing
Mobile flow использует URL как source of truth:
- `/app/groups`
- `/app/groups/:groupId/channels`
- `/app/channels/:channelId`
- `/app/channels/:channelId/members`
- `/app/channels/:channelId/settings`
- `/app/groups/:groupId/settings`
- `/app/admin/users`
- `/app/admin/audit`
- `/app/profile/:userId`

`/app` восстанавливает последний выбранный group/channel из local storage или ведёт в `/app/groups`.

### Navigation Stack
Store содержит `navigation.selectedGroupId`, `navigation.selectedChannelId`, `navigation.mobileStack`, `previousScreen`, `returnTo`. Browser back работает через route adapter, а mobile back button ведёт к parent route.

### Keyboard and Viewport
`useMobileViewportVars()` пишет `--app-viewport-height` из `visualViewport.height` с fallback на `innerHeight`. Composer закреплён внизу channel screen и учитывает `env(safe-area-inset-bottom)`.

### Bottom Sheets and Dialogs
`MobileBottomSheet`, `MobileFullscreenDialog`, `MobileActionMenu`, `MobileConfirmDialog` используют focus trap, Escape close, close button и body scroll lock.

### Realtime
`RealtimeProvider` подключается при authenticated session с access token. Events dispatch into normalized reducers. Reconnect calls realtime bootstrap. Access revocation maps to mobile access screen.

### Accessibility
Touch targets are `44x44px` minimum. Message list uses `aria-live="polite"`. Icon-like buttons have labels. Bottom sheets/dialogs use `role="dialog"` and `aria-modal`.

### Known Limitations
The mobile screens use local development fixture data when target APIs are unavailable. Full backend-connected group/channel CRUD and moderation flows still require endpoint availability and integration tests.

## English

### Architecture
The mobile UI was added as a separate `web-client/src/mobile` layer on top of the existing foundation. Desktop `ChatWindow` and `AdminPanel` were not rewritten and remain active at `1280px+`; the mobile/tablet foundation shell is active up to `1279px`.

### Breakpoints
- Mobile: `0px - 767px`
- Tablet: `768px - 1279px`
- Desktop: `1280px+`

### Routing
The mobile flow uses the URL as the source of truth:
- `/app/groups`
- `/app/groups/:groupId/channels`
- `/app/channels/:channelId`
- `/app/channels/:channelId/members`
- `/app/channels/:channelId/settings`
- `/app/groups/:groupId/settings`
- `/app/admin/users`
- `/app/admin/audit`
- `/app/profile/:userId`

`/app` restores the last selected group/channel from local storage or redirects to `/app/groups`.

### Navigation Stack
The store contains `navigation.selectedGroupId`, `navigation.selectedChannelId`, `navigation.mobileStack`, `previousScreen`, `returnTo`. Browser back works through the route adapter, and the mobile back button navigates to the parent route.

### Keyboard and Viewport
`useMobileViewportVars()` writes `--app-viewport-height` from `visualViewport.height` with `innerHeight` fallback. The composer is anchored at the bottom of the channel screen and accounts for `env(safe-area-inset-bottom)`.

### Bottom Sheets and Dialogs
`MobileBottomSheet`, `MobileFullscreenDialog`, `MobileActionMenu`, `MobileConfirmDialog` use focus trap, Escape close, close button and body scroll lock.

### Realtime
`RealtimeProvider` connects for authenticated sessions with an access token. Events dispatch into normalized reducers. Reconnect calls realtime bootstrap. Access revocation maps to the mobile access screen.

### Accessibility
Touch targets are at least `44x44px`. The message list uses `aria-live="polite"`. Icon-like buttons have labels. Bottom sheets/dialogs use `role="dialog"` and `aria-modal`.

### Known Limitations
Mobile screens use local development fixture data when target APIs are unavailable. Full backend-connected group/channel CRUD and moderation flows still require endpoint availability and integration tests.
