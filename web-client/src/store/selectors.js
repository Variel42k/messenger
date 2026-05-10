export function selectCurrentUser(state) {
  return state.users.byId[state.session.currentUserId] || null;
}

export function selectUserGroups(state) {
  return state.groups.userGroupIds
    .map((id) => state.groups.byId[id])
    .filter((group) => group?.permissions?.canView !== false);
}

export function selectNavigation(state) {
  return state.navigation || {
    selectedGroupId: state.ui.selectedGroupId,
    selectedChannelId: state.ui.selectedChannelId,
    mobileStack: state.ui.mobileNavigationStack,
  };
}

export function selectSelectedGroup(state) {
  const groupId = selectNavigation(state).selectedGroupId;
  return groupId == null ? null : state.groups.byId[groupId] || null;
}

export function selectSelectedChannel(state) {
  const channelId = selectNavigation(state).selectedChannelId || state.channels.activeChannelId;
  return channelId == null ? null : state.channels.byId[channelId] || null;
}

export function selectChannelsForGroup(state, groupId) {
  return (state.channels.byGroupId[groupId] || [])
    .map((id) => state.channels.byId[id])
    .filter((channel) => channel?.permissions?.canView !== false);
}

export function selectMessagesForChannel(state, channelId) {
  return (state.messages.idsByChannel[channelId] || [])
    .map((id) => state.messages.byId[id])
    .filter(Boolean);
}

export function selectDraftForChannel(state, channelId) {
  return state.messages.draftByChannel[channelId] || '';
}

export function selectCanPostToChannel(state, channelId) {
  const channel = state.channels.byId[channelId];
  if (!channel?.permissions?.canView) {
    return { allowed: false, reason: 'no_channel_access' };
  }
  if (channel.archived) {
    return { allowed: false, reason: 'archived_channel' };
  }
  if (channel.readonly && !channel.permissions.canPost) {
    return { allowed: false, reason: 'readonly_channel' };
  }
  if (!channel.permissions.canPost) {
    return { allowed: false, reason: 'insufficient_role' };
  }
  if (state.session.accessRevokedReason) {
    return { allowed: false, reason: state.session.accessRevokedReason };
  }
  return { allowed: true, reason: null };
}

export function selectActiveDrawer(state) {
  return state.ui.activeDrawer;
}

export function selectActiveBottomSheet(state) {
  return state.ui.activeBottomSheet;
}
