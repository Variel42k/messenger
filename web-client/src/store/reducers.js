import { AUTH_STATUS, CONNECTION_STATUS, createInitialState } from './initialState';

export const ACTIONS = {
  sessionBootstrapped: 'session/bootstrapped',
  sessionLoggedOut: 'session/logged_out',
  connectionStatusChanged: 'session/connection_status_changed',
  accessRevoked: 'session/access_revoked',
  bootstrapReceived: 'bootstrap/received',
  groupsReceived: 'groups/received',
  groupReceived: 'groups/received_one',
  channelsReceived: 'channels/received',
  channelReceived: 'channels/received_one',
  membershipsReceived: 'memberships/received',
  usersReceived: 'users/received',
  messagesReceived: 'messages/received',
  optimisticMessageAdded: 'messages/optimistic_added',
  messageSendFailed: 'messages/send_failed',
  realtimeEventApplied: 'realtime/event_applied',
  uiSelected: 'ui/selected',
  drawerOpened: 'ui/drawer_opened',
  drawerClosed: 'ui/drawer_closed',
  dialogOpened: 'ui/dialog_opened',
  dialogClosed: 'ui/dialog_closed',
  toastQueued: 'ui/toast_queued',
  toastDismissed: 'ui/toast_dismissed',
  mobileNavigated: 'navigation/mobile_navigated',
  mobileRestored: 'navigation/mobile_restored',
  viewportChanged: 'ui/viewport_changed',
  bottomSheetOpened: 'ui/bottom_sheet_opened',
  bottomSheetClosed: 'ui/bottom_sheet_closed',
  mobileDialogOpened: 'ui/mobile_dialog_opened',
  mobileDialogClosed: 'ui/mobile_dialog_closed',
  draftUpdated: 'messages/draft_updated',
  scrollAnchorUpdated: 'messages/scroll_anchor_updated',
};

const EMPTY_ARRAY = Object.freeze([]);

function ensureArray(value) {
  if (!value) {
    return [];
  }
  return Array.isArray(value) ? value : [value];
}

function pickId(entity) {
  return entity?.id ?? entity?.uuid ?? entity?.userId ?? entity?.groupId ?? entity?.channelId ?? null;
}

function toCamelPermissions(permissions = {}) {
  return {
    canView: permissions.canView ?? permissions.can_view ?? false,
    canPost: permissions.canPost ?? permissions.can_post ?? false,
    canEditOwnMessages: permissions.canEditOwnMessages ?? permissions.can_edit_own_messages ?? false,
    canDeleteOwnMessages: permissions.canDeleteOwnMessages ?? permissions.can_delete_own_messages ?? false,
    canDeleteAnyMessage: permissions.canDeleteAnyMessage ?? permissions.can_delete_any_message ?? false,
    canManageMembers: permissions.canManageMembers ?? permissions.can_manage_members ?? false,
    canChangeRoles: permissions.canChangeRoles ?? permissions.can_change_roles ?? false,
    canBanMembers: permissions.canBanMembers ?? permissions.can_ban_members ?? false,
    canManageChannel: permissions.canManageChannel ?? permissions.can_manage_channel ?? false,
    canManageGroup: permissions.canManageGroup ?? permissions.can_manage_group ?? false,
    canViewAuditLog: permissions.canViewAuditLog ?? permissions.can_view_audit_log ?? false,
  };
}

function normalizeUser(user) {
  if (!user) {
    return null;
  }
  const id = user.id ?? user.userId ?? user.username;
  if (id == null) {
    return null;
  }
  return {
    ...user,
    id,
    username: user.username ?? user.login ?? user.email ?? `user-${id}`,
    displayName: user.displayName ?? user.name ?? user.username ?? user.email ?? `User ${id}`,
    email: user.email ?? null,
    role: user.role ?? user.globalRole ?? null,
    status: user.status ?? (user.deactivatedAt || user.deactivated_at ? 'deactivated' : 'active'),
    deactivatedAt: user.deactivatedAt ?? user.deactivated_at ?? null,
    bannedUntil: user.bannedUntil ?? user.banned_until ?? null,
    deletedAt: user.deletedAt ?? user.deleted_at ?? null,
    gdprPurgedAt: user.gdprPurgedAt ?? user.gdpr_purged_at ?? null,
  };
}

