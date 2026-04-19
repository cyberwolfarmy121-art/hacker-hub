import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from '../context/AuthContext';

const RANK_COLORS = {
  RECRUIT: '#6b7280',
  CADET: '#3b82f6',
  ANALYST: '#8b5cf6',
  SPECIALIST: '#ec4899',
  GUARDIAN: '#f59e0b',
  ELITE: '#10b981',
  COMMANDER: '#ef4444',
  ADMIN: '#dc2626'
};

function LiveRoom() {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [message, setMessage] = useState('');
  const [activeTab, setActiveTab] = useState('global');
  const messagesEndRef = useRef(null);
  const socketRef = useRef(null);
  const allianceSocketRef = useRef(null);

  useEffect(() => {
    socketRef.current = io('http://localhost:5000');

    socketRef.current.on('connect', () => {
      socketRef.current.emit('join', {
        userId: user._id,
        codename: user.codename,
        displayName: user.displayName,
        rank: user.rank,
        allianceType: user.allianceType,
        allianceRank: user.allianceRank
      });
    });

    socketRef.current.on('message', (msg) => {
      setMessages(prev => [...prev, msg]);
    });

    socketRef.current.on('systemMessage', (msg) => {
      setMessages(prev => [...prev, { system: true, ...msg }]);
    });

    socketRef.current.on('usersOnline', (codenames) => {
      setOnlineUsers(codenames);
    });

    socketRef.current.on('allianceMessage', (msg) => {
      if (activeTab === 'alliance') {
        setMessages(prev => [...prev, { alliance: true, ...msg }]);
      }
    });

    return () => {
      socketRef.current.disconnect();
    };
  }, [user, activeTab]);

  useEffect(() => {
    if (user.allianceType && allianceSocketRef.current) {
      allianceSocketRef.current = io('http://localhost:5000/alliance');
      allianceSocketRef.current.on('connect', () => {
        allianceSocketRef.current.emit('join', { allianceType: user.allianceType });
      });
      allianceSocketRef.current.on('allianceHistory', (history) => {
        setMessages(history.map(msg => ({ ...msg, alliance: true })));
      });
    }
  }, [user.allianceType]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = (e) => {
    e.preventDefault();
    if (!message.trim()) return;

    const messageData = { content: message };

    if (activeTab === 'global') {
      socketRef.current.emit('chatMessage', messageData);
    } else if (activeTab === 'alliance' && user.allianceType) {
      allianceSocketRef.current?.emit('allianceMessage', messageData);
    }

    setMessage('');
  };

  const formatTime = (date) => {
    return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="live-room">
      <div className="users-panel">
        <h3 className="users-title">Operatives Online ({onlineUsers.length})</h3>
        <div id="users-list">
          {onlineUsers.map((codename, idx) => (
            <div key={idx} className="user-item">
              <div className="user-item-code">{codename}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="chat-panel">
        <div className="messages-container" id="messages-container">
          {messages.map((msg, idx) => (
            <div key={idx} className={`message-item ${msg.system ? 'system-message' : ''} ${msg.alliance ? 'alliance-message' : ''}`}>
              {msg.system ? (
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>
                  {msg.content}
                </div>
              ) : (
                <>
                  <div className="message-header">
                    <span className="message-codename" style={{ color: getRankColor(msg.rank) }}>
                      [{msg.rank}] {msg.codename}
                    </span>
                    {msg.displayName && <span className="message-display">{msg.displayName}</span>}
                    {msg.allianceRank && (
                      <span className="message-display">| {msg.allianceRank}</span>
                    )}
                    <span className="message-time">{formatTime(msg.timestamp)}</span>
                  </div>
                  <div className="message-content">{msg.content}</div>
                </>
              )}
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        <div style={{ borderBottom: '1px solid var(--border-color)', display: 'flex' }}>
          <button 
            className={`tab ${activeTab === 'global' ? 'active' : ''}`}
            style={{ flex: 1 }}
            onClick={() => setActiveTab('global')}
          >
            Global
          </button>
          {user.allianceType && (
            <button 
              className={`tab ${activeTab === 'alliance' ? 'active' : ''}`}
              style={{ flex: 1 }}
              onClick={() => setActiveTab('alliance')}
            >
              {user.allianceType === 'offence' ? 'Offense' : 'Defense'} Team
            </button>
          )}
        </div>

        <form className="message-input-container" onSubmit={sendMessage}>
          <input
            type="text"
            className="message-input"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={`Chat as [${user?.rank}] ${user?.codename}... (No links/files)`}
          />
          <button type="submit" className="btn" style={{ padding: '0.75rem 1.5rem' }}>
            Send
          </button>
        </form>
      </div>
    </div>
  );
}

export default LiveRoom;