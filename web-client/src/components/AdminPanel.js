import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import './AdminPanel.css';
import SecurityPoliciesTab from './SecurityPoliciesTab';

function AdminPanel() {
 const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [users, setUsers] = useState([]);
  const [chats, setChats] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);

  // Моковые данные для демонстрации
  useEffect(() => {
    // Имитация получения роли текущего пользователя
    setCurrentUser({ username: 'admin', role: 'ADMIN' });
    
    // Моковые данные пользователей
    setUsers([
      { id: 1, username: 'admin', email: 'admin@messenger.local', role: 'ADMIN', status: 'ACTIVE', firstName: 'Admin', lastName: 'User', createdAt: '2026-01-01' },
      { id: 2, username: 'user1', email: 'user1@example.com', role: 'USER', status: 'ACTIVE', firstName: 'John', lastName: 'Doe', createdAt: '2026-01-05' },
      { id: 3, username: 'user2', email: 'user2@example.com', role: 'USER', status: 'INACTIVE', firstName: 'Jane', lastName: 'Smith', createdAt: '2026-01-06' },
    ]);
    
    // Mock chats data
    setChats([
      { id: 1, name: 'General', type: 'GROUP', description: 'General discussion', memberCount: 15, createdAt: '2026-01-01' },
      { id: 2, name: 'Project X', type: 'PRIVATE', description: 'Project related discussions', memberCount: 5, createdAt: '2026-01-02' },
      { id: 3, name: 'Announcements', type: 'CHANNEL', description: 'Official announcements', memberCount: 50, createdAt: '2026-01-03' },
    ]);
  }, []);

  const renderTabContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardTab t={t} users={users} chats={chats} />;
      case 'user-management':
        return <UserManagementTab t={t} users={users} setUsers={setUsers} />;
      case 'chat-management':
        return <ChatManagementTab t={t} chats={chats} setChats={setChats} />;
      case 'ldap-settings':
        return <LdapSettingsTab t={t} />;
      case 'oidc-settings':
        return <OidcSettingsTab t={t} />;
      case 'cluster-federation':
        return <ClusterFederationTab t={t} />;
      case 'security-policies':
        return <SecurityPoliciesTab t={t} />;
      case 'system-settings':
        return <SystemSettingsTab t={t} />;
      case 'help':
        return <HelpTab t={t} />;
      default:
        return <DashboardTab t={t} users={users} chats={chats} />;
    }
  };

  if (!currentUser || currentUser.role !== 'ADMIN') {
    return (
      <div className="admin-panel">
        <h2>{t('errorOccurred')}</h2>
        <p>{t('adminAccessDenied')}</p>
      </div>
    );
  }

  return (
    <div className="admin-panel">
      <div className="admin-sidebar">
        <h3>{t('adminPanel')}</h3>
        <nav>
          <ul>
            <li
              className={activeTab === 'dashboard' ? 'active' : ''}
              onClick={() => setActiveTab('dashboard')}
            >
              {t('dashboard')}
            </li>
            <li
              className={activeTab === 'user-management' ? 'active' : ''}
              onClick={() => setActiveTab('user-management')}
            >
              {t('userManagement')}
            </li>
            <li
              className={activeTab === 'chat-management' ? 'active' : ''}
              onClick={() => setActiveTab('chat-management')}
            >
              {t('chatManagement')}
            </li>
            <li
              className={activeTab === 'ldap-settings' ? 'active' : ''}
              onClick={() => setActiveTab('ldap-settings')}
            >
              {t('ldapSettings')}
            </li>
            <li
              className={activeTab === 'oidc-settings' ? 'active' : ''}
              onClick={() => setActiveTab('oidc-settings')}
            >
              OIDC Provider
            </li>
            <li
              className={activeTab === 'cluster-federation' ? 'active' : ''}
              onClick={() => setActiveTab('cluster-federation')}
            >
              Cluster Federation
            </li>
            <li
              className={activeTab === 'system-settings' ? 'active' : ''}
              onClick={() => setActiveTab('system-settings')}
            >
              {t('systemSettings')}
            </li>
            <li
              className={activeTab === 'security-policies' ? 'active' : ''}
              onClick={() => setActiveTab('security-policies')}
            >
              {t('securityPolicies')}
            </li>
            <li
              className={activeTab === 'help' ? 'active' : ''}
              onClick={() => setActiveTab('help')}
            >
              {t('help')}
            </li>
          </ul>
        </nav>
      </div>
      
      <div className="admin-content">
        <div className="admin-header">
          <h2>
            {activeTab === 'dashboard' && t('dashboard')}
            {activeTab === 'user-management' && t('userManager')}
            {activeTab === 'chat-management' && t('chatManager')}
            {activeTab === 'ldap-settings' && t('ldapSettings')}
            {activeTab === 'oidc-settings' && 'OIDC Provider Configuration'}
            {activeTab === 'cluster-federation' && 'Cluster Federation Control Plane'}
            {activeTab === 'system-settings' && t('systemSettings')}
          </h2>
        </div>
        
        <div className="tab-content">
          {renderTabContent()}
        </div>
      </div>
    </div>
  );
}