function normalizeGroup(group) {
  if (!group) {
    return null;
  }
  const id = group.id ?? group.groupId;
  if (id == null) {
    return null;
  }
  return {
    ...group,
    id,
    title: group.title ?? group.name ?? `Group ${id}`,
    slug: group.slug ?? String(id),
    visibility: group.visibility ?? 'private',
    archived: Boolean(group.archived ?? group.isArchived ?? group.archived_at),
    memberCount: group.memberCount ?? group.member_count ?? null,
    unreadCount: group.unreadCount ?? group.unread_count ?? 0,
    permissions: toCamelPermissions(group.permissions),
    role: group.role ?? group.userRole ?? group.user_role ?? null,
  };
}

function normalizeChannel(channel) {
  if (!channel) {
    return null;
  }
  const id = channel.id ?? channel.channelId;
  if (id == null) {
    return null;
  }
  const groupId = channel.groupId ?? channel.group_id ?? null;
  return {
    ...channel,
    id,
    groupId,
    title: channel.title ?? channel.name ?? `Channel ${id}`,
    slug: channel.slug ?? String(id),
    kind: channel.kind ?? channel.type ?? 'public',
    readonly: Boolean(channel.readonly ?? channel.readOnly ?? channel.isReadonly ?? channel.is_readonly),
    archived: Boolean(channel.archived ?? channel.isArchived ?? channel.archived_at),
    unreadCount: channel.unreadCount ?? channel.unread_count ?? 0,
    permissions: toCamelPermissions(channel.permissions),
    role: channel.role ?? channel.userRole ?? channel.user_role ?? null,
    lastMessagePreview: channel.lastMessagePreview ?? channel.last_message_preview ?? null,
  };
}

function normalizeMembership(membership) {
  if (!membership) {
    return null;
  }
  const userId = membership.userId ?? membership.user_id ?? membership.user?.id ?? null;
  const groupId = membership.groupId ?? membership.group_id ?? null;
  const channelId = membership.channelId ?? membership.channel_id ?? null;
  const scopeType = channelId != null ? 'channel' : 'group';
  const scopeId = channelId ?? groupId;
  if (userId == null || scopeId == null) {
    return null;
  }
  const id = membership.id ?? `${scopeType}:${scopeId}:${userId}`;
  return {
    ...membership,
    id,
    userId,
    groupId,
    channelId,
    scopeType,
    scopeId,
    role: membership.role ?? 'member',
    state: membership.state ?? 'active',
    joinedAt: membership.joinedAt ?? membership.joined_at ?? null,
    leftAt: membership.leftAt ?? membership.left_at ?? null,
    permissions: toCamelPermissions(membership.permissions),
  };
}

function normalizeMessage(message, fallback = {}) {
  if (!message) {
    return null;
  }
  const id = message.id ?? message.messageId ?? fallback.id ?? fallback.aggregateId;
  const clientMsgId = message.clientMsgId ?? message.client_msg_id ?? fallback.clientMsgId ?? null;
  const channelId = message.channelId ?? message.channel_id ?? fallback.channelId ?? null;
  if (id == null || channelId == null) {
    return null;
  }
  const deletedAt = message.deletedAt ?? message.deleted_at ?? null;
  return {
    ...message,
    id,
    channelId,
    clientMsgId,
    authorId: message.authorId ?? message.author_id ?? message.senderId ?? message.sender_id ?? null,
    body: message.body ?? message.content ?? '',
    attachments: message.attachments ?? [],
    createdAt: message.createdAt ?? message.created_at ?? message.timestamp ?? fallback.createdAt ?? null,
    updatedAt: message.updatedAt ?? message.updated_at ?? null,
    editedAt: message.editedAt ?? message.edited_at ?? null,
    deletedAt,
    status: deletedAt ? 'deleted' : (message.status ?? fallback.status ?? 'persisted'),
    error: message.error ?? null,
    author: normalizeUser(message.author ?? message.sender),
  };
}

