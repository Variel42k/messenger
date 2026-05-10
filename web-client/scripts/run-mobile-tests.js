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

const { normalizeRealtimeEvent } = require(path.join(root, 'src/realtime/eventNormalizer.js'));
const { parseRoute, ROUTES } = require(path.join(root, 'src/routes/routeCore.js'));
const { createInitialState } = require(path.join(root, 'src/store/initialState.js'));
const { ACTIONS, appReducer } = require(path.join(root, 'src/store/reducers.js'));
const { selectCanPostToChannel, selectDraftForChannel, selectNavigation } = require(path.join(root, 'src/store/selectors.js'));

const tests = [];

function test(name, fn) {
  tests.push({ name, fn });
}

test('mobile route parses group channel list route', () => {
  const route = parseRoute('/app/groups/g-product/channels');
  assert.equal(route.name, 'groupChannels');
  assert.equal(route.pane, 'channels');
  assert.equal(route.params.groupId, 'g-product');
  assert.equal(ROUTES.groupChannels('g-product'), '/app/groups/g-product/channels');
});

test('mobile navigation reducer stores selected group and channel', () => {
  let state = createInitialState();
  state = appReducer(state, {
    type: ACTIONS.mobileNavigated,
    payload: {
      selectedGroupId: 'g-product',
      mobileStack: ['groups', 'channels'],
    },
  });
  state = appReducer(state, {
    type: ACTIONS.mobileNavigated,
    payload: {
      selectedChannelId: 'ch-general',
      selectedGroupId: 'g-product',
      mobileStack: ['groups', 'channels', 'channel'],
    },
  });
  const navigation = selectNavigation(state);
  assert.equal(navigation.selectedGroupId, 'g-product');
  assert.equal(navigation.selectedChannelId, 'ch-general');
  assert.deepEqual(navigation.mobileStack, ['groups', 'channels', 'channel']);
  assert.equal(state.channels.activeChannelId, 'ch-general');
});

test('viewport and draft reducers store mobile-only state', () => {
  let state = createInitialState();
  state = appReducer(state, {
    type: ACTIONS.viewportChanged,
    payload: { viewportHeight: 640, keyboardVisible: true, safeAreaInsets: { top: 0, right: 0, bottom: 16, left: 0 } },
  });
  state = appReducer(state, {
    type: ACTIONS.draftUpdated,
    payload: { channelId: 'ch-general', draft: 'Hello mobile' },
  });
  state = appReducer(state, {
    type: ACTIONS.scrollAnchorUpdated,
    payload: { channelId: 'ch-general', anchor: { bottomDistance: 20 } },
  });
  assert.equal(state.ui.viewportHeight, 640);
  assert.equal(state.ui.keyboardVisible, true);
  assert.equal(selectDraftForChannel(state, 'ch-general'), 'Hello mobile');
  assert.equal(state.messages.scrollAnchorByChannel['ch-general'].bottomDistance, 20);
});

test('readonly channel disables posting with explicit reason', () => {
  let state = createInitialState({
    channels: {
      byId: {
        'ch-readonly': {
          id: 'ch-readonly',
          permissions: { canView: true, canPost: false },
          readonly: true,
        },
      },
      byGroupId: {},
    },
  });
  const result = selectCanPostToChannel(state, 'ch-readonly');
  assert.equal(result.allowed, false);
  assert.equal(result.reason, 'readonly_channel');
});

test('membership removal revokes mobile channel route', () => {
  let state = createInitialState({
    session: { currentUserId: 'u-1' },
    navigation: { selectedGroupId: 'g-product', selectedChannelId: 'ch-general', mobileStack: ['groups', 'channels', 'channel'] },
    ui: { selectedChannelId: 'ch-general' },
    channels: {
      byId: {
        'ch-general': { id: 'ch-general', groupId: 'g-product', permissions: { canView: true, canPost: true } },
      },
      byGroupId: { 'g-product': ['ch-general'] },
      activeChannelId: 'ch-general',
    },
  });
  state = appReducer(state, {
    type: ACTIONS.realtimeEventApplied,
    payload: normalizeRealtimeEvent({
      event_id: 'mobile-membership-removed',
      event_type: 'membership.removed',
      channel_id: 'ch-general',
      seq: 1,
      payload: { userId: 'u-1', channelId: 'ch-general', state: 'removed' },
    }),
  });
  assert.equal(state.navigation.selectedChannelId, null);
  assert.equal(state.navigation.accessRevokedReason, 'membership_removed');
  assert.equal(state.channels.byId['ch-general'].permissions.canView, false);
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

console.log(`${tests.length} mobile foundation tests passed`);
