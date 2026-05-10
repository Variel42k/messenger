export const REALTIME_EVENT_TYPES = [
  'message.created',
  'message.updated',
  'message.deleted',
  'membership.added',
  'membership.removed',
  'membership.role_changed',
  'channel.updated',
  'group.updated',
  'user.deactivated',
  'user.reactivated',
  'user.banned',
  'user.unbanned',
  'presence.updated',
  'typing.started',
  'typing.stopped',
];

function read(input, snakeKey, camelKey, fallback = null) {
  return input?.[snakeKey] ?? input?.[camelKey] ?? fallback;
}

export function normalizeRealtimeEvent(input = {}) {
  const payload = input.payload || {};
  const eventType = read(input, 'event_type', 'eventType') || input.type || payload.type || 'unknown';
  const aggregateId = read(input, 'aggregate_id', 'aggregateId') || payload.id || payload.messageId || payload.channelId || null;
  const channelId = read(input, 'channel_id', 'channelId') || payload.channel_id || payload.channelId || null;
  const seq = read(input, 'seq', 'sequence');
  const serverTs = read(input, 'server_ts', 'serverTs') || input.occurredAt || input.timestamp || new Date().toISOString();
  const eventId = read(input, 'event_id', 'eventId') || input.id || `${eventType}:${aggregateId || channelId || 'global'}:${seq || serverTs}`;

  return {
    event_id: eventId,
    event_type: eventType,
    aggregate_type: read(input, 'aggregate_type', 'aggregateType') || eventType.split('.')[0],
    aggregate_id: aggregateId,
    channel_id: channelId,
    actor_id: read(input, 'actor_id', 'actorId') || payload.actor_id || payload.actorId || null,
    server_ts: serverTs,
    seq: seq == null ? null : Number(seq),
    schema_version: read(input, 'schema_version', 'schemaVersion') || 1,
    payload,
    raw: input,
  };
}

export function getRealtimeDedupeKey(input) {
  return normalizeRealtimeEvent(input).event_id;
}

export function isSupportedRealtimeEvent(input) {
  return REALTIME_EVENT_TYPES.includes(normalizeRealtimeEvent(input).event_type);
}
