import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import './ChatWindow.css';

function ChatWindow() {
  const { t } = useTranslation();
  const [chats, setChats] = useState([
    { id: 1, name: t('general'), type: 'GROUP', encrypted: true, securityLevel: 'SECURE', memberCount: 5, unread: 2, lastMessage: 'Hello everyone!' },
    { id: 2, name: t('projectDiscussion') || t('project'), type: 'PRIVATE', encrypted: false, securityLevel: 'UNSECURE', memberCount: 3, unread: 0, lastMessage: 'Meeting at 3 PM' },
    { id: 3, name: t('random'), type: 'GROUP', encrypted: true, securityLevel: 'LIMITED', memberCount: 12, unread: 5, lastMessage: 'Check out this article' }
  ]);
  const [currentChat, setCurrentChat] = useState(chats[0]);
  
  // Состояния для сообщений
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  
  // Состояния для поиска
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  
  // Состояния для тредов
  const [threads, setThreads] = useState({});
  const [currentThread, setCurrentThread] = useState(null);
  
  // Состояния для участников и ролей
  const [chatMembers, setChatMembers] = useState([]);
  const [memberToAdd, setMemberToAdd] = useState('');
  const [selectedMemberRole, setSelectedMemberRole] = useState('MEMBER');
  
  // Для прокрутки сообщений
  const messagesEndRef = useRef(null);
  const searchInputRef = useRef(null);

  // Форматирование размера файла
  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Прокрутка к последнему сообщению
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Загрузка сообщений для текущего чата
  useEffect(() => {
    // В реальном приложении здесь будет вызов API для получения сообщений
    // Для демонстрации используем фиктивные данные
    const mockMessages = [
      { id: 1, sender: 'Alice', content: t('helpContent'), isOwn: false, timestamp: new Date(Date.now() - 3600000) },
      { id: 2, sender: 'Bob', content: 'How are you doing?', isOwn: false, timestamp: new Date(Date.now() - 1800000) },
      { id: 3, sender: 'You', content: 'I am doing well, thanks!', isOwn: true, timestamp: new Date(Date.now() - 600000) },
      { id: 4, sender: 'Charlie', content: 'We need to discuss the project timeline.', isOwn: false, timestamp: new Date(Date.now() - 300000) }
    ];
    
    setMessages(mockMessages);
    setCurrentThread(null); // Сброс треда при смене чата
    
    // В реальном приложении загружаем участников чата
    const mockMembers = [
      { id: 1, username: 'Alice', role: 'ADMIN', online: true },
      { id: 2, username: 'Bob', role: 'MODERATOR', online: true },
      { id: 3, username: 'You', role: 'MEMBER', own: true },
      { id: 4, username: 'Charlie', role: 'MEMBER', online: false }
    ];
    setChatMembers(mockMembers);
  }, [currentChat]);

  // Прокрутка к последнему сообщению при его изменении
  useEffect(() => {
    scrollToBottom();
  }, [messages, currentThread]);

  // Функция отправки сообщения
  const handleSend = () => {
    if (inputValue.trim() !== '') {
      const newMessage = {
        id: messages.length + 1,
        sender: 'You',
        content: inputValue,
        isOwn: true,
        timestamp: new Date(),
        threadId: currentThread ? currentThread.id : null
      };
      
      setMessages(prevMessages => [...prevMessages, newMessage]);
      setInputValue('');
      
      // Обновляем последнее сообщение в чате
      setChats(prevChats => prevChats.map(chat =>
        chat.id === currentChat.id
          ? { ...chat, lastMessage: inputValue, unread: 0 }
          : chat
      ));
    }
  };

  // Обработка нажатия клавиши Enter
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Функция поиска сообщений
  const handleSearch = () => {
    if (!searchQuery.trim()) {
      setIsSearching(false);
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    
    // Фильтрация сообщений по запросу
    const filtered = messages.filter(message => 
      message.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      message.sender.toLowerCase().includes(searchQuery.toLowerCase())
    );
    
    setSearchResults(filtered);
  };

  // Очистка поиска
  const clearSearch = () => {
    setSearchQuery('');
    setSearchResults([]);
    setIsSearching(false);
  };

  // Создание нового чата
  const handleCreateChat = () => {
    const chatName = prompt(t('enterChatName') || 'Enter chat name:');
    if (chatName) {
      const newChat = {
        id: chats.length + 1,
        name: chatName,
        type: 'GROUP',
        encrypted: false,
        securityLevel: 'LIMITED',
        memberCount: 1,
        unread: 0,
        lastMessage: ''
      };
      setChats(prevChats => [...prevChats, newChat]);
      setCurrentChat(newChat);
    }
  };

  // Добавление участника в чат
  const handleAddMember = () => {
    if (memberToAdd.trim() !== '') {
      // В реальном приложении здесь будет вызов API для добавления участника в чат
      alert(`${t('addingMember')} "${memberToAdd}" ${t('toChat')} "${currentChat.name}"`);
      setMemberToAdd('');
    }
  };

  // Обновление роли участника
  const updateMemberRole = (userId, newRole) => {
    setChatMembers(prevMembers => 
      prevMembers.map(member => 
        member.id === userId ? { ...member, role: newRole } : member
      )
    );
  };

  // Загрузка файла
  const handleFileUpload = async (file) => {
    if (file) {
      try {
        // Показываем сообщение о начале загрузки
        alert(`${t('uploadingFile')} "${file.name}" ${t('toChat')} "${currentChat.name}"`);
        
        // Сначала загружаем файл на сервер
        const fileFormData = new FormData();
        fileFormData.append('file', file);
        fileFormData.append('chatId', currentChat.id);
        fileFormData.append('uploadedBy', 1); // В реальном приложении это будет ID текущего пользователя
        
        const fileResponse = await fetch('/api/files/upload', {
          method: 'POST',
          body: fileFormData,
        });
        
        if (fileResponse.ok) {
          const fileResult = await fileResponse.json();
          
          // После успешной загрузки файла создаем сообщение
          const messageData = {
            chatId: currentChat.id,
            senderId: 1, // ID текущего пользователя
            content: `${t('fileSent')}: ${file.name}`,
            messageType: 'FILE'
          };
          
          // Отправляем сообщение о файле
          const messageResponse = await fetch('/api/messages', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(messageData),
          });
          
          if (messageResponse.ok) {
            const messageResult = await messageResponse.json();
            
            // Создаем сообщение с информацией о файле
            const fileMessage = {
              id: messageResult.id || (messages.length + 1),
              sender: 'You',
              content: `${t('fileSent')}: ${file.name}`,
              isOwn: true,
              timestamp: new Date(),
              fileType: 'file',
              fileName: file.name,
              fileId: fileResult.fileId || fileResult.id, // ID файла, полученный от сервера
              fileSize: file.size,
              threadId: currentThread ? currentThread.id : null
            };
            
            // Добавляем сообщение с файлом в список сообщений
            setMessages(prevMessages => [...prevMessages, fileMessage]);
            
            // Обновляем последнее сообщение в чате
            setChats(prevChats => prevChats.map(chat =>
              chat.id === currentChat.id
                ? { ...chat, lastMessage: `${t('fileSent')}: ${file.name}`, unread: 0 }
                : chat
            ));
            
            alert(`${t('fileUploadedSuccessfully')}: ${file.name}`);
          } else {
            // Если сообщение не создалось, но файл загрузился, все равно отображаем его
            const fileMessage = {
              id: messages.length + 1,
              sender: 'You',
              content: `${t('fileSent')}: ${file.name}`,
              isOwn: true,
              timestamp: new Date(),
              fileType: 'file',
              fileName: file.name,
              fileId: fileResult.fileId || fileResult.id,
              fileSize: file.size,
              threadId: currentThread ? currentThread.id : null
            };
            
            setMessages(prevMessages => [...prevMessages, fileMessage]);
            alert(`${t('fileUploadedSuccessfully')}: ${file.name}`);
          }
        } else {
          const errorText = await fileResponse.text();
          throw new Error(`File upload failed with status ${fileResponse.status}: ${errorText}`);
        }
      } catch (error) {
        console.error('Error uploading file:', error);
        alert(`${t('errorUploadingFile')}: ${file.name}\n${error.message}`);
      }
    }
  };

  // Создание треда
  const createThread = (message) => {
    const newThread = {
      id: `thread-${message.id}`,
      parentMessage: message,
      replies: []
    };
    
    setThreads(prev => ({
      ...prev,
      [newThread.id]: newThread
    }));
    
    setCurrentThread(newThread);
  };

  // Ответ в тред
  const replyInThread = (threadId, content) => {
    if (!content.trim()) return;
    
    const newReply = {
      id: `reply-${Date.now()}`,
      sender: 'You',
      content: content,
      isOwn: true,
      timestamp: new Date()
    };
    
    setThreads(prev => ({
      ...prev,
      [threadId]: {
        ...prev[threadId],
        replies: [...prev[threadId].replies, newReply]
      }
    }));
    
    setInputValue('');
  };

  return (
    <div className="chat-container">
      <div className="sidebar">
        <div className="sidebar-header">
          <h3>{t('chats')}</h3>
          <button className="new-chat-btn" onClick={handleCreateChat}>+</button>
        </div>
        <div className="search-container">
          <input
            type="text"
            placeholder={t('searchMessages')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
          />
          <button onClick={handleSearch}>🔍</button>
          {isSearching && (
            <button onClick={clearSearch} className="clear-search-btn">✕</button>
          )}
        </div>
        <ul>
          {chats.map(chat => (
            <li
              key={chat.id}
              className={currentChat.id === chat.id ? 'active' : ''}
              onClick={() => {
                setCurrentChat(chat);
                clearSearch(); // Очистка поиска при смене чата
              }}
            >
              <div className="chat-info">
                <div className="chat-name-and-security">
                  <div className="chat-name">{chat.name}</div>
                  <div className={`security-indicator ${chat.securityLevel.toLowerCase()}`} title={`${chat.encrypted ? t('encrypted') : t('unencrypted')} - ${t(chat.securityLevel.toLowerCase())}`}>
                    {chat.encrypted ? '🔒' : '🔓'}
                  </div>
                </div>
                <div className="chat-type">{t(chat.type.toLowerCase())}</div>
                <div className="chat-preview">{chat.lastMessage}</div>
              </div>
              {chat.unread > 0 && (
                <div className="unread-count">{chat.unread}</div>
              )}
            </li>
          ))}
        </ul>
      </div>

      <div className="chat-area">
        <div className="chat-header">
          <h3>{currentChat.name}</h3>
          <div className="chat-type">{t(currentChat.type.toLowerCase())}</div>
        </div>

        {/* Панель участников и управления правами */}
        <div className="chat-members-bar">
          <div className="members-section">
            <h4>{t('members')} ({chatMembers.length})</h4>
            <div className="members-list">
              {chatMembers.map(member => (
                <div key={member.id} className="member-item">
                  <span className={`member-name ${member.online ? 'online' : 'offline'} ${member.own ? 'own' : ''}`}>
                    {member.username} {member.own && `(${t('you')})`}
                  </span>
                  {member.own || currentChat.createdById === member.id ? (
                    <span className={`role-badge ${member.role.toLowerCase()}`}>{t(member.role.toLowerCase())}</span>
                  ) : (
                    <select 
                      value={member.role} 
                      onChange={(e) => updateMemberRole(member.id, e.target.value)}
                      disabled={chatMembers.find(m => m.own)?.role !== 'ADMIN'}
                    >
                      <option value="MEMBER">{t('member')}</option>
                      <option value="MODERATOR">{t('moderator')}</option>
                      <option value="ADMIN">{t('admin')}</option>
                    </select>
                  )}
                </div>
              ))}
            </div>
          </div>
          
          <div className="add-member-section">
            <div className="add-member-control">
              <input
                type="text"
                placeholder={t('addMemberPlaceholder') || t('username')}
                value={memberToAdd}
                onChange={(e) => setMemberToAdd(e.target.value)}
              />
              <select 
                value={selectedMemberRole} 
                onChange={(e) => setSelectedMemberRole(e.target.value)}
              >
                <option value="MEMBER">{t('member')}</option>
                <option value="MODERATOR">{t('moderator')}</option>
              </select>
              <button onClick={handleAddMember}>{t('add')}</button>
            </div>
          </div>
        </div>

        {/* Отображение результатов поиска или обычных сообщений */}
        {isSearching && searchResults.length > 0 && (
          <div className="search-results-panel">
            <h4>{t('searchResults')} ({searchResults.length})</h4>
            <div className="search-results-messages">
              {searchResults.map(message => (
                <div key={message.id} className="search-result-item">
                  <div className="message-sender">{message.sender}</div>
                  <div className="message-content">{message.content}</div>
                  <div className="message-time">
                    {message.timestamp ? message.timestamp.toLocaleString() : ''}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Отображение треда если активен */}
        {currentThread && (
          <div className="thread-view">
            <div className="thread-header">
              <h4>{t('thread')} - {currentThread.parentMessage.sender}: {currentThread.parentMessage.content.substring(0, 30)}{currentThread.parentMessage.content.length > 30 ? '...' : ''}</h4>
              <button className="close-thread-btn" onClick={() => setCurrentThread(null)}>✕</button>
            </div>
            <div className="thread-parent-message">
              <div className="message {currentThread.parentMessage.isOwn ? 'own' : ''}">
                <div className="message-sender">{currentThread.parentMessage.sender}</div>
                <div className="message-content">{currentThread.parentMessage.content}</div>
                <div className="message-time">
                  {currentThread.parentMessage.timestamp ? currentThread.parentMessage.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                </div>
              </div>
            </div>
            <div className="thread-replies">
              {currentThread.replies.map(reply => (
                <div key={reply.id} className={`message ${reply.isOwn ? 'own' : ''}`}>
                  <div className="message-sender">{reply.sender}</div>
                  <div className="message-content">{reply.content}</div>
                  <div className="message-time">
                    {reply.timestamp ? reply.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Обычное отображение сообщений */}
        {!isSearching && !currentThread && (
          <div className="messages">
            {messages.map(message => (
              <div
                key={message.id}
                className={`message ${message.isOwn ? 'own' : ''}`}
              >
                <div className="message-sender">{message.sender}</div>
                {message.fileType === 'file' ? (
                  <div className="message-content file-content">
                    <div className="file-icon">📁</div>
                    <div className="file-info">
                      <div className="file-name">{message.fileName}</div>
                      <div className="file-size">{formatFileSize(message.fileSize)}</div>
                      <a href={`/api/files/${message.fileId}`} download={message.fileName} className="download-link">
                        {t('downloadFile')}
                      </a>
                    </div>
                  </div>
                ) : (
                  <div className="message-content">{message.content}</div>
                )}
                <div className="message-time">
                  {message.timestamp ? message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                </div>
                <div className="message-actions">
                  <button className="reply-btn" onClick={() => createThread(message)}>
                    {t('reply')}
                  </button>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}

        {/* Поле ввода сообщения */}
        {!currentThread ? (
          <div className="message-input">
            <textarea
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder={t('typeMessage')}
            />
            <button onClick={handleSend}>{t('send')}</button>
            <button className="attachment-btn" onClick={() => document.getElementById('file-upload').click()}>
              📎
            </button>
            <input
              type="file"
              id="file-upload"
              style={{ display: 'none' }}
              onChange={(e) => handleFileUpload(e.target.files[0])}
            />
          </div>
        ) : (
          <div className="message-input">
            <textarea
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  replyInThread(currentThread.id, inputValue);
                }
              }}
              placeholder={t('replyInThread')}
            />
            <button onClick={() => replyInThread(currentThread.id, inputValue)}>{t('reply')}</button>
            <button className="cancel-thread-btn" onClick={() => setCurrentThread(null)}>{t('cancel')}</button>
          </div>
        )}
      </div>
    </div>
  );
}

export default ChatWindow;