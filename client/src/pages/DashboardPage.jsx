import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { api } from '../lib/api.js';
import AppointmentCard from '../components/AppointmentCard.jsx';
import NavBar from '../components/NavBar.jsx';
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

  const handleDelete = (id) => {
    setAppointments((prev) => prev.filter((a) => a.id !== id));
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
    <div dir="rtl" className="min-h-screen bg-gray-50 flex flex-col">
      <NavBar />

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

      {/* Page wrapper */}
      <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 flex flex-col gap-6">
        {/* Greeting */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-purple-900">
              היי, {user?.name || 'מניקוריסטית'} 💅
            </h1>
            <p className="text-gray-500 text-sm mt-0.5">
              {new Date().toLocaleDateString('he-IL', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
              })}
            </p>
          </div>
        </div>

        {/* Stats cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-2xl shadow-sm border border-purple-100 p-4 text-center">
            <p className="text-3xl font-extrabold text-purple-700">{appointments.length}</p>
            <p className="text-sm text-gray-500 mt-1">תורים היום</p>
          </div>
          <div
            className={`bg-white rounded-2xl shadow-sm border p-4 text-center ${
              outOfStockCount > 0 ? 'border-red-200' : 'border-purple-100'
            }`}
          >
            <p className={`text-3xl font-extrabold ${outOfStockCount > 0 ? 'text-red-500' : 'text-gray-700'}`}>
              {outOfStockCount}
            </p>
            <p className="text-sm text-gray-500 mt-1">
              {outOfStockCount > 0 ? '⚠️ צבעים חסרים' : 'צבעים חסרים'}
            </p>
          </div>
        </div>

        {/* Quick actions */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <button
            onClick={() => navigate('/colors')}
            className="bg-white rounded-2xl shadow-sm border border-purple-100 p-4 flex flex-col items-center gap-2 active:scale-95 transition-transform hover:border-purple-300"
          >
            <span className="text-3xl">🎨</span>
            <span className="text-sm font-semibold text-gray-700">ניהול צבעים</span>
          </button>
          <button
            onClick={() => navigate('/book-for-client')}
            className="bg-white rounded-2xl shadow-sm border border-purple-100 p-4 flex flex-col items-center gap-2 active:scale-95 transition-transform hover:border-purple-300"
          >
            <span className="text-3xl">📅</span>
            <span className="text-sm font-semibold text-gray-700">קביעת תור</span>
          </button>
          <button
            onClick={() => setShowShareModal(true)}
            className="bg-white rounded-2xl shadow-sm border border-purple-100 p-4 flex flex-col items-center gap-2 active:scale-95 transition-transform hover:border-purple-300"
          >
            <span className="text-3xl">🔗</span>
            <span className="text-sm font-semibold text-gray-700">שיתוף קישור</span>
          </button>
        </div>

        {/* Main content: appointments + sidebar */}
        <div className="lg:flex lg:gap-6">
          {/* Appointments list */}
          <div className="flex-1 flex flex-col gap-4">
            <h2 className="text-lg font-bold text-purple-deeper">תורים היום</h2>

            {loading && (
              <div className="text-center text-gray-400 py-10">טוענת...</div>
            )}

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 rounded-xl px-4 py-3 text-sm">
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
                  onDelete={handleDelete}
                />
              ))}
            </div>
          </div>

          {/* Sidebar: booking link + top colors */}
          <div className="lg:w-80 flex flex-col gap-4 mt-4 lg:mt-0">
            {/* Booking link */}
            <div>
              <h2 className="text-lg font-bold text-purple-deeper mb-2">קישור הזמנה</h2>
              <div className="bg-white rounded-2xl shadow-sm border border-purple-100 p-4 flex flex-col gap-3">
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

            {/* Top 10 colors */}
            <div className="mb-6">
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
                <div className="bg-white rounded-2xl shadow-sm overflow-hidden border border-purple-100">
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
        </div>
      </div>

      {/* Share modal */}
      {showShareModal && (
        <div
          className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50"
          onClick={() => setShowShareModal(false)}
        >
          <div
            className="bg-white w-full sm:max-w-md sm:rounded-3xl rounded-t-3xl p-6 flex flex-col gap-4"
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
