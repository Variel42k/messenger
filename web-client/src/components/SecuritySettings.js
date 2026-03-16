import React, { useEffect, useState } from 'react';
import './SecuritySettings.css';
import { buildAuthHeaders, parseJsonSafely } from '../utils/auth';

function SecuritySettings({ accessToken, currentUser }) {
  const [status, setStatus] = useState(null);
  const [setupData, setSetupData] = useState(null);
  const [verificationCode, setVerificationCode] = useState('');
  const [disableCode, setDisableCode] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const loadStatus = async () => {
    if (!accessToken) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/2fa/status', {
        headers: buildAuthHeaders(accessToken),
      });
      const data = await parseJsonSafely(response);

      if (!response.ok) {
        setError(data.error || 'Unable to load two-factor authentication status.');
        setLoading(false);
        return;
      }

      setStatus(data);
    } catch (requestError) {
      console.error('Failed to load 2FA status:', requestError);
      setError('Unable to reach the server while loading 2FA settings.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStatus();
  }, [accessToken]);

  const handleSetup = async () => {
    setSaving(true);
    setError('');
    setSuccessMessage('');

    try {
      const response = await fetch('/api/auth/2fa/setup', {
        method: 'POST',
        headers: buildAuthHeaders(accessToken),
      });
      const data = await parseJsonSafely(response);

      if (!response.ok) {
        setError(data.error || 'Unable to generate a 2FA secret.');
        return;
      }

      setSetupData(data);
      setStatus((previous) => ({
        ...(previous || {}),
        enabled: false,
        pendingSetup: true,
      }));
    } catch (requestError) {
      console.error('Failed to generate 2FA secret:', requestError);
      setError('Unable to reach the server while generating the 2FA secret.');
    } finally {
      setSaving(false);
    }
  };

  const handleEnable = async () => {
    setSaving(true);
    setError('');
    setSuccessMessage('');

    try {
      const response = await fetch('/api/auth/2fa/enable', {
        method: 'POST',
        headers: buildAuthHeaders(accessToken, {
          'Content-Type': 'application/json',
        }),
        body: JSON.stringify({ code: verificationCode }),
      });
      const data = await parseJsonSafely(response);

      if (!response.ok) {
        setError(data.error || 'Unable to enable two-factor authentication.');
        return;
      }

      setVerificationCode('');
      setSetupData(null);
      setSuccessMessage(data.message || 'Two-factor authentication has been enabled.');
      await loadStatus();
    } catch (requestError) {
      console.error('Failed to enable 2FA:', requestError);
      setError('Unable to reach the server while enabling 2FA.');
    } finally {
      setSaving(false);
    }
  };

  const handleDisable = async () => {
    setSaving(true);
    setError('');
    setSuccessMessage('');

    try {
      const response = await fetch('/api/auth/2fa/disable', {
        method: 'POST',
        headers: buildAuthHeaders(accessToken, {
          'Content-Type': 'application/json',
        }),
        body: JSON.stringify({ code: disableCode }),
      });
      const data = await parseJsonSafely(response);

      if (!response.ok) {
        setError(data.error || 'Unable to disable two-factor authentication.');
        return;
      }

      setDisableCode('');
      setSetupData(null);
      setSuccessMessage(data.message || 'Two-factor authentication has been disabled.');
      await loadStatus();
    } catch (requestError) {
      console.error('Failed to disable 2FA:', requestError);
      setError('Unable to reach the server while disabling 2FA.');
    } finally {
      setSaving(false);
    }
  };

  const renderStatusClassName = () => {
    if (!status) {
      return 'security-state disabled';
    }
    if (status.enabled) {
      return 'security-state enabled';
    }
    if (status.pendingSetup || setupData) {
      return 'security-state pending';
    }
    return 'security-state disabled';
  };

  const renderStatusText = () => {
    if (!status) {
      return 'Unavailable';
    }
    if (status.enabled) {
      return 'Enabled';
    }
    if (status.pendingSetup || setupData) {
      return 'Setup in progress';
    }
    return 'Disabled';
  };

  if (!accessToken) {
    return (
      <div className="security-settings">
        <div className="security-settings-card">
          <h2>Security Settings</h2>
          <p>You need to sign in before managing two-factor authentication.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="security-settings">
      <div className="security-settings-card">
        <h2>Security Settings</h2>
        <p>
          Manage two-factor authentication for
          {' '}
          <strong>{currentUser?.username || status?.username || 'your account'}</strong>.
        </p>

        {error && <div className="error-message">{error}</div>}
        {successMessage && <div className="security-success">{successMessage}</div>}

        {loading ? (
          <p>Loading 2FA settings...</p>
        ) : (
          <>
            <div className={renderStatusClassName()}>{renderStatusText()}</div>

            {!status?.enabled && !setupData && (
              <div className="security-section">
                <h3>Set Up Authenticator App</h3>
                <p>
                  Generate a personal secret, add it to Google Authenticator, Microsoft Authenticator,
                  or another TOTP-compatible app, and confirm setup with a 6-digit code.
                </p>
                <div className="security-actions">
                  <button
                    type="button"
                    className="primary-action"
                    onClick={handleSetup}
                    disabled={saving}
                  >
                    {saving ? 'Generating...' : 'Generate 2FA Secret'}
                  </button>
                </div>
              </div>
            )}

            {!status?.enabled && (setupData || status?.pendingSetup) && (
              <div className="security-section">
                <h3>Confirm Enrollment</h3>
                <p>
                  Add this account to your authenticator app manually using the key below, then enter the
                  current 6-digit code to enable 2FA.
                </p>

                {setupData && (
                  <>
                    <div className="security-field">
                      <label htmlFor="manual-entry-key">Manual Entry Key</label>
                      <input
                        id="manual-entry-key"
                        type="text"
                        value={setupData.manualEntryKey || setupData.secret}
                        readOnly
                      />
                    </div>

                    <div className="security-field">
                      <label htmlFor="otpauth-url">Authenticator URI</label>
                      <textarea
                        id="otpauth-url"
                        value={setupData.otpauthUrl}
                        readOnly
                      />
                    </div>
                  </>
                )}

                <ul className="security-help">
                  <li>Account name: {currentUser?.username || status?.username}</li>
                  <li>Issuer: {setupData?.issuer || status?.issuer || 'Messenger'}</li>
                  <li>Code format: 6 digits, refresh every 30 seconds</li>
                </ul>

                <div className="security-field">
                  <label htmlFor="verification-code">Authentication Code</label>
                  <input
                    id="verification-code"
                    type="text"
                    inputMode="numeric"
                    maxLength="6"
                    value={verificationCode}
                    onChange={(event) => setVerificationCode(event.target.value)}
                    placeholder="123456"
                  />
                </div>

                <div className="security-actions">
                  <button
                    type="button"
                    className="primary-action"
                    onClick={handleEnable}
                    disabled={saving || verificationCode.trim().length !== 6}
                  >
                    {saving ? 'Enabling...' : 'Enable 2FA'}
                  </button>
                  <button
                    type="button"
                    className="secondary-action"
                    onClick={handleSetup}
                    disabled={saving}
                  >
                    Regenerate Secret
                  </button>
                </div>
              </div>
            )}

            {status?.enabled && (
              <div className="security-section">
                <h3>Disable Two-Factor Authentication</h3>
                <p>
                  To disable 2FA, enter the current 6-digit code from your authenticator app.
                </p>

                <div className="security-field">
                  <label htmlFor="disable-code">Authentication Code</label>
                  <input
                    id="disable-code"
                    type="text"
                    inputMode="numeric"
                    maxLength="6"
                    value={disableCode}
                    onChange={(event) => setDisableCode(event.target.value)}
                    placeholder="123456"
                  />
                </div>

                <div className="security-actions">
                  <button
                    type="button"
                    className="danger-action"
                    onClick={handleDisable}
                    disabled={saving || disableCode.trim().length !== 6}
                  >
                    {saving ? 'Disabling...' : 'Disable 2FA'}
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default SecuritySettings;
