import { useEffect, useState } from 'react';
import { ACTIONS, useAppDispatch } from '../store';

export function useIsMobileViewport(maxWidth = 767) {
  const [isMobile, setIsMobile] = useState(() => {
    if (!globalThis.window?.matchMedia) {
      return false;
    }
    return window.matchMedia(`(max-width: ${maxWidth}px)`).matches;
  });

  useEffect(() => {
    if (!window.matchMedia) {
      return undefined;
    }
    const mediaQuery = window.matchMedia(`(max-width: ${maxWidth}px)`);
    const update = () => setIsMobile(mediaQuery.matches);
    update();
    mediaQuery.addEventListener?.('change', update);
    mediaQuery.addListener?.(update);
    return () => {
      mediaQuery.removeEventListener?.('change', update);
      mediaQuery.removeListener?.(update);
    };
  }, [maxWidth]);

  return isMobile;
}

export function useMobileViewportVars() {
  const dispatch = useAppDispatch();

  useEffect(() => {
    const update = () => {
      const viewport = window.visualViewport;
      const viewportHeight = viewport?.height || window.innerHeight;
      const keyboardVisible = viewport ? viewport.height < window.innerHeight - 80 : false;
      document.documentElement.style.setProperty('--app-viewport-height', `${viewportHeight}px`);
      dispatch({
        type: ACTIONS.viewportChanged,
        payload: {
          viewportHeight,
          keyboardVisible,
          safeAreaInsets: { top: 0, right: 0, bottom: 0, left: 0 },
        },
      });
    };

    update();
    window.addEventListener('resize', update);
    window.visualViewport?.addEventListener('resize', update);
    window.visualViewport?.addEventListener('scroll', update);
    return () => {
      window.removeEventListener('resize', update);
      window.visualViewport?.removeEventListener('resize', update);
      window.visualViewport?.removeEventListener('scroll', update);
    };
  }, [dispatch]);
}
