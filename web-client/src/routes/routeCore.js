export const ROUTES = {
  app: '/app',
  groups: '/app/groups',
  group: (groupId) => `/app/groups/${groupId}`,
  groupChannels: (groupId) => `/app/groups/${groupId}/channels`,
  groupSettings: (groupId) => `/app/groups/${groupId}/settings`,
  groupMembers: (groupId) => `/app/groups/${groupId}/members`,
  channel: (channelId) => `/app/channels/${channelId}`,
  channelSettings: (channelId) => `/app/channels/${channelId}/settings`,
  channelMembers: (channelId) => `/app/channels/${channelId}/members`,
  adminUsers: '/app/admin/users',
  adminAudit: '/app/admin/audit',
  profile: (userId) => `/app/profile/${userId}`,
  help: '/help',
  security: '/app/security',
};

function asNumberOrString(value) {
  if (value == null || value === '') {
    return null;
  }
  return /^\d+$/.test(value) ? Number(value) : value;
}

export function parseRoute(pathname = '/') {
  const cleanPath = pathname.replace(/\/+$/, '') || '/';
  const segments = cleanPath.split('/').filter(Boolean);

  if (cleanPath === '/' || cleanPath === '/app') {
    return { name: 'app', pane: 'groups', params: {}, path: cleanPath };
  }

  if (cleanPath === '/help') {
    return { name: 'help', pane: 'help', params: {}, path: cleanPath };
  }

  if (cleanPath === '/app/security') {
    return { name: 'security', pane: 'security', params: {}, path: cleanPath };
  }

  if (segments[0] !== 'app') {
    return { name: 'legacy', pane: 'chat', params: {}, path: cleanPath };
  }

  if (segments[1] === 'groups' && segments.length === 2) {
    return { name: 'groups', pane: 'groups', params: {}, path: cleanPath };
  }

  if (segments[1] === 'groups' && segments[2]) {
    const groupId = asNumberOrString(segments[2]);
    if (segments[3] === 'channels') {
      return { name: 'groupChannels', pane: 'channels', params: { groupId }, path: cleanPath };
    }
    if (segments[3] === 'settings') {
      return { name: 'groupSettings', pane: 'groupSettings', params: { groupId }, path: cleanPath };
    }
    if (segments[3] === 'members') {
      return { name: 'groupMembers', pane: 'groupMembers', params: { groupId }, path: cleanPath };
    }
    return { name: 'group', pane: 'channels', params: { groupId }, path: cleanPath };
  }

  if (segments[1] === 'channels' && segments[2]) {
    const channelId = asNumberOrString(segments[2]);
    if (segments[3] === 'settings') {
      return { name: 'channelSettings', pane: 'channelSettings', params: { channelId }, path: cleanPath };
    }
    if (segments[3] === 'members') {
      return { name: 'channelMembers', pane: 'channelMembers', params: { channelId }, path: cleanPath };
    }
    return { name: 'channel', pane: 'messages', params: { channelId }, path: cleanPath };
  }

  if (segments[1] === 'admin' && segments[2] === 'users') {
    return { name: 'adminUsers', pane: 'adminUsers', params: {}, path: cleanPath };
  }

  if (segments[1] === 'admin' && segments[2] === 'audit') {
    return { name: 'adminAudit', pane: 'adminAudit', params: {}, path: cleanPath };
  }

  if (segments[1] === 'profile' && segments[2]) {
    return {
      name: 'profile',
      pane: 'profile',
      params: { userId: asNumberOrString(segments[2]) },
      path: cleanPath,
    };
  }

  return { name: 'notFound', pane: 'error', params: {}, path: cleanPath };
}

export function routeToLegacyView(route) {
  if (!route) {
    return 'chat';
  }
  if (route.name === 'adminUsers' || route.name === 'adminAudit') {
    return 'admin';
  }
  if (route.name === 'security') {
    return 'security';
  }
  if (route.name === 'help') {
    return 'help';
  }
  return 'chat';
}

export function pathForLegacyView(view) {
  if (view === 'admin') {
    return ROUTES.adminUsers;
  }
  if (view === 'security') {
    return ROUTES.security;
  }
  if (view === 'help') {
    return ROUTES.help;
  }
  return ROUTES.groups;
}
