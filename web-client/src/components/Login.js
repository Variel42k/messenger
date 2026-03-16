import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import './Login.css';
import { parseJsonSafely } from '../utils/auth';

function Login({ onLogin }) {
  const { t } = useTranslation();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [twoFactorToken, setTwoFactorToken] = useState('');
  const [requiresTwoFactor, setRequiresTwoFactor] = useState(false);
  const [pendingUsername, setPendingUsername] = useState('');
  const [pendingRole, setPendingRole] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      if (requiresTwoFactor) {
        const response = await fetch('/api/auth/login/2fa', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            twoFactorToken,
            code: twoFactorCode,
          }),
        });
        const data = await parseJsonSafely(response);

        if (!response.ok) {
          setError(data.error || 'Invalid authentication code');
          return;
        }

        onLogin({
          accessToken: data.accessToken,
          refreshToken: data.refreshToken,
          user: {
            username: data.username || pendingUsername || username,
            role: data.role || pendingRole || 'USER',
          },
        });
        return;
      }

      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username,
          password,
        }),
      });
      const data = await parseJsonSafely(response);

      if (!response.ok) {
        setError(data.error || t('invalidCredentials') || 'Invalid username or password');
        return;
      }

      if (data.requiresTwoFactor) {
        setRequiresTwoFactor(true);
        setTwoFactorToken(data.twoFactorToken);
        setPendingUsername(data.username || username);
        setPendingRole(data.role || 'USER');
        setError('');
        return;
      }

      onLogin({
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        user: {
          username: data.username || username,
          role: data.role || 'USER',
        },
      });
    } catch (requestError) {
      console.error('Login request failed:', requestError);
      setError('Unable to reach the server. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBackToPasswordStep = () => {
    setRequiresTwoFactor(false);
    setTwoFactorCode('');
    setTwoFactorToken('');
    setPendingUsername('');
    setPendingRole('');
    setError('');
  };

  return (
    <div className="login-container">
      <form onSubmit={handleSubmit} className="login-form">
        <h2>{requiresTwoFactor ? 'Two-Factor Authentication' : t('login')}</h2>
        {error && <div className="error-message">{error}</div>}

        {!requiresTwoFactor ? (
          <>
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
            <button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Signing in...' : (t('login') || 'Login')}
            </button>
            <div className="demo-credentials">
              <p><strong>Default credentials:</strong></p>
              <p>Admin: admin / admin123</p>
            </div>
          </>
        ) : (
          <>
            <p className="login-hint">
              Enter the 6-digit code from your authenticator app for
              {' '}
              <strong>{pendingUsername || username}</strong>.
            </p>
            <div className="form-group">
              <label htmlFor="twoFactorCode">Authentication Code</label>
              <input
                type="text"
                id="twoFactorCode"
                inputMode="numeric"
                maxLength="6"
                value={twoFactorCode}
                onChange={(e) => setTwoFactorCode(e.target.value)}
                required
              />
            </div>
            <div className="login-actions">
              <button type="submit" disabled={isSubmitting || twoFactorCode.trim().length !== 6}>
                {isSubmitting ? 'Verifying...' : 'Verify Code'}
              </button>
              <button type="button" className="secondary-button" onClick={handleBackToPasswordStep} disabled={isSubmitting}>
                Back
              </button>
            </div>
          </>
        )}
      </form>
    </div>
  );
}

export default Login;
