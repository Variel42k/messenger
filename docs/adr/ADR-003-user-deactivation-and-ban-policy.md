# ADR-003 User Deactivation And Ban Policy

Status: Accepted

Date: 2026-05-07

## Context

Users may need to be deactivated, globally banned, channel-banned, reactivated, or later anonymized
without breaking conversation history or foreign keys.

## Decision

Use `users.status` as the primary access gate:

- `ACTIVE`: user can authenticate and act according to memberships.
- `DEACTIVATED`: user cannot authenticate or use existing JWTs on subsequent HTTP requests.
- `BANNED`: global ban. User cannot authenticate or use existing JWTs on subsequent HTTP requests.

Keep historical messages by making `messages.sender_id` nullable and using `ON DELETE SET NULL`.
Message content is soft-deleted with `messages.deleted_at`, not hard-deleted through the API.

Use `user_bans` for ban records:

- `scope_channel_id = null`: global ban.
- `scope_channel_id = channel id`: channel ban.

Channel bans remove active membership from the channel. Global deactivation and global bans mark active
WebSocket sessions as disconnected in `ws_sessions` and publish user-scoped events.

Administrative operations are written to `audit_log`.

## Rollback

Use the V11 rollback script after backup. If restoring pre-V11 hard delete behavior, validate that no
messages with `sender_id IS NULL` remain before reintroducing a non-null author constraint.
