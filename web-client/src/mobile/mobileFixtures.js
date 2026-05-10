export const MOBILE_FIXTURE_GROUPS = [
  {
    id: 'g-product',
    title: 'Product and launch coordination',
    slug: 'product',
    visibility: 'private',
    unreadCount: 4,
    memberCount: 12,
    role: 'owner',
    permissions: {
      canView: true,
      canPost: true,
      canManageGroup: true,
      canManageMembers: true,
      canViewAuditLog: true,
    },
  },
  {
    id: 'g-support',
    title: 'Support desk',
    slug: 'support',
    visibility: 'public',
    unreadCount: 1,
    memberCount: 28,
    role: 'moderator',
    permissions: {
      canView: true,
      canPost: true,
      canManageGroup: false,
      canManageMembers: true,
      canViewAuditLog: true,
    },
  },
  {
    id: 'g-archive',
    title: 'Archived incident room with a very long name',
    slug: 'archive',
    visibility: 'private',
    unreadCount: 0,
    memberCount: 7,
    role: 'readonly',
    archived: true,
    permissions: {
      canView: true,
      canPost: false,
      canManageGroup: false,
      canManageMembers: false,
      canViewAuditLog: false,
    },
  },
];

export const MOBILE_FIXTURE_CHANNELS = [
  {
    id: 'ch-general',
    groupId: 'g-product',
    title: 'General',
    slug: 'general',
    kind: 'public',
    unreadCount: 2,
    lastMessagePreview: 'Mobile shell is ready for QA.',
    role: 'owner',
    permissions: {
      canView: true,
      canPost: true,
      canEditOwnMessages: true,
      canDeleteOwnMessages: true,
      canDeleteAnyMessage: true,
      canManageMembers: true,
      canChangeRoles: true,
      canBanMembers: true,
      canManageChannel: true,
      canManageGroup: true,
      canViewAuditLog: true,
    },
  },
  {
    id: 'ch-announcements',
    groupId: 'g-product',
    title: 'Announcements readonly channel',
    slug: 'announcements',
    kind: 'announcement',
    readonly: true,
    unreadCount: 1,
    lastMessagePreview: 'Readonly release note is pinned.',
    role: 'member',
    permissions: {
      canView: true,
      canPost: false,
      canManageMembers: false,
      canManageChannel: true,
      canViewAuditLog: true,
    },
  },
  {
    id: 'ch-roadmap',
    groupId: 'g-product',
    title: 'Roadmap planning with long channel title',
    slug: 'roadmap',
    kind: 'private',
    unreadCount: 0,
    lastMessagePreview: 'Next checkpoint moved to Friday.',
    role: 'moderator',
    permissions: {
      canView: true,
      canPost: true,
      canManageMembers: true,
      canManageChannel: true,
      canViewAuditLog: true,
    },
  },
  {
    id: 'ch-triage',
    groupId: 'g-support',
    title: 'Triage',
    slug: 'triage',
    kind: 'public',
    unreadCount: 1,
    lastMessagePreview: 'New escalation assigned.',
    role: 'moderator',
    permissions: {
      canView: true,
      canPost: true,
      canManageMembers: true,
      canBanMembers: true,
      canManageChannel: true,
      canViewAuditLog: true,
    },
  },
  {
    id: 'ch-old-incident',
    groupId: 'g-archive',
    title: 'Old incident notes',
    slug: 'old-incident',
    kind: 'private',
    archived: true,
    unreadCount: 0,
    lastMessagePreview: 'History remains available.',
    role: 'readonly',
    permissions: {
      canView: true,
      canPost: false,
      canManageMembers: false,
      canManageChannel: false,
      canViewAuditLog: false,
    },
  },
];

export const MOBILE_FIXTURE_USERS = [
  { id: 'admin', username: 'admin', displayName: 'Admin User', email: 'admin@example.test', role: 'ADMIN', status: 'active', presence: 'online' },
  { id: 'u-moderator', username: 'mira', displayName: 'Mira Moderator', email: 'mira@example.test', role: 'MODERATOR', status: 'active', presence: 'online' },
  { id: 'u-member', username: 'niko', displayName: 'Niko Member', email: 'niko@example.test', role: 'USER', status: 'active', presence: 'offline' },
  { id: 'u-deactivated', username: 'former-user', displayName: 'Former User', email: 'former@example.test', role: 'USER', status: 'deactivated', presence: 'offline' },
  { id: 'u-banned', username: 'blocked-user', displayName: 'Blocked User', email: 'blocked@example.test', role: 'USER', status: 'banned', presence: 'offline' },
];

