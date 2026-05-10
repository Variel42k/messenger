# Frontend Audit / Аудит фронтенда

## Русский

### Stack
- Framework: React 18.
- Router: полноценного router нет; добавлен lightweight route adapter в `web-client/src/routes`.
- State management: существующие экраны используют локальный React state; добавлен normalized store foundation в `web-client/src/store`.
- HTTP client: существующие компоненты используют `fetch`; добавлен единый API client в `web-client/src/api`.
- Realtime: раньше реального WebSocket client не было; добавлен realtime adapter в `web-client/src/realtime`.
- UI library: внешней UI-библиотеки нет; добавлены design tokens и primitives в `web-client/src/styles` и `web-client/src/components/ui`.
- Build tool: webpack 5, Babel.
- Tests: раньше frontend tests отсутствовали; добавлен `npm run test:foundation`, запускать только внутри Docker.
- E2E: отсутствует.
- Lint/format/typecheck: отдельных scripts нет.

### Existing routes
- До foundation: single-page переключение `chat/admin/security/help` через `currentView`.
- После foundation: адаптер понимает `/app`, `/app/groups`, `/app/groups/:groupId`, `/app/channels/:channelId`, settings/members routes, `/app/admin/users`, `/app/admin/audit`, `/app/profile/:userId`, `/help`, `/app/security`.
- Существующие screens пока подключены через legacy mapping: chat -> `/app/groups`, admin -> `/app/admin/users`, help -> `/help`, security -> `/app/security`.

### Existing components
- `App`: authenticated shell, language switcher, legacy navigation.
- `Login`: login, 2FA, OIDC flow.
- `ChatWindow`: chats/messages mock-first UI, file upload path, local message state.
- `AdminPanel`: admin mock screens plus some real admin fetch calls.
- `SecuritySettings`, `SecurityPoliciesTab`: security and auth settings.
- New foundation: `Button`, `IconButton`, `Input`, `Textarea`, `Select`, `Dialog`, `Drawer`, `Badge`, `Avatar`, `Tooltip`, `DropdownMenu`, `Skeleton`, `EmptyState`, `ErrorState`, `ConfirmDialog`, `ToastRegion`.

### Existing API clients
- Existing code uses direct `fetch` in components.
- New client exposes grouped methods for groups, channels, messages, users/admin, audit and realtime bootstrap.
- Compatibility fallback exists for `listGroups()` / `listChannels()` through legacy `/api/chats` if target endpoints are not available.

### Existing realtime layer
- Existing UI had no production WebSocket lifecycle.
- New adapter normalizes snake_case and camelCase event envelopes, dedupes by event id, supports reconnect backoff, heartbeat timeout, forced disconnect handling and resync callback.

### Existing state management
- Existing screens still keep local state.
- New normalized store includes session, users, groups, channels, memberships, messages, presence, ui, audit and realtime metadata.
- Reducers support optimistic message insert, persisted reconciliation by `clientMsgId`, event dedupe, membership removal access revocation and user deactivate/ban access revocation.

### Existing tests
- New `web-client/scripts/run-foundation-tests.js` covers route parsing, event normalization, optimistic reconciliation, duplicate realtime dedupe, membership removal revocation and API error helpers.
- All frontend tests must be executed in Docker.

### Gaps
- Target group/channel screens are not fully implemented yet.
- Existing `ChatWindow` is still not migrated to normalized store.
- Admin Users and Audit Log target screens are not production-complete.
- No E2E suite yet.
- No automated accessibility suite yet.
- Backend permission snapshots and realtime events must be treated as source of truth when screens are migrated.

### Risks
- Public API contracts for target endpoints may differ from current backend; foundation avoids breaking contracts by using adapters and fallback.
- Existing local-state screens can diverge from normalized store until migrated.
- Realtime ordering depends on backend `seq`; out-of-order behavior must be contract-tested.
- Docker availability is required for validation.

### Recommended implementation order
1. Keep foundation stable: route adapter, store, API client, realtime adapter, tokens, primitives.
2. Migrate AppShell layout to responsive panes.
3. Implement GroupList and ChannelList using API client and normalized store.
4. Migrate ChannelView messages/composer to optimistic store flow.
5. Add MembersDrawer and moderation dialogs.
6. Add Admin Users and Audit Log pages.
7. Wire realtime provider into authenticated app load/logout.
8. Add component, integration, E2E, accessibility and responsive tests in Docker.

