# UI States / UI-состояния

## Русский

### Loading
Для списков использовать `Skeleton`, для небольших действий можно использовать `aria-busy` на кнопке.

### Empty
Использовать `EmptyState` с понятным title, description и CTA только если permission snapshot разрешает действие.

### Error
Использовать `ErrorState` с readable message, retry и скрываемыми technical details.

### Forbidden
Не раскрывать приватные названия недоступных групп/каналов. Показывать причину из backend: no access, removed, banned, deactivated, readonly, archived, insufficient role.

### Readonly
Composer должен быть disabled с видимой причиной. Readonly badge обязателен в списке каналов и header.

### Banned / Deactivated
Показывать status badge. История сообщений сохраняет автора как stable display name, даже если пользователь деактивирован или anonymized.

### Offline / Reconnecting
Показывать ненавязчивый banner. Optimistic actions должны быть pending или disabled, если reconciliation невозможен.

## English

### Loading
Use `Skeleton` for lists and `aria-busy` for small button-level actions.

### Empty
Use `EmptyState` with a clear title, description and CTA only when the permission snapshot allows the action.

### Error
Use `ErrorState` with a readable message, retry and collapsible technical details.

### Forbidden
Do not leak private group/channel names. Show a backend-provided reason: no access, removed, banned, deactivated, readonly, archived, insufficient role.

### Readonly
The composer must be disabled with a visible reason. Readonly badge is required in the channel list and header.

### Banned / Deactivated
Show status badges. Message history keeps a stable author display name even when a user is deactivated or anonymized.

### Offline / Reconnecting
Show a subtle banner. Optimistic actions must be pending or disabled when reconciliation is not possible.
