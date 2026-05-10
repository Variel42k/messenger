# Mobile UI Audit

## Русский

### Current frontend stack
- React 18, webpack 5, Babel.
- Router: lightweight route adapter в `web-client/src/routes`; полноценный mobile flow ещё не реализован.
- State: normalized foundation в `web-client/src/store`; legacy screens всё ещё используют локальный state.
- API: `apiClient` в `web-client/src/api` с fallback для `/api/chats`.
- Realtime: adapter в `web-client/src/realtime`, но он ещё не подключён к authenticated app lifecycle.
- UI: tokens и primitives в `web-client/src/styles` и `web-client/src/components/ui`.
- Tests: foundation runner есть; mobile/E2E тестов пока не было.

### Current routes
- Есть `/app`, `/app/groups`, `/app/groups/:groupId`, `/app/channels/:channelId`, members/settings/admin/profile routes.
- Нет route `/app/groups/:groupId/channels`, который нужен для mobile group -> channels flow.
- Browser back сейчас управляет legacy view, но не полноценным selected group/channel stack.

### Current layout behavior
- `ChatWindow` построен как desktop split layout: sidebar `350px` + content.
- Members area встроена в channel view и занимает вертикальное место даже на узких экранах.
- Composer находится в обычном flex flow и не учитывает mobile keyboard.
- `App` имеет внешний header и card-like main container; на mobile это съедает высоту и может создавать двойной scroll.

### Current mobile breakpoints
- `App.css`: `900px` и `640px`.
- `AdminPanel.css`: `980px` и `640px`.
- `ChatWindow.css`: mobile breakpoint отсутствует.
- Tokens определяют `767px/1280px`, но mobile app layout ещё их не использует.

### Current navigation flow
- Текущий flow: legacy chat list and chat area видны одновременно.
- Нет single-pane group list -> channel list -> channel flow.
- Нет mobile top bar/back button для вложенных экранов.
- Selected group/channel не восстанавливаются из URL/local fallback.

### Current issues
- Возможен horizontal pressure на 360px из-за fixed sidebar, wide panels, inline member controls.
- Touch targets меньше 44px: create button 30px, thread close 24px, некоторые inline actions.
- Есть hover-only visual feedback.
- Dialog/drawer primitives доступны, но mobile bottom sheet/fullscreen dialog отсутствуют.
- `100vh` используется в primitives; нет `dvh/svh` и visualViewport handling.

### Missing mobile states
- Access revoked screen for removed/banned/deactivated current user.
- Readonly composer state with visible reason.
- New messages indicator when user reads older history.
- Mobile empty/error/loading screens per groups/channels/messages/members/admin/audit.
- Offline/reconnecting compact banner in mobile shell.

### Accessibility gaps
- Нет `aria-live` для новых сообщений.
- Message actions не доступны через явную mobile action button + long press.
- Не все icon-like buttons имеют `aria-label`.
- Нет mobile bottom sheet focus trap/body scroll lock.
- Touch target requirement `44x44px` не гарантирован глобально.

### Realtime/mobile risks
- Realtime events are normalized and reducible, but no React provider dispatches them yet.
- `membership.removed` can update store, but UI does not yet route to access revoked state.
- `channel.updated readonly=true` updates store, but current composer does not consume permission snapshot.
- `user.deactivated` can revoke store session, but app does not close realtime/session UI flow yet.
- Scroll behavior for incoming messages is not protected from forced auto-scroll.

### Implementation plan
1. Extend route adapter with `/app/groups/:groupId/channels`.
2. Extend normalized store for mobile navigation, viewport, bottom sheets, dialogs, drafts and scroll anchors.
3. Add mobile viewport hook and RealtimeProvider.
4. Add mobile-only AppShell and foundation screens while preserving desktop legacy UI.
5. Add mobile bottom sheets/dialog wrappers with focus trap and body scroll lock.
6. Implement mobile ChannelView with keyboard-safe composer, optimistic send and access revoked states.
7. Add Playwright mobile E2E and Docker-only scripts.
8. Update mobile docs and PR checklist.

