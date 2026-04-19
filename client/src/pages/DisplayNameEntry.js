import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function DisplayNameEntry() {
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!displayName.trim() || displayName.length < 2) {
      setError('Display name must be at least 2 characters');
      return;
    }

    try {
      const response = await apiCall('/api/profile/display-name', {
        method: 'POST',
        body: JSON.stringify({ displayName })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to set display name');
      }

      updateUser({ ...user, displayName: data.displayName });
      navigate('/main/live');
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="landing">
      <div className="form-container">
        <h2 className="form-title">Enter Your Display Name</h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
          Your codename: <span style={{ color: 'var(--accent-primary)' }}>{user?.codename}</span>
        </p>
        
        <form onSubmit={handleSubmit}>
          {error && <div className="message error">{error}</div>}
          
          <div className="form-group">
            <label className="form-label">Display Name</label>
            <input
              type="text"
              className="form-input"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="How should we call you?"
              required
            />
          </div>
          
          <button type="submit" className="btn" style={{ width: '100%' }}>
            Enter Hub
          </button>
        </form>
      </div>
    </div>
  );
}

export default DisplayNameEntry;