const AUTH_STORAGE_KEY = 'messenger.auth.session';

export function loadStoredSession() {
  try {
    const rawValue = window.localStorage.getItem(AUTH_STORAGE_KEY);
    if (!rawValue) {
      return null;
    }

    return JSON.parse(rawValue);
  } catch (error) {
    console.error('Failed to load auth session:', error);
    return null;
  }
}

export function saveStoredSession(session) {
  window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
}

export function clearStoredSession() {
  window.localStorage.removeItem(AUTH_STORAGE_KEY);
}

export function buildAuthHeaders(accessToken, headers = {}) {
  const mergedHeaders = { ...headers };
  if (accessToken) {
    mergedHeaders.Authorization = `Bearer ${accessToken}`;
  }
  return mergedHeaders;
}

export async function parseJsonSafely(response) {
  try {
    return await response.json();
  } catch (error) {
    return {};
  }
}
