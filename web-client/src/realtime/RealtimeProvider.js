import React, { createContext, useContext, useEffect, useMemo, useRef } from 'react';
import { createApiClient } from '../api';
import { ACTIONS, useAppDispatch } from '../store';
import { createRealtimeClient } from './realtimeClient';

const RealtimeContext = createContext(null);

export function RealtimeProvider({ children, enabled, accessToken }) {
  const dispatch = useAppDispatch();
  const clientRef = useRef(null);
  const realtimeApi = useMemo(() => createApiClient({ getAccessToken: () => accessToken }), [accessToken]);

  useEffect(() => {
    if (!enabled) {
      if (clientRef.current) {
        clientRef.current.disconnect({ reason: 'realtime_disabled' });
        clientRef.current = null;
      }
      return undefined;
    }

    const client = createRealtimeClient({
      getAccessToken: () => accessToken,
      onStatusChange: (status) => {
        dispatch({ type: ACTIONS.connectionStatusChanged, payload: { status } });
      },
      onEvent: (event) => {
        dispatch({ type: ACTIONS.realtimeEventApplied, payload: event });
      },
      onResyncRequested: async () => {
        try {
          const bootstrap = await realtimeApi.realtime.getRealtimeBootstrap();
          dispatch({ type: ACTIONS.bootstrapReceived, payload: bootstrap });
        } catch (error) {
          dispatch({
            type: ACTIONS.toastQueued,
            payload: {
              id: `realtime-resync-${Date.now()}`,
              status: 'warning',
              title: 'Realtime resync failed',
              message: error.message,
            },
          });
        }
      },
      onForcedClose: (event) => {
        dispatch({ type: ACTIONS.accessRevoked, payload: { reason: event?.reason || 'forced_disconnect' } });
      },
    });

    clientRef.current = client;
    client.connect();
    return () => {
      client.disconnect({ reason: 'provider_unmounted' });
      clientRef.current = null;
    };
  }, [accessToken, dispatch, enabled, realtimeApi]);

  const value = useMemo(() => ({
    send: (payload) => clientRef.current?.send(payload) || false,
    disconnect: (reason) => clientRef.current?.disconnect({ reason }),
  }), []);

  return <RealtimeContext.Provider value={value}>{children}</RealtimeContext.Provider>;
}

export function useRealtime() {
  return useContext(RealtimeContext);
}
