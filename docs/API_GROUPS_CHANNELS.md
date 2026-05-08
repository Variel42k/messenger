# Groups And Channels API

All endpoints require JWT authentication unless noted.

## Groups

### POST `/api/groups`

Request:

```json
{
  "name": "Engineering",
  "description": "Engineering workspace"
}
```

Response: `201 Created` with the persisted group chat.

Authorization: any active authenticated user.

## Channels

### POST `/api/groups/{groupId}/channels`

Request:

```json
{
  "name": "announcements",
  "description": "Readonly release notes",
  "readonly": true
}
```

Authorization: group owner/admin or system admin.

### GET `/api/channels/{channelId}`

Authorization: active channel membership or system admin. Global/channel bans are denied.

### GET `/api/channels/{channelId}/messages`

Authorization: same as channel read.

### POST `/api/channels/{channelId}/messages`

Request:

```json
{
  "content": "Hello",
  "clientMsgId": "web-1690000000-1"
}
```

`clientMsgId` is optional but recommended. Retrying the same `clientMsgId` for the same sender and channel
returns the existing message and does not create another persisted row.

Authorization:

- `MEMBER`, `MODERATOR`, `ADMIN`, `OWNER` can send in normal channels.
- Only `MODERATOR`, `ADMIN`, `OWNER` can send in readonly channels.
- `GUEST` and `READONLY` can read but cannot send.

## Membership

### POST `/api/channels/{channelId}/members`

Request:

```json
{
  "userId": 42,
  "role": "MEMBER"
}
```

Moderators can add low-privilege roles. Admins/owners can add privileged roles.

### PATCH `/api/channels/{channelId}/members/{userId}`

Request:

```json
{
  "role": "MODERATOR"
}
```

Authorization: channel admin/owner or system admin.

### DELETE `/api/channels/{channelId}/members/{userId}`

Soft-removes membership by setting `state = LEFT` and `left_at`.

Authorization: channel moderator/admin/owner or system admin.

## Messages

### PATCH `/api/messages/{messageId}`

Request:

```json
{
  "content": "Edited text"
}
```

Authorization: author, channel moderator/admin/owner, or system admin.

### DELETE `/api/messages/{messageId}`

Soft-deletes the message by setting `deleted_at` and clearing content.

Authorization: author, channel moderator/admin/owner, or system admin.

## User Moderation

### POST `/api/users/{userId}/deactivate`

Request:

```json
{
  "reason": "Offboarding"
}
```

Authorization: system admin.

### POST `/api/users/{userId}/ban`

Global ban:

```json
{
  "reason": "Policy violation"
}
```

Channel ban:

```json
{
  "channelId": 10,
  "reason": "Channel policy violation"
}
```

Authorization:

- Global ban: system admin.
- Channel ban: channel moderator/admin/owner or system admin.

### POST `/api/users/{userId}/reactivate`

Request:

```json
{
  "reason": "Appeal accepted"
}
```

Authorization: system admin.
