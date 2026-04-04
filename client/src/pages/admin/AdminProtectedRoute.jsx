import React from 'react';
import { Navigate } from 'react-router-dom';

export default function AdminProtectedRoute({ children }) {
  const token = localStorage.getItem('naily_admin_token');
  if (!token) {
    return <Navigate to="/admin/login" replace />;
  }
  return children;
}
