import { CONNECTION_STATUS } from '../store/initialState';
import { getRealtimeDedupeKey, normalizeRealtimeEvent } from './eventNormalizer';

function defaultUrl() {
  if (!globalThis.window?.location) {
    return null;
  }
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${window.location.host}/ws/realtime`;
}

function appendToken(url, token) {
  if (!token) {
    return url;
  }
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}access_token=${encodeURIComponent(token)}`;
}

export class RealtimeClient {
  constructor(options = {}) {
    this.options = {
      url: options.url || defaultUrl(),
      protocols: options.protocols,
      getAccessToken: options.getAccessToken || (() => null),
      WebSocketImpl: options.WebSocketImpl || globalThis.WebSocket,
      minBackoffMs: options.minBackoffMs || 500,
      maxBackoffMs: options.maxBackoffMs || 10000,
      heartbeatTimeoutMs: options.heartbeatTimeoutMs || 30000,
      onStatusChange: options.onStatusChange || (() => {}),
      onEvent: options.onEvent || (() => {}),
      onResyncRequested: options.onResyncRequested || (() => {}),
      onForcedClose: options.onForcedClose || (() => {}),
    };
    this.socket = null;
    this.status = CONNECTION_STATUS.idle;
    this.explicitClose = false;
    this.reconnectAttempt = 0;
    this.reconnectTimer = null;
    this.heartbeatTimer = null;
    this.subscribers = new Set();
    this.processedEventIds = new Set();
  }

  connect() {
    if (this.socket || this.status === CONNECTION_STATUS.connecting || this.status === CONNECTION_STATUS.connected) {
      return;
    }
    if (!this.options.url || !this.options.WebSocketImpl) {
      this.setStatus(CONNECTION_STATUS.offline);
      return;
    }

    this.explicitClose = false;
    this.setStatus(this.reconnectAttempt > 0 ? CONNECTION_STATUS.reconnecting : CONNECTION_STATUS.connecting);
    const token = this.options.getAccessToken();
    const url = appendToken(this.options.url, token);
    const Socket = this.options.WebSocketImpl;
    this.socket = new Socket(url, this.options.protocols);
    this.socket.onopen = () => this.handleOpen();
    this.socket.onmessage = (message) => this.handleMessage(message);
    this.socket.onerror = () => this.setStatus(CONNECTION_STATUS.offline);
    this.socket.onclose = (event) => this.handleClose(event);
  }

  disconnect({ forced = false, reason = 'client_disconnect' } = {}) {
    this.explicitClose = true;
    this.clearTimers();
    if (this.socket) {
      this.socket.close(forced ? 4001 : 1000, reason);
      this.socket = null;
    }
    this.setStatus(forced ? CONNECTION_STATUS.forcedClosed : CONNECTION_STATUS.closed);
  }

  subscribe(listener) {
    this.subscribers.add(listener);
    return () => this.subscribers.delete(listener);
  }

  send(payload) {
    if (!this.socket || this.socket.readyState !== 1) {
      return false;
    }
    this.socket.send(JSON.stringify(payload));
    return true;
  }

  handleOpen() {
    this.reconnectAttempt = 0;
    this.setStatus(CONNECTION_STATUS.connected);
    this.resetHeartbeat();
    this.options.onResyncRequested({ reason: 'connected' });
  }

  handleMessage(message) {
    this.resetHeartbeat();
    let parsed;
    try {
      parsed = typeof message.data === 'string' ? JSON.parse(message.data) : message.data;
    } catch (error) {
      return;
    }

    if (parsed?.type === 'ping' || parsed?.event_type === 'ping') {
      this.send({ type: 'pong', ts: new Date().toISOString() });
      return;
    }

    if (parsed?.type === 'forced.disconnect' || parsed?.event_type === 'forced.disconnect') {
      this.options.onForcedClose(parsed);
      this.disconnect({ forced: true, reason: parsed.reason || 'forced_disconnect' });
      return;
    }

    const key = getRealtimeDedupeKey(parsed);
    if (this.processedEventIds.has(key)) {
      return;
    }
    this.processedEventIds.add(key);
    if (this.processedEventIds.size > 2000) {
      const oldest = this.processedEventIds.values().next().value;
      this.processedEventIds.delete(oldest);
    }

    const event = normalizeRealtimeEvent(parsed);
    this.options.onEvent(event);
    this.subscribers.forEach((listener) => listener(event));
  }

  handleClose(event) {
    this.socket = null;
    this.clearHeartbeat();
    if (this.explicitClose) {
      return;
    }

    if (event?.code === 4001 || event?.code === 4003) {
      this.setStatus(CONNECTION_STATUS.forcedClosed);
      this.options.onForcedClose(event);
      return;
    }

    this.setStatus(CONNECTION_STATUS.reconnecting);
    this.scheduleReconnect();
  }

  scheduleReconnect() {
    this.clearReconnect();
    this.reconnectAttempt += 1;
    const delay = Math.min(
      this.options.maxBackoffMs,
      this.options.minBackoffMs * (2 ** (this.reconnectAttempt - 1)),
    );
    this.reconnectTimer = setTimeout(() => this.connect(), delay);
  }

  setStatus(status) {
    if (this.status === status) {
      return;
    }
    this.status = status;
    this.options.onStatusChange(status);
  }

  resetHeartbeat() {
    this.clearHeartbeat();
    this.heartbeatTimer = setTimeout(() => {
      if (this.socket) {
        this.socket.close(4000, 'heartbeat_timeout');
      }
    }, this.options.heartbeatTimeoutMs);
  }

  clearHeartbeat() {
    if (this.heartbeatTimer) {
      clearTimeout(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  clearReconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  clearTimers() {
    this.clearHeartbeat();
    this.clearReconnect();
  }
}

export function createRealtimeClient(options) {
  return new RealtimeClient(options);
}
