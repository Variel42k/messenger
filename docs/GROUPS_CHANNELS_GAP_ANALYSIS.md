# Groups, Channels, RBAC, Realtime Gap Analysis

Date: 2026-05-07

## Repository Audit

Manifests:

- Backend: `server/pom.xml`, Spring Boot 3.2, Java 17, JPA, Flyway, Redis, WebSocket/STOMP.
- Web: `web-client/package.json`, React 18, Webpack.
- Local infra: `docker-compose.yml`, PostgreSQL, Redis, LocalStack, server, web client.
- CI: `.github/workflows/ci.yml`.

Routes before this change:

- `/api/chats`
- `/api/messages/chat/{chatId}`
- `/api/messages/create`
- `/api/messages/with-file`
- `/api/auth/*`
- `/api/admin/*`
- `/ws`

Schema before this change:

- `users`, `chats`, `chat_members`, `messages`, `files`, `message_files`, `user_settings`,
  `delivery_receipts`, `refresh_tokens`, OIDC/federation tables.

Auth and realtime before this change:

- JWT filter authenticated requests.
- Deactivated users were disabled during login, but existing JWTs were not rejected.
- STOMP broker existed, but no versioned event envelope or room event publisher existed.

## 1. Group/Channel Domain Model

What exists now:

- `chats.type` already supports `GROUP` and `CHANNEL`.

What is broken/missing:

- No group-to-channel parent relation.
- No `/api/groups` or `/api/channels` contracts.

Proposed change:

- Keep `chats` canonical. Add `parent_group_id`, `is_readonly`, compatibility views `groups` and `channels`.
- Add `POST /api/groups`, `POST /api/groups/{groupId}/channels`, `GET /api/channels/{channelId}`.

Files to edit:

- `Chat`, `ChatService`, `GroupController`, `ChannelController`.
- `V11__Groups_channels_rbac_audit_soft_delete.sql`.

Migration plan:

- Add columns and indexes without deleting existing rows.
- Rollback script drops additive columns/views after backup.

Tests to add:

- Permission matrix and channel access tests.

Risks:

- Future physical split into `groups` and `channels` needs a new ADR and migration.

PR draft summary:

- Adds group/channel APIs as an adapter over the existing chat model.

## 2. Room-Scoped RBAC

What exists now:

- `ChatRole` has `MEMBER`, `MODERATOR`, `ADMIN`, `OWNER`.

What is broken/missing:

- No guest/readonly role.
- Removed members were hard-deleted.
- Authorization checks were duplicated in controllers.

Proposed change:

- Add `GUEST`, `READONLY`, `MembershipState`.
- Add `AccessControlService` for read, send, member management, role changes, and message mutation.

Files to edit:

- `ChatRole`, `MembershipState`, `UserChat`, `UserChatRepository`, `AccessControlService`.

Migration plan:

- Add `chat_members.state` default `ACTIVE`.

Tests to add:

- `AccessControlServiceTest`.

Risks:

- Existing hard-delete member behavior becomes leave-state behavior, but API response remains compatible.

PR draft summary:

- Centralizes room-scoped authorization and preserves historical membership data.

## 3. Realtime WSS Events

What exists now:

- STOMP broker configured at `/ws`.

What is broken/missing:

- No event schema, no publisher, no event contract tests.

Proposed change:

- Add `RealtimeEvent` envelope and `RealtimeEventPublisher`.
- Publish message, membership, channel, deactivation, ban, and reactivation events.

Files to edit:

- `RealtimeEvent`, `RealtimeEventPublisher`, controllers/services that mutate state.

Migration plan:

- No schema dependency except `ws_sessions` for session audit.

Tests to add:

- `RealtimeEventPublisherTest`.

Risks:

- Existing clients must subscribe to new `/topic/channels.{id}` destinations to receive the envelope.

PR draft summary:

- Introduces versioned realtime event envelopes for contract-safe clients.

## 4. Deactivate/Ban/Reactivate/Anonymize User Flows

What exists now:

- `users.status` has `ACTIVE`, `INACTIVE`, `BANNED`.

