import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

function Missions() {
  const { user, apiCall } = useAuth();
  const [missions, setMissions] = useState([]);
  const [filter, setFilter] = useState('All');
  const [userPoints, setUserPoints] = useState(user?.points || 0);
  const [completed, setCompleted] = useState(new Set());
  const [notification, setNotification] = useState('');

  const difficulties = ['All', 'Beginner', 'Intermediate', 'Advanced', 'Expert'];

  useEffect(() => {
    fetchMissions();
    setUserPoints(user.points || 0);
  }, []);

  const fetchMissions = async () => {
    try {
      const response = await apiCall('/api/missions');
      const data = await response.json();
      setMissions(data);
    } catch (error) {
      console.error('Failed to fetch missions:', error);
    }
  };

  const completeMission = async (missionId) => {
    try {
      const response = await apiCall(`/api/missions/${missionId}/complete`, { method: 'POST' });
      const data = await response.json();

      if (!response.ok) {
        alert(data.message);
        return;
      }

      setCompleted(prev => new Set([...prev, missionId]));
      setUserPoints(data.points);
      setNotification(`🎉 ${data.pointsGained} points earned! Total: ${data.points}`);
      
      setTimeout(() => setNotification(''), 3000);
      
      const profileRes = await apiCall('/api/profile');
      if (profileRes.ok) {
        const profileData = await profileRes.json();
        // Update user context if needed
      }
    } catch (error) {
      alert('Failed to complete mission');
    }
  };

  const filteredMissions = filter === 'All' 
    ? missions 
    : missions.filter(m => m.difficulty === filter);

  return (
    <div className="missions-container">
      <div className="missions-header">
        <div>
          <h2 className="missions-title">Missions</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: '0.5rem' }}>
            Your Points: <span style={{ color: 'var(--accent-primary)', fontWeight: 'bold' }}>{userPoints.toLocaleString()}</span>
            {' | Rank: '}
            <span style={{ color: getRankColor(user.rank) }}>{user.rank}</span>
          </p>
          {notification && (
            <p style={{ 
              color: 'var(--accent-primary)', 
              fontSize: '0.875rem',
              marginTop: '0.5rem',
              fontWeight: 'bold',
              animation: 'pulse 1s 3'
            }}>
              {notification}
            </p>
          )}
        </div>
        <div className="difficulty-filter">
          {difficulties.map((d) => (
            <button
              key={d}
              className={`filter-btn ${filter === d ? 'active' : ''}`}
              onClick={() => setFilter(d)}
            >
              {d}
            </button>
          ))}
        </div>
      </div>

      {filteredMissions.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
          {filter === 'All' ? 'No missions available' : `No ${filter} missions`}
        </div>
      ) : (
        <div className="missions-grid">
          {filteredMissions.map((mission) => (
            <div 
              key={mission._id} 
              className="mission-card"
              style={{ 
                opacity: completed.has(mission._id) ? 0.6 : 1,
                borderColor: completed.has(mission._id) ? 'var(--accent-primary)' : undefined
              }}
            >
              <div className="mission-header">
                <h3 className="mission-title">{mission.title}</h3>
                <span className={`mission-difficulty ${mission.difficulty}`}>
                  {mission.difficulty}
                </span>
              </div>
              <p className="mission-description">{mission.description}</p>
              
              {mission.hints && mission.hints.length > 0 && (
                <details style={{ marginBottom: '1rem' }}>
                  <summary style={{ color: 'var(--accent-secondary)', cursor: 'pointer', fontSize: '0.875rem' }}>
                    Show Hint
                  </summary>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
                    {mission.hints[0]}
                  </p>
                </details>
              )}

              <div style={{ 
                marginTop: '1rem', 
                padding: '0.5rem',
                background: 'var(--bg-tertiary)',
                borderRadius: '4px',
                fontSize: '0.75rem',
                color: 'var(--text-secondary)'
              }}>
                Category: {mission.category}
              </div>

              <div className="mission-footer" style={{ marginTop: '1rem' }}>
                <span className="mission-points" style={{ fontSize: '1rem', fontWeight: 'bold' }}>
                  +{mission.points} pts
                </span>
                <span className="mission-category">
                  {mission._id ? `ID: ${mission._id.slice(0, 8)}...` : ''}
                </span>
              </div>

              {completed.has(mission._id) ? (
                <button 
                  className="btn" 
                  style={{ 
                    width: '100%', 
                    marginTop: '1rem', 
                    background: 'var(--accent-primary)',
                    color: 'var(--bg-primary)',
                    cursor: 'default'
                  }}
                  disabled
                >
                  ✓ Completed
                </button>
              ) : (
                <button 
                  className="btn" 
                  style={{ width: '100%', marginTop: '1rem' }}
                  onClick={() => completeMission(mission._id)}
                >
                  Complete Mission
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function getRankColor(rank) {
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
}

export default Missions;