function upsertEntities(slice, entities) {
  const byId = { ...slice.byId };
  const ids = new Set(slice.allIds || EMPTY_ARRAY);

  ensureArray(entities).forEach((entity) => {
    const normalized = entity;
    const id = pickId(normalized);
    if (id == null) {
      return;
    }
    byId[id] = { ...(byId[id] || {}), ...normalized };
    ids.add(id);
  });

  return {
    ...slice,
    byId,
    allIds: Array.from(ids),
  };
}

function removeId(ids = EMPTY_ARRAY, id) {
  return ids.filter((item) => String(item) !== String(id));
}

function addUnique(ids = EMPTY_ARRAY, id) {
  if (id == null || ids.some((item) => String(item) === String(id))) {
    return ids;
  }
  return [...ids, id];
}

function normalizeMobileStack(stack, fallback = ['groups']) {
  const nextStack = ensureArray(stack).filter(Boolean);
  return nextStack.length > 0 ? nextStack : fallback;
}

function upsertUsers(usersSlice, users) {
  const normalized = ensureArray(users).map(normalizeUser).filter(Boolean);
  const next = upsertEntities(usersSlice, normalized);
  const status = { ...next.status };
  const roles = { ...next.roles };
  const presence = { ...next.presence };

  normalized.forEach((user) => {
    status[user.id] = user.status;
    roles[user.id] = user.role;
    if (user.presence) {
      presence[user.id] = user.presence;
    }
  });

  return { ...next, status, roles, presence };
}

function upsertGroups(groupsSlice, groups, options = {}) {
  const normalized = ensureArray(groups).map(normalizeGroup).filter(Boolean);
  const next = upsertEntities(groupsSlice, normalized);
  const userGroupIds = options.replaceUserGroups
    ? normalized.map((group) => group.id)
    : normalized.reduce((ids, group) => addUnique(ids, group.id), next.userGroupIds);

  return { ...next, userGroupIds };
}

function upsertChannels(channelsSlice, channels, options = {}) {
  const normalized = ensureArray(channels).map(normalizeChannel).filter(Boolean);
  const next = {
    ...channelsSlice,
    byId: { ...channelsSlice.byId },
    byGroupId: options.replaceByGroupId ? { ...channelsSlice.byGroupId, [options.replaceByGroupId]: [] } : { ...channelsSlice.byGroupId },
  };

  normalized.forEach((channel) => {
    next.byId[channel.id] = { ...(next.byId[channel.id] || {}), ...channel };
    if (channel.groupId != null) {
      next.byGroupId[channel.groupId] = addUnique(next.byGroupId[channel.groupId] || [], channel.id);
    }
  });

  return next;
}

function upsertMemberships(membershipsSlice, memberships) {
  const normalized = ensureArray(memberships).map(normalizeMembership).filter(Boolean);
  const byId = { ...membershipsSlice.byId };
  const byScope = { ...membershipsSlice.byScope };
  const byUser = { ...membershipsSlice.byUser };

  normalized.forEach((membership) => {
    byId[membership.id] = { ...(byId[membership.id] || {}), ...membership };
    const scopeKey = `${membership.scopeType}:${membership.scopeId}`;
    byScope[scopeKey] = addUnique(byScope[scopeKey] || [], membership.id);
    byUser[membership.userId] = addUnique(byUser[membership.userId] || [], membership.id);
  });

  return { ...membershipsSlice, byId, byScope, byUser };
}

