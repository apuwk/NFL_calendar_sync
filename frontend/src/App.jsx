import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Header from './components/layout/Header';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import TeamsPage from './pages/TeamsPage';
import CalendarPage from './pages/CalendarPage';
import HomePage from './pages/HomePage';
import ProfilePage from './pages/ProfilePage';
import OAuthCallback from './components/calendar/OAuthCallback';


// Protected Route wrapper component
const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem('token');
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return children;
};

// Layout component to handle header display
const Layout = ({ children, onLogout }) => {
  const location = window.location.pathname;
  const showHeader = !['/login', '/register'].includes(location);
  
  return (
    <>
      {showHeader && <Header onLogout={onLogout} />}
      <div className={`${showHeader ? 'pt-4' : ''}`}>
        {children}
      </div>
    </>
  );
};

const App = () => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));

  const handleLogin = (userData) => {
    setUser(userData);
    setToken(userData.token);
    localStorage.setItem('token', userData.token);
  };

  const handleRegister = (userData) => {
    setUser(userData);
    setToken(userData.token);
    localStorage.setItem('token', userData.token);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
  };

  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        <Layout onLogout={handleLogout}>
          <Routes>
            {/* Public routes */}
            <Route path="/" element={
              token ? <HomePage /> : <Navigate to="/login" replace />
            } />
            <Route path="/login" element={
              token ? <Navigate to="/" replace /> : 
              <LoginPage onLogin={handleLogin} />
            } />
            <Route path="/register" element={
              token ? <Navigate to="/" replace /> : 
              <RegisterPage onRegister={handleRegister} />
            } />

            {/* Protected routes */}
            <Route path="/teams" element={
              <ProtectedRoute>
                <TeamsPage token={token} />
              </ProtectedRoute>
            } />
            <Route path="/calendar" element={
              <ProtectedRoute>
                <CalendarPage token={token} />
              </ProtectedRoute>
            } />
            <Route path="/profile" element={
              <ProtectedRoute>
                <ProfilePage token={token} />
              </ProtectedRoute>
            } />
            <Route path="/calendar/callback" element={
              <ProtectedRoute>
                <OAuthCallback />
              </ProtectedRoute>
            } />
            {/* Catch-all route */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Layout>
      </div>
    </Router>
  );
};

export default App;