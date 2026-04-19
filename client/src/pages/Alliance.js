import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from '../context/AuthContext';
import { SOCKET_URL } from '../config';

const ALLIANCE_COLORS = {
  offence: '#ef4444',
  defence: '#3b82f6'
};

const ALLIANCE_RANKS = {
  MEMBER: { level: 0, name: 'Member', defaultPerms: { messaging: true, tasks: true, flagging: false, invites: false } },
  OPERATIVE: { level: 1, name: 'Operative', defaultPerms: { messaging: true, tasks: true, flagging: false, invites: true } },
  ELITE: { level: 2, name: 'Elite', defaultPerms: { messaging: true, tasks: true, flagging: true, invites: true } },
  MARSHAL: { level: 3, name: 'Marshal', defaultPerms: { messaging: true, tasks: true, flagging: true, invites: true, promote: true, demote: true, manageTasks: true, managePermissions: true, remove: true } }
};

const PERMISSION_LABELS = {
  messaging: 'Send Messages',
  tasks: 'Access Tasks',
  flagging: 'Flag Content',
  invites: 'Invite Members',
  promote: 'Promote Members',
  demote: 'Demote Members',
  manageTasks: 'Manage Tasks',
  managePermissions: 'Manage Permissions',
  remove: 'Remove Members'
};