function upsertMessages(messagesSlice, messages, options = {}) {
  const normalized = ensureArray(messages).map((message) => normalizeMessage(message)).filter(Boolean);
  const byId = { ...messagesSlice.byId };
  const idsByChannel = { ...messagesSlice.idsByChannel };
  const pendingByClientMsgId = { ...messagesSlice.pendingByClientMsgId };
  const failedByClientMsgId = { ...messagesSlice.failedByClientMsgId };

  normalized.forEach((message) => {
    const pendingId = message.clientMsgId ? pendingByClientMsgId[message.clientMsgId] : null;
    if (pendingId && pendingId !== message.id) {
      delete byId[pendingId];
      idsByChannel[message.channelId] = removeId(idsByChannel[message.channelId] || [], pendingId);
    }

    byId[message.id] = {
      ...(byId[message.id] || {}),
      ...message,
      status: options.status || message.status || 'persisted',
      error: null,
    };
    idsByChannel[message.channelId] = addUnique(idsByChannel[message.channelId] || [], message.id);

    if (message.clientMsgId) {
      delete pendingByClientMsgId[message.clientMsgId];
      delete failedByClientMsgId[message.clientMsgId];
    }
  });

  return {
    ...messagesSlice,
    byId,
    idsByChannel,
    pendingByClientMsgId,
    failedByClientMsgId,
    cursorByChannel: options.cursorByChannel || messagesSlice.cursorByChannel,
    hasMoreByChannel: options.hasMoreByChannel || messagesSlice.hasMoreByChannel,
  };
}

function addOptimisticMessage(messagesSlice, draft) {
  const clientMsgId = draft.clientMsgId ?? draft.client_msg_id;
  const channelId = draft.channelId ?? draft.channel_id;
  const id = draft.id ?? `temp:${clientMsgId}`;
  const message = normalizeMessage(
    {
      ...draft,
      id,
      clientMsgId,
      channelId,
      status: 'pending',
      createdAt: draft.createdAt || new Date().toISOString(),
    },
    { status: 'pending' },
  );

  if (!message) {
    return messagesSlice;
  }
  const failedByClientMsgId = { ...messagesSlice.failedByClientMsgId };
  delete failedByClientMsgId[message.clientMsgId];

  return {
    ...messagesSlice,
    byId: { ...messagesSlice.byId, [message.id]: message },
    idsByChannel: {
      ...messagesSlice.idsByChannel,
      [message.channelId]: addUnique(messagesSlice.idsByChannel[message.channelId] || [], message.id),
    },
    pendingByClientMsgId: {
      ...messagesSlice.pendingByClientMsgId,
      [message.clientMsgId]: message.id,
    },
    failedByClientMsgId,
  };
}

function markMessageFailed(messagesSlice, { clientMsgId, error }) {
  const tempId = messagesSlice.pendingByClientMsgId[clientMsgId];
  if (!tempId || !messagesSlice.byId[tempId]) {
    return messagesSlice;
  }
  return {
    ...messagesSlice,
    byId: {
      ...messagesSlice.byId,
      [tempId]: { ...messagesSlice.byId[tempId], status: 'failed', error: error || 'send_failed' },
    },
    failedByClientMsgId: {
      ...messagesSlice.failedByClientMsgId,
      [clientMsgId]: error || 'send_failed',
    },
  };
}

function removeChannelAccess(state, channelId, reason = 'membership_removed') {
  if (channelId == null) {
    return state;
  }
  const channel = state.channels.byId[channelId];
  const nextChannels = {
    ...state.channels,
    byId: {
      ...state.channels.byId,
      [channelId]: {
        ...(channel || { id: channelId }),
        permissions: {
          ...(channel?.permissions || {}),
          canView: false,
          canPost: false,
          reason,
        },
      },
    },
  };

  if (channel?.groupId != null) {
    nextChannels.byGroupId = {
      ...state.channels.byGroupId,
      [channel.groupId]: removeId(state.channels.byGroupId[channel.groupId] || [], channelId),
    };
  }

  return {
    ...state,
    channels: nextChannels,
    navigation: state.navigation?.selectedChannelId === channelId
      ? {
        ...state.navigation,
        selectedChannelId: null,
        accessRevokedReason: reason,
        previousScreen: 'channel',
        mobileStack: ['groups', 'channels', 'accessRevoked'],
      }
      : { ...state.navigation, accessRevokedReason: reason },
    ui: state.ui.selectedChannelId === channelId
      ? { ...state.ui, selectedChannelId: null, activePane: 'channels' }
      : state.ui,
  };
}

