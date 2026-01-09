import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import './ChatWindow.css';

function ChatWindow() {
  const { t } = useTranslation();
  const [messages, setMessages] = useState([
    { id: 1, sender: 'System', content: t('helpContent'), isOwn: false }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [chats, setChats] = useState([
    { id: 1, name: t('general'), type: 'GROUP', unread: 2, lastMessage: 'Hello everyone!' },
    { id: 2, name: t('projectDiscussion') || t('project'), type: 'PRIVATE', unread: 0, lastMessage: 'Meeting at 3 PM' },
    { id: 3, name: t('random'), type: 'GROUP', unread: 5, lastMessage: 'Check out this article' }
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
                <div className="chat-name">{chat.name}</div>
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

        <div className="messages">
          {messages.map(message => (
            <div
              key={message.id}
              className={`message ${message.isOwn ? 'own' : ''}`}
            >
              <div className="message-sender">{message.sender}</div>
              <div className="message-content">{message.content}</div>
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
            onKeyPress={handleKeyPress}
            placeholder={t('typeMessage')}
          />
          <button onClick={handleSend}>{t('send')}</button>
        </div>
      </div>
    </div>
  );
}

export default ChatWindow;