export const MOBILE_FIXTURE_MEMBERSHIPS = [
  { userId: 'admin', groupId: 'g-product', role: 'owner', state: 'active' },
  { userId: 'u-moderator', groupId: 'g-product', role: 'moderator', state: 'active' },
  { userId: 'u-member', groupId: 'g-product', role: 'member', state: 'active' },
  { userId: 'u-deactivated', groupId: 'g-product', role: 'member', state: 'active' },
  { userId: 'admin', channelId: 'ch-general', groupId: 'g-product', role: 'owner', state: 'active' },
  { userId: 'u-moderator', channelId: 'ch-general', groupId: 'g-product', role: 'moderator', state: 'active' },
  { userId: 'u-member', channelId: 'ch-general', groupId: 'g-product', role: 'member', state: 'active' },
  { userId: 'u-deactivated', channelId: 'ch-general', groupId: 'g-product', role: 'member', state: 'active' },
  { userId: 'u-banned', channelId: 'ch-general', groupId: 'g-product', role: 'member', state: 'banned' },
  { userId: 'admin', channelId: 'ch-announcements', groupId: 'g-product', role: 'owner', state: 'active' },
  { userId: 'u-member', channelId: 'ch-announcements', groupId: 'g-product', role: 'readonly', state: 'active' },
  { userId: 'admin', channelId: 'ch-triage', groupId: 'g-support', role: 'owner', state: 'active' },
  { userId: 'u-moderator', channelId: 'ch-triage', groupId: 'g-support', role: 'moderator', state: 'active' },
];

export const MOBILE_FIXTURE_MESSAGES = [
  {
    id: 'm-1',
    channelId: 'ch-general',
    authorId: 'u-moderator',
    body: 'Mobile channel view keeps the composer visible.',
    createdAt: new Date(Date.now() - 1000 * 60 * 40).toISOString(),
    status: 'persisted',
  },
  {
    id: 'm-2',
    channelId: 'ch-general',
    authorId: 'admin',
    body: 'Long press or use the action button to open message actions.',
    createdAt: new Date(Date.now() - 1000 * 60 * 22).toISOString(),
    status: 'persisted',
  },
  {
    id: 'm-3',
    channelId: 'ch-general',
    authorId: 'u-deactivated',
    body: 'This message remains visible after author deactivation.',
    createdAt: new Date(Date.now() - 1000 * 60 * 11).toISOString(),
    status: 'persisted',
  },
  {
    id: 'm-4',
    channelId: 'ch-announcements',
    authorId: 'admin',
    body: 'Readonly channels disable composer for regular members.',
    createdAt: new Date(Date.now() - 1000 * 60 * 9).toISOString(),
    status: 'persisted',
  },
  {
    id: 'm-5',
    channelId: 'ch-triage',
    authorId: 'u-moderator',
    body: 'Triage queue is calm right now.',
    createdAt: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
    status: 'persisted',
  },
];

export const MOBILE_FIXTURE_AUDIT = [
  { id: 'a-1', action: 'channel.updated', actor: 'admin', target: 'ch-announcements', createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString() },
  { id: 'a-2', action: 'membership.role_changed', actor: 'admin', target: 'u-moderator', createdAt: new Date(Date.now() - 1000 * 60 * 18).toISOString() },
  { id: 'a-3', action: 'user.deactivated', actor: 'admin', target: 'u-deactivated', createdAt: new Date(Date.now() - 1000 * 60 * 7).toISOString() },
];

export function createMobileFixtureBootstrap(currentUser) {
  const user = currentUser
    ? {
      id: currentUser.id ?? currentUser.userId ?? currentUser.username,
      username: currentUser.username,
      displayName: currentUser.displayName || currentUser.username,
      role: currentUser.role || currentUser.globalRole || 'USER',
      status: currentUser.status || 'active',
      ...currentUser,
    }
    : null;
  const users = user
    ? [user, ...MOBILE_FIXTURE_USERS.filter((item) => String(item.id) !== String(user.id))]
    : MOBILE_FIXTURE_USERS;

  return {
    users,
    groups: MOBILE_FIXTURE_GROUPS,
    channels: MOBILE_FIXTURE_CHANNELS,
    memberships: MOBILE_FIXTURE_MEMBERSHIPS,
    messages: MOBILE_FIXTURE_MESSAGES,
    audit: MOBILE_FIXTURE_AUDIT,
  };
}
