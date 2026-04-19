import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

const RANKS_INFO = {
  RECRUIT: { name: 'Recruit', points: 0, color: '#6b7280', powers: ['Basic chat access', 'View missions'] },
  CADET: { name: 'Cadet', points: 100, color: '#3b82f6', powers: ['Basic chat', 'Use reactions', 'Access missions', 'Join alliance'] },
  ANALYST: { name: 'Analyst', points: 300, color: '#8b5cf6', powers: ['Chat', 'Reactions', 'Highlight answers', 'Complete advanced missions'] },
  SPECIALIST: { name: 'Specialist', points: 600, color: '#ec4899', powers: ['Chat', 'Reactions', 'Highlight answers', 'Flag messages', 'Access expert missions'] },
  GUARDIAN: { name: 'Cyber Guardian', points: 1000, color: '#f59e0b', powers: ['Chat', 'Reactions', 'Flag messages', 'Mute users', 'Lead alliance teams'] },
  ELITE: { name: 'Elite Defender', points: 2000, color: '#10b981', powers: ['Chat', 'Delete messages', 'Warn users', 'Moderate alliance', 'Create missions'] },
  COMMANDER: { name: 'Cyber Commander', points: 5000, color: '#ef4444', powers: ['Chat', 'Suspend users', 'Full moderation', 'Manage tasks', 'Alliance leadership'] },
  ADMIN: { name: 'Admin', points: 0, color: '#dc2626', powers: ['Full access', 'Manage all users', 'Create missions', 'View audit logs', 'System control', 'Print any ID'] }
};

const RANK_ICONS = {
  RECRUIT: '🔰',
  CADET: '⭐',
  ANALYST: '🔍',
  SPECIALIST: '⚡',
  GUARDIAN: '🛡️',
  ELITE: '🔥',
  COMMANDER: '👑',
  ADMIN: '👾'
};

