import React, { useState } from 'react';
import './AdminPanel.css';

function SecurityPoliciesTab({ t }) {
  const [policies, setPolicies] = useState({
    enabled: false,
    encryptionRequired: false,
    minPasswordLength: 8,
    requireSpecialChars: false,
    passwordExpiryDays: 90,
    enableTwoFactorAuth: false,
    sessionTimeout: 30,
    maxLoginAttempts: 5,
    lockoutDuration: 30,
    dataRetentionPeriod: 30,
    automaticDataPurge: true,
    purgeFrequency: 'daily',
    auditLogging: true
  });

  const [selectedUserGroups, setSelectedUserGroups] = useState(['admin', 'moderator']);
  const [dataCategories, setDataCategories] = useState([
    { id: 'confidential', name: t('confidential') || 'Confidential', selected: false },
    { id: 'internal', name: t('internal') || 'Internal Use Only', selected: true },
    { id: 'public', name: t('public') || 'Public', selected: false }
  ]);

  const [messageRetentionSettings, setMessageRetentionSettings] = useState({
    enabled: true,
    retentionPeriod: 30,
    purgeSchedule: 'daily',
    categories: ['regular']
  });

  const [encryptionPolicy, setEncryptionPolicy] = useState({
    enabled: true,
    algorithm: 'AES-256-GCM',
    mode: 'required'
  });

  const [passwordPolicy, setPasswordPolicy] = useState({
    minPasswordLength: 8,
    requireSpecialChars: true,
    passwordExpiryDays: 90,
    enableTwoFactorAuth: false
  });

  const userGroups = [
    { id: 'admin', name: t('admin') || 'Admin' },
    { id: 'moderator', name: t('moderator') || 'Moderator' },
    { id: 'member', name: t('member') || 'Member' },
    { id: 'guest', name: 'Guest' }
  ];

  const dataClassifications = [
    { id: 'public', name: t('public') || 'Public' },
    { id: 'internal', name: t('internal') || 'Internal Use Only' },
    { id: 'confidential', name: t('confidential') || 'Confidential' },
    { id: 'restricted', name: t('restricted') || 'Restricted' }
  ];

  const handlePolicyChange = (key, value) => {
    setPolicies({
      ...policies,
      [key]: value
    });
  };

  const toggleUserGroup = (groupId) => {
    if (selectedUserGroups.includes(groupId)) {
      setSelectedUserGroups(selectedUserGroups.filter(id => id !== groupId));
    } else {
      setSelectedUserGroups([...selectedUserGroups, groupId]);
    }
  };

  const toggleDataCategory = (categoryId) => {
    setDataCategories(
      dataCategories.map(category =>
        category.id === categoryId
          ? { ...category, selected: !category.selected }
          : category
      )
    );
  };

  const handleSavePolicies = async () => {
    try {
      const policyData = {
        ...policies,
        appliedToUserGroups: selectedUserGroups,
        dataCategories: dataCategories.filter(cat => cat.selected).map(cat => cat.id),
        messageRetention: messageRetentionSettings,
        encryptionPolicy: encryptionPolicy,
        passwordPolicy: passwordPolicy
      };

      const response = await fetch('/api/admin/security-policies', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(policyData),
      });

      if (response.ok) {
        alert(t('policySavedSuccessfully') || 'Policy saved successfully');
      } else {
        alert(t('errorSavingPolicy') || 'Error saving policy');
      }
    } catch (error) {
      console.error('Error saving security policies:', error);
      alert(t('errorSavingPolicy') || 'Error saving policy');
    }
  };

  return (
    <div className="security-policies-tab">
      <h3>{t('securityPolicies') || 'Security Policies'}</h3>
      
      <div className="policies-form">
        <div className="form-group checkbox-group">
          <label>
            <input
              type="checkbox"
              checked={policies.enabled}
              onChange={(e) => handlePolicyChange('enabled', e.target.checked)}
            />
            {t('enableSecurityPolicies') || 'Enable Security Policies'}
          </label>
          <small>{t('enableSecurityPoliciesDescription') || 'Enable comprehensive security policies for the application.'}</small>
        </div>
        
        {policies.enabled && (
          <div className="policies-content">
            <div className="policy-section">
              <h4>{t('encryptionPolicy') || 'Encryption Policy'}</h4>
              <div className="form-row">
                <div className="form-group checkbox-group">
                  <label>
                    <input
                      type="checkbox"
                      checked={encryptionPolicy.enabled}
                      onChange={(e) => setEncryptionPolicy({...encryptionPolicy, enabled: e.target.checked})}
                    />
                    {t('enableEncryption') || 'Enable Encryption'}
                  </label>
                </div>
                
                <div className="form-group">
                  <label>{t('encryptionAlgorithm') || 'Encryption Algorithm'}:</label>
                  <select
                    value={encryptionPolicy.algorithm}
                    onChange={(e) => setEncryptionPolicy({...encryptionPolicy, algorithm: e.target.value})}
                  >
                    <option value="AES-256-GCM">AES-256-GCM</option>
                    <option value="AES-192-GCM">AES-192-GCM</option>
                    <option value="AES-128-GCM">AES-128-GCM</option>
                  </select>
                </div>
                
                <div className="form-group">
                  <label>{t('encryptionMode') || 'Encryption Mode'}:</label>
                  <select
                    value={encryptionPolicy.mode}
                    onChange={(e) => setEncryptionPolicy({...encryptionPolicy, mode: e.target.value})}
                  >
                    <option value="required">{t('encryptionRequired') || 'Required'}</option>
                    <option value="optional">{t('encryptionOptional') || 'Optional'}</option>
                  </select>
                </div>
              </div>
            </div>
            
            <div className="policy-section">
              <h4>{t('passwordPolicy') || 'Password Policy'}</h4>
              <div className="form-row">
                <div className="form-group">
                  <label>{t('minPasswordLength') || 'Minimum Password Length'}:</label>
                  <input
                    type="number"
                    value={passwordPolicy.minPasswordLength}
                    onChange={(e) => setPasswordPolicy({...passwordPolicy, minPasswordLength: parseInt(e.target.value) || 8})}
                    min="6"
                    max="128"
                  />
                </div>
                
                <div className="form-group">
                  <label>{t('passwordExpiryDays') || 'Password Expiry (days)'}:</label>
                  <input
                    type="number"
                    value={passwordPolicy.passwordExpiryDays}
                    onChange={(e) => setPasswordPolicy({...passwordPolicy, passwordExpiryDays: parseInt(e.target.value) || 90})}
                    min="1"
                    max="365"
                  />
                </div>
              </div>
              
              <div className="form-row">
                <div className="form-group checkbox-group">
                  <label>
                    <input
                      type="checkbox"
                      checked={passwordPolicy.requireSpecialChars}
                      onChange={(e) => setPasswordPolicy({...passwordPolicy, requireSpecialChars: e.target.checked})}
                    />
                    {t('requireSpecialChars') || 'Require Special Characters'}
                  </label>
                </div>
                
                <div className="form-group checkbox-group">
                  <label>
                    <input
                      type="checkbox"
                      checked={passwordPolicy.enableTwoFactorAuth}
                      onChange={(e) => setPasswordPolicy({...passwordPolicy, enableTwoFactorAuth: e.target.checked})}
                    />
                    {t('enableTwoFactorAuth') || 'Enable Two-Factor Authentication'}
                  </label>
                </div>
              </div>
            </div>
            
            <div className="policy-section">
              <h4>{t('messageRetentionSettings') || 'Message Retention Settings'}</h4>
              <div className="form-row">
                <div className="form-group checkbox-group">
                  <label>
                    <input
                      type="checkbox"
                      checked={messageRetentionSettings.enabled}
                      onChange={(e) => setMessageRetentionSettings({...messageRetentionSettings, enabled: e.target.checked})}
                    />
                    {t('enableAutomaticPurge') || 'Enable Automatic Data Purge'}
                  </label>
                </div>
                
                <div className="form-group">
                  <label>{t('dataRetentionPeriod') || 'Data Retention Period (days)'}:</label>
                  <input
                    type="number"
                    value={messageRetentionSettings.retentionPeriod}
                    onChange={(e) => setMessageRetentionSettings({...messageRetentionSettings, retentionPeriod: parseInt(e.target.value) || 30})}
                    min="1"
                    max="3650"
                  />
                  <small>{t('dataRetentionPeriodDescription') || 'Number of days to retain messages and associated data before automatic deletion.'}</small>
                </div>
                
                <div className="form-group">
                  <label>{t('purgeFrequency') || 'Purge Frequency'}:</label>
                  <select
                    value={messageRetentionSettings.purgeSchedule}
                    onChange={(e) => setMessageRetentionSettings({...messageRetentionSettings, purgeSchedule: e.target.value})}
                  >
                    <option value="daily">{t('daily') || 'Daily'}</option>
                    <option value="weekly">{t('weekly') || 'Weekly'}</option>
                    <option value="monthly">{t('monthly') || 'Monthly'}</option>
                  </select>
                </div>
              </div>
            
            <div className="policy-section">
              <h4>{t('dataClassification') || 'Data Classification'}</h4>
              <div className="form-group">
                <label>{t('dataCategories') || 'Data Categories'}:</label>
                <div className="checkbox-list">
                  {dataClassifications.map(category => (
                    <label key={category.id} className="checkbox-item">
                      <input
                        type="checkbox"
                        checked={dataCategories.some(dc => dc.id === category.id && dc.selected)}
                        onChange={() => toggleDataCategory(category.id)}
                      />
                      {category.name}
                    </label>
                  ))}
                </div>
                <small>{t('dataClassificationDescription') || 'Rules for categorizing and handling different types of information.'}</small>
              </div>
            </div>
            
            <div className="policy-section">
              <h4>{t('accessControlPolicy') || 'Access Control Policy'}</h4>
              <div className="form-row">
                <div className="form-group">
                  <label>{t('sessionTimeout') || 'Session Timeout'} ({t('minutes') || 'minutes'}):</label>
                  <input
                    type="number"
                    value={policies.sessionTimeout}
                    onChange={(e) => handlePolicyChange('sessionTimeout', parseInt(e.target.value) || 30)}
                    min="5"
                    max="480"
                  />
                </div>
                
                <div className="form-group">
                  <label>{t('maxLoginAttempts') || 'Max Login Attempts'}:</label>
                  <input
                    type="number"
                    value={policies.maxLoginAttempts}
                    onChange={(e) => handlePolicyChange('maxLoginAttempts', parseInt(e.target.value) || 5)}
                    min="1"
                    max="10"
                  />
                </div>
              </div>
              
              <div className="form-group">
                <label>{t('lockoutDuration') || 'Account Lockout Duration'} ({t('minutes') || 'minutes'}):</label>
                <input
                  type="number"
                  value={policies.lockoutDuration}
                  onChange={(e) => handlePolicyChange('lockoutDuration', parseInt(e.target.value) || 30)}
                  min="1"
                  max="1440"
                />
              </div>
            </div>
            
            <div className="policy-section">
              <h4>{t('auditLogging') || 'Audit Logging'}</h4>
              <div className="form-group checkbox-group">
                <label>
                  <input
                    type="checkbox"
                    checked={policies.auditLogging}
                    onChange={(e) => handlePolicyChange('auditLogging', e.target.checked)}
                  />
                  {t('enableAuditLogging') || 'Enable Audit Logging'}
                </label>
                <small>{t('auditLoggingDescription') || 'Enable detailed logging of user actions and system events.'}</small>
              </div>
            </div>
            
            <div className="policy-section">
              <h4>{t('applyPolicyTo') || 'Apply Policy To'}</h4>
              <div className="form-group">
                <label>{t('selectUserGroups') || 'Select User Groups'}:</label>
                <div className="checkbox-list">
                  {userGroups.map(group => (
                    <label key={group.id} className="checkbox-item">
                      <input
                        type="checkbox"
                        checked={selectedUserGroups.includes(group.id)}
                        onChange={() => toggleUserGroup(group.id)}
                      />
                      {group.name}
                    </label>
                  ))}
                </div>
              </div>
            </div>
            
            {/* Detailed help section for domain configuration */}
            <details className="ldap-help-section" style={{marginTop: '20px', padding: '15px', border: '1px solid #ccc', borderRadius: '5px', backgroundColor: '#f9f9f9'}}>
              <summary style={{cursor: 'pointer', fontWeight: 'bold', marginBottom: '10px'}}>
                {t('domainConfigurationHelp') || 'Domain Configuration Help'}
              </summary>
              
              <div style={{marginTop: '10px'}} id="domain-help-content">
                <h4>{t('windowsDomainConfiguration') || 'Windows Domain Configuration'}</h4>
                <p>{t('windowsDomainConfigurationDescription') || 'To configure domain authentication with a Windows domain controller:'}</p>
                <ol style={{marginLeft: '20px'}}>
                  <li>{t('windowsStep1') || 'Open Active Directory Users and Computers'}</li>
                  <li>{t('windowsStep2') || 'Navigate to the Organizational Unit (OU) containing users'}</li>
                  <li>{t('windowsStep3') || 'Identify the Base DN (e.g., DC=company,DC=com)'}</li>
                  <li>{t('windowsStep4') || 'Create a service account with read permissions to user data'}</li>
                  <li>{t('windowsStep5') || 'Use LDAPS (ldaps://) for secure connections'}</li>
                  <li>{t('windowsStep6') || 'Common user DN pattern: CN={0},OU=Users,DC=company,DC=com'}</li>
                </ol>
                
                <h4 style={{marginTop: '15px'}}>{t('linuxDomainConfiguration') || 'Linux Domain Configuration'}</h4>
                <p>{t('linuxDomainConfigurationDescription') || 'To configure domain authentication with a Linux OpenLDAP server:'}</p>
                <ol style={{marginLeft: '20px'}}>
                  <li>{t('linuxStep1') || 'Install and configure OpenLDAP server'}</li>
                  <li>{t('linuxStep2') || 'Set up directory structure and base DN'}</li>
                  <li>{t('linuxStep3') || 'Create bind user with appropriate permissions'}</li>
                  <li>{t('linuxStep4') || 'Configure SSL/TLS if required'}</li>
                  <li>{t('linuxStep5') || 'Common user DN pattern: uid={0},ou=people,dc=example,dc=com'}</li>
                </ol>
                
                <h4 style={{marginTop: '15px'}}>{t('commonLdapUrls') || 'Common LDAP URLs'}</h4>
                <ul style={{marginLeft: '20px'}}>
                  <li><strong>{t('windowsLdapUrl') || 'Windows AD'}:</strong> {t('ldapWindowsUrlDetails') || 'ldap://domain-controller.company.com:389 or ldaps://domain-controller.company.com:636'}</li>
                  <li><strong>{t('openLdapUrl') || 'OpenLDAP'}:</strong> {t('ldapOpenLdapUrlDetails') || 'ldap://ldap.example.com:389 or ldaps://ldap.example.com:636'}</li>
                </ul>
              </div>
            </details>
          </div>
        )}
        
        <div className="form-actions">
          <button 
            className="btn btn-success" 
            onClick={handleSavePolicies}
            disabled={!policies.enabled}
          >
            {t('savePolicy') || 'Save Policy'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default SecurityPoliciesTab;