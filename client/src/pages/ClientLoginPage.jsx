import React, { useState } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { api } from '../lib/api.js';

export default function ClientLoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirect = searchParams.get('redirect');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await api.post('/api/client-auth/login', { email, password });
      localStorage.setItem('naily_client_token', data.token);
      localStorage.setItem('naily_client_user', JSON.stringify(data.user));
      if (redirect === 'back') {
        navigate(-1);
      } else {
        navigate('/client/profile');
      }
    } catch (err) {
      setError(err.message || 'שגיאה בהתחברות');
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
          <p className="text-white/80 mt-1">התחברי לחשבון שלך</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-3xl shadow-xl p-8 flex flex-col gap-5">
          <h2 className="text-xl font-bold text-purple-800 text-center">כניסה ללקוחות</h2>

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
                placeholder="••••••"
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
              {loading ? 'מתחברת...' : 'כניסה'}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500">
            אין לך חשבון?{' '}
            <Link to="/client/signup" className="text-purple-600 font-semibold underline">
              הרשמה כאן
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