// Dashboard Tab Component
function DashboardTab({ t, users, chats }) {
  const activeUsers = users.filter(u => u.status === 'ACTIVE').length;
  const totalChats = chats.length;
  const privateChats = chats.filter(c => c.type === 'PRIVATE').length;
  const groupChats = chats.filter(c => c.type === 'GROUP').length;
  
  return (
    <div className="dashboard-tab">
      <div className="stats-grid">
        <div className="stat-card">
          <h3>{users.length}</h3>
          <p>{t('userList')}</p>
        </div>
        <div className="stat-card">
          <h3>{activeUsers}</h3>
          <p>{t('active')} {t('users').toLowerCase()}</p>
        </div>
        <div className="stat-card">
          <h3>{totalChats}</h3>
          <p>{t('chats').toLowerCase()}</p>
        </div>
        <div className="stat-card">
          <h3>{chats.reduce((acc, chat) => acc + chat.memberCount, 0)}</h3>
          <p>{t('totalMembers')}</p>
        </div>
      </div>
      
      <div className="recent-activity">
        <h3>{t('recentActivity')}</h3>
        <div className="activity-list">
          <div className="activity-item">
            <span className="activity-type">{t('newUserRegistered')}</span>
            <span className="activity-user">user2</span>
            <span className="activity-time">2 hours ago</span>
          </div>
          <div className="activity-item">
            <span className="activity-type">{t('newChatCreated')}</span>
            <span className="activity-user">Project Y</span>
            <span className="activity-time">5 hours ago</span>
          </div>
          <div className="activity-item">
            <span className="activity-type">{t('userStatusChanged')}</span>
            <span className="activity-user">user1</span>
            <span className="activity-time">1 day ago</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// User Management Tab Component
function UserManagementTab({ t, users, setUsers }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddUserForm, setShowAddUserForm] = useState(false);
  const [newUser, setNewUser] = useState({ username: '', email: '', password: '', role: 'USER' });
  
  const filteredUsers = users.filter(user => 
    user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.lastName.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  const handleAddUser = (e) => {
    e.preventDefault();
    // В реальном приложении это был бы вызов API
    const userToAdd = {
      id: users.length + 1,
      ...newUser,
      status: 'ACTIVE',
      firstName: '',
      lastName: '',
      createdAt: new Date().toISOString().split('T')[0]
    };
    setUsers([...users, userToAdd]);
    setNewUser({ username: '', email: '', password: '', role: 'USER' });
    setShowAddUserForm(false);
  };
  
  const handleChangeUserRole = (userId, newRole) => {
    setUsers(users.map(user => 
      user.id === userId ? { ...user, role: newRole } : user
    ));
  };
  
  const handleDeleteUser = (userId) => {
    if (window.confirm(t('deleteConfirmation'))) {
      setUsers(users.filter(user => user.id !== userId));
    }
  };
  
  return (
    <div className="user-management-tab">
      <div className="tab-controls">
        <input
          type="text"
          placeholder={t('searchUsers')}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="search-input"
        />
        <button 
          className="btn btn-primary" 
          onClick={() => setShowAddUserForm(!showAddUserForm)}
        >
          {t('addUser')}
        </button>
      </div>
      
      {showAddUserForm && (
        <form onSubmit={handleAddUser} className="add-user-form">
          <h3>{t('addUser')}</h3>
          <div className="form-group">
            <label>{t('username')}:</label>
            <input
              type="text"
              value={newUser.username}
              onChange={(e) => setNewUser({...newUser, username: e.target.value})}
              required
            />
          </div>
          <div className="form-group">
            <label>{t('userEmail')}:</label>
            <input
              type="email"
              value={newUser.email}
              onChange={(e) => setNewUser({...newUser, email: e.target.value})}
              required
            />
          </div>
          <div className="form-group">
            <label>{t('password')}:</label>
            <input
              type="password"
              value={newUser.password}
              onChange={(e) => setNewUser({...newUser, password: e.target.value})}
              required
            />
          </div>
          <div className="form-group">
            <label>{t('userRole')}:</label>
            <select
              value={newUser.role}
              onChange={(e) => setNewUser({...newUser, role: e.target.value})}
            >
              <option value="USER">{t('member')}</option>
              <option value="MODERATOR">{t('moderator')}</option>
              <option value="ADMIN">{t('admin')}</option>
            </select>
          </div>
          <div className="form-actions">
            <button type="submit" className="btn btn-success">{t('save')}</button>
            <button 
              type="button" 
              className="btn btn-secondary" 
              onClick={() => setShowAddUserForm(false)}
            >
              {t('cancel')}
            </button>
          </div>
        </form>
      )}
      
      <div className="users-table-container">
        <table className="users-table">
          <thead>
            <tr>
              <th>{t('userId')}</th>
              <th>{t('username')}</th>
              <th>{t('userEmail')}</th>
              <th>{t('userRole')}</th>
              <th>{t('userStatus')}</th>
              <th>{t('userCreatedAt')}</th>
              <th>{t('actions')}</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map(user => (
              <tr key={user.id}>
                <td>{user.id}</td>
                <td>{user.username}</td>
                <td>{user.email}</td>
                <td>
                  <select
                    value={user.role}
                    onChange={(e) => handleChangeUserRole(user.id, e.target.value)}
                  >
                    <option value="USER">{t('member')}</option>
                    <option value="MODERATOR">{t('moderator')}</option>
                    <option value="ADMIN">{t('admin')}</option>
                  </select>
                </td>
                <td>
                  <span className={`status-badge ${user.status.toLowerCase()}`}>
                    {t(user.status.toLowerCase())}
                  </span>
                </td>
                <td>{user.createdAt}</td>
                <td>
                  <button 
                    className="btn btn-danger btn-small"
                    onClick={() => handleDeleteUser(user.id)}
                  >
                    {t('delete')}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Chat Management Tab Component
function ChatManagementTab({ t, chats, setChats }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddChatForm, setShowAddChatForm] = useState(false);
  const [newChat, setNewChat] = useState({ name: '', type: 'GROUP', description: '', encrypted: false, securityLevel: 'LIMITED' });
  
  const filteredChats = chats.filter(chat => 
    chat.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    chat.description.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  const handleAddChat = (e) => {
    e.preventDefault();
    // В реальном приложении это был бы вызов API
    const chatToAdd = {
      id: chats.length + 1,
      ...newChat,
      memberCount: 1,
      createdAt: new Date().toISOString().split('T')[0]
    };
    setChats([...chats, chatToAdd]);
    setNewChat({ name: '', type: 'GROUP', description: '' });
    setShowAddChatForm(false);
  };
  
  const handleDeleteChat = (chatId) => {
    if (window.confirm(t('deleteConfirmation'))) {
      setChats(chats.filter(chat => chat.id !== chatId));
    }
  };

  const [showChatMembersModal, setShowChatMembersModal] = useState(false);
  const [currentChatId, setCurrentChatId] = useState(null);
  const [chatMembers, setChatMembers] = useState([]);
  const [availableUsers, setAvailableUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState('');
  const [selectedRole, setSelectedRole] = useState('MEMBER');

  const handleManageChatMembers = (chatId) => {
    // Загрузка участников чата и доступных пользователей
    setCurrentChatId(chatId);
    // В реальном приложении здесь будет вызов API для получения участников чата и всех пользователей
    setChatMembers([
      { id: 1, username: 'admin', role: 'OWNER' },
      { id: 2, username: 'user1', role: 'MEMBER' },
      { id: 3, username: 'user2', role: 'MODERATOR' }
    ]);
    setAvailableUsers([
      { id: 4, username: 'user3' },
      { id: 5, username: 'user4' },
      { id: 6, username: 'user5' }
    ]);
    setShowChatMembersModal(true);
  };

  const handleAddMember = () => {
    if (selectedUser) {
      // В реальном приложении здесь будет вызов API для добавления участника
      const userToAdd = availableUsers.find(u => u.id === parseInt(selectedUser));
      if (userToAdd) {
        setChatMembers([...chatMembers, { ...userToAdd, role: selectedRole }]);
        setAvailableUsers(availableUsers.filter(u => u.id !== parseInt(selectedUser)));
        setSelectedUser('');
      }
    }
  };

  const handleRemoveMember = (userId) => {
    const userToRemove = chatMembers.find(m => m.id === userId);
    if (userToRemove) {
      // В реальном приложении здесь будет вызов API для удаления участника
      setChatMembers(chatMembers.filter(m => m.id !== userId));
      setAvailableUsers([...availableUsers, { id: userToRemove.id, username: userToRemove.username }]);
    }
  };

  const handleUpdateRole = (userId, newRole) => {
    // В реальном приложении здесь будет вызов API для обновления роли
    setChatMembers(chatMembers.map(member =>
      member.id === userId ? { ...member, role: newRole } : member
    ));
  };

  const closeChatMembersModal = () => {
    setShowChatMembersModal(false);
    setCurrentChatId(null);
  };

  const ChatMembersModal = () => {
    if (!showChatMembersModal) return null;

    return (
      <div className="modal-overlay" onClick={closeChatMembersModal}>
        <div className="modal-content" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <h3>{t('manageChatMembers')}</h3>
            <button className="close-btn" onClick={closeChatMembersModal}>×</button>
          </div>
          <div className="modal-body">
            <div className="chat-members-section">
              <h4>{t('currentMembers')}</h4>
              <table className="members-table">
                <thead>
                  <tr>
                    <th>{t('username')}</th>
                    <th>{t('role')}</th>
                    <th>{t('actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {chatMembers.map(member => (
                    <tr key={member.id}>
                      <td>{member.username}</td>
                      <td>
                        <select
                          value={member.role}
                          onChange={(e) => handleUpdateRole(member.id, e.target.value)}
                        >
                          <option value="MEMBER">{t('member')}</option>
                          <option value="MODERATOR">{t('moderator')}</option>
                          <option value="ADMIN">{t('admin')}</option>
                        </select>
                      </td>
                      <td>
                        <button
                          className="btn btn-danger btn-small"
                          onClick={() => handleRemoveMember(member.id)}
                        >
                          {t('remove')}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            <div className="add-member-section">
              <h4>{t('addMember')}</h4>
              <div className="add-member-controls">
                <select
                  value={selectedUser}
                  onChange={(e) => setSelectedUser(e.target.value)}
                >
                  <option value="">{t('selectUser')}</option>
                  {availableUsers.map(user => (
                    <option key={user.id} value={user.id}>{user.username}</option>
                  ))}
                </select>
                <select
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value)}
                >
                  <option value="MEMBER">{t('member')}</option>
                  <option value="MODERATOR">{t('moderator')}</option>
                  <option value="ADMIN">{t('admin')}</option>
                </select>
                <button
                  className="btn btn-primary"
                  onClick={handleAddMember}
                  disabled={!selectedUser}
                >
                  {t('add')}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };
  
  return (
    <div className="chat-management-tab">
      <div className="tab-controls">
        <input
          type="text"
          placeholder={t('searchChats') || t('search')}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="search-input"
        />
        <button
          className="btn btn-primary"
          onClick={() => setShowAddChatForm(!showAddChatForm)}
        >
          {t('createChat')}
        </button>
      </div>
      
      {showAddChatForm && (
        <form onSubmit={handleAddChat} className="add-chat-form">
          <h3>{t('createChat')}</h3>
          <div className="form-group">
            <label>{t('chatName')}:</label>
            <input
              type="text"
              value={newChat.name}
              onChange={(e) => setNewChat({...newChat, name: e.target.value})}
              required
            />
          </div>
          <div className="form-group">
            <label>{t('chatType')}:</label>
            <select
              value={newChat.type}
              onChange={(e) => setNewChat({...newChat, type: e.target.value})}
            >
              <option value="PRIVATE">{t('private')}</option>
              <option value="GROUP">{t('group')}</option>
              <option value="CHANNEL">{t('channel')}</option>
            </select>
          </div>
          <div className="form-group checkbox-group">
            <label>
              <input
                type="checkbox"
                checked={newChat.encrypted || false}
                onChange={(e) => setNewChat({...newChat, encrypted: e.target.checked})}
              />
              {t('encrypted')}
            </label>
          </div>
          <div className="form-group">
            <label>{t('securityLevel')}:</label>
            <select
              value={newChat.securityLevel || 'LIMITED'}
              onChange={(e) => setNewChat({...newChat, securityLevel: e.target.value})}
            >
              <option value="SECURE">{t('secure')}</option>
              <option value="LIMITED">{t('limited')}</option>
              <option value="UNSECURE">{t('unsecure')}</option>
            </select>
          </div>
          <div className="form-group">
            <label>{t('description')}:</label>
            <textarea
              value={newChat.description}
              onChange={(e) => setNewChat({...newChat, description: e.target.value})}
            />
          </div>
          <div className="form-actions">
            <button type="submit" className="btn btn-success">{t('save')}</button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setShowAddChatForm(false)}
            >
              {t('cancel')}
            </button>
          </div>
        </form>
      )}
      
      <div className="chats-table-container">
        <table className="chats-table">
          <thead>
            <tr>
              <th>{t('id') || t('userId')}</th>
              <th>{t('chatName')}</th>
              <th>{t('chatType')}</th>
              <th>{t('description')}</th>
              <th>{t('members')}</th>
              <th>{t('securityLevel')}</th>
              <th>{t('date') || t('userCreatedAt')}</th>
              <th>{t('actions')}</th>
            </tr>
          </thead>
          <tbody>
            {filteredChats.map(chat => (
              <tr key={chat.id}>
                <td>{chat.id}</td>
                <td>{chat.name}</td>
                <td>
                  <span className={`chat-type-badge ${chat.type.toLowerCase()}`}>
                    {t(chat.type.toLowerCase())}
                  </span>
                </td>
                <td>{chat.description}</td>
                <td>{chat.memberCount}</td>
                <td>
                  <span className={`security-level-badge ${chat.securityLevel ? chat.securityLevel.toLowerCase() : 'unsecure'}`}>
                    {chat.encrypted ? (chat.securityLevel ? t(chat.securityLevel.toLowerCase()) : t('secure')) : t('unsecure')}
                  </span>
                </td>
                <td>{chat.createdAt}</td>
                <td>
                  <button
                    className="btn btn-danger btn-small"
                    onClick={() => handleDeleteChat(chat.id)}
                  >
                    {t('delete')}
                  </button>
                  <button
                    className="btn btn-info btn-small"
                    onClick={() => handleManageChatMembers(chat.id)}
                    style={{ marginLeft: '5px' }}
                  >
                    {t('manageMembers')}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// System Settings Tab Component
function SystemSettingsTab({ t }) {
  const [settings, setSettings] = useState({
    maintenanceMode: false,
    registrationEnabled: true,
    maxFileSize: 100,
    retentionDays: 30
  });
  
 const handleSettingChange = (key, value) => {
    setSettings({
      ...settings,
      [key]: value
    });
  };
  
  const handleSaveSettings = () => {
    // В реальном приложении это был бы вызов API
    alert(t('settingsSaved'));
  };
  
 return (
    <div className="system-settings-tab">
      <h3>{t('generalSettings')}</h3>
      
      <div className="settings-form">
        <div className="form-group checkbox-group">
          <label>
            <input
              type="checkbox"
              checked={settings.maintenanceMode}
              onChange={(e) => handleSettingChange('maintenanceMode', e.target.checked)}
            />
            {t('maintenanceMode')}
          </label>
          <small>{t('maintenanceModeDescription') || t('maintenanceModeDesc') || 'Enable maintenance mode to restrict access to the application.'}</small>
        </div>
        
        <div className="form-group checkbox-group">
          <label>
            <input
              type="checkbox"
              checked={settings.registrationEnabled}
              onChange={(e) => handleSettingChange('registrationEnabled', e.target.checked)}
            />
            {t('allowNewRegistrations')}
          </label>
          <small>{t('allowNewRegistrationsDescription') || t('allowNewRegDesc') || 'Allow new users to register for accounts.'}</small>
        </div>
        
        <div className="form-group">
          <label>{t('maxFileSize')} (MB):</label>
          <input
            type="number"
            value={settings.maxFileSize}
            onChange={(e) => handleSettingChange('maxFileSize', parseInt(e.target.value))}
            min="1"
            max="1000"
          />
          <small>{t('maxFileSizeDescription') || t('maxFileSizeDesc') || 'Maximum file size allowed for uploads.'}</small>
        </div>
        
        <div className="form-group">
          <label>{t('messageRetention')} ({t('days').toLowerCase()}):</label>
          <input
            type="number"
            value={settings.retentionDays}
            onChange={(e) => handleSettingChange('retentionDays', parseInt(e.target.value))}
            min="1"
            max="365"
          />
          <small>{t('messageRetentionDescription') || t('messageRetentionDesc') || 'Number of days to retain messages before automatic deletion.'}</small>
        </div>
        
        <div className="form-actions">
          <button className="btn btn-success" onClick={handleSaveSettings}>
            {t('saveChanges')}
          </button>
        </div>
      </div>
    </div>
  );
}

// LDAP Settings Tab Component
function LdapSettingsTab({ t }) {
  const [ldapSettings, setLdapSettings] = useState({
    enabled: false,
    url: '',
    baseDn: '',
    userDnPattern: '',
    managerDn: '',
    managerPassword: ''
  });

  const [ldapHelpInfo, setLdapHelpInfo] = useState(null);
  const [showHelp, setShowHelp] = useState(false);

  // Загрузка справочной информации по LDAP при монтировании компонента
  useEffect(() => {
    const fetchLdapHelpInfo = async () => {
      try {
        const response = await fetch('/api/admin/ldap-configuration-help');
        if (response.ok) {
          const data = await response.json();
          setLdapHelpInfo(data);
        }
      } catch (error) {
        console.error('Error fetching LDAP help info:', error);
      }
    };

    fetchLdapHelpInfo();
  }, []);

  const handleLdapSettingChange = (key, value) => {
    setLdapSettings({
      ...ldapSettings,
      [key]: value
    });
  };

  const handleToggleLdap = () => {
    setLdapSettings({
      ...ldapSettings,
      enabled: !ldapSettings.enabled
    });
  };

  const handleSaveLdapSettings = async () => {
    // В реальном приложении это был бы вызов API для сохранения настроек LDAP
    try {
      const response = await fetch('/api/admin/ldap-settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(ldapSettings),
      });

      if (response.ok) {
        alert(t('ldapSettingsSaved'));
      } else {
        alert(t('errorSavingLdapSettings'));
      }
    } catch (error) {
      console.error('Error saving LDAP settings:', error);
      alert(t('errorSavingLdapSettings'));
    }
  };

  return (
    <div className="ldap-settings-tab">
      <h3>{t('ldapConfiguration')}</h3>
      
      <div className="settings-form">
        <div className="form-group checkbox-group">
          <label>
            <input
              type="checkbox"
              checked={ldapSettings.enabled}
              onChange={handleToggleLdap}
            />
            {t('enableLdapAuthentication')}
          </label>
          <small>{t('enableLdapDescription') || 'Enable LDAP authentication for user login.'}</small>
        </div>
        
        {ldapSettings.enabled && (
          <>
            <div className="form-group">
              <label>{t('ldapServerUrl')}:</label>
              <input
                type="text"
                value={ldapSettings.url}
                onChange={(e) => handleLdapSettingChange('url', e.target.value)}
                placeholder="ldap://ldap.example.com:389"
              />
              <small>{t('ldapServerUrlDescription') || 'URL of the LDAP server (e.g., ldap://example.com:389)'}</small>
            </div>
            
            <div className="form-group">
              <label>{t('ldapBaseDn')}:</label>
              <input
                type="text"
                value={ldapSettings.baseDn}
                onChange={(e) => handleLdapSettingChange('baseDn', e.target.value)}
                placeholder="dc=example,dc=com"
              />
              <small>{t('ldapBaseDnDescription') || 'Base DN for LDAP queries (e.g., dc=example,dc=com)'}</small>
            </div>
            
            <div className="form-group">
              <label>{t('ldapUserDnPattern')}:</label>
              <input
                type="text"
                value={ldapSettings.userDnPattern}
                onChange={(e) => handleLdapSettingChange('userDnPattern', e.target.value)}
                placeholder="uid={0},ou=people"
              />
              <small>{t('ldapUserDnPatternDescription') || 'Pattern for user DNs (e.g., uid={0},ou=people)'}</small>
            </div>
            
            <div className="form-group">
              <label>{t('ldapManagerDn')}:</label>
              <input
                type="text"
                value={ldapSettings.managerDn}
                onChange={(e) => handleLdapSettingChange('managerDn', e.target.value)}
                placeholder="cn=admin,dc=example,dc=com"
              />
              <small>{t('ldapManagerDnDescription') || 'DN of the LDAP manager account for binding'}</small>
            </div>
            
            <div className="form-group">
              <label>{t('ldapManagerPassword')}:</label>
              <input
                type="password"
                value={ldapSettings.managerPassword}
                onChange={(e) => handleLdapSettingChange('managerPassword', e.target.value)}
                placeholder={t('enterPassword')}
              />
              <small>{t('ldapManagerPasswordDescription') || 'Password for the LDAP manager account'}</small>
            </div>
            
            {/* Help section for LDAP domain configuration */}
            <details className="ldap-help-section" style={{marginTop: '20px', padding: '15px', border: '1px solid #ccc', borderRadius: '5px', backgroundColor: '#f9f9f9'}}>
              <summary style={{cursor: 'pointer', fontWeight: 'bold', marginBottom: '10px'}}>
                {t('ldapDomainConfigurationHelp') || 'LDAP Domain Configuration Help'}
              </summary>
              
              <div style={{marginTop: '10px'}} id="ldap-help-content">
                {ldapHelpInfo ? (
                  <>
                    <h4>{t('windowsDomainConfiguration') || 'Windows Domain Configuration'}</h4>
                    <p>{ldapHelpInfo.windowsDomainConfiguration?.description || 'To configure LDAP authentication with a Windows domain controller:'}</p>
                    <ol style={{marginLeft: '20px'}}>
                      {ldapHelpInfo.windowsDomainConfiguration?.steps?.map((step, index) => (
                        <li key={index}>{step}</li>
                      ))}
                    </ol>
                    
                    <h4 style={{marginTop: '15px'}}>{t('linuxDomainConfiguration') || 'Linux Domain Configuration'}</h4>
                    <p>{ldapHelpInfo.linuxDomainConfiguration?.description || 'To configure LDAP authentication with a Linux OpenLDAP server:'}</p>
                    <ol style={{marginLeft: '20px'}}>
                      {ldapHelpInfo.linuxDomainConfiguration?.steps?.map((step, index) => (
                        <li key={index}>{step}</li>
                      ))}
                    </ol>
                    
                    <h4 style={{marginTop: '15px'}}>{t('commonLdapUrls') || 'Common LDAP URLs'}</h4>
                    <ul style={{marginLeft: '20px'}}>
                      <li><strong>{t('windowsLdapUrl') || 'Windows AD'}:</strong> {ldapHelpInfo.commonLdapUrls?.windowsLdapUrl || 'ldap://domain-controller.company.com:389 or ldaps://domain-controller.company.com:636'}</li>
                      <li><strong>{t('openLdapUrl') || 'OpenLDAP'}:</strong> {ldapHelpInfo.commonLdapUrls?.openLdapUrl || 'ldap://ldap.example.com:389 or ldaps://ldap.example.com:636'}</li>
                    </ul>
                  </>
                ) : (
                  <p>{t('loading')}...</p>
                )}
              </div>
            </details>
          </>
        )}
        
        <div className="form-actions">
          <button className="btn btn-success" onClick={handleSaveLdapSettings} disabled={!ldapSettings.enabled}>
            {t('saveLdapSettings')}
          </button>
        </div>
      </div>
    </div>
  );
}

function OidcSettingsTab() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [settings, setSettings] = useState({
    providerName: 'default',
    displayName: 'Enterprise SSO',
    enabled: false,
    issuerUri: '',
    authorizationUri: '',
    tokenUri: '',
    userInfoUri: '',
    jwksUri: '',
    clientId: '',
    clientSecret: '',
    scopes: 'openid profile email',
    redirectUri: `${window.location.origin}${window.location.pathname}`,
    autoProvisionUsers: true,
    defaultRole: 'USER',
    clientSecretConfigured: false,
  });

  const loadSettings = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/admin/oidc/provider');
      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Unable to load OIDC provider settings.');
        setLoading(false);
        return;
      }

      setSettings((previous) => ({
        ...previous,
        ...data,
        clientSecret: '',
      }));
    } catch (requestError) {
      setError('Failed to load OIDC configuration.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const updateField = (key, value) => {
    setSettings((previous) => ({
      ...previous,
      [key]: value,
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/api/admin/oidc/provider', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(settings),
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Unable to save OIDC provider settings.');
        return;
      }

      setSettings((previous) => ({
        ...previous,
        ...data,
        clientSecret: '',
      }));
      setSuccess('OIDC provider settings were saved successfully.');
    } catch (requestError) {
      setError('Network error while saving OIDC settings.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="oidc-settings-tab">
      <h3>OpenID Connect Provider</h3>
      <p className="tab-description">
        Configure your enterprise identity provider and enable seamless single sign-on for Messenger users.
      </p>

      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}

      {loading ? (
        <p>Loading OIDC settings...</p>
      ) : (
        <div className="settings-form">
          <div className="form-group checkbox-group">
            <label>
              <input
                type="checkbox"
                checked={settings.enabled}
                onChange={(event) => updateField('enabled', event.target.checked)}
              />
              Enable OIDC authentication
            </label>
            <small>When enabled, users can authenticate through your configured OIDC provider.</small>
          </div>

          <div className="form-group">
            <label>Provider key</label>
            <input
              type="text"
              value={settings.providerName || ''}
              onChange={(event) => updateField('providerName', event.target.value)}
              placeholder="default"
            />
          </div>

          <div className="form-group">
            <label>Display name</label>
            <input
              type="text"
              value={settings.displayName || ''}
              onChange={(event) => updateField('displayName', event.target.value)}
              placeholder="Corporate SSO"
            />
          </div>

          <div className="form-group">
            <label>Authorization URL</label>
            <input
              type="text"
              value={settings.authorizationUri || ''}
              onChange={(event) => updateField('authorizationUri', event.target.value)}
              placeholder="https://idp.example.com/oauth2/v1/authorize"
            />
          </div>

          <div className="form-group">
            <label>Token URL</label>
            <input
              type="text"
              value={settings.tokenUri || ''}
              onChange={(event) => updateField('tokenUri', event.target.value)}
              placeholder="https://idp.example.com/oauth2/v1/token"
            />
          </div>

          <div className="form-group">
            <label>UserInfo URL</label>
            <input
              type="text"
              value={settings.userInfoUri || ''}
              onChange={(event) => updateField('userInfoUri', event.target.value)}
              placeholder="https://idp.example.com/oauth2/v1/userinfo"
            />
          </div>

          <div className="form-group">
            <label>Issuer URL</label>
            <input
              type="text"
              value={settings.issuerUri || ''}
              onChange={(event) => updateField('issuerUri', event.target.value)}
              placeholder="https://idp.example.com"
            />
          </div>

          <div className="form-group">
            <label>JWKS URL</label>
            <input
              type="text"
              value={settings.jwksUri || ''}
              onChange={(event) => updateField('jwksUri', event.target.value)}
              placeholder="https://idp.example.com/oauth2/v1/keys"
            />
          </div>

          <div className="form-group">
            <label>Client ID</label>
            <input
              type="text"
              value={settings.clientId || ''}
              onChange={(event) => updateField('clientId', event.target.value)}
              placeholder="messenger-web-client"
            />
          </div>

          <div className="form-group">
            <label>
              Client Secret
              {' '}
              {settings.clientSecretConfigured ? '(already configured, leave blank to keep)' : ''}
            </label>
            <input
              type="password"
              value={settings.clientSecret || ''}
              onChange={(event) => updateField('clientSecret', event.target.value)}
              placeholder="********"
            />
          </div>

          <div className="form-group">
            <label>Scopes</label>
            <input
              type="text"
              value={settings.scopes || ''}
              onChange={(event) => updateField('scopes', event.target.value)}
              placeholder="openid profile email"
            />
          </div>

          <div className="form-group">
            <label>Redirect URI</label>
            <input
              type="text"
              value={settings.redirectUri || ''}
              onChange={(event) => updateField('redirectUri', event.target.value)}
              placeholder={`${window.location.origin}${window.location.pathname}`}
            />
          </div>

          <div className="form-group checkbox-group">
            <label>
              <input
                type="checkbox"
                checked={settings.autoProvisionUsers}
                onChange={(event) => updateField('autoProvisionUsers', event.target.checked)}
              />
              Auto-provision users
            </label>
            <small>Automatically create local Messenger accounts for first-time OIDC users.</small>
          </div>

          <div className="form-group">
            <label>Default role for new OIDC users</label>
            <select
              value={settings.defaultRole || 'USER'}
              onChange={(event) => updateField('defaultRole', event.target.value)}
            >
              <option value="USER">USER</option>
              <option value="ADMIN">ADMIN</option>
            </select>
          </div>

          <div className="form-actions">
            <button className="btn btn-success" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : 'Save OIDC Settings'}
            </button>
            <button className="btn btn-secondary" onClick={loadSettings} disabled={saving}>
              Reload
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function ClusterFederationTab() {
  const [clusters, setClusters] = useState([]);
  const [federations, setFederations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [newCluster, setNewCluster] = useState({
    name: '',
    apiBaseUrl: '',
    healthEndpoint: '/actuator/health',
  });

  const [newFederation, setNewFederation] = useState({
    name: '',
    description: '',
    clusterIds: [],
  });

  const loadData = async () => {
    setLoading(true);
    setError('');

    try {
      const [clustersResponse, federationsResponse] = await Promise.all([
        fetch('/api/admin/federation/clusters'),
        fetch('/api/admin/federation/federations'),
      ]);

      const clustersData = await clustersResponse.json();
      const federationsData = await federationsResponse.json();

      if (!clustersResponse.ok) {
        setError(clustersData.error || 'Unable to load cluster registry.');
        setLoading(false);
        return;
      }

      if (!federationsResponse.ok) {
        setError(federationsData.error || 'Unable to load federation list.');
        setLoading(false);
        return;
      }

      setClusters(clustersData);
      setFederations(federationsData);
    } catch (requestError) {
      setError('Unable to reach cluster federation API.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const toggleClusterSelection = (clusterId) => {
    setNewFederation((previous) => {
      const alreadySelected = previous.clusterIds.includes(clusterId);
      return {
        ...previous,
        clusterIds: alreadySelected
          ? previous.clusterIds.filter((id) => id !== clusterId)
          : [...previous.clusterIds, clusterId],
      };
    });
  };

  const handleAddCluster = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/api/admin/federation/clusters', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newCluster),
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Unable to register cluster.');
        return;
      }

      setNewCluster({ name: '', apiBaseUrl: '', healthEndpoint: '/actuator/health' });
      setSuccess('Cluster registered and health-checked successfully.');
      await loadData();
    } catch (requestError) {
      setError('Failed to register cluster.');
    } finally {
      setSaving(false);
    }
  };

  const handleRefreshStatuses = async () => {
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/api/admin/federation/clusters/refresh', {
        method: 'POST',
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Unable to refresh cluster statuses.');
        return;
      }

      setClusters(data);
      setSuccess('Cluster status refreshed.');
    } catch (requestError) {
      setError('Failed to refresh clusters.');
    } finally {
      setSaving(false);
    }
  };

  const handleCreateFederation = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/api/admin/federation/federations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newFederation),
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Unable to create federation.');
        return;
      }

      setNewFederation({ name: '', description: '', clusterIds: [] });
      setSuccess('Federation created from running clusters.');
      await loadData();
    } catch (requestError) {
      setError('Failed to create federation.');
    } finally {
      setSaving(false);
    }
  };

  const runningClusters = clusters.filter((cluster) => cluster.status === 'RUNNING');

  return (
    <div className="cluster-federation-tab">
      <h3>Cluster Federation</h3>
      <p className="tab-description">
        Register active clusters, verify their health, and create federations strictly from running nodes.
      </p>

      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}

      <div className="tab-controls">
        <button className="btn btn-secondary" onClick={loadData} disabled={saving || loading}>
          Reload Data
        </button>
        <button className="btn btn-primary" onClick={handleRefreshStatuses} disabled={saving || loading}>
          Refresh Cluster Health
        </button>
      </div>

      {loading ? (
        <p>Loading federation state...</p>
      ) : (
        <>
          <form className="add-chat-form" onSubmit={handleAddCluster}>
            <h4>Register Cluster</h4>
            <div className="form-group">
              <label>Cluster name</label>
              <input
                type="text"
                value={newCluster.name}
                onChange={(event) => setNewCluster({ ...newCluster, name: event.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label>API base URL</label>
              <input
                type="text"
                value={newCluster.apiBaseUrl}
                onChange={(event) => setNewCluster({ ...newCluster, apiBaseUrl: event.target.value })}
                placeholder="http://cluster-1.example.com:8080"
                required
              />
            </div>
            <div className="form-group">
              <label>Health endpoint</label>
              <input
                type="text"
                value={newCluster.healthEndpoint}
                onChange={(event) => setNewCluster({ ...newCluster, healthEndpoint: event.target.value })}
              />
            </div>
            <div className="form-actions">
              <button type="submit" className="btn btn-success" disabled={saving}>
                {saving ? 'Registering...' : 'Register Cluster'}
              </button>
            </div>
          </form>

          <div className="users-table-container">
            <table className="users-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Name</th>
                  <th>API URL</th>
                  <th>Status</th>
                  <th>Last Checked</th>
                  <th>Last Error</th>
                </tr>
              </thead>
              <tbody>
                {clusters.map((cluster) => (
                  <tr key={cluster.id}>
                    <td>{cluster.id}</td>
                    <td>{cluster.name}</td>
                    <td>{cluster.apiBaseUrl}</td>
                    <td>
                      <span className={`status-badge ${cluster.status.toLowerCase()}`}>
                        {cluster.status}
                      </span>
                    </td>
                    <td>{cluster.lastCheckedAt ? new Date(cluster.lastCheckedAt).toLocaleString() : 'never'}</td>
                    <td>{cluster.lastError || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <form className="add-chat-form" onSubmit={handleCreateFederation}>
            <h4>Create Federation (Running Clusters Only)</h4>
            <div className="form-group">
              <label>Federation name</label>
              <input
                type="text"
                value={newFederation.name}
                onChange={(event) => setNewFederation({ ...newFederation, name: event.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label>Description</label>
              <textarea
                value={newFederation.description}
                onChange={(event) => setNewFederation({ ...newFederation, description: event.target.value })}
              />
            </div>

            <div className="federation-cluster-picker">
              {runningClusters.length === 0 ? (
                <p>No running clusters available. Refresh health checks first.</p>
              ) : (
                runningClusters.map((cluster) => (
                  <label key={cluster.id} className="cluster-chip">
                    <input
                      type="checkbox"
                      checked={newFederation.clusterIds.includes(cluster.id)}
                      onChange={() => toggleClusterSelection(cluster.id)}
                    />
                    <span>{cluster.name}</span>
                  </label>
                ))
              )}
            </div>

            <div className="form-actions">
              <button
                type="submit"
                className="btn btn-success"
                disabled={saving || newFederation.clusterIds.length < 2}
              >
                {saving ? 'Creating...' : 'Create Federation'}
              </button>
            </div>
          </form>

          <div className="users-table-container">
            <table className="users-table">
              <thead>
                <tr>
                  <th>Federation</th>
                  <th>Status</th>
                  <th>Clusters</th>
                  <th>Created</th>
                </tr>
              </thead>
              <tbody>
                {federations.map((federation) => (
                  <tr key={federation.id}>
                    <td>
                      <strong>{federation.name}</strong>
                      <br />
                      <small>{federation.description || 'No description'}</small>
                    </td>
                    <td>
                      <span className={`status-badge ${federation.status.toLowerCase()}`}>
                        {federation.status}
                      </span>
                    </td>
                    <td>
                      {(federation.clusters || []).map((cluster) => cluster.name).join(', ')}
                    </td>
                    <td>{federation.createdAt ? new Date(federation.createdAt).toLocaleString() : '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}


// Help Tab Component
function HelpTab({ t }) {
return (
 <div className="help-tab">
   <h3>{t('helpAndSupport')}</h3>
   
   <div className="help-content">
     <section className="help-section">
       <h4>{t('applicationOverview') || 'Application Overview'}</h4>
       <p>{t('applicationOverviewDescription') || 'The Messenger application is a real-time communication platform that supports multiple protocols and authentication methods.'}</p>
     </section>
     
     <section className="help-section">
       <h4>{t('authenticationMethods') || 'Authentication Methods'}</h4>
       <ul>
         <li><strong>{t('standardAuthentication') || 'Standard Authentication'}:</strong> {t('standardAuthenticationDescription') || 'Username and password authentication against the internal database.'}</li>
         <li><strong>{t('ldapAuthentication') || 'LDAP Authentication'}:</strong> {t('ldapAuthenticationDescription') || 'Enterprise authentication via LDAP/AD servers.'}</li>
       </ul>
     </section>
     
     <section className="help-section">
       <h4>{t('ldapConfigurationTitle') || 'LDAP Configuration Guide'}</h4>
       <div className="ldap-configuration-help">
         <h5>{t('windowsDomainConfiguration') || 'Windows Domain Configuration'}</h5>
         <p>{t('windowsDomainConfigurationDescription') || 'To configure LDAP authentication with a Windows domain controller:'}</p>
         <ol>
           <li>{t('windowsStep1') || 'Open Active Directory Users and Computers'}</li>
           <li>{t('windowsStep2') || 'Navigate to the Organizational Unit (OU) containing users'}</li>
           <li>{t('windowsStep3') || 'Identify the Base DN (e.g., DC=company,DC=com)'}</li>
           <li>{t('windowsStep4') || 'Create a service account with read permissions to user data'}</li>
           <li>{t('windowsStep5') || 'Use LDAPS (ldaps://) for secure connections'}</li>
           <li>{t('windowsStep6') || 'Common user DN pattern: CN={0},OU=Users,DC=company,DC=com'}</li>
         </ol>
         
         <h5 style={{marginTop: '15px'}}>{t('linuxDomainConfiguration') || 'Linux Domain Configuration'}</h5>
         <p>{t('linuxDomainConfigurationDescription') || 'To configure LDAP authentication with a Linux OpenLDAP server:'}</p>
         <ol>
           <li>{t('linuxStep1') || 'Install and configure OpenLDAP server'}</li>
           <li>{t('linuxStep2') || 'Set up directory structure and base DN'}</li>
           <li>{t('linuxStep3') || 'Create bind user with appropriate permissions'}</li>
           <li>{t('linuxStep4') || 'Configure SSL/TLS if required'}</li>
           <li>{t('linuxStep5') || 'Common user DN pattern: uid={0},ou=people,dc=example,dc=com'}</li>
         </ol>
       </div>
     </section>
     
     <section className="help-section">
       <h4>{t('troubleshooting') || 'Troubleshooting'}</h4>
       <ul>
         <li><strong>{t('connectionIssues') || 'Connection Issues'}:</strong> {t('connectionIssuesDescription') || 'Check network connectivity and firewall settings for required ports (8080, 5432, 6379, 9000).'}</li>
         <li><strong>{t('authenticationProblems') || 'Authentication Problems'}:</strong> {t('authenticationProblemsDescription') || 'Verify credentials and authentication method configuration.'}</li>
         <li><strong>{t('ldapConnectionFailure') || 'LDAP Connection Failure'}:</strong> {t('ldapConnectionFailureDescription') || 'Verify LDAP server URL, base DN, and manager credentials.'}</li>
       </ul>
     </section>
     
     <section className="help-section">
       <h4>{t('systemRequirements') || 'System Requirements'}</h4>
       <ul>
         <li>{t('minimumRam') || 'RAM: Minimum 4GB recommended for production use'}</li>
         <li>{t('supportedDatabases') || 'Database: PostgreSQL 12+ or compatible'}</li>
         <li>{t('supportedCache') || 'Cache: Redis 6+ for session and pub/sub'}</li>
         <li>{t('supportedStorage') || 'Storage: S3-compatible object storage for file attachments'}</li>
       </ul>
     </section>
   </div>
 </div>
);
}

export default AdminPanel;