function applyMessageDeleted(messagesSlice, message) {
  const normalized = normalizeMessage(message);
  if (!normalized) {
    return messagesSlice;
  }
  const current = messagesSlice.byId[normalized.id] || {};
  return {
    ...messagesSlice,
    byId: {
      ...messagesSlice.byId,
      [normalized.id]: {
        ...current,
        ...normalized,
        body: normalized.body || current.body || '',
        deletedAt: normalized.deletedAt || new Date().toISOString(),
        status: 'deleted',
      },
    },
  };
}

function applyRealtimeEvent(state, event) {
  const eventId = event.event_id ?? event.eventId;
  const eventType = event.event_type ?? event.type;
  const channelId = event.channel_id ?? event.channelId ?? event.payload?.channelId ?? event.payload?.channel_id;
  const seq = event.seq ?? event.sequence ?? null;

  if (eventId && state.realtime.processedEventIds[eventId]) {
    return state;
  }

  if (channelId != null && seq != null) {
    const currentSeq = state.realtime.channelSeqByChannel[channelId];
    if (currentSeq != null && Number(seq) <= Number(currentSeq)) {
      return {
        ...state,
        realtime: {
          ...state.realtime,
          processedEventIds: eventId
            ? { ...state.realtime.processedEventIds, [eventId]: true }
            : state.realtime.processedEventIds,
        },
      };
    }
  }

  const payload = event.payload || {};
  let nextState = state;

  switch (eventType) {
    case 'message.created':
      nextState = {
        ...nextState,
        messages: upsertMessages(nextState.messages, payload.message || payload, { status: 'persisted' }),
      };
      break;
    case 'message.updated':
      nextState = {
        ...nextState,
        messages: upsertMessages(nextState.messages, payload.message || payload, { status: 'persisted' }),
      };
      break;
    case 'message.deleted':
      nextState = {
        ...nextState,
        messages: applyMessageDeleted(nextState.messages, payload.message || payload),
      };
      break;
    case 'membership.added':
    case 'membership.role_changed':
      nextState = {
        ...nextState,
        memberships: upsertMemberships(nextState.memberships, payload.membership || payload),
      };
      break;
    case 'membership.removed': {
      const membership = normalizeMembership(payload.membership || payload);
      if (membership) {
        nextState = {
          ...nextState,
          memberships: upsertMemberships(nextState.memberships, { ...membership, state: 'removed', leftAt: membership.leftAt || new Date().toISOString() }),
        };
        if (String(membership.userId) === String(nextState.session.currentUserId)) {
          nextState = removeChannelAccess(nextState, membership.channelId, 'membership_removed');
        }
      }
      break;
    }
    case 'channel.updated':
      nextState = {
        ...nextState,
        channels: upsertChannels(nextState.channels, payload.channel || payload),
      };
      break;
    case 'group.updated':
      nextState = {
        ...nextState,
        groups: upsertGroups(nextState.groups, payload.group || payload),
      };
      break;
    case 'user.deactivated':
    case 'user.banned':
    case 'user.reactivated':
    case 'user.unbanned': {
      const user = normalizeUser(payload.user || payload);
      const statusFromEvent = eventType.endsWith('deactivated')
        ? 'deactivated'
        : eventType.endsWith('banned')
          ? 'banned'
          : 'active';
      if (user) {
        nextState = {
          ...nextState,
          users: upsertUsers(nextState.users, { ...user, status: user.status || statusFromEvent }),
        };
        if (String(user.id) === String(nextState.session.currentUserId) && statusFromEvent !== 'active') {
          nextState = {
            ...nextState,
            session: {
              ...nextState.session,
              authStatus: AUTH_STATUS.anonymous,
              connectionStatus: CONNECTION_STATUS.forcedClosed,
              accessRevokedReason: statusFromEvent,
            },
            navigation: {
              ...nextState.navigation,
              selectedChannelId: null,
              accessRevokedReason: statusFromEvent,
              previousScreen: 'channel',
              mobileStack: ['accessRevoked'],
            },
          };
        }
      }
      break;
    }
    case 'presence.updated':
      nextState = {
        ...nextState,
        presence: {
          ...nextState.presence,
          byUserId: {
            ...nextState.presence.byUserId,
            [payload.userId ?? payload.user_id]: payload,
          },
        },
      };
      break;
    case 'typing.started':
    case 'typing.stopped': {
      const typingChannelId = payload.channelId ?? payload.channel_id ?? channelId;
      const typingUserId = payload.userId ?? payload.user_id;
      const current = new Set(nextState.presence.typingByChannel[typingChannelId] || []);
      if (eventType === 'typing.started') {
        current.add(typingUserId);
      } else {
        current.delete(typingUserId);
      }
      nextState = {
        ...nextState,
        presence: {
          ...nextState.presence,
          typingByChannel: {
            ...nextState.presence.typingByChannel,
            [typingChannelId]: Array.from(current).filter(Boolean),
          },
        },
      };
      break;
    }
    default:
      break;
  }

  return {
    ...nextState,
    realtime: {
      ...nextState.realtime,
      processedEventIds: eventId
        ? { ...nextState.realtime.processedEventIds, [eventId]: true }
        : nextState.realtime.processedEventIds,
      channelSeqByChannel: channelId != null && seq != null
        ? { ...nextState.realtime.channelSeqByChannel, [channelId]: seq }
        : nextState.realtime.channelSeqByChannel,
    },
  };
}

