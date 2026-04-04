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
import LandingPage from './pages/LandingPage.jsx';
import AdminLoginPage from './pages/admin/AdminLoginPage.jsx';
import AdminDashboardPage from './pages/admin/AdminDashboardPage.jsx';
import AdminProtectedRoute from './pages/admin/AdminProtectedRoute.jsx';

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

  // Determine client login state
  const clientUser = (() => {
    try {
      return JSON.parse(localStorage.getItem('naily_client_user') || 'null');
    } catch {
      return null;
    }
  })();

  return (
    <div className="app-container">
      <Routes>
        {/* Landing: smart redirect if logged in */}
        <Route
          path="/"
          element={
            user
              ? <Navigate to="/dashboard" replace />
              : clientUser
              ? <Navigate to="/client/profile" replace />
              : <LandingPage />
          }
        />

        {/* Tech auth */}
        <Route path="/login" element={user ? <Navigate to="/dashboard" replace /> : <LoginPage />} />
        <Route path="/signup" element={user ? <Navigate to="/dashboard" replace /> : <SignupPage />} />

        {/* Tech protected routes */}
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

        {/* Public booking (techId can be numeric id or username slug) */}
        <Route path="/book/:techId" element={<BookingPage />} />

        {/* Client routes */}
        <Route path="/client/login" element={<ClientLoginPage />} />
        <Route path="/client/signup" element={<ClientSignupPage />} />
        <Route path="/client/profile" element={<ClientProfilePage />} />

        {/* Admin routes */}
        <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
        <Route path="/admin/login" element={<AdminLoginPage />} />
        <Route
          path="/admin/dashboard"
          element={
            <AdminProtectedRoute>
              <AdminDashboardPage />
            </AdminProtectedRoute>
          }
        />

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
