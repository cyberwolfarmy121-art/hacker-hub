import React from 'react';
import { Link } from 'react-router-dom';

function Landing() {
  return (
    <div className="landing">
      <div className="landing-content">
        <h1 className="logo">⚡ Hacker Hub</h1>
        <p className="banner" style={{ animation: 'typing 3s steps(30) forwards, blink 0.8s infinite' }}>
          Ethical Cybersecurity Learning & Chat Platform
        </p>
        <p className="banner-subtitle">
          Learn • Compete • Collaborate • Protect
        </p>

        <div className="auth-buttons">
          <Link to="/register">
            <button className="btn">Join Now</button>
          </Link>
          <Link to="/login">
            <button className="btn btn-secondary">Access Vault</button>
          </Link>
        </div>

        <div style={{ 
          marginTop: '4rem', 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '1.5rem',
          maxWidth: '800px',
          margin: '4rem auto 0'
        }}>
          {[
            { icon: '🎯', title: 'Learn', desc: 'Master ethical cybersecurity through hands-on missions' },
            { icon: '🏆', title: 'Rank Up', desc: 'Earn points and climb through 8 ranks' },
            { icon: '🤝', title: 'Alliances', desc: 'Join offence or defence teams with like-minded pros' },
            { icon: '🔒', title: 'Anonymous', desc: 'Stay safe with codename-based identity' }
          ].map((feature, idx) => (
            <div key={idx} style={{
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-color)',
              padding: '1.5rem',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>{feature.icon}</div>
              <h4 style={{ color: 'var(--accent-primary)', marginBottom: '0.5rem', textTransform: 'uppercase', fontSize: '0.875rem', letterSpacing: '1px' }}>
                {feature.title}
              </h4>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>
                {feature.desc}
              </p>
            </div>
          ))}
        </div>

        <footer style={{ marginTop: '3rem', padding: '1.5rem', borderTop: '1px solid var(--border-color)', color: 'var(--text-secondary)', fontSize: '0.75rem' }}>
          <div style={{ marginBottom: '0.5rem' }}>© 2024 Cyber Wolf Hub • Ethical Hacking Community</div>
          <div>24×7 Support Available</div>
        </footer>
      </div>
    </div>
  );
}

export default Landing;