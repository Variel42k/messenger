import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import './App.css';
import ChatWindow from './components/ChatWindow';
import Login from './components/Login';
import Help from './components/Help';
import AdminPanel from './components/AdminPanel';

function App() {
  const { t, i18n } = useTranslation();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [currentView, setCurrentView] = useState('chat'); // 'chat', 'help', 'admin'

  const changeLanguage = (lng) => {
    i18n.changeLanguage(lng);
  };

  // Simulate checking user role after login
  const handleLogin = (userData) => {
    setIsAuthenticated(true);
    // In a real application, this would come from the authentication response
    setCurrentUser(userData || { username: 'admin', role: 'ADMIN' });
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setCurrentUser(null);
    setCurrentView('chat');
  };

  // Update language options to include new languages
  const languageOptions = [
    { value: 'en', label: 'English' },
    { value: 'ru', label: 'Русский' },
    { value: 'de', label: 'Deutsch' },
    { value: 'zh', label: '中文' }
  ];

  return (
    <div className="app">
      <header className="app-header">
        <h1>{t('app.title')}</h1>
        <div className="header-controls">
          <select onChange={(e) => changeLanguage(e.target.value)} defaultValue="en">
            {languageOptions.map(lang => (
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

      <main className="app-main">
        {currentView === 'chat' ? (
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
        ) : (
          <Help />
        )}
      </main>
    </div>
  );
}

export default App;