## English

### Current frontend stack
- React 18, webpack 5, Babel.
- Router: lightweight route adapter in `web-client/src/routes`; a full mobile flow is not implemented yet.
- State: normalized foundation in `web-client/src/store`; legacy screens still use local state.
- API: `apiClient` in `web-client/src/api` with `/api/chats` fallback.
- Realtime: adapter in `web-client/src/realtime`, not connected to authenticated app lifecycle yet.
- UI: tokens and primitives in `web-client/src/styles` and `web-client/src/components/ui`.
- Tests: foundation runner exists; mobile/E2E tests were missing.

### Current routes
- Existing routes include `/app`, `/app/groups`, `/app/groups/:groupId`, `/app/channels/:channelId`, members/settings/admin/profile routes.
- Missing `/app/groups/:groupId/channels`, required for the mobile group -> channels flow.
- Browser back currently affects legacy view, not a full selected group/channel stack.

### Current layout behavior
- `ChatWindow` is a desktop split layout: `350px` sidebar plus content.
- Members area is embedded inside the channel view and takes vertical space on narrow screens.
- Composer stays in normal flex flow and does not account for the mobile keyboard.
- `App` has an outer header and card-like main container; on mobile this consumes height and can create double scroll.

### Current mobile breakpoints
- `App.css`: `900px` and `640px`.
- `AdminPanel.css`: `980px` and `640px`.
- `ChatWindow.css`: no mobile breakpoint.
- Tokens define `767px/1280px`, but mobile app layout does not use them yet.

### Current navigation flow
- Current flow shows the legacy chat list and chat area at the same time.
- There is no single-pane group list -> channel list -> channel flow.
- There is no mobile top bar/back button for nested screens.
- Selected group/channel are not restored from URL/local fallback.

### Current issues
- 360px screens can be pressured by fixed sidebar, wide panels and inline member controls.
- Touch targets below 44px: 30px create button, 24px thread close, several inline actions.
- Some visual behavior is hover-only.
- Dialog/drawer primitives exist, but mobile bottom sheet/fullscreen dialog is missing.
- `100vh` is used in primitives; no `dvh/svh` or visualViewport handling.

### Missing mobile states
- Access revoked screen for removed/banned/deactivated current user.
- Readonly composer state with visible reason.
- New messages indicator when the user reads older history.
- Mobile empty/error/loading screens for groups/channels/messages/members/admin/audit.
- Offline/reconnecting compact banner in mobile shell.

### Accessibility gaps
- No `aria-live` for new messages.
- Message actions are not available through explicit mobile action button plus long press.
- Not all icon-like buttons have `aria-label`.
- No mobile bottom sheet focus trap/body scroll lock.
- The `44x44px` touch target requirement is not globally guaranteed.

### Realtime/mobile risks
- Realtime events are normalized and reducible, but no React provider dispatches them yet.
- `membership.removed` can update store, but UI does not route to access revoked state yet.
- `channel.updated readonly=true` updates store, but the current composer does not consume permission snapshot.
- `user.deactivated` can revoke store session, but app does not close realtime/session UI flow yet.
- Incoming message scroll behavior is not protected from forced auto-scroll.

### Implementation plan
1. Extend route adapter with `/app/groups/:groupId/channels`.
2. Extend normalized store for mobile navigation, viewport, bottom sheets, dialogs, drafts and scroll anchors.
3. Add mobile viewport hook and RealtimeProvider.
4. Add mobile-only AppShell and foundation screens while preserving desktop legacy UI.
5. Add mobile bottom sheets/dialog wrappers with focus trap and body scroll lock.
6. Implement mobile ChannelView with keyboard-safe composer, optimistic send and access revoked states.
7. Add Playwright mobile E2E and Docker-only scripts.
8. Update mobile docs and PR checklist.
