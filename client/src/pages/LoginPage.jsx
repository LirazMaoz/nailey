import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) =>
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(form.email, form.password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message || 'שגיאה בהתחברות');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-card-gradient flex flex-col">
      {/* Header */}
      <div className="bg-tech-gradient text-white text-center py-10 px-6 rounded-b-3xl">
        <div className="text-5xl mb-2">💅</div>
        <h1 className="text-3xl font-extrabold tracking-wide">Naily</h1>
        <p className="text-purple-light mt-1 text-sm">ניהול טיפולי ציפורניים</p>
      </div>

      {/* Form */}
      <div className="flex-1 px-6 py-8 flex flex-col gap-5">
        <h2 className="text-2xl font-bold text-purple-deeper text-center">התחברות</h2>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 rounded-xl px-4 py-3 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-semibold text-gray-600 mb-1">אימייל</label>
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              className="input-field"
              placeholder="nail@example.com"
              required
              autoComplete="email"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-600 mb-1">סיסמה</label>
            <input
              type="password"
              name="password"
              value={form.password}
              onChange={handleChange}
              className="input-field"
              placeholder="••••••••"
              required
              autoComplete="current-password"
            />
          </div>

          <button type="submit" className="btn-primary mt-2" disabled={loading}>
            {loading ? 'מתחברת...' : 'התחברות'}
          </button>
        </form>

        <p className="text-center text-gray-500 text-sm">
          אין לך חשבון?{' '}
          <Link to="/signup" className="text-purple-dark font-semibold underline">
            הרשמה כאן
          </Link>
        </p>
      </div>
    </div>
  );
}