export function appReducer(state = createInitialState(), action = {}) {
  switch (action.type) {
    case ACTIONS.sessionBootstrapped:
      return {
        ...state,
        session: {
          ...state.session,
          currentUserId: action.payload?.user?.id ?? action.payload?.user?.userId ?? action.payload?.user?.username ?? null,
          authStatus: AUTH_STATUS.authenticated,
          globalRole: action.payload?.user?.role ?? action.payload?.user?.globalRole ?? null,
          permissions: action.payload?.permissions || {},
        },
        users: upsertUsers(state.users, action.payload?.user),
      };
    case ACTIONS.sessionLoggedOut:
      return createInitialState();
    case ACTIONS.connectionStatusChanged:
      return {
        ...state,
        session: { ...state.session, connectionStatus: action.payload?.status || CONNECTION_STATUS.idle },
      };
    case ACTIONS.accessRevoked:
      return {
        ...state,
        session: {
          ...state.session,
          authStatus: AUTH_STATUS.anonymous,
          connectionStatus: CONNECTION_STATUS.forcedClosed,
          accessRevokedReason: action.payload?.reason || 'access_revoked',
        },
        navigation: {
          ...state.navigation,
          selectedChannelId: null,
          accessRevokedReason: action.payload?.reason || 'access_revoked',
          previousScreen: state.navigation?.mobileStack?.at?.(-1) || state.ui.activePane,
          mobileStack: ['accessRevoked'],
        },
      };
    case ACTIONS.bootstrapReceived:
      return {
        ...state,
        users: upsertUsers(state.users, action.payload?.users || action.payload?.user),
        groups: upsertGroups(state.groups, action.payload?.groups, { replaceUserGroups: true }),
        channels: upsertChannels(state.channels, action.payload?.channels),
        memberships: upsertMemberships(state.memberships, action.payload?.memberships),
        realtime: {
          ...state.realtime,
          lastBootstrapAt: new Date().toISOString(),
        },
      };
    case ACTIONS.groupsReceived:
      return {
        ...state,
        groups: upsertGroups(state.groups, action.payload?.groups || action.payload, { replaceUserGroups: Boolean(action.payload?.replace) }),
      };
    case ACTIONS.groupReceived:
      return {
        ...state,
        groups: upsertGroups(state.groups, action.payload?.group || action.payload),
      };
    case ACTIONS.channelsReceived:
      return {
        ...state,
        channels: upsertChannels(state.channels, action.payload?.channels || action.payload, { replaceByGroupId: action.payload?.groupId }),
      };
    case ACTIONS.channelReceived:
      return {
        ...state,
        channels: upsertChannels(state.channels, action.payload?.channel || action.payload),
      };
    case ACTIONS.membershipsReceived:
      return {
        ...state,
        memberships: upsertMemberships(state.memberships, action.payload?.memberships || action.payload),
      };
    case ACTIONS.usersReceived:
      return {
        ...state,
        users: upsertUsers(state.users, action.payload?.users || action.payload),
      };
    case ACTIONS.messagesReceived:
      return {
        ...state,
        messages: upsertMessages(state.messages, action.payload?.messages || action.payload, {
          cursorByChannel: action.payload?.channelId
            ? { ...state.messages.cursorByChannel, [action.payload.channelId]: action.payload.cursor ?? null }
            : state.messages.cursorByChannel,
          hasMoreByChannel: action.payload?.channelId
            ? { ...state.messages.hasMoreByChannel, [action.payload.channelId]: Boolean(action.payload.hasMore) }
            : state.messages.hasMoreByChannel,
        }),
      };
    case ACTIONS.optimisticMessageAdded:
      return {
        ...state,
        messages: addOptimisticMessage(state.messages, action.payload),
      };
    case ACTIONS.messageSendFailed:
      return {
        ...state,
        messages: markMessageFailed(state.messages, action.payload || {}),
      };
    case ACTIONS.realtimeEventApplied:
      return applyRealtimeEvent(state, action.payload);
    case ACTIONS.uiSelected:
      return {
        ...state,
        channels: {
          ...state.channels,
          activeChannelId: action.payload?.channelId ?? state.channels.activeChannelId,
        },
        navigation: {
          ...state.navigation,
          selectedGroupId: action.payload?.groupId ?? state.navigation.selectedGroupId,
          selectedChannelId: action.payload?.channelId ?? state.navigation.selectedChannelId,
          mobileStack: normalizeMobileStack(action.payload?.mobileNavigationStack ?? state.navigation.mobileStack),
        },
        ui: {
          ...state.ui,
          selectedGroupId: action.payload?.groupId ?? state.ui.selectedGroupId,
          selectedChannelId: action.payload?.channelId ?? state.ui.selectedChannelId,
          activePane: action.payload?.activePane ?? state.ui.activePane,
          mobileNavigationStack: action.payload?.mobileNavigationStack ?? state.ui.mobileNavigationStack,
        },
      };
    case ACTIONS.mobileNavigated: {
      const previousScreen = state.navigation.mobileStack[state.navigation.mobileStack.length - 1] || null;
      const mobileStack = normalizeMobileStack(action.payload?.mobileStack || action.payload?.stack, state.navigation.mobileStack);
      return {
        ...state,
        channels: {
          ...state.channels,
          activeChannelId: action.payload?.selectedChannelId ?? action.payload?.channelId ?? state.channels.activeChannelId,
        },
        navigation: {
          ...state.navigation,
          selectedGroupId: action.payload?.selectedGroupId ?? action.payload?.groupId ?? state.navigation.selectedGroupId,
          selectedChannelId: action.payload?.selectedChannelId ?? action.payload?.channelId ?? state.navigation.selectedChannelId,
          mobileStack,
          previousScreen,
          returnTo: action.payload?.returnTo ?? state.navigation.returnTo,
          accessRevokedReason: action.payload?.accessRevokedReason ?? null,
        },
        ui: {
          ...state.ui,
          selectedGroupId: action.payload?.selectedGroupId ?? action.payload?.groupId ?? state.ui.selectedGroupId,
          selectedChannelId: action.payload?.selectedChannelId ?? action.payload?.channelId ?? state.ui.selectedChannelId,
          activePane: mobileStack[mobileStack.length - 1] || state.ui.activePane,
          mobileNavigationStack: mobileStack,
        },
      };
    }
    case ACTIONS.mobileRestored:
      return {
        ...state,
        navigation: {
          ...state.navigation,
          selectedGroupId: action.payload?.selectedGroupId ?? state.navigation.selectedGroupId,
          selectedChannelId: action.payload?.selectedChannelId ?? state.navigation.selectedChannelId,
          mobileStack: normalizeMobileStack(action.payload?.mobileStack || action.payload?.stack, state.navigation.mobileStack),
          previousScreen: action.payload?.previousScreen ?? state.navigation.previousScreen,
          returnTo: action.payload?.returnTo ?? state.navigation.returnTo,
        },
        ui: {
          ...state.ui,
          selectedGroupId: action.payload?.selectedGroupId ?? state.ui.selectedGroupId,
          selectedChannelId: action.payload?.selectedChannelId ?? state.ui.selectedChannelId,
          mobileNavigationStack: normalizeMobileStack(action.payload?.mobileStack || action.payload?.stack, state.ui.mobileNavigationStack),
        },
        channels: {
          ...state.channels,
          activeChannelId: action.payload?.selectedChannelId ?? state.channels.activeChannelId,
        },
      };
    case ACTIONS.viewportChanged:
      return {
        ...state,
        ui: {
          ...state.ui,
          keyboardVisible: Boolean(action.payload?.keyboardVisible),
          viewportHeight: action.payload?.viewportHeight ?? state.ui.viewportHeight,
          safeAreaInsets: action.payload?.safeAreaInsets ?? state.ui.safeAreaInsets,
        },
      };
    case ACTIONS.bottomSheetOpened:
      return { ...state, ui: { ...state.ui, activeBottomSheet: action.payload || null } };
    case ACTIONS.bottomSheetClosed:
      return { ...state, ui: { ...state.ui, activeBottomSheet: null } };
    case ACTIONS.mobileDialogOpened:
      return { ...state, ui: { ...state.ui, activeDialog: action.payload || null } };
    case ACTIONS.mobileDialogClosed:
      return { ...state, ui: { ...state.ui, activeDialog: null } };
    case ACTIONS.draftUpdated:
      return {
        ...state,
        messages: {
          ...state.messages,
          draftByChannel: {
            ...state.messages.draftByChannel,
            [action.payload?.channelId]: action.payload?.draft || '',
          },
        },
      };
    case ACTIONS.scrollAnchorUpdated:
      return {
        ...state,
        messages: {
          ...state.messages,
          scrollAnchorByChannel: {
            ...state.messages.scrollAnchorByChannel,
            [action.payload?.channelId]: action.payload?.anchor || null,
          },
        },
      };
    case ACTIONS.drawerOpened:
      return { ...state, ui: { ...state.ui, activeDrawer: action.payload?.drawer || null } };
    case ACTIONS.drawerClosed:
      return { ...state, ui: { ...state.ui, activeDrawer: null } };
    case ACTIONS.dialogOpened:
      return {
        ...state,
        ui: {
          ...state.ui,
          dialogs: { ...state.ui.dialogs, [action.payload?.name]: action.payload?.props || true },
        },
      };
    case ACTIONS.dialogClosed: {
      const dialogs = { ...state.ui.dialogs };
      delete dialogs[action.payload?.name];
      return { ...state, ui: { ...state.ui, dialogs } };
    }
    case ACTIONS.toastQueued:
      return {
        ...state,
        ui: {
          ...state.ui,
          toasts: [...state.ui.toasts, { id: action.payload?.id || Date.now(), ...action.payload }],
        },
      };
    case ACTIONS.toastDismissed:
      return {
        ...state,
        ui: {
          ...state.ui,
          toasts: state.ui.toasts.filter((toast) => toast.id !== action.payload?.id),
        },
      };
    default:
      return state;
  }
}

export const reducersForTests = {
  applyRealtimeEvent,
  addOptimisticMessage,
  normalizeMessage,
  normalizeChannel,
  normalizeGroup,
  normalizeMembership,
  normalizeUser,
  toCamelPermissions,
};
