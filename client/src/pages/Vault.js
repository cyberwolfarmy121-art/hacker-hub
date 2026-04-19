import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { QRCodeSVG } from 'qrcode.react';

function Vault() {
  const { user, apiCall } = useAuth();
  const [vault, setVault] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showIdCard, setShowIdCard] = useState(false);
  const [idCardCreated, setIdCardCreated] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchVault = async () => {
      setLoading(true);
      const searchParams = new URLSearchParams(location.search);
      const targetUserId = searchParams.get('userId');

      let url = '/api/vault';
      if (targetUserId && user.role === 'ADMIN') {
        url += `?userId=${targetUserId}`;
      }

      const response = await apiCall(url);
      if (response.ok) {
        const data = await response.json();
        setVault(data);
        // Check if ID card already exists
        if (data.idCard && data.idCard.created) {
          setIdCardCreated(true);
          setShowIdCard(true);
        }
      }
      setLoading(false);
    };
    fetchVault();
  }, [location.search]);

  const handleCreateId = () => {
    setShowIdCard(true);
    setIdCardCreated(true);
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return <div className="loading">Loading vault...</div>;
  }

  if (!vault) {
    return <div className="loading">Vault data not available</div>;
  }

  const formatDate = (date) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-GB', { 
      day: '2-digit', 
      month: 'short', 
      year: 'numeric' 
    }).toUpperCase();
  };

  const getExpiryDate = (createdDate) => {
    if (!createdDate) {
      const fiveMonthsLater = new Date();
      fiveMonthsLater.setMonth(fiveMonthsLater.getMonth() + 5);
      return fiveMonthsLater;
    }
    const expiry = new Date(createdDate);
    expiry.setMonth(expiry.getMonth() + 5);
    return expiry;
  };

  const isAdminView = user.role === 'ADMIN' && new URLSearchParams(location.search).get('userId');
  const qrValue = `HACKERHUB:${vault.codename}:${vault.displayName}:${vault.rank}:${new Date().getFullYear()}`;
  
  const cardCreatedDate = vault.idCard?.created || new Date();
  const cardExpiryDate = getExpiryDate(vault.idCard?.created);
  const uniqueId = `HH${vault.codename.replace('CW', '')}${Date.now().toString().slice(-6)}`;

  return (
    <div className="vault-container">
      <div className="vault-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 className="vault-title">My Vault</h2>
          <p style={{ color: 'var(--text-secondary)' }}>
            {isAdminView ? '🔍 Admin View' : 'Your secure identity card and achievements'}
          </p>
        </div>
        {!isAdminView && !idCardCreated && (
          <button className="btn" onClick={handleCreateId} style={{ fontSize: '0.875rem', padding: '0.5rem 1rem' }}>
            ➕ Create ID
          </button>
        )}
        {idCardCreated && (
          <button className="btn" onClick={handlePrint} style={{ fontSize: '0.875rem', padding: '0.5rem 1rem' }}>
            🖨️ Print ID
          </button>
        )}
      </div>

      <div style={{ 
        marginTop: '1.5rem',
        padding: '1.5rem', 
        background: 'var(--bg-secondary)', 
        border: '1px solid var(--border-color)',
        borderRadius: '4px'
      }}>
        <h4 style={{ color: 'var(--accent-secondary)', marginBottom: '1rem' }}>
          🏆 Points Earned Through Tasks
        </h4>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '1rem' }}>
          <span style={{ fontSize: '3rem', color: 'var(--accent-primary)', fontWeight: 'bold' }}>
            {vault.points?.toLocaleString() || 0}
          </span>
          <span style={{ color: 'var(--text-secondary)', fontSize: '1rem' }}>points</span>
        </div>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: '0.5rem' }}>
          Complete missions to earn more points and rank up!
        </p>
      </div>

      {showIdCard && (
        <div style={{ marginTop: '2rem' }}>
          {/* Indian Voter ID Style Card */}
          <div className="id-card" style={{ 
            background: 'linear-gradient(135deg, #1e3a5f 0%, #0d1b2a 100%)',
            border: '3px solid #c9a227',
            borderRadius: '8px',
            padding: '0',
            maxWidth: '500px',
            margin: '0 auto'
          }}>
            {/* Header */}
            <div style={{ 
              background: '#c9a227', 
              padding: '0.75rem 1.5rem',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div style={{ color: '#0d1b2a', fontWeight: 'bold', fontSize: '0.875rem' }}>
                ⚡ HACKER HUB SECURITY
              </div>
              <div style={{ color: '#0d1b2a', fontWeight: 'bold', fontSize: '0.75rem' }}>
                GOVT. RECOGNIZED
              </div>
            </div>
            
            {/* Body */}
            <div style={{ padding: '1.5rem', display: 'flex', gap: '1.5rem' }}>
              {/* Photo Side */}
              <div style={{ 
                width: '100px', 
                height: '120px', 
                background: '#2a3f54',
                border: '2px solid #c9a227',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                <span style={{ fontSize: '2.5rem' }}>👤</span>
              </div>
              
              {/* Details */}
              <div style={{ flex: 1 }}>
                <div style={{ color: '#c9a227', fontSize: '0.625rem', letterSpacing: '1px', marginBottom: '0.25rem' }}>
                  ELECTORAL IDENTIFICATION
                </div>
                <div style={{ color: '#fff', fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>
                  {(vault.displayName || 'Anonymous').toUpperCase()}
                </div>
                <div style={{ color: '#8ba3c1', fontSize: '0.875rem', marginBottom: '0.25rem' }}>
                  ID NO: <span style={{ color: '#fff' }}>{vault.codename}</span>
                </div>
                <div style={{ color: '#8ba3c1', fontSize: '0.75rem' }}>
                  UNIQUE NO: <span style={{ color: '#fff' }}>{uniqueId}</span>
                </div>
              </div>
              
              {/* QR */}
              <div style={{ flexShrink: 0 }}>
                <QRCodeSVG 
                  value={qrValue}
                  size={80}
                  level="H"
                  includeMargin={true}
                  bgColor="#ffffff"
                  fgColor="#000000"
                />
              </div>
            </div>
            
            {/* Footer Details */}
            <div style={{ 
              padding: '1rem 1.5rem', 
              background: 'rgba(0,0,0,0.3)',
              display: 'grid',
              gridTemplateColumns: '1fr 1fr 1fr',
              gap: '1rem',
              fontSize: '0.625rem'
            }}>
              <div>
                <div style={{ color: '#8ba3c1', marginBottom: '0.125rem' }}>DATE OF CREATION</div>
                <div style={{ color: '#fff', fontWeight: 'bold' }}>{formatDate(cardCreatedDate)}</div>
              </div>
              <div>
                <div style={{ color: '#8ba3c1', marginBottom: '0.125rem' }}>VALIDITY UPTO</div>
                <div style={{ color: '#c9a227', fontWeight: 'bold' }}>{formatDate(cardExpiryDate)}</div>
              </div>
              <div>
                <div style={{ color: '#8ba3c1', marginBottom: '0.125rem' }}>RANK</div>
                <div style={{ color: getRankColor(vault.rank), fontWeight: 'bold' }}>{vault.rank}</div>
              </div>
            </div>
          </div>
          
          <p style={{ textAlign: 'center', color: 'var(--text-secondary)', marginTop: '1rem', fontSize: '0.75rem' }}>
            This ID card is valid for 5 months from date of creation
          </p>
        </div>
      )}

      {!showIdCard && idCardCreated === false && (
        <div style={{ 
          marginTop: '2rem', 
          padding: '2rem', 
          background: 'var(--bg-secondary)', 
          border: '1px solid var(--border-color)',
          borderRadius: '4px',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🪪</div>
          <h4 style={{ color: 'var(--accent-secondary)', marginBottom: '0.5rem' }}>
            No ID Card Created
          </h4>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
            Click "Create ID" to generate your hacker identity card
          </p>
          <button className="btn" onClick={handleCreateId}>
            ➕ Create ID Card
          </button>
        </div>
      )}

      <div style={{ 
        marginTop: '2rem', 
        padding: '1.5rem', 
        background: 'var(--bg-secondary)', 
        border: '1px solid var(--border-color)',
        borderRadius: '4px'
      }}>
        <h4 style={{ color: 'var(--accent-secondary)', marginBottom: '1rem' }}>
          🛡️ Card Information
        </h4>
        <ul style={{ listStyle: 'none', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
          <li style={{ marginBottom: '0.5rem' }}>
            <span style={{ color: 'var(--accent-primary)' }}>🔐</span> This ID proves your cyber identity
          </li>
          <li style={{ marginBottom: '0.5rem' }}>
            <span style={{ color: 'var(--accent-primary)' }}>📅</span> Card is valid for 5 months from creation
          </li>
          <li style={{ marginBottom: '0.5rem' }}>
            <span style={{ color: 'var(--accent-primary)' }}>📱</span> QR code can be scanned for verification
          </li>
          <li>
            <span style={{ color: 'var(--accent-primary)' }}>🔄</span> Renew automatically upon re-registration
          </li>
        </ul>
      </div>

      {user?.role === 'ADMIN' && !isAdminView && (
        <div style={{ 
          marginTop: '2rem', 
          padding: '1.5rem', 
          background: 'var(--bg-secondary)', 
          border: '2px solid var(--accent-warning)',
          borderRadius: '4px'
        }}>
          <h4 style={{ color: 'var(--accent-warning)', marginBottom: '1rem' }}>
            👑 Admin Tools
          </h4>
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            <a href="/main/admin" className="btn" style={{ fontSize: '0.875rem' }}>
              User Management
            </a>
            <button className="btn btn-secondary" style={{ fontSize: '0.875rem' }} onClick={() => alert('Full ID verification system in admin panel')}>
              Verify ID Cards
            </button>
          </div>
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

export default Vault;