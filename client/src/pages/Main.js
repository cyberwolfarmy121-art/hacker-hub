import React from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function Main() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const currentTab = location.pathname.split('/').pop() || 'live';

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const rankLevels = { RECRUIT: 0, CADET: 1, ANALYST: 2, SPECIALIST: 3, GUARDIAN: 4, ELITE: 5, COMMANDER: 6, ADMIN: 7 };
  const userLevel = rankLevels[user?.rank] || 0;
  const canJoinAlliance = userLevel >= 1;

  return (
    <div className="main-container">
      <header className="main-header">
        <div>
          <Link to="/main/live">
            <h1 className="header-logo">Welcome to Hacker Hub</h1>
          </Link>
          <p style={{ color: '#ff3366', fontSize: '0.875rem', marginTop: '0.25rem' }}>
            We are here to protect the civilians
          </p>
        </div>
        
        <div className="header-user">
          <div className="user-info">
            <div className="user-codename">[{user?.rank}] {user?.codename}</div>
            <div className="user-display">{user?.displayName}</div>
          </div>
          <button className="btn" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </header>

      <nav className="main-tabs">
        <Link to="/main/live">
          <button className={`tab ${currentTab === 'live' ? 'active' : ''}`}>
            Live Room
          </button>
        </Link>
        <Link to="/main/missions">
          <button className={`tab ${currentTab === 'missions' ? 'active' : ''}`}>
            Missions
          </button>
        </Link>
        <Link to="/main/profile">
          <button className={`tab ${currentTab === 'profile' ? 'active' : ''}`}>
            Profile [{user?.rank}]
          </button>
        </Link>
        <Link to="/main/vault">
          <button className={`tab ${currentTab === 'vault' ? 'active' : ''}`}>
            Vault
          </button>
        </Link>
        {canJoinAlliance ? (
          <Link to="/main/alliance">
            <button className={`tab ${currentTab === 'alliance' ? 'active' : ''}`}>
              Alliance
            </button>
          </Link>
        ) : (
          <button className="tab" style={{ opacity: 0.5, cursor: 'not-allowed' }} title="Reach Cadet rank to unlock">
            Alliance 🔒
          </button>
        )}
        {user?.codename === 'CWHUB' && (
          <Link to="/main/admin">
            <button className={`tab ${currentTab === 'admin' ? 'active' : ''}`}>
              Admin
            </button>
          </Link>
        )}
      </nav>

      <main className="main-content">
        <Outlet />
      </main>

      <footer style={{ textAlign: 'center', padding: '1rem', borderTop: '1px solid var(--border-color)', color: 'var(--text-secondary)', fontSize: '0.75rem' }}>
        Admin: CYBER WOLF | 24*7 Support
      </footer>
    </div>
  );
}

export default Main;