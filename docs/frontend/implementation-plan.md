# Frontend Implementation Plan / План реализации фронтенда

## Русский

## Task: Frontend Foundation

### 1. What exists now
Проект использует React 18, webpack и legacy `currentView` в `App`. Компоненты напрямую вызывают `fetch`, а `ChatWindow` и `AdminPanel` держат собственный локальный state.

### 2. What is broken/missing
Не было route adapter, normalized store, единого API client, production WebSocket adapter, tokens, UI primitives и frontend test script. CI frontend job запускал Node напрямую, а не через Docker.

### 3. Proposed change
Добавить foundation без переписывания существующих экранов: route adapter, normalized reducer/store, API client facade, realtime adapter, design tokens, accessible UI primitives и Docker-only foundation tests.

### 4. Files to edit
- `web-client/src/routes/*`
- `web-client/src/store/*`
- `web-client/src/api/*`
- `web-client/src/realtime/*`
- `web-client/src/styles/tokens.css`
- `web-client/src/components/ui/*`
- `web-client/src/App.js`
- `web-client/scripts/run-foundation-tests.js`
- `web-client/package.json`
- `.github/workflows/ci.yml`
- `docs/frontend/*`

### 5. UI/UX behavior
Legacy screens remain available. Header navigation updates target URLs. New primitives provide consistent buttons, forms, dialogs, drawers, badges, skeletons, empty/error states and toast region.

### 6. State changes
Normalized slices added: session, users, groups, channels, memberships, messages, presence, ui, audit, realtime. Reducers are idempotent for realtime events and support optimistic message reconciliation by `clientMsgId`.

### 7. API/realtime dependencies
The client expects target endpoints under `/api/groups`, `/api/channels`, `/api/messages`, `/api/users`, `/api/admin/audit`, `/api/realtime/bootstrap`. Group/channel list methods include legacy `/api/chats` fallback.

### 8. Accessibility notes
Dialog and Drawer include focus trap and Escape close hook. Inputs link errors via `aria-describedby`. IconButton requires `label`. ToastRegion uses `aria-live`. Tokens define visible focus and reduced motion support.

### 9. Tests to add
Foundation tests cover route parsing, event normalization, optimistic -> persisted reconciliation, duplicate event dedupe, membership removal revocation and API error helpers. Run only in Docker.

### 10. Risks
Existing screens still use local state until migrated. Backend target contracts may lag frontend foundation. Rollback is limited to removing foundation imports and route/store wrappers because public contracts were not changed.

### 11. PR draft summary
Adds frontend foundation for production group/channel work while preserving existing screens and contracts. Adds Docker-only web foundation tests and bilingual documentation.

## English

## Task: Frontend Foundation

### 1. What exists now
The project uses React 18, webpack and legacy `currentView` switching in `App`. Components call `fetch` directly, while `ChatWindow` and `AdminPanel` own local state.

### 2. What is broken/missing
There was no route adapter, normalized store, shared API client, production WebSocket adapter, design token layer, UI primitives or frontend test script. The frontend CI job used host Node instead of Docker.

### 3. Proposed change
Add a foundation without rewriting existing screens: route adapter, normalized reducer/store, API client facade, realtime adapter, design tokens, accessible UI primitives and Docker-only foundation tests.

### 4. Files to edit
- `web-client/src/routes/*`
- `web-client/src/store/*`
- `web-client/src/api/*`
- `web-client/src/realtime/*`
- `web-client/src/styles/tokens.css`
- `web-client/src/components/ui/*`
- `web-client/src/App.js`
- `web-client/scripts/run-foundation-tests.js`
- `web-client/package.json`
- `.github/workflows/ci.yml`
- `docs/frontend/*`

### 5. UI/UX behavior
Legacy screens remain available. Header navigation updates target URLs. New primitives provide consistent buttons, forms, dialogs, drawers, badges, skeletons, empty/error states and toast region.

### 6. State changes
Normalized slices were added: session, users, groups, channels, memberships, messages, presence, ui, audit, realtime. Reducers are idempotent for realtime events and support optimistic reconciliation by `clientMsgId`.

### 7. API/realtime dependencies
The client expects target endpoints under `/api/groups`, `/api/channels`, `/api/messages`, `/api/users`, `/api/admin/audit`, `/api/realtime/bootstrap`. Group/channel list methods include legacy `/api/chats` fallback.

### 8. Accessibility notes
Dialog and Drawer include focus trap and Escape close hook. Inputs link errors through `aria-describedby`. IconButton requires `label`. ToastRegion uses `aria-live`. Tokens define visible focus and reduced motion support.

### 9. Tests to add
Foundation tests cover route parsing, event normalization, optimistic -> persisted reconciliation, duplicate event dedupe, membership removal revocation and API error helpers. Run only in Docker.

### 10. Risks
Existing screens still use local state until migrated. Backend target contracts may lag behind frontend foundation. Rollback is limited to removing foundation imports and route/store wrappers because public contracts were not changed.

### 11. PR draft summary
Adds frontend foundation for production group/channel work while preserving existing screens and contracts. Adds Docker-only web foundation tests and bilingual documentation.
