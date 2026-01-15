import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import './ChatWindow.css';

function ChatWindow() {
 const { t } = useTranslation();
  
  // Функция для форматирования размера файла
  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const [messages, setMessages] = useState([
    { id: 1, sender: 'System', content: t('helpContent'), isOwn: false }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [memberToAdd, setMemberToAdd] = useState('');
  
  const handleAddMember = () => {
    if (memberToAdd.trim() !== '') {
      // В реальном приложении здесь будет вызов API для добавления участника в чат
      alert(`${t('addingMember')} "${memberToAdd}" ${t('toChat')} "${currentChat.name}"`);
      setMemberToAdd('');
    }
  };
  
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
              fileSize: file.size
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
              fileSize: file.size
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
  const [chats, setChats] = useState([
    { id: 1, name: t('general'), type: 'GROUP', encrypted: true, securityLevel: 'SECURE', memberCount: 5, unread: 2, lastMessage: 'Hello everyone!' },
    { id: 2, name: t('projectDiscussion') || t('project'), type: 'PRIVATE', encrypted: false, securityLevel: 'UNSECURE', memberCount: 3, unread: 0, lastMessage: 'Meeting at 3 PM' },
    { id: 3, name: t('random'), type: 'GROUP', encrypted: true, securityLevel: 'LIMITED', memberCount: 12, unread: 5, lastMessage: 'Check out this article' }
  ]);
  const [currentChat, setCurrentChat] = useState(chats[0]);

  const handleSend = () => {
    if (inputValue.trim() !== '') {
      const newMessage = {
        id: messages.length + 1,
        sender: 'You',
        content: inputValue,
        isOwn: true,
        timestamp: new Date()
      };
      setMessages([...messages, newMessage]);
      setInputValue('');
      
      // Update the last message in the current chat
      setChats(chats.map(chat =>
        chat.id === currentChat.id
          ? { ...chat, lastMessage: inputValue, unread: 0 }
          : chat
      ));
    }
  };
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleCreateChat = () => {
    const chatName = prompt(t('enterChatName') || 'Enter chat name:');
    if (chatName) {
      const newChat = {
        id: chats.length + 1,
        name: chatName,
        type: 'GROUP',
        unread: 0,
        lastMessage: ''
      };
      setChats([...chats, newChat]);
      setCurrentChat(newChat);
    }
  };

  return (
    <div className="chat-container">
      <div className="sidebar">
        <div className="sidebar-header">
          <h3>{t('chats')}</h3>
          <button className="new-chat-btn" onClick={handleCreateChat}>+</button>
        </div>
        <ul>
          {chats.map(chat => (
            <li
              key={chat.id}
              className={currentChat.id === chat.id ? 'active' : ''}
              onClick={() => setCurrentChat(chat)}
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

        <div className="chat-members-bar">
          <h4>{t('members')} ({currentChat.memberCount || 3})</h4>
          <div className="add-member-control">
            <input
              type="text"
              placeholder={t('addMemberPlaceholder') || t('username')}
              value={memberToAdd}
              onChange={(e) => setMemberToAdd(e.target.value)}
            />
            <button onClick={handleAddMember}>{t('add')}</button>
          </div>
        </div>

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
            </div>
          ))}
        </div>

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
      </div>
    </div>
  );
}

export default ChatWindow;