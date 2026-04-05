import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function SignupPage() {
  const { signup } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', confirm: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) =>
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (form.password !== form.confirm) {
      return setError('הסיסמאות אינן תואמות');
    }
    if (form.password.length < 6) {
      return setError('הסיסמה חייבת להכיל לפחות 6 תווים');
    }

    setLoading(true);
    try {
      await signup(form.name, form.email, form.phone, form.password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message || 'שגיאה בהרשמה');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      dir="rtl"
      className="min-h-screen flex items-center justify-center bg-gradient-to-br from-pink-100 to-purple-100 px-4 py-8"
    >
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8 mx-4">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="text-4xl mb-2">💅</div>
          <h1 className="text-3xl font-extrabold text-purple-800">Naily</h1>
          <p className="text-gray-500 mt-1 text-sm">הרשמה כמניקוריסטית</p>
        </div>

        <h2 className="text-2xl font-bold text-purple-deeper text-center mb-5">יצירת חשבון</h2>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 rounded-xl px-4 py-3 text-sm mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-semibold text-gray-600 mb-1">שם מלא</label>
            <input
              type="text"
              name="name"
              value={form.name}
              onChange={handleChange}
              className="input-field"
              placeholder="ישראלה ישראלי"
              required
            />
          </div>

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
            <label className="block text-sm font-semibold text-gray-600 mb-1">
              טלפון <span className="text-gray-400 font-normal">(אופציונלי)</span>
            </label>
            <input
              type="tel"
              name="phone"
              value={form.phone}
              onChange={handleChange}
              className="input-field"
              placeholder="050-0000000"
              dir="ltr"
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
              placeholder="לפחות 6 תווים"
              required
              autoComplete="new-password"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-600 mb-1">אישור סיסמה</label>
            <input
              type="password"
              name="confirm"
              value={form.confirm}
              onChange={handleChange}
              className="input-field"
              placeholder="הכנס סיסמה שוב"
              required
              autoComplete="new-password"
            />
          </div>

          <button type="submit" className="btn-primary mt-1" disabled={loading}>
            {loading ? 'נרשמת...' : 'הרשמה'}
          </button>
        </form>

        <p className="text-center text-gray-500 text-sm mt-5">
          יש לך כבר חשבון?{' '}
          <Link to="/login" className="text-purple-dark font-semibold underline">
            התחברות
          </Link>
        </p>
      </div>
    </div>
  );
}
