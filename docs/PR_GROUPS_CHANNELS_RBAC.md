# PR Draft: Production-Grade Groups, Channels, RBAC, Moderation, Realtime

## Title

Add production-grade groups/channels backend, RBAC, moderation, audit, realtime events, local topology

## Problem

The current messenger backend exposes chats and basic membership, but production group/channel workflows
need explicit contracts, room-scoped authorization, idempotent messages, soft deletes, bans, audit logging,
seed data, and a fuller local environment.

## Scope

- Add `/api/groups`, `/api/channels`, `/api/users/{id}/deactivate|ban|reactivate`.
- Add centralized `AccessControlService`.
- Add realtime event envelope and publisher.
- Add audit log, ban records, WebSocket session records.
- Add Flyway migrations, rollback scripts, and seed data.
- Add local compose healthchecks, MailHog, worker, seed-init, `.env.example`.
- Add backend tests for permission matrix, idempotency, and realtime contracts.

## DB Changes

- `users`: `deactivated_at`, `deleted_at`, `gdpr_purged_at`; partial unique indexes for active users.
- `chats`: `parent_group_id`, `is_readonly`, `deleted_at`.
- `chat_members`: `state`.
- `messages`: nullable `sender_id`, `client_msg_id`, `edited_at`, `deleted_at`, idempotency unique index.
- New tables: `user_bans`, `audit_log`, `ws_sessions`.
- Compatibility views: `groups`, `channels`.

## API Changes

New additive endpoints:

- `POST /api/groups`
- `POST /api/groups/{groupId}/channels`
- `GET /api/channels/{channelId}`
- `GET /api/channels/{channelId}/messages`
- `POST /api/channels/{channelId}/messages`
- `PATCH /api/messages/{messageId}`
- `DELETE /api/messages/{messageId}`
- `POST /api/channels/{channelId}/members`
- `PATCH /api/channels/{channelId}/members/{userId}`
- `DELETE /api/channels/{channelId}/members/{userId}`
- `POST /api/users/{userId}/deactivate`
- `POST /api/users/{userId}/ban`
- `POST /api/users/{userId}/reactivate`

Existing `/api/chats` and legacy message APIs are preserved.

## UI Changes

No frontend implementation in this increment. UI work remains pending for Group List, Channel List,
Channel View, Channel Settings, Members Drawer, Admin Users Screen, moderation dialogs, normalized state,
optimistic send, responsive layout, and accessibility.

## Realtime Changes

Adds versioned `RealtimeEvent` envelope and publishes:

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

## Security Impact

- Existing JWTs for deactivated/banned users are rejected on subsequent HTTP requests.
- Room-scoped authorization is centralized.
- Readonly and guest roles cannot send messages.
- Message edits/deletes require author or moderator/admin/owner rights.
- Admin/moderation changes write audit records.

## Migration / Rollback Plan

Apply Flyway V11 and V12. Roll back with:

- `server/src/main/resources/db/rollback/V12__Seed_groups_channels_messages_rollback.sql`
- `server/src/main/resources/db/rollback/V11__Groups_channels_rbac_audit_soft_delete_rollback.sql`

Take a database backup before rollback. Validate nullable `messages.sender_id` rows before restoring
legacy non-null author constraints.

## Test Evidence

- `server`: `./mvnw.cmd test`
- Result: 35 tests, 0 failures.

## Screenshots / Recordings

Not applicable. This increment is backend, migrations, docs, and local infrastructure.

## Checklist

- [x] ADR updated or not needed
- [x] Migrations added
- [x] Rollback documented
- [x] Unit tests added
- [ ] Integration tests added
- [ ] E2E tests added
- [x] Docs updated
- [ ] Accessibility reviewed
- [ ] Responsive reviewed
- [x] No hidden breaking changes
- [x] Audit logging added where needed
