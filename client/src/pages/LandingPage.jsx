import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div
      dir="rtl"
      className="min-h-screen flex flex-col"
      style={{
        background: 'linear-gradient(135deg, #fce4ec 0%, #e1bee7 40%, #d1c4e9 100%)',
      }}
    >
      {/* Hero */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 text-center py-16">
        <div className="max-w-4xl w-full mx-auto flex flex-col items-center gap-6">
          <div className="text-7xl md:text-8xl drop-shadow-lg">💅</div>
          <h1
            className="text-5xl md:text-7xl font-extrabold"
            style={{
              background: 'linear-gradient(135deg, #c56cd6, #7b2ff7)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            Naily
          </h1>
          <p className="text-xl md:text-2xl font-semibold text-gray-700 max-w-lg leading-snug">
            ניהול תורים וצבעים לגלאמור שבך
          </p>
          <p className="text-sm md:text-base text-gray-500 max-w-xl">
            פלטפורמה חכמה למניקוריסטיות ולקוחות — קביעת תורים, ניהול צבעים, הכל במקום אחד
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-6 w-full max-w-2xl mt-2">
            {/* Tech section */}
            <div className="flex-1 flex flex-col gap-2">
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

            <div className="flex sm:flex-col items-center gap-3">
              <div className="flex-1 sm:flex-none h-px sm:h-16 sm:w-px bg-gray-300 w-full" />
              <span className="text-xs text-gray-400">או</span>
              <div className="flex-1 sm:flex-none h-px sm:h-16 sm:w-px bg-gray-300 w-full" />
            </div>

            {/* Client section */}
            <div className="flex-1 flex flex-col gap-2">
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
        </div>

        {/* Features */}
        <div className="mt-16 w-full max-w-3xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { icon: '🎨', label: 'ניהול צבעים', desc: 'נהלי את כל צבעי הלק שלך, סרקי בקבוקונים וקבלי זיהוי אוטומטי' },
              { icon: '📅', label: 'הזמנת תורים', desc: 'לקוחות קובעות תורים עצמאית — אונליין, 24/7, ללא שיחות טלפון' },
              { icon: '💬', label: 'SMS אוטומטי', desc: 'הודעות אישור ותזכורת נשלחות ללקוחות אוטומטית' },
            ].map((f) => (
              <div
                key={f.label}
                className="bg-white/60 backdrop-blur-sm rounded-2xl p-5 flex flex-col items-center gap-3 shadow-sm text-center"
              >
                <span className="text-4xl">{f.icon}</span>
                <span className="text-base font-bold text-gray-700">{f.label}</span>
                <span className="text-sm text-gray-500">{f.desc}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <p className="text-center text-xs text-gray-400 py-6">
        © 2026 Naily · כל הזכויות שמורות
      </p>
    </div>
  );
}
