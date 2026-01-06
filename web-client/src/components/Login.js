import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import './Login.css';

function Login({ onLogin }) {
  const { t } = useTranslation();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    // В реальном приложении здесь будет вызов API для аутентификации
    console.log('Login attempt with:', { username, password });
    onLogin();
  };

  return (
    <div className="login-container">
      <form onSubmit={handleSubmit} className="login-form">
        <h2>{t('login')}</h2>
        <div className="form-group">
          <label htmlFor="username">{t('username')}</label>
          <input
            type="text"
            id="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="password">{t('password')}</label>
          <input
            type="password"
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        <button type="submit">{t('login')}</button>
      </form>
    </div>
  );
}

export default Login;