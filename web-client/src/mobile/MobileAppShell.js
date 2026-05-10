import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createApiClient } from '../api';
import { Badge, Button, EmptyState, ErrorState, Input, Skeleton, Textarea, ToastRegion } from '../components/ui';
import { normalizeRealtimeEvent } from '../realtime';
import {
  ACTIONS,
  selectActiveBottomSheet,
  selectCanPostToChannel,
  selectChannelsForGroup,
  selectCurrentUser,
  selectDraftForChannel,
  selectMessagesForChannel,
  selectNavigation,
  selectSelectedChannel,
  selectSelectedGroup,
  selectUserGroups,
  useAppDispatch,
  useAppSelector,
} from '../store';
import { ROUTES, useRoute } from '../routes/routeAdapter';
import { createMobileFixtureBootstrap, MOBILE_FIXTURE_AUDIT } from './mobileFixtures';
import { clearMobileNavigation, readMobileNavigation, writeMobileNavigation } from './mobileStorage';
import { useMobileViewportVars } from './useMobileViewport';
import { MobileActionMenu, MobileBottomSheet, MobileConfirmDialog, MobileFullscreenDialog } from './MobileOverlays';
import './MobileAppShell.css';

function formatTime(value) {
  if (!value) {
    return '';
  }
  return new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function reasonText(reason) {
  const reasons = {
    no_channel_access: 'You do not have access to this channel.',
    membership_removed: 'Your membership was removed.',
    readonly_channel: 'This channel is readonly.',
    archived_channel: 'This channel is archived.',
    insufficient_role: 'Your role does not allow this action.',
    deactivated: 'Your account was deactivated.',
    banned: 'Access is blocked by a ban.',
    offline: 'Sending is disabled while offline.',
    forced_disconnect: 'Your realtime session was closed by the server.',
    access_revoked: 'Access was revoked.',
  };
  return reasons[reason] || 'This action is not available.';
}

function useMobileBootstrap(currentUser, accessToken) {
  const dispatch = useAppDispatch();
  const [status, setStatus] = useState({ loading: true, fallback: false, error: null });

  useEffect(() => {
    const controller = new AbortController();
    const api = createApiClient({ getAccessToken: () => accessToken });
    const fixture = createMobileFixtureBootstrap(currentUser);
    dispatch({ type: ACTIONS.bootstrapReceived, payload: fixture });
    dispatch({ type: ACTIONS.messagesReceived, payload: { messages: fixture.messages } });
    dispatch({ type: ACTIONS.usersReceived, payload: { users: fixture.users } });
    setStatus({ loading: false, fallback: true, error: null });

    if (window.location.search.includes('mockAuth=')) {
      return () => controller.abort();
    }

    async function load() {
      try {
        const groups = await api.groups.listGroups({ signal: controller.signal });
        if (Array.isArray(groups) && groups.length > 0) {
          dispatch({ type: ACTIONS.groupsReceived, payload: { groups, replace: true } });
          const channelResults = await Promise.allSettled(
            groups.map((group) => api.channels.listChannels(group.id, { signal: controller.signal })),
          );
          const channels = channelResults
            .filter((result) => result.status === 'fulfilled')
            .flatMap((result) => result.value || []);
          if (channels.length > 0) {
            dispatch({ type: ACTIONS.channelsReceived, payload: { channels } });
          }
          setStatus({ loading: false, fallback: false, error: null });
          return;
        }
        setStatus({ loading: false, fallback: true, error: null });
      } catch (error) {
        if (error.code === 'request_cancelled') {
          return;
        }
        setStatus({ loading: false, fallback: true, error });
      }
    }

    load();
    return () => controller.abort();
  }, [accessToken, currentUser, dispatch]);

  return status;
}

function useMobileRouteSync(route, groups, channelsById) {
  const dispatch = useAppDispatch();
  const { navigate } = useRoute();
  const navigation = useAppSelector(selectNavigation);

  useEffect(() => {
    if (route.name === 'app') {
      const saved = readMobileNavigation();
      if (saved?.selectedChannelId) {
        navigate(ROUTES.channel(saved.selectedChannelId), { replace: true });
      } else if (saved?.selectedGroupId) {
        navigate(ROUTES.groupChannels(saved.selectedGroupId), { replace: true });
      } else {
        navigate(ROUTES.groups, { replace: true });
      }
      return;
    }

    if (route.name === 'groups') {
      dispatch({ type: ACTIONS.mobileNavigated, payload: { mobileStack: ['groups'] } });
      return;
    }

    if (route.name === 'group' || route.name === 'groupChannels') {
      dispatch({
        type: ACTIONS.mobileNavigated,
        payload: {
          selectedGroupId: route.params.groupId,
          selectedChannelId: null,
          mobileStack: ['groups', 'channels'],
        },
      });
      return;
    }

    if (route.name === 'channel') {
      const channel = channelsById[route.params.channelId];
      dispatch({
        type: ACTIONS.mobileNavigated,
        payload: {
          selectedGroupId: channel?.groupId || navigation.selectedGroupId || groups[0]?.id || null,
          selectedChannelId: route.params.channelId,
          mobileStack: ['groups', 'channels', 'channel'],
        },
      });
      return;
    }

    if (route.name === 'channelMembers' || route.name === 'channelSettings') {
      const channel = channelsById[route.params.channelId];
      dispatch({
        type: ACTIONS.mobileNavigated,
        payload: {
          selectedGroupId: channel?.groupId || navigation.selectedGroupId || null,
          selectedChannelId: route.params.channelId,
          mobileStack: ['groups', 'channels', 'channel', route.name === 'channelMembers' ? 'members' : 'settings'],
        },
      });
      return;
    }

    if (route.name === 'groupMembers' || route.name === 'groupSettings') {
      dispatch({
        type: ACTIONS.mobileNavigated,
        payload: {
          selectedGroupId: route.params.groupId,
          selectedChannelId: null,
          mobileStack: ['groups', 'channels', route.name === 'groupMembers' ? 'members' : 'settings'],
        },
      });
      return;
    }

    if (route.name === 'adminUsers' || route.name === 'adminAudit' || route.name === 'profile') {
      dispatch({
        type: ACTIONS.mobileNavigated,
        payload: {
          mobileStack: ['groups', route.name],
          returnTo: ROUTES.groups,
        },
      });
    }
  }, [channelsById, dispatch, groups, navigate, navigation.selectedGroupId, route]);

  useEffect(() => {
    writeMobileNavigation({
      selectedGroupId: navigation.selectedGroupId,
      selectedChannelId: navigation.selectedChannelId,
      mobileStack: navigation.mobileStack,
    });
  }, [navigation.mobileStack, navigation.selectedChannelId, navigation.selectedGroupId]);
}

function MobileTopBar({ title, subtitle, canGoBack, onBack, onLogout, actions, connectionStatus }) {
  return (
    <header className="mobile-top-bar">
      <div className="mobile-top-bar__main">
        {canGoBack && (
          <button type="button" className="mobile-back-button" onClick={onBack} aria-label="Go back">
            Back
          </button>
        )}
        <div className="mobile-title">
          <h1>{title}</h1>
          {subtitle && <p>{subtitle}</p>}
        </div>
      </div>
      <div className="mobile-top-bar__actions">
        <MobileConnectionStatus status={connectionStatus} />
        {actions}
        <button type="button" className="mobile-icon-button" onClick={onLogout} aria-label="Log out">
          Out
        </button>
      </div>
    </header>
  );
}

function MobileConnectionStatus({ status }) {
  const normalized = status || 'idle';
  return (
    <span className={`mobile-connection mobile-connection--${normalized}`} aria-label={`Connection ${normalized}`}>
      {normalized === 'connected' ? 'Live' : normalized === 'reconnecting' ? 'Sync' : normalized}
    </span>
  );
}

function MobileToastContainer() {
  const dispatch = useAppDispatch();
  const toasts = useAppSelector((state) => state.ui.toasts);
  return (
    <ToastRegion
      toasts={toasts}
      onDismiss={(id) => dispatch({ type: ACTIONS.toastDismissed, payload: { id } })}
    />
  );
}

function StatusBanner({ fallback, error }) {
  if (!fallback && !error) {
    return null;
  }
  return (
    <div className="mobile-status-banner" role="status">
      {fallback
        ? 'Local development data is shown because target API data is unavailable.'
        : error?.message}
    </div>
  );
}

function ScreenScaffold({ loading, error, empty, children, emptyTitle, emptyDescription, onRetry }) {
  if (loading) {
    return (
      <div className="mobile-screen mobile-screen--list" aria-busy="true">
        <Skeleton height="4rem" />
        <Skeleton height="4rem" />
        <Skeleton height="4rem" />
      </div>
    );
  }
  if (error && !children) {
    return <ErrorState title="Could not load this screen" message={error.message} onRetry={onRetry} />;
  }
  if (empty) {
    return <EmptyState title={emptyTitle} description={emptyDescription} />;
  }
  return children;
}

function GroupListScreen({ loading, fallback, error }) {
  const { navigate } = useRoute();
  const dispatch = useAppDispatch();
  const groups = useAppSelector(selectUserGroups);
  const [query, setQuery] = useState('');
  const filteredGroups = groups.filter((group) => group.title.toLowerCase().includes(query.toLowerCase()));

  return (
    <ScreenScaffold
      loading={loading}
      empty={filteredGroups.length === 0}
      emptyTitle="No groups yet"
      emptyDescription="Available groups will appear here after the server grants access."
    >
      <section className="mobile-screen mobile-screen--list" aria-labelledby="mobile-groups-title">
        <StatusBanner fallback={fallback} error={error} />
        <div className="mobile-search-row">
          <Input
            id="mobile-group-search"
            label="Search groups"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by group name"
          />
          <button
            type="button"
            className="mobile-floating-action"
            onClick={() => dispatch({ type: ACTIONS.bottomSheetOpened, payload: { type: 'createGroup' } })}
            aria-label="Create group"
          >
            New
          </button>
        </div>
        <div className="mobile-list" role="list">
          {filteredGroups.map((group) => (
            <article key={group.id} className="mobile-list-card" role="listitem">
              <button
                type="button"
                className="mobile-list-card__main"
                onClick={() => navigate(ROUTES.groupChannels(group.id))}
                aria-current={false}
              >
                <span className="mobile-list-card__title">{group.title}</span>
                <span className="mobile-list-card__meta">
                  {group.memberCount ?? 0} members · {group.visibility}
                </span>
                <span className="mobile-badge-row">
                  {group.role && <Badge status="active">{group.role}</Badge>}
                  {group.archived && <Badge status="archived">archived</Badge>}
                  {group.unreadCount > 0 && <Badge status="pending">{group.unreadCount} unread</Badge>}
                </span>
              </button>
              <button
                type="button"
                className="mobile-icon-button"
                onClick={() => dispatch({ type: ACTIONS.bottomSheetOpened, payload: { type: 'groupActions', groupId: group.id } })}
                aria-label={`Open actions for ${group.title}`}
              >
                More
              </button>
            </article>
          ))}
        </div>
      </section>
    </ScreenScaffold>
  );
}

function ChannelListScreen({ group }) {
  const { navigate } = useRoute();
  const dispatch = useAppDispatch();
  const channels = useAppSelector((state) => selectChannelsForGroup(state, group?.id));
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const filteredChannels = channels
    .filter((channel) => channel.title.toLowerCase().includes(query.toLowerCase()))
    .filter((channel) => {
      if (filter === 'unread') return channel.unreadCount > 0;
      if (filter === 'private') return channel.kind === 'private';
      if (filter === 'readonly') return channel.readonly;
      if (filter === 'archived') return channel.archived;
      return !channel.archived;
    });

  if (!group) {
    return <ForbiddenScreen reason="no_group_access" backTo={ROUTES.groups} />;
  }

  return (
    <section className="mobile-screen mobile-screen--list">
      <div className="mobile-compact-header">
        <strong>{group.title}</strong>
        <span>{group.memberCount ?? 0} members</span>
      </div>
      <div className="mobile-search-row">
        <Input
          id="mobile-channel-search"
          label="Search channels"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search by channel name"
        />
        {group.permissions?.canManageGroup && (
          <button
            type="button"
            className="mobile-floating-action"
            onClick={() => dispatch({ type: ACTIONS.bottomSheetOpened, payload: { type: 'createChannel', groupId: group.id } })}
            aria-label="Create channel"
          >
            New
          </button>
        )}
      </div>
      <div className="mobile-filter-tabs" role="tablist" aria-label="Channel filters">
        {['all', 'unread', 'private', 'readonly', 'archived'].map((item) => (
          <button
            key={item}
            type="button"
            role="tab"
            aria-selected={filter === item}
            className={filter === item ? 'is-active' : ''}
            onClick={() => setFilter(item)}
          >
            {item}
          </button>
        ))}
      </div>
      <div className="mobile-list" role="list">
        {filteredChannels.map((channel) => (
          <article key={channel.id} className="mobile-list-card" role="listitem">
            <button
              type="button"
              className="mobile-list-card__main"
              onClick={() => navigate(ROUTES.channel(channel.id))}
            >
              <span className="mobile-list-card__title">{channel.title}</span>
              <span className="mobile-list-card__meta">{channel.lastMessagePreview || 'No recent messages'}</span>
              <span className="mobile-badge-row">
                <Badge status="neutral">{channel.kind}</Badge>
                {channel.readonly && <Badge status="readonly">readonly</Badge>}
                {channel.archived && <Badge status="archived">archived</Badge>}
                {channel.unreadCount > 0 && <Badge status="pending">{channel.unreadCount} unread</Badge>}
              </span>
            </button>
            <button
              type="button"
              className="mobile-icon-button"
              onClick={() => dispatch({ type: ACTIONS.bottomSheetOpened, payload: { type: 'channelActions', channelId: channel.id } })}
              aria-label={`Open actions for ${channel.title}`}
            >
              More
            </button>
          </article>
        ))}
      </div>
    </section>
  );
}

function ChannelViewScreen({ channel, currentUser }) {
  const dispatch = useAppDispatch();
  const { navigate } = useRoute();
  const messages = useAppSelector((state) => selectMessagesForChannel(state, channel?.id));
  const draft = useAppSelector((state) => selectDraftForChannel(state, channel?.id));
  const usersById = useAppSelector((state) => state.users.byId);
  const canPost = useAppSelector((state) => channel ? selectCanPostToChannel(state, channel.id) : { allowed: false, reason: 'no_channel_access' });
  const connectionStatus = useAppSelector((state) => state.session.connectionStatus);
  const navigation = useAppSelector(selectNavigation);
  const listRef = useRef(null);
  const pressTimer = useRef(null);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [hasNewMessages, setHasNewMessages] = useState(false);
  const [devFallback, setDevFallback] = useState(false);
  const api = useMemo(() => createApiClient(), []);

  useEffect(() => {
    if (!channel) {
      return;
    }
    const list = listRef.current;
    if (!list) {
      return;
    }
    if (isAtBottom) {
      list.scrollTop = list.scrollHeight;
      setHasNewMessages(false);
    } else {
      setHasNewMessages(true);
    }
  }, [channel, isAtBottom, messages.length]);

  if (!channel || channel.permissions?.canView === false || navigation.accessRevokedReason) {
    return <ForbiddenScreen reason={navigation.accessRevokedReason || channel?.permissions?.reason || 'no_channel_access'} backTo={channel?.groupId ? ROUTES.groupChannels(channel.groupId) : ROUTES.groups} />;
  }

  const disabledReason = canPost.allowed
    ? null
    : canPost.reason || (connectionStatus === 'offline' ? 'offline' : null);

  const handleScroll = () => {
    const list = listRef.current;
    if (!list) {
      return;
    }
    const bottomDistance = list.scrollHeight - list.scrollTop - list.clientHeight;
    const nextAtBottom = bottomDistance < 80;
    setIsAtBottom(nextAtBottom);
    if (nextAtBottom) {
      setHasNewMessages(false);
    }
    dispatch({
      type: ACTIONS.scrollAnchorUpdated,
      payload: { channelId: channel.id, anchor: { scrollTop: list.scrollTop, bottomDistance } },
    });
  };

  const handleSend = async () => {
    if (!draft.trim() || disabledReason) {
      return;
    }
    const clientMsgId = `mobile-${Date.now()}`;
    const optimistic = {
      id: `temp:${clientMsgId}`,
      clientMsgId,
      channelId: channel.id,
      authorId: currentUser?.id ?? currentUser?.username ?? 'me',
      body: draft.trim(),
      createdAt: new Date().toISOString(),
    };
    dispatch({ type: ACTIONS.optimisticMessageAdded, payload: optimistic });
    dispatch({ type: ACTIONS.draftUpdated, payload: { channelId: channel.id, draft: '' } });

    try {
      const response = await api.messages.sendMessage(channel.id, {
        clientMsgId,
        body: optimistic.body,
        attachments: [],
      });
      if (!response?.id && !response?.message?.id) {
        throw new Error('Target message API unavailable in local development.');
      }
      const persisted = response.message || response;
      dispatch({
        type: ACTIONS.realtimeEventApplied,
        payload: normalizeRealtimeEvent({
          event_id: `local-${clientMsgId}`,
          event_type: 'message.created',
          channel_id: channel.id,
          seq: Date.now(),
          payload: { ...persisted, clientMsgId, channelId: channel.id },
        }),
      });
    } catch (error) {
      setDevFallback(true);
      dispatch({
        type: ACTIONS.realtimeEventApplied,
        payload: normalizeRealtimeEvent({
          event_id: `dev-${clientMsgId}`,
          event_type: 'message.created',
          channel_id: channel.id,
          seq: Date.now(),
          payload: { ...optimistic, id: `msg-${clientMsgId}`, status: 'persisted' },
        }),
      });
      dispatch({
        type: ACTIONS.toastQueued,
        payload: {
          id: `message-fallback-${clientMsgId}`,
          status: 'warning',
          title: 'Local development fallback',
          message: 'Message API was unavailable; the optimistic message was reconciled locally.',
        },
      });
    }
  };

  const openMessageActions = (message) => {
    dispatch({ type: ACTIONS.bottomSheetOpened, payload: { type: 'messageActions', messageId: message.id } });
  };

  return (
    <section className="mobile-channel-screen" aria-label={channel.title}>
      {devFallback && <StatusBanner fallback />}
      <div
        ref={listRef}
        className="mobile-message-list"
        onScroll={handleScroll}
        aria-live="polite"
        aria-relevant="additions text"
        data-testid="mobile-message-list"
      >
        {messages.map((message) => {
          const author = usersById[message.authorId] || message.author || { displayName: message.authorId || 'Unknown user' };
          const isOwn = String(message.authorId) === String(currentUser?.id ?? currentUser?.username);
          return (
            <article
              key={message.id}
              className={`mobile-message ${isOwn ? 'mobile-message--own' : ''} mobile-message--${message.status || 'persisted'}`}
              onContextMenu={(event) => {
                event.preventDefault();
                openMessageActions(message);
              }}
              onTouchStart={() => {
                pressTimer.current = setTimeout(() => openMessageActions(message), 520);
              }}
              onTouchEnd={() => clearTimeout(pressTimer.current)}
            >
              <header>
                <strong>{author.displayName || author.username}</strong>
                {author.status === 'deactivated' && <Badge status="deactivated">deactivated</Badge>}
                {author.status === 'banned' && <Badge status="banned">banned</Badge>}
                <time>{formatTime(message.createdAt)}</time>
              </header>
              <p>{message.status === 'deleted' ? 'Message deleted' : message.body}</p>
              <footer>
                {message.status === 'pending' && <Badge status="pending">sending</Badge>}
                {message.status === 'failed' && <Badge status="failed">failed</Badge>}
                <button
                  type="button"
                  className="mobile-message__actions"
                  onClick={() => openMessageActions(message)}
                  aria-label="Open message actions"
                >
                  Actions
                </button>
              </footer>
            </article>
          );
        })}
      </div>
      {hasNewMessages && (
        <button
          type="button"
          className="mobile-new-messages"
          onClick={() => {
            if (listRef.current) {
              listRef.current.scrollTop = listRef.current.scrollHeight;
            }
            setHasNewMessages(false);
          }}
        >
          New messages
        </button>
      )}
      <MessageComposer
        draft={draft}
        disabledReason={disabledReason}
        onDraftChange={(value) => dispatch({ type: ACTIONS.draftUpdated, payload: { channelId: channel.id, draft: value } })}
        onSend={handleSend}
      />
    </section>
  );
}

function MessageComposer({ draft, disabledReason, onDraftChange, onSend }) {
  const textareaRef = useRef(null);
  const disabled = Boolean(disabledReason);

  const resize = () => {
    const textarea = textareaRef.current;
    if (!textarea) {
      return;
    }
    textarea.style.height = 'auto';
    textarea.style.height = `${Math.min(textarea.scrollHeight, 132)}px`;
  };

  useEffect(() => {
    resize();
  }, [draft]);

  return (
    <form
      className="mobile-composer"
      onSubmit={(event) => {
        event.preventDefault();
        onSend();
      }}
      data-testid="mobile-composer"
    >
      {disabled && <p className="mobile-composer__reason">{reasonText(disabledReason)}</p>}
      <div className="mobile-composer__row">
        <button type="button" className="mobile-icon-button" aria-label="Attach file" disabled={disabled}>
          File
        </button>
        <textarea
          ref={textareaRef}
          value={draft}
          onChange={(event) => onDraftChange(event.target.value)}
          onInput={resize}
          placeholder={disabled ? reasonText(disabledReason) : 'Message'}
          disabled={disabled}
          aria-label="Message"
          rows={1}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault();
              onSend();
            }
          }}
        />
        <button type="submit" className="mobile-send-button" disabled={disabled || !draft.trim()}>
          Send
        </button>
      </div>
    </form>
  );
}

