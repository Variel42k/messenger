import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import './Login.css';
import { parseJsonSafely } from '../utils/auth';

function clearOidcQueryParams() {
  const url = new URL(window.location.href);
  ['code', 'state', 'session_state', 'iss'].forEach((key) => url.searchParams.delete(key));
  const nextUrl = `${url.pathname}${url.search}${url.hash}`;
  window.history.replaceState({}, document.title, nextUrl);
}

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
  const [isOidcBusy, setIsOidcBusy] = useState(false);
  const [oidcProvider, setOidcProvider] = useState({ enabled: false, displayName: 'Enterprise SSO' });
  const [error, setError] = useState('');

  useEffect(() => {
    let isMounted = true;

    const loadPublicProvider = async () => {
      try {
        const response = await fetch('/api/auth/oidc/provider');
        const data = await parseJsonSafely(response);

        if (!response.ok || !isMounted) {
          return;
        }

        setOidcProvider({
          enabled: Boolean(data.enabled),
          displayName: data.displayName || 'Enterprise SSO',
        });
      } catch (requestError) {
        if (isMounted) {
          setOidcProvider({ enabled: false, displayName: 'Enterprise SSO' });
        }
      }
    };

    loadPublicProvider();
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const state = params.get('state');

    if (!code || !state) {
      return;
    }

    let isMounted = true;

    const exchangeOidcCode = async () => {
      setIsOidcBusy(true);
      setError('');

      try {
        const redirectUri = `${window.location.origin}${window.location.pathname}`;
        const response = await fetch('/api/auth/oidc/exchange', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ code, state, redirectUri }),
        });
        const data = await parseJsonSafely(response);

        if (!response.ok) {
          if (isMounted) {
            setError(data.error || 'OIDC sign-in failed. Please try again.');
          }
          return;
        }

        if (isMounted) {
          onLogin({
            accessToken: data.accessToken,
            refreshToken: data.refreshToken,
            user: {
              username: data.username || 'user',
              role: data.role || 'USER',
            },
          });
        }
      } catch (requestError) {
        if (isMounted) {
          setError('Unable to complete OIDC sign-in. Please try again.');
        }
      } finally {
        clearOidcQueryParams();
        if (isMounted) {
          setIsOidcBusy(false);
        }
      }
    };

    exchangeOidcCode();

    return () => {
      isMounted = false;
    };
  }, [onLogin]);

  const handleSubmit = async (event) => {
    event.preventDefault();
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

  const handleOidcSignIn = async () => {
    setError('');
    setIsOidcBusy(true);

    try {
      const redirectUri = `${window.location.origin}${window.location.pathname}`;
      const response = await fetch(`/api/auth/oidc/authorization-url?redirectUri=${encodeURIComponent(redirectUri)}`);
      const data = await parseJsonSafely(response);

      if (!response.ok || !data.authorizationUrl) {
        setError(data.error || 'OIDC provider is not configured yet.');
        setIsOidcBusy(false);
        return;
      }

      window.location.href = data.authorizationUrl;
    } catch (requestError) {
      setError('Unable to start OIDC sign-in. Please try again later.');
      setIsOidcBusy(false);
    }
  };

  return (
    <div className="login-container">
      <form onSubmit={handleSubmit} className="login-form">
        <div className="login-form-top">
          <p className="login-eyebrow">Secure Workspace</p>
          <h2>{requiresTwoFactor ? 'Two-Factor Authentication' : t('login')}</h2>
          <p className="login-subtitle">
            {requiresTwoFactor
              ? 'Confirm your identity with the code from your authenticator app.'
              : 'Sign in to manage chats, policies, and federated clusters.'}
          </p>
        </div>

        {error && <div className="error-message">{error}</div>}

        {isOidcBusy && !requiresTwoFactor && (
          <div className="login-info-banner">Completing single sign-on...</div>
        )}

        {!requiresTwoFactor ? (
          <>
            <div className="form-group">
              <label htmlFor="username">{t('username')}</label>
              <input
                type="text"
                id="username"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="password">{t('password')}</label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
            </div>

            <button type="submit" disabled={isSubmitting || isOidcBusy}>
              {isSubmitting ? 'Signing in...' : (t('login') || 'Login')}
            </button>

            {oidcProvider.enabled && (
              <>
                <div className="login-divider"><span>or</span></div>
                <button
                  type="button"
                  className="oidc-button"
                  onClick={handleOidcSignIn}
                  disabled={isSubmitting || isOidcBusy}
                >
                  {isOidcBusy ? 'Redirecting...' : `Continue with ${oidcProvider.displayName}`}
                </button>
              </>
            )}

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
                onChange={(event) => setTwoFactorCode(event.target.value)}
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