## English

### Stack
- Framework: React 18.
- Router: no full router existed; a lightweight route adapter now lives in `web-client/src/routes`.
- State management: existing screens use local React state; a normalized store foundation now lives in `web-client/src/store`.
- HTTP client: existing components use direct `fetch`; a shared API client now lives in `web-client/src/api`.
- Realtime: no production WebSocket client existed; a realtime adapter now lives in `web-client/src/realtime`.
- UI library: no external UI library; design tokens and primitives were added under `web-client/src/styles` and `web-client/src/components/ui`.
- Build tool: webpack 5, Babel.
- Tests: frontend tests were missing; `npm run test:foundation` was added and must run in Docker.
- E2E: missing.
- Lint/format/typecheck: no dedicated scripts.

### Existing routes
- Before foundation: `chat/admin/security/help` were switched through local `currentView`.
- After foundation: the adapter understands `/app`, `/app/groups`, `/app/groups/:groupId`, `/app/channels/:channelId`, settings/members routes, `/app/admin/users`, `/app/admin/audit`, `/app/profile/:userId`, `/help`, `/app/security`.
- Existing screens remain connected through legacy mapping: chat -> `/app/groups`, admin -> `/app/admin/users`, help -> `/help`, security -> `/app/security`.

### Existing components
- `App`: authenticated shell, language switcher, legacy navigation.
- `Login`: login, 2FA and OIDC flow.
- `ChatWindow`: mock-first chats/messages UI, file upload path, local message state.
- `AdminPanel`: admin mock screens plus several real admin fetch calls.
- `SecuritySettings`, `SecurityPoliciesTab`: security and auth settings.
- New foundation primitives: `Button`, `IconButton`, `Input`, `Textarea`, `Select`, `Dialog`, `Drawer`, `Badge`, `Avatar`, `Tooltip`, `DropdownMenu`, `Skeleton`, `EmptyState`, `ErrorState`, `ConfirmDialog`, `ToastRegion`.

### Existing API clients
- Existing code uses component-level `fetch`.
- The new client exposes groups, channels, messages, users/admin, audit and realtime bootstrap methods.
- `listGroups()` and `listChannels()` include compatibility fallback through legacy `/api/chats` when target endpoints are unavailable.

### Existing realtime layer
- Existing UI had no production WebSocket lifecycle.
- The new adapter normalizes snake_case and camelCase envelopes, dedupes by event id, supports reconnect backoff, heartbeat timeout, forced disconnect handling and resync callback.

### Existing state management
- Existing screens still use local state.
- The new normalized store includes session, users, groups, channels, memberships, messages, presence, ui, audit and realtime metadata.
- Reducers support optimistic messages, persisted reconciliation by `clientMsgId`, event dedupe, membership removal access revocation and user deactivate/ban access revocation.

### Existing tests
- `web-client/scripts/run-foundation-tests.js` covers route parsing, event normalization, optimistic reconciliation, duplicate realtime dedupe, membership removal revocation and API error helpers.
- All frontend tests must be executed in Docker.

### Gaps
- Target group/channel screens are not production-complete yet.
- `ChatWindow` is not migrated to the normalized store yet.
- Admin Users and Audit Log target screens are not complete.
- E2E and automated accessibility suites are missing.
- Backend permission snapshots and realtime events must become the source of truth during migration.

### Risks
- Target endpoint contracts may differ from the current backend; the foundation avoids breaking contracts through adapters and fallback.
- Existing local-state screens can diverge from the normalized store until migrated.
- Realtime ordering depends on backend `seq`; this needs contract tests.
- Docker availability is required for validation.

### Recommended implementation order
1. Stabilize foundation: route adapter, store, API client, realtime adapter, tokens, primitives.
2. Migrate AppShell layout to responsive panes.
3. Implement GroupList and ChannelList through API client and normalized store.
4. Migrate ChannelView messages/composer to the optimistic store flow.
5. Add MembersDrawer and moderation dialogs.
6. Add Admin Users and Audit Log pages.
7. Wire realtime provider into authenticated app load/logout.
8. Add component, integration, E2E, accessibility and responsive tests in Docker.