function Alliance() {
  const { user, apiCall } = useAuth();
  const [alliance, setAlliance] = useState(null);
  const [loading, setLoading] = useState(true);
  const [allianceMessages, setAllianceMessages] = useState([]);
  const [messageInput, setMessageInput] = useState('');
  const [activeSection, setActiveSection] = useState('members');
  const [message, setMessage] = useState('');
  const [showPermModal, setShowPermModal] = useState(false);
  const [selectedRank, setSelectedRank] = useState(null);
  const [rankPerms, setRankPerms] = useState({});
  const messagesEndRef = useRef(null);

  useEffect(() => {
    fetchAlliance();
    
    const allianceSocket = io(`${SOCKET_URL}/alliance`);
    allianceSocket.emit('join', { allianceType: user.allianceType });

    allianceSocket.on('allianceMessage', (msg) => {
      setAllianceMessages(prev => [...prev, msg]);
    });

    allianceSocket.on('allianceHistory', (history) => {
      setAllianceMessages(history);
    });

    return () => allianceSocket.disconnect();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [allianceMessages]);

  const fetchAlliance = async () => {
    try {
      const response = await apiCall('/api/alliance');
      if (response.ok) {
        const data = await response.json();
        setAlliance(data);
      }
    } catch (err) {
      console.error('Failed to fetch alliance:', err);
    }
    setLoading(false);
  };

  const joinAlliance = async (type) => {
    setLoading(true);
    const response = await apiCall('/api/alliance/join', {
      method: 'POST',
      body: JSON.stringify({ allianceType: type })
    });
    
    if (response.ok) {
      const data = await response.json();
      setAlliance(data);
    }
    setLoading(false);
  };

  const leaveAlliance = async () => {
    if (!window.confirm('Are you sure you want to leave your alliance?')) return;
    
    const response = await apiCall('/api/alliance/leave', { method: 'POST' });
    if (response.ok) {
      setAlliance(null);
    }
  };

  const promoteMember = async (targetId, newRank) => {
    await apiCall('/api/alliance/promote', {
      method: 'POST',
      body: JSON.stringify({ targetId, newRank })
    });
    fetchAlliance();
  };

  const demoteMember = async (targetId) => {
    await apiCall('/api/alliance/demote', {
      method: 'POST',
      body: JSON.stringify({ targetId })
    });
    fetchAlliance();
  };

  const removeMember = async (targetId) => {
    if (!window.confirm('Remove this member from alliance?')) return;
    await apiCall('/api/alliance/remove', {
      method: 'POST',
      body: JSON.stringify({ targetId })
    });
    fetchAlliance();
  };

  const openPermModal = (rank) => {
    setSelectedRank(rank);
    setRankPerms(alliance.rankPermissions?.[rank] || ALLIANCE_RANKS[rank].defaultPerms || {});
    setShowPermModal(true);
  };

  const saveRankPerms = async () => {
    await apiCall('/api/alliance/rank-permissions', {
      method: 'POST',
      body: JSON.stringify({ rank: selectedRank, permissions: rankPerms })
    });
    setShowPermModal(false);
    fetchAlliance();
  };

  const togglePerm = (perm) => {
    setRankPerms(prev => ({ ...prev, [perm]: !prev[perm] }));
  };

  const sendAllianceMessage = (e) => {
    e.preventDefault();
    if (!messageInput.trim()) return;
    
    const allianceSocket = io(`${SOCKET_URL}/alliance`);
    allianceSocket.emit('allianceMessage', { content: messageInput });
    allianceSocket.emit('chatMessage', { content: `/team ${messageInput}` });
    
    setMessageInput('');
  };

  const formatTime = (date) => {
    return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (!user.allianceType && !alliance) {
    return (
      <div className="alliance-container">
        <div className="alliance-header">
          <h2 className="alliance-title">Select Alliance</h2>
        </div>

        <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem', textAlign: 'center' }}>
          Choose your path. Each alliance has unique missions and team focus.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
          <div 
            className="alliance-members" 
            style={{ padding: '2rem', background: 'var(--bg-secondary)', border: `2px solid ${ALLIANCE_COLORS.offence}`, textAlign: 'center', cursor: 'pointer' }}
            onClick={() => joinAlliance('offence')}
          >
            <h3 style={{ color: ALLIANCE_COLORS.offence, fontSize: '1.5rem', marginBottom: '1rem' }}>⚔️ OFFENCE TEAM</h3>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>Red Warriors</p>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '2rem' }}>
              Focus: Penetration testing, CTF challenges, exploit development
            </p>
            <button className="btn" style={{ borderColor: ALLIANCE_COLORS.offence, color: ALLIANCE_COLORS.offence }}>
              Join Offence
            </button>
          </div>

          <div 
            className="alliance-members" 
            style={{ padding: '2rem', background: 'var(--bg-secondary)', border: `2px solid ${ALLIANCE_COLORS.defence}`, textAlign: 'center', cursor: 'pointer' }}
            onClick={() => joinAlliance('defence')}
          >
            <h3 style={{ color: ALLIANCE_COLORS.defence, fontSize: '1.5rem', marginBottom: '1rem' }}>🛡️ DEFENCE TEAM</h3>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>Blue Shield</p>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '2rem' }}>
              Focus: Blue team ops, threat detection, incident response
            </p>
            <button className="btn" style={{ borderColor: ALLIANCE_COLORS.defence, color: ALLIANCE_COLORS.defence }}>
              Join Defence
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return <div className="loading">Loading alliance...</div>;
  }

  return (
    <div className="alliance-container">
      <div className="alliance-header">
        <div>
          <h2 className="alliance-title">
            <span style={{ color: ALLIANCE_COLORS[alliance?.allianceType] }}>
              {alliance?.allianceType?.toUpperCase()} TEAM
            </span>
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
            {alliance?.alliance?.name} • {alliance?.alliance?.memberCount} members
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <span style={{ 
            padding: '0.5rem 1rem', 
            background: 'var(--bg-tertiary)', 
            border: `1px solid ${ALLIANCE_COLORS[alliance?.allianceType]}`,
            color: ALLIANCE_COLORS[alliance?.allianceType],
            fontWeight: 'bold',
            textTransform: 'uppercase'
          }}>
            {alliance?.allianceRank}
          </span>
          <button className="btn btn-small" onClick={leaveAlliance}>
            Leave
          </button>
        </div>
      </div>

      <div style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
          <button 
            className={`tab ${activeSection === 'members' ? 'active' : ''}`}
            onClick={() => setActiveSection('members')}
          >
            Members
          </button>
          <button 
            className={`tab ${activeSection === 'chat' ? 'active' : ''}`}
            onClick={() => setActiveSection('chat')}
          >
            Team Chat
          </button>
          {alliance.permissions?.managePermissions && (
            <button 
              className={`tab ${activeSection === 'manage' ? 'active' : ''}`}
              onClick={() => setActiveSection('manage')}
            >
              Manage
            </button>
          )}
        </div>

        {activeSection === 'members' && (
          <div className="profile-card">
            <h3 style={{ color: 'var(--accent-secondary)', marginBottom: '1.5rem' }}>
              Team Roster
            </h3>
            
            <div className="alliance-members">
              {alliance.members?.map((member) => (
                <div key={member._id} className="member-card">
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between',
                    marginBottom: '0.5rem'
                  }}>
                    <div className="member-code" style={{ fontSize: '1rem' }}>{member.codename}</div>
                    {member._id === user._id && (
                      <span style={{ fontSize: '0.75rem', color: 'var(--accent-primary)' }}>(You)</span>
                    )}
                  </div>
                  <div className="member-rank" style={{ fontSize: '0.75rem' }}>
                    [{member.rank}]
                  </div>
                  {member.displayName && (
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                      {member.displayName}
                    </div>
                  )}
                  <div className="member-alliance-rank" style={{ 
                    border: `1px solid ${ALLIANCE_COLORS[alliance.allianceType]}`,
                    fontSize: '0.75rem',
                    marginTop: '0.25rem'
                  }}>
                    {member.allianceRank}
                  </div>

                  {(alliance.permissions?.promote || alliance.permissions?.demote) && member._id !== user._id && (
                    <div style={{ 
                      display: 'flex', 
                      gap: '0.25rem', 
                      marginTop: '0.75rem',
                      justifyContent: 'center'
                    }}>
                      {alliance.permissions?.promote && member.allianceRank !== 'MARSHAL' && (
                        <button 
                          className="btn btn-small"
                          onClick={() => promoteMember(member._id, getNextRank(member.allianceRank))}
                          style={{ fontSize: '0.625rem', padding: '0.25rem 0.5rem' }}
                        >
                          Promote
                        </button>
                      )}
                      {alliance.permissions?.demote && member.allianceRank !== 'MEMBER' && (
                        <button 
                          className="btn btn-small btn-danger"
                          onClick={() => demoteMember(member._id)}
                          style={{ fontSize: '0.625rem', padding: '0.25rem 0.5rem' }}
                        >
                          Demote
                        </button>
                      )}
                      {alliance.permissions?.managePermissions && (
                        <button 
                          className="btn btn-small"
                          onClick={() => removeMember(member._id)}
                          style={{ fontSize: '0.625rem', padding: '0.25rem 0.5rem' }}
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {activeSection === 'chat' && (
          <div className="profile-card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ 
              height: '300px', 
              overflowY: 'auto', 
              padding: '1rem',
              background: 'var(--bg-tertiary)'
            }}>
              {allianceMessages.map((msg, idx) => (
                <div key={idx} style={{ marginBottom: '0.75rem' }}>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'baseline' }}>
                    <span style={{ 
                      color: ALLIANCE_COLORS[alliance.allianceType], 
                      fontWeight: 'bold',
                      fontSize: '0.875rem'
                    }}>
                      [{msg.allianceRank}] {msg.codename}
                    </span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                      {formatTime(msg.timestamp)}
                    </span>
                  </div>
                  <div style={{ color: 'var(--text-primary)', fontSize: '0.875rem' }}>
                    {msg.content}
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
            <form onSubmit={sendAllianceMessage} style={{ 
              display: 'flex', 
              padding: '1rem', 
              borderTop: '1px solid var(--border-color)' 
            }}>
              <input
                type="text"
                className="message-input"
                value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
                placeholder="Team message..."
                style={{ flex: 1 }}
              />
              <button type="submit" className="btn" style={{ padding: '0.5rem 1rem' }}>
                Send
              </button>
            </form>
          </div>
        )}

        {activeSection === 'manage' && alliance.permissions?.managePermissions && (
          <div className="profile-card">
            <h3 style={{ color: 'var(--accent-secondary)', marginBottom: '1.5rem' }}>
              Alliance Management - Rank Permissions
            </h3>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', fontSize: '0.875rem' }}>
              Configure permissions for each alliance rank. Only Marshal can modify these settings.
            </p>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
              {Object.entries(ALLIANCE_RANKS).filter(([key]) => key !== 'MARSHAL').map(([rankKey, rankInfo]) => (
                <div key={rankKey} style={{ 
                  padding: '1rem', 
                  background: 'var(--bg-tertiary)', 
                  border: '1px solid var(--border-color)',
                  borderRadius: '4px'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <span style={{ fontWeight: 'bold', color: ALLIANCE_COLORS[alliance.allianceType] }}>
                      {rankInfo.name}
                    </span>
                    <button 
                      className="btn btn-small"
                      onClick={() => openPermModal(rankKey)}
                      style={{ fontSize: '0.625rem', padding: '0.25rem 0.5rem' }}
                    >
                      Edit
                    </button>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    {Object.entries(alliance.rankPermissions?.[rankKey] || rankInfo.defaultPerms || {})
                      .filter(([_, v]) => v)
                      .map(([perm]) => PERMISSION_LABELS[perm] || perm)
                      .join(', ') || 'No permissions'
                    }
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="profile-card">
        <h3 style={{ color: 'var(--accent-secondary)', marginBottom: '1rem' }}>
          Mission Focus
        </h3>
        {alliance.allianceType === 'offence' ? (
          <ul style={{ listStyle: 'none', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
            <li style={{ marginBottom: '0.5rem' }}>✓ Penetration testing & vulnerability assessment</li>
            <li style={{ marginBottom: '0.5rem' }}>✓ Capture The Flag (CTF) competitions</li>
            <li style={{ marginBottom: '0.5rem' }}>✓ Exploit development & research</li>
            <li style={{ marginBottom: '0.5rem' }}>✓ Red team operations</li>
            <li>✓ OSINT & reconnaissance techniques</li>
          </ul>
        ) : (
          <ul style={{ listStyle: 'none', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
            <li style={{ marginBottom: '0.5rem' }}>✓ Network defense & monitoring</li>
            <li style={{ marginBottom: '0.5rem' }}>✓ Incident response & forensics</li>
            <li style={{ marginBottom: '0.5rem' }}>✓ Threat intelligence analysis</li>
            <li style={{ marginBottom: '0.5rem' }}>✓ Security architecture review</li>
            <li>✓ Malware analysis & reverse engineering</li>
          </ul>
        )}
      </div>

      {showPermModal && (
        <div className="rules-overlay">
          <div className="rules-popup">
            <h2 className="rules-title">Edit {ALLIANCE_RANKS[selectedRank]?.name} Permissions</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem', fontSize: '0.875rem' }}>
              Configure what {ALLIANCE_RANKS[selectedRank]?.name}s can do in the alliance.
            </p>
            
            <div style={{ marginBottom: '1.5rem' }}>
              {Object.entries(PERMISSION_LABELS).map(([perm, label]) => (
                <div key={perm} className="rules-checkbox">
                  <input
                    type="checkbox"
                    id={`perm-${perm}`}
                    checked={rankPerms[perm] || false}
                    onChange={() => togglePerm(perm)}
                  />
                  <label htmlFor={`perm-${perm}`}>{label}</label>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button className="btn" onClick={saveRankPerms} style={{ flex: 1 }}>
                Save Permissions
              </button>
              <button className="btn btn-secondary" onClick={() => setShowPermModal(false)} style={{ flex: 1 }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function getNextRank(currentRank) {
  const order = ['MEMBER', 'OPERATIVE', 'ELITE', 'MARSHAL'];
  const idx = order.indexOf(currentRank);
  return idx < order.length - 1 ? order[idx + 1] : 'MARSHAL';
}

function formatTime(date) {
  return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default Alliance;