function Profile() {
  const { user, apiCall } = useAuth();
  const [profile, setProfile] = useState(null);
  const [displayName, setDisplayName] = useState('');
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const res = await apiCall('/api/profile');
      if (res.ok) {
        const data = await res.json();
        setProfile(data);
      }
    } catch (err) {
      console.error('Failed to fetch profile:', err);
    }
  };

  const hideName = (name) => {
    if (!name || name.length < 2) return '**';
    return name.substring(0, 2) + '*'.repeat(name.length - 2);
  };

  const getWarningLevel = (warnings) => {
    if (warnings === 0) return { level: 'Clean', color: '#10b981' };
    if (warnings === 1) return { level: 'Caution', color: '#f59e0b' };
    if (warnings === 2) return { level: 'Warning', color: '#ff6600' };
    return { level: 'Critical', color: '#ef4444' };
  };

  const handleSaveDisplayName = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!displayName.trim() || displayName.length < 2 || displayName.length > 30) {
      setError('Display name must be 2-30 characters');
      return;
    }

    try {
      const res = await apiCall('/api/profile/display-name', {
        method: 'POST',
        body: JSON.stringify({ displayName })
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.message);

      setSuccess('Display name updated!');
      setEditing(false);
      fetchProfile();
    } catch (err) {
      setError(err.message);
    }
  };

  const getRankProgress = () => {
    if (!profile) return { percent: 0, next: null, remaining: 0 };

    const rankOrder = Object.keys(RANKS_INFO);
    const currentIdx = rankOrder.indexOf(profile.rank);
    if (profile.rank === 'ADMIN') return { percent: 100, next: null, remaining: 0 };

    const nextRankKey = rankOrder[currentIdx + 1];
    const current = RANKS_INFO[profile.rank];
    const next = RANKS_INFO[nextRankKey];

    const range = next.points - current.points;
    const earned = profile.points - current.points;
    const percent = Math.min(100, Math.max(0, (earned / range) * 100));

    return {
      percent,
      next: next ? next.name : null,
      remaining: next ? next.points - profile.points : 0
    };
  };

  if (!profile) {
    return <div className="loading">Loading profile...</div>;
  }

  const progress = getRankProgress();
  const powers = RANKS_INFO[profile.rank]?.powers || [];
  const rankInfo = RANKS_INFO[profile.rank];
  const warningInfo = getWarningLevel(profile.warnings);

  return (
    <div className="profile-container">
      <div className="profile-header">
        <div className="profile-card">
          <div 
            className="profile-rank-badge" 
            style={{ 
              color: rankInfo.color, 
              borderColor: rankInfo.color,
              background: rankInfo.color + '20'
            }}
          >
            {RANK_ICONS[profile.rank]} {profile.rank}
          </div>

          <div className="profile-avatar">
            {RANK_ICONS[profile.rank]}
          </div>

          <h2 className="profile-name">{hideName(profile.displayName || user.codename)}</h2>
          <div className="profile-id">{profile.codename}</div>

          <div className="profile-stats-grid">
            <div className="profile-stat">
              <div className="profile-stat-value" style={{ color: rankInfo.color }}>
                {profile.points}
              </div>
              <div className="profile-stat-label">Points</div>
            </div>
            <div className="profile-stat">
              <div className="profile-stat-value" style={{ color: warningInfo.color }}>
                {profile.warnings}
              </div>
              <div className="profile-stat-label">Warnings</div>
            </div>
            <div className="profile-stat">
              <div className="profile-stat-value">
                {profile.allianceType ? '✓' : '—'}
              </div>
              <div className="profile-stat-label">Alliance</div>
            </div>
          </div>

          {profile.rank !== 'ADMIN' && progress.next && (
            <div className="progress-container">
              <div className="progress-label">
                <span className="progress-rank">{profile.rank}</span>
                <span className="progress-next">
                  {progress.next === 'MAX' ? 'Max' : `${progress.remaining} to ${progress.next}`}
                </span>
              </div>
              <div className="progress-bar">
                <div 
                  className="progress-fill" 
                  style={{ 
                    width: `${progress.percent}%`,
                    background: `linear-gradient(90deg, ${rankInfo.color}, #ffffff)`
                  }}
                />
              </div>
            </div>
          )}
        </div>

        <div className="profile-card">
          <h3 style={{ color: 'var(--accent-secondary)', marginBottom: '1.5rem' }}>Account Details</h3>

          <div style={{ marginBottom: '1rem' }}>
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', marginBottom: '0.25rem' }}>Email</div>
            <div style={{ color: 'var(--text-primary)' }}>{profile.email}</div>
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', marginBottom: '0.25rem' }}>Role</div>
            <div style={{ color: rankInfo.color, fontWeight: 'bold', fontSize: '1.125rem' }}>
              {profile.role}
            </div>
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', marginBottom: '0.25rem' }}>Member Since</div>
            <div style={{ color: 'var(--text-primary)' }}>
              {new Date(profile.createdAt).toLocaleDateString()}
            </div>
          </div>

          {profile.allianceType && (
            <>
              <div style={{ marginBottom: '1rem' }}>
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', marginBottom: '0.25rem' }}>Alliance</div>
                <div style={{ color: profile.allianceType === 'offence' ? '#ef4444' : '#3b82f6', fontWeight: 'bold', textTransform: 'capitalize' }}>
                  {profile.allianceType} Team
                </div>
              </div>
              <div style={{ marginBottom: '1rem' }}>
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', marginBottom: '0.25rem' }}>Alliance Rank</div>
                <div style={{ color: 'var(--text-primary)' }}>{profile.allianceRank}</div>
              </div>
            </>
          )}

          {profile.rulesAccepted && (
            <div style={{ marginTop: '1rem', padding: '0.5rem', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: '4px' }}>
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>
                ✓ Rules accepted on {new Date(profile.rulesAcceptedAt).toLocaleDateString()}
              </div>
            </div>
          )}
        </div>

        <div className="profile-card">
          <h3 style={{ color: 'var(--accent-secondary)', marginBottom: '1.5rem' }}>
            {RANK_ICONS[profile.rank]} Your Powers
          </h3>
          <ul style={{ listStyle: 'none' }}>
            {powers.map((power, idx) => (
              <li key={idx} style={{ 
                padding: '0.75rem', 
                marginBottom: '0.5rem', 
                background: 'var(--bg-tertiary)', 
                borderLeft: `3px solid ${rankInfo.color}`,
                borderRadius: '0 4px 4px 0'
              }}>
                <span style={{ color: 'var(--accent-primary)' }}>✓</span> {power}
              </li>
            ))}
          </ul>
        </div>

        <div className="profile-card">
          <h3 style={{ color: 'var(--accent-secondary)', marginBottom: '1rem' }}>
            🏆 Rank Progression
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {Object.entries(RANKS_INFO)
              .filter(([key]) => key !== 'ADMIN')
              .map(([key, info]) => (
                <div 
                  key={key} 
                  style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between',
                    padding: '0.5rem',
                    background: 'var(--bg-tertiary)',
                    border: `1px solid ${key === profile.rank ? info.color : 'var(--border-color)'}`,
                    borderRadius: '4px'
                  }}
                >
                  <span style={{ color: key === profile.rank ? info.color : 'var(--text-secondary)' }}>
                    {RANK_ICONS[key]} {info.name}
                  </span>
                  <span style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>
                    {info.points} pts
                  </span>
                </div>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Profile;