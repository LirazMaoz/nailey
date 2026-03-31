import React, { createContext, useContext, useEffect, useState } from 'react';
import { api } from '../lib/api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const storedToken = localStorage.getItem('naily_token');
      const storedUser = localStorage.getItem('naily_user');
      if (storedToken && storedUser) {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
      }
    } catch {
      // ignore
    }
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    const data = await api.post('/api/auth/login', { email, password });
    setToken(data.token);
    setUser(data.user);
    localStorage.setItem('naily_token', data.token);
    localStorage.setItem('naily_user', JSON.stringify(data.user));
    return data;
  };

  const signup = async (name, email, phone, password) => {
    const data = await api.post('/api/auth/signup', { name, email, phone, password });
    if (data.token) {
      setToken(data.token);
      setUser(data.user);
      localStorage.setItem('naily_token', data.token);
      localStorage.setItem('naily_user', JSON.stringify(data.user));
    }
    return data;
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('naily_token');
    localStorage.removeItem('naily_user');
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
