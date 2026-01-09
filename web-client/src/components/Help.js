import React from 'react';
import { useTranslation } from 'react-i18next';
import './Help.css';

function Help() {
  const { t } = useTranslation();

  return (
    <div className="help-container">
      <h2>{t('help')}</h2>
      <div className="help-content">
        <h3>{t('setupInstructions')}</h3>
        <p>{t('helpContent')}</p>
        
        <h4>{t('webClientHelp')}</h4>
        <ul>
          <li>{t('serverConnection')}: The web client connects to the server via WebSocket on port 8080</li>
          <li>Login with your credentials to start chatting</li>
          <li>Select a chat from the sidebar to view messages</li>
          <li>Type a message in the input field and press Send or Enter to send</li>
        </ul>
        
        <h4>{t('javaClientHelp')}</h4>
        <ul>
          <li>Download the JavaFX client from the releases section</li>
          <li>Ensure you have Java 17 or higher installed</li>
          <li>Run the client with: java -jar messenger-client.jar</li>
          <li>Login with the same credentials as the web client</li>
        </ul>
        
        <h4>{t('adminFeatures') || t('adminPanel')}</h4>
        <ul>
          <li>{t('userManager')}: Manage users, their roles and account status</li>
          <li>{t('chatManager')}: Create, modify and delete chat rooms</li>
          <li>{t('systemSettings')}: Configure system-wide settings and parameters</li>
          <li>{t('userManagement')}: Monitor and control user activities</li>
          <li>{t('chatManagement')}: Manage chat settings and permissions</li>
          <li>{t('messageManagement')}: Review and moderate messages</li>
        </ul>
        
        <h4>{t('troubleshooting')}</h4>
        <ul>
          <li>If you can't connect to the server, check if it's running on port 8080</li>
          <li>Make sure your firewall allows connections to the server</li>
          <li>For Java client issues, ensure JavaFX libraries are properly installed</li>
          <li>Check the server logs for any authentication errors</li>
          <li>If administrative features are not visible, ensure your account has ADMIN role</li>
        </ul>
      </div>
    </div>
  );
}

export default Help;