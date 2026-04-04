import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { api } from '../lib/api.js';
import AppointmentCard from '../components/AppointmentCard.jsx';
import { useSubscription } from '../hooks/useSubscription.js';
import SubscriptionModal from '../components/SubscriptionModal.jsx';

function todayISO() {
  return new Date().toISOString().split('T')[0];
}

export default function DashboardPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { status: subStatus, loading: subLoading, isBlocked } = useSubscription();
  const [trialBannerDismissed, setTrialBannerDismissed] = useState(false);

  const [appointments, setAppointments] = useState([]);
  const [outOfStockCount, setOutOfStockCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showShareModal, setShowShareModal] = useState(false);
  const [topColors, setTopColors] = useState([]);
  const evtSourceRef = useRef(null);

  const today = todayISO();

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [apptData, colorsData] = await Promise.all([
        api.get(`/api/appointments?date=${today}`),
        api.get('/api/colors'),
      ]);
      setAppointments(apptData);
      setOutOfStockCount(colorsData.filter((c) => c.out_of_stock).length);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [today]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // SSE for top colors
  useEffect(() => {
    if (!user?.id) return;
    const evtSource = new EventSource(`/api/stats/top-colors/stream?techId=${user.id}`);
    evtSourceRef.current = evtSource;
    evtSource.onmessage = (e) => {
      try {
        setTopColors(JSON.parse(e.data));
      } catch {
        // ignore parse errors
      }
    };
    evtSource.onerror = () => {
      evtSource.close();
    };
    return () => {
      evtSource.close();
    };
  }, [user?.id]);

  const handleStatusChange = (updated) => {
    setAppointments((prev) =>
      prev.map((a) => (a.id === updated.id ? { ...a, ...updated } : a))
    );
  };

  const bookingLink = `${window.location.origin}/book/${user?.username || user?.id}`;

  const copyLink = () => {
    navigator.clipboard.writeText(bookingLink).then(() => {
      alert('הקישור הועתק!');
    });
  };

  // Show paywall if subscription is blocked
  if (!subLoading && isBlocked) {
    return <SubscriptionModal status={subStatus} />;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Trial banner */}
      {!subLoading && subStatus?.access === 'trial_active' && !trialBannerDismissed && (
        <div
          className="flex items-center justify-between px-4 py-2 text-sm font-semibold text-white"
          style={{ background: 'linear-gradient(90deg, #f8a5c2, #c56cd6)' }}
        >
          <span>
            ניסיון חינמי — נותרו {subStatus.days_left} ימים
          </span>
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                api.post('/api/subscriptions/checkout', { plan: 'monthly' })
                  .then((d) => d.url && window.open(d.url, '_blank'))
                  .catch(() => {});
              }}
              className="bg-white text-purple-700 rounded-lg px-3 py-0.5 text-xs font-bold"
            >
              שדרגי עכשיו
            </button>
            <button
              onClick={() => setTrialBannerDismissed(true)}
              className="text-white/80 hover:text-white text-lg leading-none"
            >
              ×
            </button>
          </div>
        </div>
      )}
      {/* Header */}
      <div className="bg-tech-gradient text-white px-4 pt-6 pb-8 rounded-b-3xl">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-bold">היי, {user?.name || 'מניקוריסטית'} 💅</h1>
            <p className="text-purple-light text-sm">
              {new Date().toLocaleDateString('he-IL', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
              })}
            </p>
          </div>
          <button
            onClick={logout}
            className="text-purple-light text-sm underline"
          >
            יציאה
          </button>
        </div>

        {/* Stats row */}
        <div className="flex gap-3">
          <div className="flex-1 bg-white/20 rounded-2xl p-3 text-center backdrop-blur-sm">
            <p className="text-2xl font-extrabold">{appointments.length}</p>
            <p className="text-xs text-purple-light">תורים היום</p>
          </div>
          <div
            className={`flex-1 rounded-2xl p-3 text-center backdrop-blur-sm ${
              outOfStockCount > 0 ? 'bg-red-400/30 border border-red-300' : 'bg-white/20'
            }`}
          >
            <p className="text-2xl font-extrabold">{outOfStockCount}</p>
            <p className="text-xs text-purple-light">
              {outOfStockCount > 0 ? '⚠️ צבעים חסרים' : 'צבעים חסרים'}
            </p>
          </div>
        </div>
      </div>

      {/* Quick actions */}
      <div className="px-4 -mt-3 grid grid-cols-3 gap-2">
        <button
          onClick={() => navigate('/colors')}
          className="bg-white rounded-2xl shadow-md p-3 flex flex-col items-center gap-1 active:scale-95 transition-transform"
        >
          <span className="text-2xl">🎨</span>
          <span className="text-xs font-semibold text-gray-700">ניהול צבעים</span>
        </button>
        <button
          onClick={() => navigate('/book-for-client')}
          className="bg-white rounded-2xl shadow-md p-3 flex flex-col items-center gap-1 active:scale-95 transition-transform"
        >
          <span className="text-2xl">📅</span>
          <span className="text-xs font-semibold text-gray-700">קביעת תור</span>
        </button>
        <button
          onClick={() => setShowShareModal(true)}
          className="bg-white rounded-2xl shadow-md p-3 flex flex-col items-center gap-1 active:scale-95 transition-transform"
        >
          <span className="text-2xl">🔗</span>
          <span className="text-xs font-semibold text-gray-700">שיתוף קישור</span>
        </button>
      </div>

      {/* Appointments */}
      <div className="flex-1 px-4 pt-5 pb-6">
        <h2 className="text-lg font-bold text-purple-deeper mb-3">תורים היום</h2>

        {loading && (
          <div className="text-center text-gray-400 py-10">טוענת...</div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 rounded-xl px-4 py-3 text-sm mb-3">
            {error}
          </div>
        )}

        {!loading && appointments.length === 0 && (
          <div className="text-center py-12">
            <div className="text-5xl mb-3">🌸</div>
            <p className="text-gray-500">אין תורים להיום</p>
            <button
              onClick={() => navigate('/book-for-client')}
              className="btn-primary mt-4 max-w-xs mx-auto"
            >
              קבעי תור ראשון
            </button>
          </div>
        )}

        <div className="flex flex-col gap-3">
          {appointments.map((appt) => (
            <AppointmentCard
              key={appt.id}
              appointment={appt}
              onStatusChange={handleStatusChange}
            />
          ))}
        </div>

        {/* Booking link section */}
        <div className="mt-4">
          <h2 className="text-lg font-bold text-purple-deeper mb-2">קישור הזמנה</h2>
          <div className="bg-white rounded-2xl shadow-sm p-4 flex flex-col gap-3">
            <p className="text-sm text-gray-500">שלחי ללקוחות שלך:</p>
            <div
              className="bg-purple-50 rounded-xl px-3 py-2 text-xs font-mono break-all text-gray-700 border border-purple-100"
              dir="ltr"
            >
              {bookingLink}
            </div>
            <button onClick={copyLink} className="btn-outline text-sm py-2">
              📋 העתקת קישור
            </button>
          </div>
        </div>

        {/* Top 10 colors section */}
        <div className="mt-4 mb-6">
          <div className="flex items-center gap-2 mb-2">
            <h2 className="text-lg font-bold text-purple-deeper">Top 10 צבעים</h2>
            <span className="flex items-center gap-1 text-xs text-green-600 font-semibold">
              <span
                className="inline-block w-2 h-2 rounded-full bg-green-500"
                style={{ animation: 'pulse 2s infinite' }}
              />
              עדכון בזמן אמת
            </span>
          </div>
          {topColors.length === 0 ? (
            <div className="text-center text-gray-400 text-sm py-6">אין נתונים עדיין</div>
          ) : (
            <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-purple-50 text-purple-700 text-xs">
                    <th className="py-2 px-3 text-right font-semibold">#</th>
                    <th className="py-2 px-3 text-right font-semibold">צבע</th>
                    <th className="py-2 px-3 text-right font-semibold">שם</th>
                    <th className="py-2 px-3 text-right font-semibold">מספר</th>
                    <th className="py-2 px-3 text-left font-semibold">טיפולים</th>
                  </tr>
                </thead>
                <tbody>
                  {topColors.map((c, i) => (
                    <tr key={c.id} className="border-t border-gray-50">
                      <td className="py-2 px-3 text-gray-400 font-bold">{i + 1}</td>
                      <td className="py-2 px-3">
                        <div
                          className="rounded-full border border-gray-200"
                          style={{ width: 20, height: 20, backgroundColor: c.hex }}
                        />
                      </td>
                      <td className="py-2 px-3 text-gray-800 font-medium">{c.name}</td>
                      <td className="py-2 px-3 text-gray-400 font-mono text-xs" dir="ltr">{c.number}</td>
                      <td className="py-2 px-3 text-left font-bold text-purple-700">{c.count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Share modal */}
      {showShareModal && (
        <div
          className="fixed inset-0 bg-black/50 flex items-end z-50"
          onClick={() => setShowShareModal(false)}
        >
          <div
            className="bg-white w-full max-w-[430px] mx-auto rounded-t-3xl p-6 flex flex-col gap-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold text-purple-deeper">קישור הזמנת תורים</h3>
            <p className="text-sm text-gray-500">
              שלחי את הקישור הזה ללקוחות שלך כדי שיוכלו לקבוע תורים בעצמן:
            </p>
            <div
              className="bg-purple-light/30 rounded-xl px-3 py-3 text-sm font-mono break-all text-gray-700"
              dir="ltr"
            >
              {bookingLink}
            </div>
            <button onClick={copyLink} className="btn-primary">
              📋 העתקת קישור
            </button>
            <button
              onClick={() => setShowShareModal(false)}
              className="btn-outline"
            >
              סגירה
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
