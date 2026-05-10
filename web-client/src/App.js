import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import './styles/tokens.css';
import './App.css';
import ChatWindow from './components/ChatWindow';
import Login from './components/Login';
import Help from './components/Help';
import AdminPanel from './components/AdminPanel';
import SecuritySettings from './components/SecuritySettings';
import MobileAppShell from './mobile/MobileAppShell';
import { useIsMobileViewport } from './mobile/useMobileViewport';
import { RealtimeProvider } from './realtime';
import { pathForLegacyView, routeToLegacyView, RouteProvider, useRoute } from './routes/routeAdapter';
import { ACTIONS, AppStoreProvider, useAppDispatch } from './store';
import { clearStoredSession, loadStoredSession, saveStoredSession } from './utils/auth';

const searchParams = new URLSearchParams(window.location.search);
const mockView = searchParams.get('mockView');
const mockRole = (searchParams.get('mockRole') || '').toUpperCase();
const mockAuthRaw = (searchParams.get('mockAuth') || '').toLowerCase();
const mockShapesOnly = searchParams.get('mockShapesOnly') === '1';

const isMockView = ['login', 'chat', 'admin', 'help', 'flow'].includes(mockView || '');
const shouldMockAuth = mockAuthRaw === '1' || mockAuthRaw === 'true' || (mockView === 'chat' || mockView === 'admin');
const initialRole = mockRole || (mockView === 'admin' ? 'ADMIN' : 'USER');
const initialView = mockView === 'login' ? 'chat' : (isMockView ? mockView : 'chat');
const storedSession = shouldMockAuth ? null : loadStoredSession();
const initialUser = shouldMockAuth
  ? { username: initialRole === 'ADMIN' ? 'admin' : 'user', role: initialRole }
  : storedSession?.user || null;
const initialAccessToken = shouldMockAuth ? null : storedSession?.accessToken || null;
const initialRefreshToken = shouldMockAuth ? null : storedSession?.refreshToken || null;

function FlowPrototype() {
  return (
    <div className="flow-prototype">
      <div className="flow-node flow-node-login" />
      <div className="flow-node flow-node-chat" />
      <div className="flow-node flow-node-admin" />
      <svg className="flow-svg" viewBox="0 0 1849 847" aria-hidden="true">
        <defs>
          <marker id="flow-arrow-head" markerWidth="10" markerHeight="10" refX="8" refY="5" orient="auto">
            <polygon points="0 0, 10 5, 0 10" fill="#2f3f52" />
          </marker>
        </defs>

        <line x1="360" y1="320" x2="470" y2="320" className="flow-link" markerEnd="url(#flow-arrow-head)" />
        <path d="M 360 210 L 1290 210 L 1290 320 L 1349 320" className="flow-link" markerEnd="url(#flow-arrow-head)" />
        <line x1="470" y1="430" x2="360" y2="430" className="flow-link" markerEnd="url(#flow-arrow-head)" />
        <line x1="1349" y1="430" x2="998" y2="430" className="flow-link" markerEnd="url(#flow-arrow-head)" />
      </svg>
    </div>
  );
}

