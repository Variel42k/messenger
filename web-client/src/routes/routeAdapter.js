import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { ROUTES, parseRoute, pathForLegacyView, routeToLegacyView } from './routeCore';

export { ROUTES, parseRoute, pathForLegacyView, routeToLegacyView };

const RouteContext = createContext(null);

function readLocation() {
  return {
    pathname: window.location.pathname,
    search: window.location.search,
    hash: window.location.hash,
  };
}

export function RouteProvider({ children }) {
  const [locationState, setLocationState] = useState(readLocation);

  useEffect(() => {
    const handlePopState = () => setLocationState(readLocation());
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigate = useCallback((to, options = {}) => {
    const nextPath = typeof to === 'string' ? to : to?.path;
    if (!nextPath) {
      return;
    }

    if (options.replace) {
      window.history.replaceState({}, '', nextPath);
    } else {
      window.history.pushState({}, '', nextPath);
    }
    setLocationState(readLocation());
  }, []);

  const value = useMemo(() => {
    const route = parseRoute(locationState.pathname);
    return {
      location: locationState,
      route,
      navigate,
      isActive: (path) => parseRoute(path).name === route.name,
    };
  }, [locationState, navigate]);

  return <RouteContext.Provider value={value}>{children}</RouteContext.Provider>;
}

export function useRoute() {
  const context = useContext(RouteContext);
  if (!context) {
    throw new Error('useRoute must be used inside RouteProvider');
  }
  return context;
}

export function AppLink({ to, children, className, activeClassName = 'active', ...props }) {
  const { navigate, isActive } = useRoute();
  const active = isActive(to);
  const mergedClassName = [className, active ? activeClassName : ''].filter(Boolean).join(' ');

  return (
    <a
      href={to}
      className={mergedClassName}
      aria-current={active ? 'page' : undefined}
      onClick={(event) => {
        event.preventDefault();
        navigate(to);
      }}
      {...props}
    >
      {children}
    </a>
  );
}
