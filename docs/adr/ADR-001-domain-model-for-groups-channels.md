# ADR-001 Domain Model For Groups And Channels

Status: Accepted

Date: 2026-05-07

## Context

The existing public API and schema are centered on `chats`, `chat_members`, and `messages`.
Production-grade groups and channels require room-scoped RBAC, membership lifecycle state, bans,
audit records, soft deletes, and idempotent message creation.

## Decision

Keep `chats` as the canonical storage table to avoid breaking existing `/api/chats` clients.
Expose production contracts through additive APIs:

- `POST /api/groups`
- `POST /api/groups/{groupId}/channels`
- `GET /api/channels/{channelId}`
- `GET /api/channels/{channelId}/messages`
- `POST /api/channels/{channelId}/messages`
- membership APIs under `/api/channels/{channelId}/members`

Groups are `chats.type = GROUP`. Channels are `chats.type = CHANNEL` with `parent_group_id`.
Compatibility database views `groups` and `channels` expose the target model without duplicating data.

Memberships remain in `chat_members`, now extended with `state`, `joined_at`, and `left_at`.
Messages remain in `messages`, now extended with `client_msg_id`, `edited_at`, and `deleted_at`.

## Consequences

Existing clients continue to work. New clients can use group/channel contracts immediately.
Future extraction into physical `groups` and `channels` tables would require ADR update and migration plan.

## Rollback

Run `server/src/main/resources/db/rollback/V11__Groups_channels_rbac_audit_soft_delete_rollback.sql`
after taking a database backup. Existing pre-V11 `/api/chats` behavior is preserved by the rollback.
