import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { API_URL } from '../config';

function Login() {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    try {
      const response = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Login failed');
      }

      login(data.user, data.token);
      navigate('/displayname');
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="landing">
      <div className="form-container">
        <h2 className="form-title">Login</h2>
        
        <form onSubmit={handleSubmit}>
          {error && <div className="message error">{error}</div>}
          
          <div className="form-group">
            <label className="form-label">Email / Cyber ID</label>
            <input
              type="text"
              name="email"
              className="form-input"
              value={formData.email}
              onChange={handleChange}
              placeholder="your@email.com or CW123"
              required
            />
          </div>
          
          <div className="form-group">
            <label className="form-label">Password</label>
            <input
              type="password"
              name="password"
              className="form-input"
              value={formData.password}
              onChange={handleChange}
              required
            />
          </div>
          
          <button type="submit" className="btn" style={{ width: '100%', marginBottom: '1rem' }}>
            Login
          </button>
        </form>
        
        <p style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
          Don't have an account?{' '}
          <Link to="/register" style={{ color: 'var(--accent-primary)' }}>
            Register
          </Link>
        </p>
      </div>
    </div>
  );
}

export default Login;