# QA Matrix: Groups, Channels, RBAC, Realtime, Moderation

## API Regression

| Scenario | Expected result | Current coverage |
| --- | --- | --- |
| Create group | Active authenticated user becomes owner | Backend API implemented |
| Create channel | Group owner/admin can create channel | Backend API implemented |
| Add member | Moderator can add low-privilege member; admin/owner can add privileged roles | Backend API implemented |
| Remove member | Removed user has `LEFT` membership and loses access | Backend API implemented |
| Role change | Admin/owner can change role; moderator cannot promote to privileged roles | Backend API implemented |
| Readonly channel | Member cannot send; moderator/admin/owner can send | Unit covered |
| Message send | Requires active membership and no active ban | Backend API implemented |
| Message edit/delete | Author or room moderator/admin/owner only | Backend API implemented |
| clientMsgId retry | Duplicate send returns existing message without duplicate event | Unit covered |
| Deactivate user | Status becomes `DEACTIVATED`, HTTP access denied on next request | Backend API implemented |
| Ban user globally | Status becomes `BANNED`, sessions marked disconnected | Backend API implemented |
| Ban user from channel | Ban record created and membership left | Backend API implemented |
| Reactivate user | Status becomes `ACTIVE` | Backend API implemented |
| Historical messages after deactivation | Messages keep nullable `sender_id`; history remains readable for members | Migration implemented |
| Permission denial | Forbidden action returns 403 | Backend API implemented |

## WebSocket Contract

| Scenario | Expected event |
| --- | --- |
| Message send | `message.created` on `/topic/channels.{channelId}` |
| Message edit | `message.updated` |
| Message delete | `message.deleted` |
| Member add | `membership.added` |
| Member remove | `membership.removed` |
| Role change | `membership.role_changed` |
| Channel create/update | `channel.updated` |
| Deactivate user | `user.deactivated` on `/topic/users.{userId}` |
| Ban user | `user.banned` |

## E2E Cases To Add

- Admin deactivates a user; target user loses HTTP access on the next request.
- Moderator bans a member from a channel; member is removed from the channel list.
- Member loses access in realtime after ban/deactivation event.
- Message list stays stable after author deactivation.
- Desktop breakpoint: 3-column group/channel/message layout.
- Tablet breakpoint: split pane layout.
- Mobile breakpoint: single pane navigation.
- Keyboard navigation through group list, channel list, message composer, members drawer.
- Focus trap in deactivate and ban dialogs.
- Live region announces new incoming messages.
- Reduced-motion mode disables nonessential motion.

## Regression Checklist

- [ ] Create group/channel
- [ ] Add/remove member
- [ ] Role change
- [ ] Readonly channel
- [ ] Message send/edit/delete
- [ ] Optimistic send reconciliation
- [ ] Presence update
- [ ] Deactivate user
- [ ] Ban user
- [ ] Reactivate user
- [ ] Historical message visibility
- [ ] Permission denials
- [ ] Desktop responsive layout
- [ ] Tablet responsive layout
- [ ] Mobile responsive layout
- [ ] Accessibility keyboard/focus/ARIA pass
