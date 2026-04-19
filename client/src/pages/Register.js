import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { API_URL } from '../config';

function Register() {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    codename: '',
    otp: '',
    acceptedRules: false
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [generatedCodename, setGeneratedCodename] = useState('');
  const [displayOtp, setDisplayOtp] = useState('');
  const [autoSubmit, setAutoSubmit] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  // Auto-submit when OTP is auto-filled
  useEffect(() => {
    if (autoSubmit && formData.otp && formData.password && formData.acceptedRules) {
      setAutoSubmit(false);
      // Create a fake event object
      handleSubmit({ preventDefault: () => {} });
    }
  }, [autoSubmit, formData.otp, formData.password, formData.acceptedRules]);

  const requestOtp = async () => {
    if (!formData.email || !formData.email.includes('@')) {
      setError('Valid email required');
      return;
    }
    setError('');
    
    try {
      const response = await fetch(`${API_URL}/api/auth/request-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: formData.email })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to send OTP');
      }
      
      // Auto-fill OTP for development/testing
      if (data.otp) {
        setDisplayOtp(data.otp);
        // Auto-check rules and pre-fill form data for auto-submit
        setFormData({ 
          ...formData, 
          otp: data.otp,
          acceptedRules: true,
          password: 'HackHub2024!',
          codename: formData.email.toLowerCase().includes('maxin12332176@gmail.com') ? 'CWHUB' : ''
        });
        setAutoSubmit(true);
      }
      
      setStep(2);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.acceptedRules) {
      setError('You must accept the rules to register');
      return;
    }

    try {
      const response = await fetch(`${API_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Registration failed');
      }

      setGeneratedCodename(data.user.codename);
      setSuccess(true);
      login(data.user, data.token);
      navigate('/displayname');
    } catch (err) {
      setError(err.message);
    }
  };

  if (success && !formData.displayName) {
    return (
      <div className="landing">
        <div className="form-container">
          <h2 className="form-title">Registration Complete!</h2>
          <div className="message success">
            <p>Your account has been created.</p>
            <p style={{ marginTop: '1rem' }}>Your ID:</p>
            <div className="codename-display">{generatedCodename}</div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>
              Save this ID - you'll use it for login
            </p>
          </div>
          <button className="btn" style={{ width: '100%' }} onClick={() => navigate('/displayname')}>
            Continue to Setup Display Name
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="landing">
      <div className="form-container">
        <h2 className="form-title">Join Hacker Hub</h2>
        
        {step === 1 ? (
          <>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', fontSize: '0.875rem' }}>
              Step 1: Enter your email to receive OTP
            </p>
            {error && <div className="message error">{error}</div>}
            
            <div className="form-group">
              <label className="form-label">Email</label>
              <input
                type="email"
                name="email"
                className="form-input"
                value={formData.email}
                onChange={handleChange}
                placeholder="your.email@gmail.com"
                required
              />
            </div>

            <button type="button" className="btn" style={{ width: '100%' }} onClick={requestOtp}>
              Send OTP
            </button>
          </>
        ) : (
          <form onSubmit={handleSubmit}>
            {error && <div className="message error">{error}</div>}
            
            <div className="form-group">
              <label className="form-label">Email</label>
              <input
                type="email"
                name="email"
                className="form-input"
                value={formData.email}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">OTP Code</label>
              <input
                type="text"
                name="otp"
                className="form-input"
                value={formData.otp}
                onChange={handleChange}
                placeholder="Enter 6-digit OTP"
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

            <div className="form-group">
              <label className="form-label">Cyber ID (Optional)</label>
              <input
                type="text"
                name="codename"
                className="form-input"
                placeholder="Leave blank for random CWxxx"
                onChange={handleChange}
                maxLength={10}
              />
              <small style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>
                Enter CWHUB for Admin access
              </small>
            </div>

            <div className="form-group" style={{ marginTop: '1.5rem' }}>
              <div className="rules-checkbox">
                <input
                  type="checkbox"
                  id="rules"
                  checked={formData.acceptedRules}
                  onChange={(e) => setFormData({ ...formData, acceptedRules: e.target.checked })}
                  required
                />
                <label htmlFor="rules">
                  I accept the <Link to="/rules" style={{ color: 'var(--accent-primary)' }}>Community Rules</Link>
                </label>
              </div>
            </div>

            <button type="submit" className="btn" style={{ width: '100%' }}>
              Register
            </button>
          </form>
        )}

        <p style={{ textAlign: 'center', color: 'var(--text-secondary)', marginTop: '1rem', fontSize: '0.875rem' }}>
          Already have an account?{' '}
          <Link to="/login" style={{ color: 'var(--accent-primary)' }}>
            Login
          </Link>
        </p>
      </div>
    </div>
  );
}

export default Register;