What is broken/missing:

- Existing JWTs were not rejected for disabled users.
- No moderation endpoints.
- No ban records or websocket session tracking.
- Anonymization is not implemented yet.

Proposed change:

- Add `DEACTIVATED`, timestamps, `user_bans`, `ws_sessions`.
- Add `/api/users/{userId}/deactivate`, `/ban`, `/reactivate`.
- Reject disabled users in `JwtAuthenticationFilter`.

Files to edit:

- `User`, `UserStatus`, `JwtAuthenticationFilter`, `UserModerationController`, `UserModerationService`.

Migration plan:

- Add nullable timestamps and ban/session tables.

Tests to add:

- Permission matrix covers disabled access. Add E2E for live session loss in the next UI increment.

Risks:

- Server-side WebSocket disconnect is represented in DB and event stream; transport-level forced close needs a STOMP auth/session interceptor follow-up.

PR draft summary:

- Adds moderation endpoints and immediate HTTP access loss for deactivated/banned users.

## 5. Audit Log

What exists now:

- Admin UI mentions audit logging, but no persistent table existed.

What is broken/missing:

- Administrative mutations were not recorded.

Proposed change:

- Add `audit_log` table and `AuditLogService`.
- Record group/channel/member/message/user moderation changes.

Files to edit:

- `AuditLog`, `AuditLogRepository`, `AuditLogService`, controllers.

Migration plan:

- Add table with indexes by actor, action, channel, created time.

Tests to add:

- Add repository-backed audit tests in the next integration-test pass.

Risks:

- Details are stored as text for now. If structured querying is needed, migrate to JSONB by ADR.

PR draft summary:

- Adds persistent audit trail for administrative operations.

## 6. Local Docker Compose Environment

What exists now:

- PostgreSQL, Redis, LocalStack, server, web client.

What is broken/missing:

- No mail catcher, worker, seed/init service, or healthcheck gating.

Proposed change:

- Add MailHog, worker, seed-init, healthchecks, `.env.example`, trace id injection.

Files to edit:

- `docker-compose.yml`, `.env.example`, `TraceIdFilter`, `application.yml`.

Migration plan:

- Compose-only additive services. Remove blocks to rollback.

Tests to add:

- CI `docker compose config` check.

Risks:

- Worker currently runs the same artifact on an internal port until dedicated job processing lands.

PR draft summary:

- Makes local topology closer to production and easier to test.

## 7. Seed Data

What exists now:

- Only default admin data exists.

What is broken/missing:

- No realistic groups, channels, members, messages, deactivated users, or banned users.

Proposed change:

- Add V12 seed migration with 3 moderators, 20 users, 5 groups, 20 channels, 1000 messages,
  2 deactivated users, and 2 banned users.

Files to edit:

- `V12__Seed_groups_channels_messages.sql`.

Migration plan:

- Add deterministic seed rows identified by `Seed ...` names and `seed-*` client ids.

Tests to add:

- Migration smoke in CI.

Risks:

- Seed data should not be enabled in production environments that require empty tenancy.

PR draft summary:

- Adds reproducible local development data.

## 8. API And E2E Tests

What exists now:

- Backend unit tests for auth, encryption, files, TOTP.

What is broken/missing:

- No API tests for new endpoints.
- No browser E2E suite in this repo.

Proposed change:

- Add unit/contract coverage now.
- Add API and E2E suites as the next frontend increment once the UI consumes the new contracts.

Files to edit:

- `AccessControlServiceTest`, `MessageServiceIdempotencyTest`, `RealtimeEventPublisherTest`.
- `.github/workflows/ci.yml`.

Migration plan:

- Test-only additions.

Tests to add:

- Current increment: permission matrix, idempotency, realtime envelope.
- Next increment: MockMvc endpoint tests and browser E2E for admin deactivation, moderator ban, realtime access loss.

Risks:

- Without frontend integration, acceptance for responsive UI and optimistic reconciliation remains pending.

PR draft summary:

- Raises backend regression coverage and documents the remaining E2E work.