function AppContent() {
  const { t, i18n } = useTranslation();
  const { navigate, route } = useRoute();
  const dispatch = useAppDispatch();
  const isMobile = useIsMobileViewport(1279);
  const routeDrivenInitialView = isMockView ? initialView : routeToLegacyView(route);
  const [isAuthenticated, setIsAuthenticated] = useState(Boolean(initialUser));
  const [currentUser, setCurrentUser] = useState(initialUser);
  const [accessToken, setAccessToken] = useState(initialAccessToken);
  const [refreshToken, setRefreshToken] = useState(initialRefreshToken);
  const [currentView, setCurrentViewState] = useState(routeDrivenInitialView); // 'chat', 'help', 'admin', 'security'

  useEffect(() => {
    if (!mockShapesOnly) {
      document.body.classList.remove('figma-shapes-only');
      return;
    }

    document.body.classList.add('figma-shapes-only');
    return () => document.body.classList.remove('figma-shapes-only');
  }, []);

  useEffect(() => {
    if (isMockView || mockView === 'flow') {
      return;
    }
    setCurrentViewState(routeToLegacyView(route));
  }, [route]);

  const changeLanguage = (lng) => {
    i18n.changeLanguage(lng);
  };

  const setCurrentView = (view, options = {}) => {
    setCurrentViewState(view);
    if (!isMockView && mockView !== 'flow') {
      navigate(pathForLegacyView(view), options);
    }
  };

  const handleLogin = (userData) => {
    setIsAuthenticated(true);
    const nextUser = userData?.user || userData || { username: 'admin', role: 'ADMIN' };
    const nextAccessToken = userData?.accessToken || null;
    const nextRefreshToken = userData?.refreshToken || null;

    setCurrentUser(nextUser);
    setAccessToken(nextAccessToken);
    setRefreshToken(nextRefreshToken);
    dispatch({ type: ACTIONS.sessionBootstrapped, payload: { user: nextUser } });
    setCurrentView('chat', { replace: true });

    if (!shouldMockAuth) {
      saveStoredSession({
        accessToken: nextAccessToken,
        refreshToken: nextRefreshToken,
        user: nextUser,
      });
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setCurrentUser(null);
    setAccessToken(null);
    setRefreshToken(null);
    dispatch({ type: ACTIONS.sessionLoggedOut });
    setCurrentView('chat', { replace: true });
    clearStoredSession();
  };

  const languageOptions = [
    { value: 'en', label: 'English' },
    { value: 'ru', label: 'Русский' },
    { value: 'de', label: 'Deutsch' },
    { value: 'zh', label: '中文' }
  ];

  const renderMobileMessenger = isMobile && isAuthenticated && (currentView === 'chat' || currentView === 'admin');

  return (
    <div className={`app ${renderMobileMessenger ? 'mobile-app-host' : ''}`}>
      <header className="app-header">
        <h1>{t('app.title')}</h1>
        <div className="header-controls">
          <select onChange={(e) => changeLanguage(e.target.value)} defaultValue="en">
            {languageOptions.map((lang) => (
              <option key={lang.value} value={lang.value}>{lang.label}</option>
            ))}
          </select>

          {isAuthenticated && (
            <div className="user-controls">
              <span className="username">Hello, {currentUser?.username || 'User'}</span>

              {currentUser?.role === 'ADMIN' && (
                <button
                  className={currentView === 'admin' ? 'active' : ''}
                  onClick={() => setCurrentView('admin')}
                >
                  {t('adminPanel')}
                </button>
              )}

              <button
                className={currentView === 'security' ? 'active' : ''}
                onClick={() => setCurrentView('security')}
              >
                Security
              </button>

              <button onClick={handleLogout}>{t('logout')}</button>
            </div>
          )}

          <nav>
            <button
              className={currentView === 'chat' ? 'active' : ''}
              onClick={() => setCurrentView('chat')}
            >
              {t('chat')}
            </button>
            <button
              className={currentView === 'help' ? 'active' : ''}
              onClick={() => setCurrentView('help')}
            >
              {t('help')}
            </button>
          </nav>
        </div>
      </header>

      <RealtimeProvider enabled={isAuthenticated && Boolean(accessToken)} accessToken={accessToken}>
        <main className="app-main">
          {mockView === 'flow' ? (
            <FlowPrototype />
          ) : renderMobileMessenger ? (
            <MobileAppShell currentUser={currentUser} accessToken={accessToken} onLogout={handleLogout} />
          ) : currentView === 'chat' ? (
            !isAuthenticated ? (
              <Login onLogin={handleLogin} />
            ) : (
              <ChatWindow />
            )
          ) : currentView === 'admin' ? (
            isAuthenticated && currentUser?.role === 'ADMIN' ? (
              <AdminPanel />
            ) : (
              <div className="unauthorized">
                <h2>{t('errorOccurred')}</h2>
                <p>{t('adminAccessDenied') || 'Administrative access is denied.'}</p>
                <button onClick={() => setCurrentView('chat')}>{t('back')}</button>
              </div>
            )
          ) : currentView === 'security' ? (
            isAuthenticated ? (
              <SecuritySettings accessToken={accessToken} currentUser={currentUser} />
            ) : (
              <Login onLogin={handleLogin} />
            )
          ) : (
            <Help />
          )}
        </main>
      </RealtimeProvider>
    </div>
  );
}

function App() {
  return (
    <AppStoreProvider initialSession={{ user: initialUser }}>
      <RouteProvider>
        <AppContent />
      </RouteProvider>
    </AppStoreProvider>
  );
}

export default App;
