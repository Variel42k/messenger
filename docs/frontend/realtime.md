# Frontend Realtime / Realtime фронтенда

## Русский

### Lifecycle
Realtime client должен подключаться после authenticated app load и отключаться при logout. После reconnect вызывается resync/bootstrap callback.

### Event Envelope
Adapter принимает snake_case и camelCase:

```json
{
  "event_id": "uuid",
  "event_type": "message.created",
  "aggregate_type": "message",
  "aggregate_id": "uuid",
  "channel_id": "uuid",
  "actor_id": "uuid",
  "server_ts": "iso-date",
  "seq": 123,
  "schema_version": 1,
  "payload": {}
}
```

### Supported Events
`message.created`, `message.updated`, `message.deleted`, `membership.added`, `membership.removed`, `membership.role_changed`, `channel.updated`, `group.updated`, `user.deactivated`, `user.reactivated`, `user.banned`, `user.unbanned`, `presence.updated`, `typing.started`, `typing.stopped`.

### Dedupe and Ordering
Adapter dedupe events by `event_id`. Store reducer also records processed event ids and channel seq. Duplicate `message.created` must not duplicate messages.

### Optimistic Reconciliation
Pending messages are indexed by `clientMsgId`. When persisted `message.created` arrives, temp message is removed and persisted message replaces it.

## English

### Lifecycle
The realtime client should connect after authenticated app load and disconnect on logout. After reconnect it calls the resync/bootstrap callback.

### Event Envelope
The adapter accepts snake_case and camelCase:

```json
{
  "event_id": "uuid",
  "event_type": "message.created",
  "aggregate_type": "message",
  "aggregate_id": "uuid",
  "channel_id": "uuid",
  "actor_id": "uuid",
  "server_ts": "iso-date",
  "seq": 123,
  "schema_version": 1,
  "payload": {}
}
```

### Supported Events
`message.created`, `message.updated`, `message.deleted`, `membership.added`, `membership.removed`, `membership.role_changed`, `channel.updated`, `group.updated`, `user.deactivated`, `user.reactivated`, `user.banned`, `user.unbanned`, `presence.updated`, `typing.started`, `typing.stopped`.

### Dedupe and Ordering
The adapter dedupes events by `event_id`. The store reducer also records processed event ids and channel seq. Duplicate `message.created` must not duplicate messages.

### Optimistic Reconciliation
Pending messages are indexed by `clientMsgId`. When the persisted `message.created` arrives, the temp message is removed and replaced by the persisted message.
