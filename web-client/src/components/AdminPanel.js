import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import './AdminPanel.css';

function AdminPanel() {
 const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [users, setUsers] = useState([]);
  const [chats, setChats] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);

  // Mock data for demonstration
  useEffect(() => {
    // Simulate fetching current user role
    setCurrentUser({ username: 'admin', role: 'ADMIN' });
    
    // Mock users data
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
      case 'system-settings':
        return <SystemSettingsTab t={t} />;
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
              className={activeTab === 'system-settings' ? 'active' : ''}
              onClick={() => setActiveTab('system-settings')}
            >
              {t('systemSettings')}
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
    // In a real application, this would be an API call
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
  const [newChat, setNewChat] = useState({ name: '', type: 'GROUP', description: '' });
  
  const filteredChats = chats.filter(chat => 
    chat.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    chat.description.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  const handleAddChat = (e) => {
    e.preventDefault();
    // In a real application, this would be an API call
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
                <td>{chat.createdAt}</td>
                <td>
                  <button 
                    className="btn btn-danger btn-small"
                    onClick={() => handleDeleteChat(chat.id)}
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
    // In a real application, this would be an API call
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

export default AdminPanel;