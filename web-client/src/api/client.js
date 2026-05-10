import { ApiError, normalizeApiError } from './errors';

const DEFAULT_BASE_URL = '';

function stripTrailingSlash(value) {
  return value ? value.replace(/\/+$/, '') : '';
}

function buildQuery(query) {
  if (!query) {
    return '';
  }
  const params = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value == null || value === '') {
      return;
    }
    if (Array.isArray(value)) {
      value.forEach((item) => params.append(key, item));
    } else {
      params.set(key, value);
    }
  });
  const queryString = params.toString();
  return queryString ? `?${queryString}` : '';
}

async function parseBody(response) {
  if (response.status === 204) {
    return null;
  }
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    return response.json();
  }
  const text = await response.text();
  return text ? { message: text } : null;
}

function legacyChatsToGroups(chats = []) {
  const group = {
    id: 'legacy-direct',
    title: 'Direct messages',
    slug: 'direct-messages',
    visibility: 'private',
    permissions: { canView: true, canPost: true },
  };
  const channels = chats.map((chat) => ({
    id: chat.id,
    groupId: group.id,
    title: chat.name || chat.title || `Chat ${chat.id}`,
    slug: String(chat.id),
    kind: chat.type || 'private',
    permissions: { canView: true, canPost: true },
    lastMessagePreview: chat.lastMessage || chat.last_message || null,
    ...chat,
  }));
  return { groups: [group], channels };
}

