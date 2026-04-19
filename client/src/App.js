import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Landing from './pages/Landing';
import Register from './pages/Register';
import Login from './pages/Login';
import DisplayNameEntry from './pages/DisplayNameEntry';
import Main from './pages/Main';
import LiveRoom from './pages/LiveRoom';
import Missions from './pages/Missions';
import Profile from './pages/Profile';
import Vault from './pages/Vault';
import Alliance from './pages/Alliance';
import AdminPanel from './pages/AdminPanel';
import RulesPopup from './pages/RulesPopup';

function ProtectedRoute({ children, requireAdmin = false, minRank = null }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/" />;
  }

  if (requireAdmin && user.codename !== 'CWHUB') {
    return <Navigate to="/main" />;
  }

  const rankLevels = { RECRUIT: 0, CADET: 1, ANALYST: 2, SPECIALIST: 3, GUARDIAN: 4, ELITE: 5, COMMANDER: 6, ADMIN: 7 };
  if (minRank && rankLevels[user.rank] < rankLevels[minRank]) {
    return <Navigate to="/main" />;
  }

  return children;
}

function AppRoutes() {
  const { user, showRules, setShowRules } = useAuth();

  return (
    <>
      {showRules && <RulesPopup onAccept={() => setShowRules(false)} />}
      <Routes>
        <Route path="/" element={user ? <Navigate to="/main" /> : <Landing />} />
        <Route path="/register" element={user ? <Navigate to="/main" /> : <Register />} />
        <Route path="/login" element={user ? <Navigate to="/main" /> : <Login />} />
        <Route path="/displayname" element={user && !user.displayName ? <DisplayNameEntry /> : <Navigate to="/main" />} />
        <Route path="/main" element={
          <ProtectedRoute>
            <Main />
          </ProtectedRoute>
        }>
          <Route path="live" element={<LiveRoom />} />
          <Route path="missions" element={<Missions />} />
          <Route path="profile" element={<Profile />} />
          <Route path="vault" element={<Vault />} />
          <Route path="alliance" element={
            <ProtectedRoute minRank="CADET">
              <Alliance />
            </ProtectedRoute>
          } />
          <Route path="admin" element={
            <ProtectedRoute requireAdmin>
              <AdminPanel />
            </ProtectedRoute>
          } />
        </Route>
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;