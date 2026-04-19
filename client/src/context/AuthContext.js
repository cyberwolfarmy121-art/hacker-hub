import React, { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showRules, setShowRules] = useState(false);
  const [rulesAccepted, setRulesAccepted] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    const storedToken = localStorage.getItem('token');
    const storedRules = localStorage.getItem('rulesAccepted');
    
    if (storedUser && storedToken) {
      setUser(JSON.parse(storedUser));
      if (!storedRules) {
        setShowRules(true);
      }
    }
    setLoading(false);
  }, []);

  const login = (userData, token) => {
    // Normalize: server returns 'role' as rank, create alias 'rank' for consistency
    const normalized = { ...userData, rank: userData.role };
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(normalized));
    setUser(normalized);
    setShowRules(true);
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('rulesAccepted');
    setUser(null);
    setShowRules(false);
    setRulesAccepted(false);
    navigate('/');
  };

  const updateUser = (userData) => {
    setUser(prev => {
      const updated = { ...prev, ...userData };
      localStorage.setItem('user', JSON.stringify(updated));
      return updated;
    });
  };

  const acceptRules = () => {
    localStorage.setItem('rulesAccepted', 'true');
    setRulesAccepted(true);
    setShowRules(false);
  };

  const apiCall = async (endpoint, options = {}) => {
    const token = localStorage.getItem('token');
    const response = await fetch(`http://localhost:5000${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers
      }
    });
    
    if (response.status === 401 || response.status === 403) {
      logout();
      return response;
    }
    
    return response;
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, updateUser, loading, showRules, setShowRules, acceptRules, rulesAccepted, apiCall }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}