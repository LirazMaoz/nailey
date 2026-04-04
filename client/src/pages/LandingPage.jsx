import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div
      dir="rtl"
      className="min-h-screen flex flex-col items-center justify-center px-6 text-center"
      style={{
        background: 'linear-gradient(135deg, #fce4ec 0%, #e1bee7 40%, #d1c4e9 100%)',
      }}
    >
      {/* Hero */}
      <div className="flex flex-col items-center gap-4 mb-10">
        <div className="text-7xl drop-shadow-lg">💅</div>
        <h1
          className="text-5xl font-extrabold"
          style={{
            background: 'linear-gradient(135deg, #c56cd6, #7b2ff7)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          Naily
        </h1>
        <p className="text-xl font-semibold text-gray-700 max-w-xs leading-snug">
          ניהול תורים וצבעים לגלאמור שבך
        </p>
        <p className="text-sm text-gray-500 max-w-xs">
          פלטפורמה חכמה למניקוריסטיות ולקוחות — קביעת תורים, ניהול צבעים, הכל במקום אחד
        </p>
      </div>

      {/* CTA Buttons */}
      <div className="flex flex-col gap-4 w-full max-w-sm">
        {/* Tech button */}
        <div className="flex flex-col gap-2">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">אני מטפלת ציפורניים</p>
          <div className="flex gap-3">
            <button
              onClick={() => navigate('/login')}
              className="flex-1 py-3.5 rounded-2xl font-bold text-white text-sm shadow-lg active:scale-95 transition-transform"
              style={{ background: 'linear-gradient(135deg, #c56cd6, #7b2ff7)' }}
            >
              כניסה
            </button>
            <button
              onClick={() => navigate('/signup')}
              className="flex-1 py-3.5 rounded-2xl font-bold text-purple-700 text-sm border-2 border-purple-300 bg-white active:scale-95 transition-transform"
            >
              הרשמה
            </button>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-gray-300" />
          <span className="text-xs text-gray-400">או</span>
          <div className="flex-1 h-px bg-gray-300" />
        </div>

        {/* Client button */}
        <div className="flex flex-col gap-2">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">אני לקוחה</p>
          <div className="flex gap-3">
            <button
              onClick={() => navigate('/client/login')}
              className="flex-1 py-3.5 rounded-2xl font-bold text-white text-sm shadow-lg active:scale-95 transition-transform"
              style={{ background: 'linear-gradient(135deg, #f8a5c2, #c56cd6)' }}
            >
              כניסה
            </button>
            <button
              onClick={() => navigate('/client/signup')}
              className="flex-1 py-3.5 rounded-2xl font-bold text-pink-600 text-sm border-2 border-pink-200 bg-white active:scale-95 transition-transform"
            >
              הרשמה
            </button>
          </div>
        </div>
      </div>

      {/* Features */}
      <div className="mt-12 grid grid-cols-3 gap-4 max-w-sm w-full">
        {[
          { icon: '📅', label: 'תורים אונליין' },
          { icon: '🎨', label: 'ניהול צבעים' },
          { icon: '💬', label: 'SMS אוטומטי' },
        ].map((f) => (
          <div
            key={f.label}
            className="bg-white/60 backdrop-blur-sm rounded-2xl p-3 flex flex-col items-center gap-1 shadow-sm"
          >
            <span className="text-2xl">{f.icon}</span>
            <span className="text-xs font-semibold text-gray-600">{f.label}</span>
          </div>
        ))}
      </div>

      {/* Footer */}
      <p className="mt-10 text-xs text-gray-400">
        © 2026 Naily · כל הזכויות שמורות
      </p>
    </div>
  );
}
