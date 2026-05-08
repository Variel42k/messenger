# ADR-002 Realtime Event Envelope

Status: Accepted

Date: 2026-05-07

## Context

Realtime clients need ordered, versioned, idempotent events for messages, membership changes,
channel changes, deactivation, and bans.

## Decision

All new realtime events use the `RealtimeEvent` envelope:

```json
{
  "eventId": "uuid",
  "type": "message.created",
  "channelId": 123,
  "sequence": 456,
  "schemaVersion": 1,
  "occurredAt": "2026-05-07T12:00:00",
  "payload": {}
}
```

Channel-scoped events are published to `/topic/channels.{channelId}`.
User-scoped administrative events are published to `/topic/users.{userId}`.

Supported event types in this increment:

- `message.created`
- `message.updated`
- `message.deleted`
- `membership.added`
- `membership.removed`
- `membership.role_changed`
- `channel.updated`
- `user.deactivated`
- `user.banned`
- `user.reactivated`

`sequence` is the persisted entity id for message and membership events where available.
`schemaVersion` allows additive envelope evolution without breaking consumers.

## Rollback

Clients can ignore unknown event fields. Server rollback is covered by the V11 rollback script.
