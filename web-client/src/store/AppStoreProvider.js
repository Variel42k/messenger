import React, { createContext, useContext, useMemo, useReducer } from 'react';
import { createInitialState } from './initialState';
import { ACTIONS, appReducer } from './reducers';

const StoreContext = createContext(null);
const DispatchContext = createContext(null);

function mapInitialSession(initialSession = {}) {
  const user = initialSession.user;
  if (!user) {
    return {};
  }

  return {
    session: {
      currentUserId: user.id ?? user.userId ?? user.username ?? null,
      authStatus: 'authenticated',
      globalRole: user.role ?? user.globalRole ?? null,
      connectionStatus: 'idle',
    },
    users: {
      byId: {
        [user.id ?? user.userId ?? user.username]: {
          id: user.id ?? user.userId ?? user.username,
          username: user.username,
          displayName: user.displayName || user.username,
          role: user.role ?? user.globalRole ?? null,
          status: user.status || 'active',
          ...user,
        },
      },
      allIds: [user.id ?? user.userId ?? user.username],
      status: { [user.id ?? user.userId ?? user.username]: user.status || 'active' },
      roles: { [user.id ?? user.userId ?? user.username]: user.role ?? user.globalRole ?? null },
    },
  };
}

export function AppStoreProvider({ children, initialSession }) {
  const initialState = useMemo(() => createInitialState(mapInitialSession(initialSession)), [initialSession]);
  const [state, dispatch] = useReducer(appReducer, initialState);

  return (
    <StoreContext.Provider value={state}>
      <DispatchContext.Provider value={dispatch}>{children}</DispatchContext.Provider>
    </StoreContext.Provider>
  );
}

export function useAppStore() {
  const context = useContext(StoreContext);
  if (!context) {
    throw new Error('useAppStore must be used inside AppStoreProvider');
  }
  return context;
}

export function useAppDispatch() {
  const context = useContext(DispatchContext);
  if (!context) {
    throw new Error('useAppDispatch must be used inside AppStoreProvider');
  }
  return context;
}

export function useAppSelector(selector) {
  return selector(useAppStore());
}

export function useSessionActions() {
  const dispatch = useAppDispatch();
  return useMemo(() => ({
    bootstrapSession: (payload) => dispatch({ type: ACTIONS.sessionBootstrapped, payload }),
    logoutSession: () => dispatch({ type: ACTIONS.sessionLoggedOut }),
    setConnectionStatus: (status) => dispatch({ type: ACTIONS.connectionStatusChanged, payload: { status } }),
    revokeAccess: (reason) => dispatch({ type: ACTIONS.accessRevoked, payload: { reason } }),
  }), [dispatch]);
}
