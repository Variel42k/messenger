import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import './ChatWindow.css';

function ChatWindow() {
  const { t } = useTranslation();
  const [messages, setMessages] = useState([
    { id: 1, sender: 'System', content: t('helpContent'), isOwn: false }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [chats, setChats] = useState(['General', 'Project Discussion', 'Random']);
  const [currentChat, setCurrentChat] = useState('General');

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
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="chat-container">
      <div className="sidebar">
        <h3>Chats</h3>
        <ul>
          {chats.map(chat => (
            <li 
              key={chat} 
              className={currentChat === chat ? 'active' : ''}
              onClick={() => setCurrentChat(chat)}
            >
              {chat}
            </li>
          ))}
        </ul>
        <div className="new-chat">
          <input type="text" placeholder="New chat name" />
          <button>Create</button>
        </div>
      </div>

      <div className="chat-area">
        <div className="chat-header">
          <h3>{currentChat}</h3>
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
                {message.timestamp ? message.timestamp.toLocaleTimeString() : ''}
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