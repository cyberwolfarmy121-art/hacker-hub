import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function AdminPanel() {
  const { apiCall } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({ totalUsers: 0, activeUsers: 0, bannedUsers: 0, cadetPlus: 0 });
  const [users, setUsers] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [showAddMission, setShowAddMission] = useState(false);
  const [activeTab, setActiveTab] = useState('users');
  const [missionForm, setMissionForm] = useState({
    title: '',
    description: '',
    difficulty: 'Beginner',
    points: 100,
    category: 'CTF',
    hints: ''
  });

  useEffect(() => {
    fetchAdminData();
  }, []);

  const fetchAdminData = async () => {
    try {
      const [statsRes, usersRes, logsRes] = await Promise.all([
        apiCall('/api/admin/stats'),
        apiCall('/api/admin/users'),
        apiCall('/api/admin/audit-logs')
      ]);

      if (statsRes.ok) setStats(await statsRes.json());
      if (usersRes.ok) setUsers(await usersRes.json());
      if (logsRes.ok) setAuditLogs(await logsRes.json());
    } catch (error) {
      console.error('Failed to fetch admin data:', error);
    }
  };

  const handleAddMission = async (e) => {
    e.preventDefault();
    
    try {
      const response = await apiCall('/api/missions', {
        method: 'POST',
        body: JSON.stringify({
          ...missionForm,
          hints: missionForm.hints ? missionForm.hints.split('|') : []
        })
      });

      const data = await response.json();

      if (!response.ok) throw new Error(data.message || 'Failed');

      alert('Mission added successfully!');
      setShowAddMission(false);
      setMissionForm({
        title: '',
        description: '',
        difficulty: 'Beginner',
        points: 100,
        category: 'CTF',
        hints: ''
      });
      fetchAdminData();
    } catch (err) {
      alert('Failed: ' + err.message);
    }
  };

  const handleDeleteMission = async (missionId) => {
    if (!window.confirm('Delete this mission?')) return;
    
    try {
      const response = await apiCall(`/api/missions/${missionId}`, { method: 'DELETE' });
      if (response.ok) {
        fetchAdminData();
      }
    } catch (error) {
      alert('Failed to delete mission');
    }
  };

  const handleWarnUser = async (userId) => {
    if (!window.confirm('Issue warning to this user?')) return;
    
    try {
      const response = await apiCall(`/api/admin/users/${userId}/warn`, { method: 'POST' });
      if (response.ok) {
        fetchAdminData();
      }
    } catch (error) {
      alert('Failed to warn user');
    }
  };

  const handleSuspendUser = async (userId, currentStatus) => {
    if (!window.confirm(`${currentStatus ? 'Unsuspend' : 'Suspend'} this user?`)) return;
    
    try {
      const response = await apiCall(`/api/admin/users/${userId}/suspend`, { method: 'POST' });
      if (response.ok) {
        fetchAdminData();
      }
    } catch (error) {
      alert('Failed to suspend user');
    }
  };

  const handleVerifyUser = async (userId, currentStatus) => {
    try {
      const response = await apiCall(`/api/admin/users/${userId}/verify`, { method: 'POST' });
      if (response.ok) {
        fetchAdminData();
      }
    } catch (error) {
      alert('Failed to verify user');
    }
  };

  const getRankColor = (rank) => {
    const colors = {
      RECRUIT: '#6b7280',
      CADET: '#3b82f6',
      ANALYST: '#8b5cf6',
      SPECIALIST: '#ec4899',
      GUARDIAN: '#f59e0b',
      ELITE: '#10b981',
      COMMANDER: '#ef4444',
      ADMIN: '#dc2626'
    };
    return colors[rank] || '#ffffff';
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleString();
  };

  return (
    <div className="admin-container">
      <div className="admin-header">
        <h2 className="admin-title">👑 Admin Control Panel</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
          Manage users, missions, and view system logs
        </p>
      </div>

      <div className="admin-stats">
        <div className="stat-card">
          <div className="stat-value">{stats.totalUsers}</div>
          <div className="stat-label">Total Users</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: 'var(--accent-primary)' }}>{stats.cadetPlus}</div>
          <div className="stat-label">Cadet+</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: 'var(--accent-warning)' }}>{stats.bannedUsers}</div>
          <div className="stat-label">Banned</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: 'var(--text-secondary)' }}>{stats.activeUsers}</div>
          <div className="stat-label">Active</div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
        <button 
          className={`tab ${activeTab === 'users' ? 'active' : ''}`}
          onClick={() => setActiveTab('users')}
        >
          Users
        </button>
        <button 
          className={`tab ${activeTab === 'missions' ? 'active' : ''}`}
          onClick={() => setActiveTab('missions')}
        >
          Missions
        </button>
        <button 
          className={`tab ${activeTab === 'logs' ? 'active' : ''}`}
          onClick={() => setActiveTab('logs')}
        >
          Audit Logs
        </button>
      </div>

      {activeTab === 'users' && (
        <div className="admin-section">
          <h3 className="section-title">User Management</h3>
          <div style={{ overflowX: 'auto' }}>
            <table className="users-table">
              <thead>
                <tr>
                  <th>Codename</th>
                  <th>Display</th>
                  <th>Rank</th>
                  <th>Points</th>
                  <th>Warnings</th>
                  <th>Alliance</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u._id}>
                    <td>
                      <span style={{ color: getRankColor(u.role), fontWeight: 'bold' }}>
                        {u.codename}
                      </span>
                    </td>
                    <td>{u.displayName || '-'}</td>
                    <td>
                      <span style={{ 
                        padding: '0.125rem 0.5rem',
                        fontSize: '0.75rem',
                        background: getRankColor(u.role) + '20',
                        color: getRankColor(u.role),
                        borderRadius: '4px'
                      }}>
                        {u.role}
                      </span>
                    </td>
                    <td>{u.points}</td>
                    <td>{u.warnings}</td>
                    <td>
                      {u.allianceType ? (
                        <span style={{ 
                          color: u.allianceType === 'offence' ? '#ef4444' : '#3b82f6',
                          textTransform: 'capitalize'
                        }}>
                          {u.allianceType} - {u.allianceRank}
                        </span>
                      ) : '-'}
                    </td>
                    <td>
                      {u.isBanned ? (
                        <span style={{ color: 'var(--accent-warning)' }}>❌ Banned</span>
                      ) : (
                        <span style={{ color: 'var(--accent-primary)' }}>✓ Active</span>
                      )}
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
                        <button 
                          className="btn btn-small" 
                          onClick={() => handleWarnUser(u._id)}
                          title="Issue Warning"
                          style={{ fontSize: '0.625rem', padding: '0.25rem 0.5rem' }}
                        >
                          ⚠️ Warn
                        </button>
                        <button 
                          className="btn btn-small" 
                          onClick={() => handleSuspendUser(u._id, u.isBanned)}
                          title="Ban/Unban"
                          style={{ 
                            fontSize: '0.625rem',
                            padding: '0.25rem 0.5rem',
                            borderColor: u.isBanned ? 'var(--accent-primary)' : 'var(--accent-warning)', 
                            color: u.isBanned ? 'var(--accent-primary)' : 'var(--accent-warning)' 
                          }}
                        >
                          {u.isBanned ? '🟢' : '🔴'}
                        </button>
                        <button 
                          className="btn btn-small"
                          onClick={() => navigate(`/main/vault?userId=${u._id}`)}
                          title="View ID Card"
                          style={{ fontSize: '0.625rem', padding: '0.25rem 0.5rem' }}
                        >
                          👁️ View
                        </button>
                        <button 
                          className="btn btn-small"
                          onClick={() => handleVerifyUser(u._id, u.idVerified)}
                          title="Verify ID"
                          style={{ 
                            fontSize: '0.625rem',
                            padding: '0.25rem 0.5rem',
                            borderColor: u.idVerified ? '#10b981' : '#dc2626',
                            color: u.idVerified ? '#10b981' : '#dc2626' 
                          }}
                        >
                          {u.idVerified ? '✓' : '❌'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'missions' && (
        <div className="admin-section">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 className="section-title">Mission Management</h3>
            <button 
              className="btn"
              onClick={() => setShowAddMission(!showAddMission)}
            >
              {showAddMission ? '✕ Cancel' : '+ Create Mission'}
            </button>
          </div>

          {showAddMission && (
            <form onSubmit={handleAddMission} style={{ 
              marginTop: '1.5rem', 
              padding: '1.5rem', 
              background: 'var(--bg-tertiary)',
              border: '1px solid var(--border-color)',
              borderRadius: '4px'
            }}>
              <div className="form-group">
                <label className="form-label">Title</label>
                <input
                  type="text"
                  className="form-input"
                  value={missionForm.title}
                  onChange={(e) => setMissionForm({ ...missionForm, title: e.target.value })}
                  placeholder="Enter mission title"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea
                  className="form-input"
                  rows="3"
                  value={missionForm.description}
                  onChange={(e) => setMissionForm({ ...missionForm, description: e.target.value })}
                  placeholder="Describe the mission"
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Difficulty</label>
                  <select
                    className="form-input"
                    value={missionForm.difficulty}
                    onChange={(e) => setMissionForm({ ...missionForm, difficulty: e.target.value })}
                  >
                    <option>Beginner</option>
                    <option>Intermediate</option>
                    <option>Advanced</option>
                    <option>Expert</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Points</label>
                  <input
                    type="number"
                    className="form-input"
                    value={missionForm.points}
                    onChange={(e) => setMissionForm({ ...missionForm, points: parseInt(e.target.value) || 0 })}
                    min="1"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Category</label>
                  <select
                    className="form-input"
                    value={missionForm.category}
                    onChange={(e) => setMissionForm({ ...missionForm, category: e.target.value })}
                  >
                    <option>CTF</option>
                    <option>Web Security</option>
                    <option>Network Security</option>
                    <option>Cryptography</option>
                    <option>Forensics</option>
                    <option>Reverse Engineering</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Hints (optional, separate with |)</label>
                <input
                  type="text"
                  className="form-input"
                  value={missionForm.hints}
                  onChange={(e) => setMissionForm({ ...missionForm, hints: e.target.value })}
                  placeholder="First hint | Second hint | Third hint"
                />
              </div>

              <button type="submit" className="btn">Create Mission</button>
            </form>
          )}

          <div style={{ marginTop: '2rem' }}>
            <h4 style={{ color: 'var(--accent-secondary)', marginBottom: '1rem' }}>
              Existing Missions ({missions.length})
            </h4>
            <div style={{ display: 'grid', gap: '0.5rem' }}>
              {missions.map((m) => (
                <div key={m._id} style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between',
                  padding: '0.75rem',
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border-color)'
                }}>
                  <div>
                    <span style={{ 
                      color: getRankColor(m.difficulty) || 'var(--text-primary)',
                      fontWeight: 'bold' 
                    }}>
                      {m.title}
                    </span>
                    <span style={{ 
                      marginLeft: '0.5rem', 
                      padding: '0.125rem 0.5rem',
                      fontSize: '0.75rem',
                      background: 'var(--bg-tertiary)',
                      borderRadius: '4px'
                    }}>
                      {m.difficulty} • {m.points}pts
                    </span>
                  </div>
                  <button 
                    className="btn btn-small btn-danger"
                    onClick={() => handleDeleteMission(m._id)}
                  >
                    Delete
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'logs' && (
        <div className="admin-section">
          <h3 className="section-title">📋 Recent Audit Logs</h3>
          <div style={{ overflowX: 'auto' }}>
            <table className="users-table">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Action</th>
                  <th>User</th>
                  <th>Details</th>
                  <th>IP</th>
                </tr>
              </thead>
              <tbody>
                {auditLogs.map((log, idx) => (
                  <tr key={idx}>
                    <td style={{ fontSize: '0.75rem' }}>{formatDate(log.timestamp)}</td>
                    <td>
                      <span style={{ color: 'var(--accent-primary)', fontWeight: 'bold' }}>
                        {log.action}
                      </span>
                    </td>
                    <td>{log.userId?.codename || 'System'}</td>
                    <td style={{ maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {JSON.stringify(log.details)}
                    </td>
                    <td style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                      {log.ip || 'N/A'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminPanel;