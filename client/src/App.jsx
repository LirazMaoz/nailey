import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import LoginPage from './pages/LoginPage.jsx';
import SignupPage from './pages/SignupPage.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import ColorsPage from './pages/ColorsPage.jsx';
import BookingPage from './pages/BookingPage.jsx';
import BookForClientPage from './pages/BookForClientPage.jsx';
import ClientLoginPage from './pages/ClientLoginPage.jsx';
import ClientSignupPage from './pages/ClientSignupPage.jsx';
import ClientProfilePage from './pages/ClientProfilePage.jsx';

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="app-container flex items-center justify-center min-h-screen">
        <div className="text-purple-dark text-lg font-semibold animate-pulse">טוענת...</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

function AppRoutes() {
  const { user } = useAuth();

  return (
    <div className="app-container">
      <Routes>
        <Route path="/" element={user ? <Navigate to="/dashboard" replace /> : <Navigate to="/login" replace />} />
        <Route path="/login" element={user ? <Navigate to="/dashboard" replace /> : <LoginPage />} />
        <Route path="/signup" element={user ? <Navigate to="/dashboard" replace /> : <SignupPage />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/colors"
          element={
            <ProtectedRoute>
              <ColorsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/book-for-client"
          element={
            <ProtectedRoute>
              <BookForClientPage />
            </ProtectedRoute>
          }
        />
        <Route path="/book/:techId" element={<BookingPage />} />
        <Route path="/client/login" element={<ClientLoginPage />} />
        <Route path="/client/signup" element={<ClientSignupPage />} />
        <Route path="/client/profile" element={<ClientProfilePage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}
