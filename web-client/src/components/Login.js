import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import './Login.css';

function Login({ onLogin }) {
  const { t } = useTranslation();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    // В реальном приложении здесь будет вызов API для аутентификации
    console.log('Login attempt with:', { username, password });
    
    // Simulate checking credentials and assigning roles
    // In a real application, this would come from the authentication API
    if (username === 'admin' && password === 'admin123') {
      onLogin({ username, role: 'ADMIN' });
    } else if (username === 'moderator' && password === 'modpass') {
      onLogin({ username, role: 'MODERATOR' });
    } else if (password.length >= 3) {  // Simple validation for demo
      onLogin({ username, role: 'USER' });
    } else {
      setError(t('invalidCredentials') || 'Invalid username or password');
    }
  };

  return (
    <div className="login-container">
      <form onSubmit={handleSubmit} className="login-form">
        <h2>{t('login')}</h2>
        {error && <div className="error-message">{error}</div>}
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
        <div className="demo-credentials">
          <p><strong>Demo credentials:</strong></p>
          <p>Admin: admin / admin123</p>
          <p>User: any_username / any_password (min 3 chars)</p>
        </div>
      </form>
    </div>
  );
}

export default Login;