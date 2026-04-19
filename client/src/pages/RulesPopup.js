import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

function RulesPopup() {
  const [accepted, setAccepted] = useState(false);
  const { acceptRules } = useAuth();

  const handleAccept = () => {
    if (accepted) {
      acceptRules();
    }
  };

  return (
    <div className="rules-overlay">
      <div className="rules-popup">
        <h2 className="rules-title">Hacker Hub Rules</h2>
        
        <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem', fontSize: '0.875rem' }}>
          Welcome to Hacker Hub! Before entering, you must accept these rules:
        </p>
        
        <ul className="rules-list">
          <li>1. Don't harm anyone - Never attack or damage systems</li>
          <li>2. Don't use your real name - Stay anonymous</li>
          <li>3. Don't misuse the knowledge you learn - Use ethically</li>
          <li>4. Don't use any personal information - Keep it private</li>
          <li>5. Follow the ethics - White hat principles only</li>
        </ul>

        <div className="rules-checkbox">
          <input
            type="checkbox"
            id="accept-rules"
            checked={accepted}
            onChange={(e) => setAccepted(e.target.checked)}
          />
          <label htmlFor="accept-rules">
            I understood
          </label>
        </div>

        <button 
          className="btn" 
          style={{ width: '100%' }}
          onClick={handleAccept}
          disabled={!accepted}
        >
          Enter Hacker Hub
        </button>

        <p style={{ textAlign: 'center', color: 'var(--text-secondary)', marginTop: '1rem', fontSize: '0.75rem' }}>
          Violations: 1st offense = 1 week ban, repeated = 1 month ban
        </p>
      </div>
    </div>
  );
}

export default RulesPopup;