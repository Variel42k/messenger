import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import './App.css';
import ChatWindow from './components/ChatWindow';
import Login from './components/Login';
import Help from './components/Help';

function App() {
  const { t, i18n } = useTranslation();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentView, setCurrentView] = useState('chat'); // 'chat', 'help'

  const changeLanguage = (lng) => {
    i18n.changeLanguage(lng);
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1>{t('messenger')}</h1>
        <div className="header-controls">
          <select onChange={(e) => changeLanguage(e.target.value)} defaultValue="en">
            <option value="en">English</option>
            <option value="ru">Русский</option>
            <option value="es">Español</option>
          </select>
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
            <Login onLogin={() => setIsAuthenticated(true)} />
          ) : (
            <ChatWindow />
          )
        ) : (
          <Help />
        )}
      </main>
    </div>
  );
}

export default App;