function MembersScreen({ group, channel }) {
  const dispatch = useAppDispatch();
  const usersById = useAppSelector((state) => state.users.byId);
  const memberships = useAppSelector((state) => Object.values(state.memberships.byId));
  const scopeMembers = memberships.filter((membership) => (
    channel ? membership.channelId === channel.id : membership.groupId === group?.id && !membership.channelId
  ));
  const canManage = channel?.permissions?.canManageMembers || group?.permissions?.canManageMembers;

  return (
    <section className="mobile-screen mobile-screen--list">
      <div className="mobile-search-row">
        <Input id="mobile-member-search" label="Search members" placeholder="Search members" />
        {canManage && (
          <button
            type="button"
            className="mobile-floating-action"
            onClick={() => dispatch({ type: ACTIONS.bottomSheetOpened, payload: { type: 'addMember', channelId: channel?.id, groupId: group?.id } })}
          >
            Add
          </button>
        )}
      </div>
      <div className="mobile-list">
        {scopeMembers.map((membership) => {
          const user = usersById[membership.userId] || { displayName: membership.userId };
          return (
            <article key={membership.id} className="mobile-list-card">
              <button
                type="button"
                className="mobile-list-card__main"
                onClick={() => dispatch({ type: ACTIONS.bottomSheetOpened, payload: { type: 'memberActions', membershipId: membership.id } })}
              >
                <span className="mobile-list-card__title">{user.displayName || user.username}</span>
                <span className="mobile-list-card__meta">{user.email || user.username}</span>
                <span className="mobile-badge-row">
                  <Badge status="active">{membership.role}</Badge>
                  <Badge status={membership.state === 'banned' ? 'banned' : user.status || 'active'}>{membership.state || user.status || 'active'}</Badge>
                </span>
              </button>
              <button
                type="button"
                className="mobile-icon-button"
                onClick={() => dispatch({ type: ACTIONS.bottomSheetOpened, payload: { type: 'memberActions', membershipId: membership.id } })}
                disabled={!canManage}
                aria-label={`Open actions for ${user.displayName || user.username}`}
              >
                More
              </button>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function ChannelSettingsScreen({ channel }) {
  const dispatch = useAppDispatch();
  const [title, setTitle] = useState(channel?.title || '');
  const [readonly, setReadonly] = useState(Boolean(channel?.readonly));

  useEffect(() => {
    setTitle(channel?.title || '');
    setReadonly(Boolean(channel?.readonly));
  }, [channel]);

  if (!channel?.permissions?.canManageChannel) {
    return <ForbiddenScreen reason="insufficient_role" backTo={channel ? ROUTES.channel(channel.id) : ROUTES.groups} />;
  }

  return (
    <SettingsForm
      title="Channel settings"
      onSave={() => {
        dispatch({ type: ACTIONS.channelReceived, payload: { ...channel, title, readonly } });
        dispatch({ type: ACTIONS.toastQueued, payload: { id: `channel-save-${Date.now()}`, status: 'success', title: 'Channel saved' } });
      }}
      dangerAction={() => dispatch({ type: ACTIONS.bottomSheetOpened, payload: { type: 'dangerZone', target: 'channel', id: channel.id } })}
    >
      <Input label="Title" value={title} onChange={(event) => setTitle(event.target.value)} />
      <label className="mobile-toggle">
        <input type="checkbox" checked={readonly} onChange={(event) => setReadonly(event.target.checked)} />
        <span>Readonly channel</span>
      </label>
    </SettingsForm>
  );
}

function GroupSettingsScreen({ group }) {
  const dispatch = useAppDispatch();
  const [title, setTitle] = useState(group?.title || '');

  useEffect(() => {
    setTitle(group?.title || '');
  }, [group]);

  if (!group?.permissions?.canManageGroup) {
    return <ForbiddenScreen reason="insufficient_role" backTo={group ? ROUTES.groupChannels(group.id) : ROUTES.groups} />;
  }

  return (
    <SettingsForm
      title="Group settings"
      onSave={() => {
        dispatch({ type: ACTIONS.groupReceived, payload: { ...group, title } });
        dispatch({ type: ACTIONS.toastQueued, payload: { id: `group-save-${Date.now()}`, status: 'success', title: 'Group saved' } });
      }}
      dangerAction={() => dispatch({ type: ACTIONS.bottomSheetOpened, payload: { type: 'dangerZone', target: 'group', id: group.id } })}
    >
      <Input label="Title" value={title} onChange={(event) => setTitle(event.target.value)} />
      <Input label="Visibility" value={group.visibility || 'private'} readOnly />
    </SettingsForm>
  );
}

function SettingsForm({ title, children, onSave, dangerAction }) {
  return (
    <section className="mobile-screen mobile-settings-screen">
      <h2>{title}</h2>
      <div className="mobile-form-stack">{children}</div>
      <div className="mobile-sticky-actions">
        <Button onClick={onSave}>Save</Button>
        <Button variant="danger" onClick={dangerAction}>Danger zone</Button>
      </div>
    </section>
  );
}

function AdminUsersScreen({ currentUser }) {
  const dispatch = useAppDispatch();
  const users = useAppSelector((state) => state.users.allIds.map((id) => state.users.byId[id]).filter(Boolean));
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('all');
  const isAdmin = currentUser?.role === 'ADMIN';
  const filteredUsers = users
    .filter((user) => user.displayName?.toLowerCase().includes(query.toLowerCase()) || user.username?.toLowerCase().includes(query.toLowerCase()) || user.email?.toLowerCase().includes(query.toLowerCase()))
    .filter((user) => status === 'all' || user.status === status);

  if (!isAdmin) {
    return <ForbiddenScreen reason="insufficient_role" backTo={ROUTES.groups} />;
  }

  return (
    <section className="mobile-screen mobile-screen--list">
      <div className="mobile-search-row">
        <Input id="mobile-user-search" label="Search users" value={query} onChange={(event) => setQuery(event.target.value)} />
      </div>
      <div className="mobile-filter-tabs" role="tablist" aria-label="User filters">
        {['all', 'active', 'deactivated', 'banned'].map((item) => (
          <button key={item} type="button" className={status === item ? 'is-active' : ''} onClick={() => setStatus(item)}>
            {item}
          </button>
        ))}
      </div>
      <div className="mobile-list">
        {filteredUsers.map((user) => (
          <article key={user.id} className="mobile-list-card">
            <button
              type="button"
              className="mobile-list-card__main"
              onClick={() => dispatch({ type: ACTIONS.bottomSheetOpened, payload: { type: 'userActions', userId: user.id } })}
            >
              <span className="mobile-list-card__title">{user.displayName || user.username}</span>
              <span className="mobile-list-card__meta">{user.email || user.username}</span>
              <span className="mobile-badge-row">
                <Badge status={user.status || 'active'}>{user.status || 'active'}</Badge>
                {user.role && <Badge status="neutral">{user.role}</Badge>}
              </span>
            </button>
            <button
              type="button"
              className="mobile-icon-button"
              onClick={() => dispatch({ type: ACTIONS.bottomSheetOpened, payload: { type: 'userActions', userId: user.id } })}
              aria-label={`Open actions for ${user.displayName || user.username}`}
            >
              More
            </button>
          </article>
        ))}
      </div>
    </section>
  );
}

function AuditLogScreen() {
  return (
    <section className="mobile-screen mobile-screen--list">
      <div className="mobile-list">
        {MOBILE_FIXTURE_AUDIT.map((item) => (
          <article key={item.id} className="mobile-list-card mobile-list-card--static">
            <span className="mobile-list-card__title">{item.action}</span>
            <span className="mobile-list-card__meta">{item.actor} -> {item.target}</span>
            <time>{formatTime(item.createdAt)}</time>
          </article>
        ))}
      </div>
    </section>
  );
}

function UserProfileScreen({ userId }) {
  const user = useAppSelector((state) => state.users.byId[userId]);
  if (!user) {
    return <ForbiddenScreen reason="no_user_access" backTo={ROUTES.groups} />;
  }
  return (
    <section className="mobile-screen mobile-profile-screen">
      <h2>{user.displayName || user.username}</h2>
      <p>{user.email || user.username}</p>
      <span className="mobile-badge-row">
        <Badge status={user.status || 'active'}>{user.status || 'active'}</Badge>
        {user.role && <Badge status="neutral">{user.role}</Badge>}
      </span>
    </section>
  );
}

function ForbiddenScreen({ reason, backTo }) {
  const { navigate } = useRoute();
  return (
    <section className="mobile-screen mobile-forbidden-screen" data-testid="mobile-access-revoked">
      <h2>Access unavailable</h2>
      <p>{reasonText(reason)}</p>
      <Button onClick={() => navigate(backTo || ROUTES.groups)}>Back</Button>
    </section>
  );
}

function CreateGroupSheet({ onClose }) {
  const dispatch = useAppDispatch();
  const { navigate } = useRoute();
  const [title, setTitle] = useState('');
  return (
    <form
      className="mobile-form-stack"
      onSubmit={(event) => {
        event.preventDefault();
        const id = `g-${Date.now()}`;
        dispatch({
          type: ACTIONS.groupReceived,
          payload: {
            id,
            title: title || 'New group',
            slug: id,
            visibility: 'private',
            permissions: { canView: true, canPost: true, canManageGroup: true, canManageMembers: true },
          },
        });
        onClose();
        navigate(ROUTES.groupChannels(id));
      }}
    >
      <Input label="Group title" value={title} onChange={(event) => setTitle(event.target.value)} required />
      <Button type="submit">Create group</Button>
    </form>
  );
}

function CreateChannelSheet({ groupId, onClose }) {
  const dispatch = useAppDispatch();
  const { navigate } = useRoute();
  const [title, setTitle] = useState('');
  return (
    <form
      className="mobile-form-stack"
      onSubmit={(event) => {
        event.preventDefault();
        const id = `ch-${Date.now()}`;
        dispatch({
          type: ACTIONS.channelReceived,
          payload: {
            id,
            groupId,
            title: title || 'New channel',
            slug: id,
            kind: 'private',
            permissions: { canView: true, canPost: true, canManageChannel: true, canManageMembers: true },
          },
        });
        onClose();
        navigate(ROUTES.channel(id));
      }}
    >
      <Input label="Channel title" value={title} onChange={(event) => setTitle(event.target.value)} required />
      <Button type="submit">Create channel</Button>
    </form>
  );
}

function ReasonSheet({ title, description, confirmLabel, destructive, onConfirm, onClose }) {
  const [reason, setReason] = useState('');
  return (
    <MobileConfirmDialog
      open
      title={title}
      description={description}
      confirmLabel={confirmLabel}
      destructive={destructive}
      onCancel={onClose}
      onConfirm={() => {
        if (!reason.trim()) {
          return;
        }
        onConfirm(reason);
      }}
    >
      <Textarea label="Reason" value={reason} onChange={(event) => setReason(event.target.value)} required />
    </MobileConfirmDialog>
  );
}

function MobileOverlayHost() {
  const dispatch = useAppDispatch();
  const { navigate } = useRoute();
  const sheet = useAppSelector(selectActiveBottomSheet);
  const groupsById = useAppSelector((state) => state.groups.byId);
  const channelsById = useAppSelector((state) => state.channels.byId);
  const membershipsById = useAppSelector((state) => state.memberships.byId);
  const messagesById = useAppSelector((state) => state.messages.byId);
  const usersById = useAppSelector((state) => state.users.byId);

  const close = () => dispatch({ type: ACTIONS.bottomSheetClosed });
  if (!sheet) {
    return null;
  }

  if (sheet.type === 'createGroup') {
    return (
      <MobileBottomSheet open title="Create group" onClose={close}>
        <CreateGroupSheet onClose={close} />
      </MobileBottomSheet>
    );
  }

  if (sheet.type === 'createChannel') {
    return (
      <MobileBottomSheet open title="Create channel" onClose={close}>
        <CreateChannelSheet groupId={sheet.groupId} onClose={close} />
      </MobileBottomSheet>
    );
  }

  if (sheet.type === 'groupActions') {
    const group = groupsById[sheet.groupId];
    return (
      <MobileBottomSheet open title={group?.title || 'Group actions'} onClose={close}>
        <MobileActionMenu actions={[
          { label: 'Open channels', onSelect: () => { close(); navigate(ROUTES.groupChannels(sheet.groupId)); } },
          { label: 'Members', onSelect: () => { close(); navigate(ROUTES.groupMembers(sheet.groupId)); } },
          { label: 'Settings', disabled: !group?.permissions?.canManageGroup, onSelect: () => { close(); navigate(ROUTES.groupSettings(sheet.groupId)); } },
        ]} />
      </MobileBottomSheet>
    );
  }

  if (sheet.type === 'channelActions') {
    const channel = channelsById[sheet.channelId];
    return (
      <MobileBottomSheet open title={channel?.title || 'Channel actions'} onClose={close}>
        <MobileActionMenu actions={[
          { label: 'Open channel', onSelect: () => { close(); navigate(ROUTES.channel(sheet.channelId)); } },
          { label: 'Members', onSelect: () => { close(); navigate(ROUTES.channelMembers(sheet.channelId)); } },
          { label: 'Settings', disabled: !channel?.permissions?.canManageChannel, onSelect: () => { close(); navigate(ROUTES.channelSettings(sheet.channelId)); } },
        ]} />
      </MobileBottomSheet>
    );
  }

  if (sheet.type === 'messageActions') {
    const message = messagesById[sheet.messageId];
    return (
      <MobileBottomSheet open title="Message actions" onClose={close}>
        <MobileActionMenu actions={[
          { label: 'Reply', description: 'Thread support is a later migration step.', onSelect: close },
          { label: 'Copy text', onSelect: () => { navigator.clipboard?.writeText(message?.body || ''); close(); } },
          { label: 'Delete', danger: true, onSelect: () => { dispatch({ type: ACTIONS.realtimeEventApplied, payload: normalizeRealtimeEvent({ event_id: `delete-${Date.now()}`, event_type: 'message.deleted', channel_id: message?.channelId, payload: { ...message, deletedAt: new Date().toISOString() } }) }); close(); } },
        ]} />
      </MobileBottomSheet>
    );
  }

  if (sheet.type === 'memberActions') {
    const membership = membershipsById[sheet.membershipId];
    const user = usersById[membership?.userId];
    return (
      <MobileBottomSheet open title={user?.displayName || 'Member actions'} onClose={close}>
        <MobileActionMenu actions={[
          { label: 'Open profile', onSelect: () => { close(); navigate(ROUTES.profile(membership.userId)); } },
          { label: 'Change role', onSelect: () => { dispatch({ type: ACTIONS.toastQueued, payload: { id: `role-${Date.now()}`, status: 'info', title: 'Role editor ready for backend wiring' } }); close(); } },
          { label: 'Ban member', danger: true, onSelect: () => dispatch({ type: ACTIONS.bottomSheetOpened, payload: { type: 'banMember', membershipId: sheet.membershipId } }) },
          { label: 'Remove member', danger: true, onSelect: () => dispatch({ type: ACTIONS.bottomSheetOpened, payload: { type: 'removeMember', membershipId: sheet.membershipId } }) },
        ]} />
      </MobileBottomSheet>
    );
  }

  if (sheet.type === 'banMember' || sheet.type === 'removeMember') {
    const membership = membershipsById[sheet.membershipId];
    return (
      <ReasonSheet
        title={sheet.type === 'banMember' ? 'Ban member' : 'Remove member'}
        description="A reason is required and will be sent to the backend when the endpoint is available."
        confirmLabel={sheet.type === 'banMember' ? 'Ban' : 'Remove'}
        destructive
        onClose={close}
        onConfirm={(reason) => {
          dispatch({
            type: ACTIONS.realtimeEventApplied,
            payload: normalizeRealtimeEvent({
              event_id: `${sheet.type}-${Date.now()}`,
              event_type: 'membership.removed',
              channel_id: membership?.channelId,
              payload: { ...membership, state: sheet.type === 'banMember' ? 'banned' : 'removed', reason },
            }),
          });
          close();
        }}
      />
    );
  }

  if (sheet.type === 'addMember') {
    return (
      <MobileBottomSheet open title="Add member" onClose={close}>
        <div className="mobile-form-stack">
          <Input label="User login or email" placeholder="name@example.test" />
          <Button onClick={() => {
            dispatch({ type: ACTIONS.toastQueued, payload: { id: `add-member-${Date.now()}`, status: 'info', title: 'Add member endpoint pending' } });
            close();
          }}>
            Add member
          </Button>
        </div>
      </MobileBottomSheet>
    );
  }

  if (sheet.type === 'userActions') {
    const user = usersById[sheet.userId];
    return (
      <MobileBottomSheet open title={user?.displayName || 'User actions'} onClose={close}>
        <MobileActionMenu actions={[
          { label: 'Open profile', onSelect: () => { close(); navigate(ROUTES.profile(sheet.userId)); } },
          { label: user?.status === 'deactivated' ? 'Reactivate' : 'Deactivate', danger: user?.status !== 'deactivated', onSelect: () => dispatch({ type: ACTIONS.bottomSheetOpened, payload: { type: user?.status === 'deactivated' ? 'reactivateUser' : 'deactivateUser', userId: sheet.userId } }) },
          { label: 'Ban globally', danger: true, onSelect: () => dispatch({ type: ACTIONS.bottomSheetOpened, payload: { type: 'banUser', userId: sheet.userId } }) },
          { label: 'View audit', onSelect: () => { close(); navigate(ROUTES.adminAudit); } },
        ]} />
      </MobileBottomSheet>
    );
  }

  if (sheet.type === 'deactivateUser' || sheet.type === 'banUser') {
    return (
      <ReasonSheet
        title={sheet.type === 'banUser' ? 'Ban user' : 'Deactivate user'}
        description="The user will lose access immediately. Message history remains visible."
        confirmLabel={sheet.type === 'banUser' ? 'Ban' : 'Deactivate'}
        destructive
        onClose={close}
        onConfirm={(reason) => {
          const eventType = sheet.type === 'banUser' ? 'user.banned' : 'user.deactivated';
          dispatch({ type: ACTIONS.realtimeEventApplied, payload: normalizeRealtimeEvent({ event_id: `${eventType}-${Date.now()}`, event_type: eventType, payload: { id: sheet.userId, reason } }) });
          close();
        }}
      />
    );
  }

  if (sheet.type === 'reactivateUser') {
    return (
      <MobileConfirmDialog
        open
        title="Reactivate user"
        description="Previous memberships may still require manual review."
        confirmLabel="Reactivate"
        onCancel={close}
        onConfirm={() => {
          dispatch({ type: ACTIONS.realtimeEventApplied, payload: normalizeRealtimeEvent({ event_id: `reactivate-${Date.now()}`, event_type: 'user.reactivated', payload: { id: sheet.userId, status: 'active' } }) });
          close();
        }}
      />
    );
  }

  if (sheet.type === 'dangerZone') {
    return (
      <MobileBottomSheet open title="Danger zone" onClose={close}>
        <p className="mobile-sheet-copy">Danger actions require backend confirmation and audit logging.</p>
        <Button variant="danger" onClick={close}>I understand</Button>
      </MobileBottomSheet>
    );
  }

  return null;
}

function MobileScreenRouter({ route, bootstrapStatus, currentUser }) {
  const group = useAppSelector(selectSelectedGroup);
  const channel = useAppSelector(selectSelectedChannel);

  if (route.name === 'groups' || route.name === 'app') {
    return <GroupListScreen loading={bootstrapStatus.loading} fallback={bootstrapStatus.fallback} error={bootstrapStatus.error} />;
  }
  if (route.name === 'group' || route.name === 'groupChannels') {
    return <ChannelListScreen group={group} />;
  }
  if (route.name === 'channel') {
    return <ChannelViewScreen channel={channel} currentUser={currentUser} />;
  }
  if (route.name === 'channelMembers') {
    return <MembersScreen channel={channel} />;
  }
  if (route.name === 'groupMembers') {
    return <MembersScreen group={group} />;
  }
  if (route.name === 'channelSettings') {
    return <ChannelSettingsScreen channel={channel} />;
  }
  if (route.name === 'groupSettings') {
    return <GroupSettingsScreen group={group} />;
  }
  if (route.name === 'adminUsers') {
    return <AdminUsersScreen currentUser={currentUser} />;
  }
  if (route.name === 'adminAudit') {
    return <AuditLogScreen />;
  }
  if (route.name === 'profile') {
    return <UserProfileScreen userId={route.params.userId} />;
  }
  return <ForbiddenScreen reason="no_channel_access" backTo={ROUTES.groups} />;
}

function titleForRoute(route, group, channel) {
  if (route.name === 'groups' || route.name === 'app') return 'Groups';
  if (route.name === 'group' || route.name === 'groupChannels') return group?.title || 'Channels';
  if (route.name === 'channel') return channel?.title || 'Channel';
  if (route.name === 'channelMembers' || route.name === 'groupMembers') return 'Members';
  if (route.name === 'channelSettings' || route.name === 'groupSettings') return 'Settings';
  if (route.name === 'adminUsers') return 'Admin users';
  if (route.name === 'adminAudit') return 'Audit log';
  if (route.name === 'profile') return 'Profile';
  return 'Messenger';
}

function parentPathForRoute(route, group, channel, navigation) {
  if (route.name === 'channel') {
    return ROUTES.groupChannels(channel?.groupId || navigation.selectedGroupId || group?.id || 'g-product');
  }
  if (route.name === 'channelMembers' || route.name === 'channelSettings') {
    return ROUTES.channel(route.params.channelId);
  }
  if (route.name === 'groupMembers' || route.name === 'groupSettings' || route.name === 'groupChannels' || route.name === 'group') {
    return ROUTES.groups;
  }
  if (route.name === 'adminUsers' || route.name === 'adminAudit' || route.name === 'profile') {
    return ROUTES.groups;
  }
  return ROUTES.groups;
}

export default function MobileAppShell({ currentUser, accessToken, onLogout }) {
  const { route, navigate } = useRoute();
  const dispatch = useAppDispatch();
  const groups = useAppSelector(selectUserGroups);
  const group = useAppSelector(selectSelectedGroup);
  const channel = useAppSelector(selectSelectedChannel);
  const navigation = useAppSelector(selectNavigation);
  const connectionStatus = useAppSelector((state) => state.session.connectionStatus);
  const channelsById = useAppSelector((state) => state.channels.byId);
  const storeUser = useAppSelector(selectCurrentUser);
  const bootstrapStatus = useMobileBootstrap(storeUser || currentUser, accessToken);
  useMobileViewportVars();
  useMobileRouteSync(route, groups, channelsById);

  const canGoBack = !['groups', 'app'].includes(route.name);
  const parentPath = parentPathForRoute(route, group, channel, navigation);
  const title = titleForRoute(route, group, channel);
  const subtitle = channel?.readonly ? 'Readonly' : group?.visibility || '';

  return (
    <div className="mobile-app-shell" data-testid="mobile-app-shell">
      <MobileTopBar
        title={title}
        subtitle={subtitle}
        canGoBack={canGoBack}
        onBack={() => navigate(parentPath)}
        onLogout={() => {
          clearMobileNavigation();
          dispatch({ type: ACTIONS.sessionLoggedOut });
          onLogout();
        }}
        connectionStatus={connectionStatus}
        actions={(
          <button
            type="button"
            className="mobile-icon-button"
            onClick={() => {
              if (route.name === 'channel' && channel) {
                navigate(ROUTES.channelMembers(channel.id));
              } else if (currentUser?.role === 'ADMIN') {
                navigate(ROUTES.adminUsers);
              } else {
                navigate(ROUTES.groups);
              }
            }}
            aria-label="Open related screen"
          >
            Menu
          </button>
        )}
      />
      <main className="mobile-pane-container">
        <MobileScreenRouter route={route} bootstrapStatus={bootstrapStatus} currentUser={storeUser || currentUser} />
      </main>
      <MobileOverlayHost />
      <MobileToastContainer />
    </div>
  );
}

export { MobileFullscreenDialog };
