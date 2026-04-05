import React, { useState } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { api } from '../lib/api.js';

export default function ClientSignupPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirect = searchParams.get('redirect');

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await api.post('/api/client-auth/signup', { name, phone, email, password });
      localStorage.setItem('naily_client_token', data.token);
      localStorage.setItem('naily_client_user', JSON.stringify(data.user));
      navigate(redirect ? decodeURIComponent(redirect) : '/client/profile');
    } catch (err) {
      setError(err.message || 'שגיאה בהרשמה');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      dir="rtl"
      className="min-h-screen flex items-center justify-center px-4 py-8"
      style={{ background: 'linear-gradient(135deg, #f8a5c2 0%, #c56cd6 100%)' }}
    >
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">💅</div>
          <h1 className="text-3xl font-extrabold text-white">Naily</h1>
          <p className="text-white/80 mt-1">הרשמה ללקוחות</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-3xl shadow-xl p-8 flex flex-col gap-5">
          <h2 className="text-xl font-bold text-purple-800 text-center">יצירת חשבון חדש</h2>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 rounded-xl px-4 py-3 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-600 mb-1">שם מלא</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full border-2 border-purple-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-purple-400 transition-colors"
                placeholder="שם שלך"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-600 mb-1">טלפון</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full border-2 border-purple-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-purple-400 transition-colors"
                placeholder="050-0000000"
                dir="ltr"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-600 mb-1">אימייל</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full border-2 border-purple-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-purple-400 transition-colors"
                placeholder="your@email.com"
                dir="ltr"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-600 mb-1">סיסמה</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full border-2 border-purple-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-purple-400 transition-colors"
                placeholder="לפחות 6 תווים"
                dir="ltr"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl font-bold text-white transition-opacity disabled:opacity-60"
              style={{ background: 'linear-gradient(135deg, #f8a5c2, #c56cd6)' }}
            >
              {loading ? 'נרשמת...' : 'הרשמה'}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500">
            כבר יש לך חשבון?{' '}
            <Link to="/client/login" className="text-purple-600 font-semibold underline">
              התחברי כאן
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