export function createApiClient(options = {}) {
  const {
    baseUrl = DEFAULT_BASE_URL,
    getAccessToken = () => null,
    onUnauthorized,
    fetchImpl = globalThis.fetch ? globalThis.fetch.bind(globalThis) : null,
  } = options;
  const root = stripTrailingSlash(baseUrl);

  async function request(path, requestOptions = {}) {
    if (!fetchImpl) {
      throw new ApiError('Fetch API is not available in this runtime.', { status: 0, code: 'fetch_unavailable' });
    }
    const {
      method = 'GET',
      body,
      headers = {},
      signal,
      query,
      retry = false,
    } = requestOptions;
    const url = `${root}${path}${buildQuery(query)}`;
    const accessToken = getAccessToken();
    const requestHeaders = {
      Accept: 'application/json',
      ...headers,
    };

    if (body != null && !(body instanceof FormData)) {
      requestHeaders['Content-Type'] = 'application/json';
    }
    if (accessToken) {
      requestHeaders.Authorization = `Bearer ${accessToken}`;
    }

    const execute = async () => {
      const response = await fetchImpl(url, {
        method,
        headers: requestHeaders,
        body: body == null || body instanceof FormData ? body : JSON.stringify(body),
        signal,
      });
      const data = await parseBody(response);

      if (!response.ok) {
        const error = new ApiError(data?.message || data?.error || response.statusText, {
          status: response.status,
          code: data?.code || `http_${response.status}`,
          details: data?.details || data?.errors || data,
          response,
        });
        if (error.isUnauthorized && onUnauthorized) {
          onUnauthorized(error);
        }
        throw error;
      }

      return data;
    };

    try {
      return await execute();
    } catch (error) {
      const normalized = normalizeApiError(error);
      if (retry && normalized.status === 0 && method === 'GET') {
        return execute();
      }
      throw normalized;
    }
  }

  async function requestWithFallback(primaryPath, fallbackPath, optionsForRequest, mapper = (value) => value) {
    try {
      return await request(primaryPath, optionsForRequest);
    } catch (error) {
      if (error.status !== 404 && error.status !== 405) {
        throw error;
      }
      const fallback = await request(fallbackPath, optionsForRequest);
      return mapper(fallback);
    }
  }

  return {
    request,
    groups: {
      listGroups: (options = {}) => requestWithFallback('/api/groups', '/api/chats', {
        signal: options.signal,
        query: options.query,
      }, (data) => legacyChatsToGroups(data?.items || data?.chats || data || []).groups),
      createGroup: (payload, options = {}) => request('/api/groups', { method: 'POST', body: payload, signal: options.signal }),
      getGroup: (groupId, options = {}) => request(`/api/groups/${groupId}`, { signal: options.signal }),
      updateGroup: (groupId, payload, options = {}) => request(`/api/groups/${groupId}`, { method: 'PATCH', body: payload, signal: options.signal }),
      listGroupMembers: (groupId, options = {}) => request(`/api/groups/${groupId}/members`, { signal: options.signal, query: options.query }),
      addGroupMember: (groupId, payload, options = {}) => request(`/api/groups/${groupId}/members`, { method: 'POST', body: payload, signal: options.signal }),
      updateGroupMember: (groupId, userId, payload, options = {}) => request(`/api/groups/${groupId}/members/${userId}`, { method: 'PATCH', body: payload, signal: options.signal }),
      removeGroupMember: (groupId, userId, options = {}) => request(`/api/groups/${groupId}/members/${userId}`, { method: 'DELETE', signal: options.signal }),
    },
    channels: {
      listChannels: (groupId, options = {}) => requestWithFallback(`/api/groups/${groupId}/channels`, '/api/chats', {
        signal: options.signal,
        query: options.query,
      }, (data) => legacyChatsToGroups(data?.items || data?.chats || data || []).channels),
      createChannel: (groupId, payload, options = {}) => request(`/api/groups/${groupId}/channels`, { method: 'POST', body: payload, signal: options.signal }),
      getChannel: (channelId, options = {}) => request(`/api/channels/${channelId}`, { signal: options.signal }),
      updateChannel: (channelId, payload, options = {}) => request(`/api/channels/${channelId}`, { method: 'PATCH', body: payload, signal: options.signal }),
      listChannelMembers: (channelId, options = {}) => request(`/api/channels/${channelId}/members`, { signal: options.signal, query: options.query }),
      addChannelMember: (channelId, payload, options = {}) => request(`/api/channels/${channelId}/members`, { method: 'POST', body: payload, signal: options.signal }),
      updateChannelMember: (channelId, userId, payload, options = {}) => request(`/api/channels/${channelId}/members/${userId}`, { method: 'PATCH', body: payload, signal: options.signal }),
      removeChannelMember: (channelId, userId, options = {}) => request(`/api/channels/${channelId}/members/${userId}`, { method: 'DELETE', signal: options.signal }),
    },
    messages: {
      listMessages: (channelId, cursor, options = {}) => request(`/api/channels/${channelId}/messages`, {
        signal: options.signal,
        query: { cursor, limit: options.limit },
      }),
      sendMessage: (channelId, payload, options = {}) => request(`/api/channels/${channelId}/messages`, {
        method: 'POST',
        body: payload,
        signal: options.signal,
      }),
      editMessage: (messageId, payload, options = {}) => request(`/api/messages/${messageId}`, { method: 'PATCH', body: payload, signal: options.signal }),
      deleteMessage: (messageId, options = {}) => request(`/api/messages/${messageId}`, { method: 'DELETE', signal: options.signal }),
    },
    users: {
      listUsers: (filters = {}, options = {}) => request('/api/admin/users', { signal: options.signal, query: filters }),
      getUser: (userId, options = {}) => request(`/api/users/${userId}`, { signal: options.signal }),
      deactivateUser: (userId, payload, options = {}) => request(`/api/users/${userId}/deactivate`, { method: 'POST', body: payload, signal: options.signal }),
      reactivateUser: (userId, options = {}) => request(`/api/users/${userId}/reactivate`, { method: 'POST', signal: options.signal }),
      banUser: (userId, payload, options = {}) => request(`/api/users/${userId}/ban`, { method: 'POST', body: payload, signal: options.signal }),
      unbanUser: (userId, payload = {}, options = {}) => request(`/api/users/${userId}/unban`, { method: 'POST', body: payload, signal: options.signal }),
      anonymizeUser: (userId, payload, options = {}) => request(`/api/users/${userId}/anonymize`, { method: 'POST', body: payload, signal: options.signal }),
    },
    audit: {
      listAuditLog: (filters = {}, options = {}) => request('/api/admin/audit', { signal: options.signal, query: filters }),
    },
    realtime: {
      getRealtimeBootstrap: (options = {}) => request('/api/realtime/bootstrap', { signal: options.signal, retry: true }),
    },
  };
}

export const apiClient = createApiClient();
