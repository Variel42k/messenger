const assert = require('assert/strict');
const fs = require('fs');
const path = require('path');
const babel = require('@babel/core');

const root = path.resolve(__dirname, '..');
const originalLoader = require.extensions['.js'];

require.extensions['.js'] = function transformSource(module, filename) {
  if (!filename.startsWith(path.join(root, 'src'))) {
    return originalLoader(module, filename);
  }

  const source = fs.readFileSync(filename, 'utf8');
  const result = babel.transformSync(source, {
    filename,
    babelrc: false,
    configFile: false,
    presets: [
      ['@babel/preset-env', { targets: { node: 'current' }, modules: 'commonjs' }],
      ['@babel/preset-react', { runtime: 'automatic' }],
    ],
  });
  module._compile(result.code, filename);
};

const { ApiError } = require(path.join(root, 'src/api/errors.js'));
const { normalizeRealtimeEvent } = require(path.join(root, 'src/realtime/eventNormalizer.js'));
const { ROUTES, parseRoute, pathForLegacyView } = require(path.join(root, 'src/routes/routeCore.js'));
const { createInitialState } = require(path.join(root, 'src/store/initialState.js'));
const { ACTIONS, appReducer } = require(path.join(root, 'src/store/reducers.js'));

const tests = [];

function test(name, fn) {
  tests.push({ name, fn });
}

test('route adapter parses target app routes and legacy fallback', () => {
  assert.equal(parseRoute('/app/groups').name, 'groups');
  assert.deepEqual(parseRoute('/app/groups/42/settings').params, { groupId: 42 });
  assert.equal(parseRoute('/app/channels/main-room').name, 'channel');
  assert.equal(parseRoute('/app/admin/users').pane, 'adminUsers');
  assert.equal(parseRoute('/unknown').name, 'legacy');
  assert.equal(pathForLegacyView('admin'), ROUTES.adminUsers);
});

test('realtime normalizer accepts camelCase and snake_case envelopes', () => {
  const camel = normalizeRealtimeEvent({
    eventId: 'evt-1',
    eventType: 'message.created',
    aggregateType: 'message',
    aggregateId: 'msg-1',
    channelId: 'ch-1',
    actorId: 'u-1',
    sequence: 7,
    schemaVersion: 1,
    payload: { id: 'msg-1', body: 'Hello' },
  });
  assert.equal(camel.event_id, 'evt-1');
  assert.equal(camel.event_type, 'message.created');
  assert.equal(camel.seq, 7);

  const snake = normalizeRealtimeEvent({
    event_id: 'evt-2',
    event_type: 'channel.updated',
    aggregate_id: 'ch-1',
    channel_id: 'ch-1',
    seq: 8,
    payload: { readonly: true },
  });
  assert.equal(snake.event_id, 'evt-2');
  assert.equal(snake.channel_id, 'ch-1');
});

test('normalized reducer reconciles optimistic messages with persisted realtime event', () => {
  let state = createInitialState({ session: { currentUserId: 'u-1' } });
  state = appReducer(state, {
    type: ACTIONS.optimisticMessageAdded,
    payload: {
      id: 'temp:c-1',
      clientMsgId: 'c-1',
      channelId: 'ch-1',
      authorId: 'u-1',
      body: 'Optimistic hello',
    },
  });
  assert.equal(state.messages.pendingByClientMsgId['c-1'], 'temp:c-1');
  assert.equal(state.messages.byId['temp:c-1'].status, 'pending');

  const event = normalizeRealtimeEvent({
    event_id: 'evt-message-created',
    event_type: 'message.created',
    aggregate_type: 'message',
    aggregate_id: 'msg-1',
    channel_id: 'ch-1',
    seq: 1,
    payload: {
      id: 'msg-1',
      clientMsgId: 'c-1',
      channelId: 'ch-1',
      authorId: 'u-1',
      body: 'Optimistic hello',
    },
  });
  state = appReducer(state, { type: ACTIONS.realtimeEventApplied, payload: event });

  assert.equal(state.messages.byId['temp:c-1'], undefined);
  assert.equal(state.messages.byId['msg-1'].status, 'persisted');
  assert.equal(state.messages.pendingByClientMsgId['c-1'], undefined);
  assert.deepEqual(state.messages.idsByChannel['ch-1'], ['msg-1']);

  const afterDuplicate = appReducer(state, { type: ACTIONS.realtimeEventApplied, payload: event });
  assert.deepEqual(afterDuplicate.messages.idsByChannel['ch-1'], ['msg-1']);
});

test('membership removal revokes current user channel access', () => {
  const state = createInitialState({
    session: { currentUserId: 'u-1' },
    channels: {
      byId: {
        'ch-1': { id: 'ch-1', groupId: 'g-1', permissions: { canView: true, canPost: true } },
      },
      byGroupId: { 'g-1': ['ch-1'] },
      activeChannelId: 'ch-1',
    },
    ui: { selectedChannelId: 'ch-1' },
  });
  const next = appReducer(state, {
    type: ACTIONS.realtimeEventApplied,
    payload: normalizeRealtimeEvent({
      event_id: 'evt-membership-removed',
      event_type: 'membership.removed',
      channel_id: 'ch-1',
      seq: 2,
      payload: { userId: 'u-1', channelId: 'ch-1', state: 'removed' },
    }),
  });

  assert.equal(next.channels.byId['ch-1'].permissions.canView, false);
  assert.equal(next.channels.byId['ch-1'].permissions.canPost, false);
  assert.equal(next.ui.selectedChannelId, null);
});

test('ApiError exposes status helpers', () => {
  assert.equal(new ApiError('no auth', { status: 401 }).isUnauthorized, true);
  assert.equal(new ApiError('no access', { status: 403 }).isForbidden, true);
  assert.equal(new ApiError('conflict', { status: 409 }).isConflict, true);
  assert.equal(new ApiError('invalid', { status: 422 }).isValidationError, true);
});

let failures = 0;
tests.forEach(({ name, fn }) => {
  try {
    fn();
    console.log(`ok - ${name}`);
  } catch (error) {
    failures += 1;
    console.error(`not ok - ${name}`);
    console.error(error.stack || error);
  }
});

if (failures > 0) {
  process.exit(1);
}

console.log(`${tests.length} foundation tests passed`);
