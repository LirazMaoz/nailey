import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';

const STATUS_LABELS = {
  pending: { label: 'ממתין', color: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
  arrived: { label: 'הגיעה', color: 'bg-blue-100 text-blue-700 border-blue-200' },
  done: { label: 'הושלם', color: 'bg-green-100 text-green-700 border-green-200' },
};

function formatDate(dateStr) {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('he-IL', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function formatTime(timeStr) {
  if (!timeStr) return '';
  return String(timeStr).slice(0, 5);
}

export default function ClientProfilePage() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('naily_client_token');
    if (!token) {
      navigate('/client/login');
      return;
    }

    fetch('/api/client-auth/me', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'שגיאה בטעינת הפרופיל');
        return data;
      })
      .then((data) => setProfile(data))
      .catch((err) => {
        setError(err.message);
        if (err.message === 'Unauthorized' || err.message === 'Invalid token') {
          localStorage.removeItem('naily_client_token');
          localStorage.removeItem('naily_client_user');
          navigate('/client/login');
        }
      })
      .finally(() => setLoading(false));
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('naily_client_token');
    localStorage.removeItem('naily_client_user');
    navigate('/client/login');
  };

  if (loading) {
    return (
      <div
        dir="rtl"
        className="min-h-screen flex items-center justify-center"
        style={{ background: 'linear-gradient(135deg, #f8a5c2 0%, #c56cd6 100%)' }}
      >
        <p className="text-white text-lg font-semibold animate-pulse">טוענת...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div
        dir="rtl"
        className="min-h-screen flex items-center justify-center px-4"
        style={{ background: 'linear-gradient(135deg, #f8a5c2 0%, #c56cd6 100%)' }}
      >
        <div className="bg-white rounded-3xl p-6 text-center max-w-sm w-full">
          <p className="text-red-500 mb-4">{error}</p>
          <Link to="/client/login" className="text-purple-600 underline font-semibold">
            חזרה לכניסה
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div
      dir="rtl"
      className="min-h-screen flex flex-col"
      style={{ background: 'linear-gradient(135deg, #f8a5c2 0%, #c56cd6 100%)' }}
    >
      {/* Header / profile card */}
      <div className="px-4 pt-10 pb-6 text-white">
        <div className="max-w-3xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-4">
              {/* Avatar initial */}
              <div className="w-16 h-16 rounded-full bg-white/30 flex items-center justify-center text-2xl font-extrabold text-white flex-shrink-0">
                {profile?.name?.charAt(0) || '?'}
              </div>
              <div>
                <h1 className="text-2xl font-extrabold">{profile?.name}</h1>
                <p className="text-white/80 text-sm" dir="ltr">{profile?.phone}</p>
                {profile?.email && (
                  <p className="text-white/70 text-xs" dir="ltr">{profile.email}</p>
                )}
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="self-start md:self-auto text-sm text-white/80 border border-white/40 rounded-xl px-4 py-2 hover:bg-white/10 transition-colors"
            >
              יציאה
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 bg-gray-50 rounded-t-3xl px-4 pt-6 pb-8">
        <div className="max-w-3xl mx-auto flex flex-col gap-5">
          <h2 className="text-lg font-bold text-purple-800">התורים האחרונים שלי</h2>

          {profile?.appointments?.length === 0 && (
            <div className="text-center py-8 text-gray-400">
              <div className="text-4xl mb-2">🌸</div>
              <p>אין תורים עדיין</p>
            </div>
          )}

          {/* Mobile: card list, Desktop: table */}
          <div className="hidden md:block">
            {profile?.appointments?.length > 0 && (
              <div className="bg-white rounded-2xl shadow-sm overflow-hidden border border-purple-100">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-purple-50 text-purple-700 text-xs">
                      <th className="py-3 px-4 text-right font-semibold">תאריך</th>
                      <th className="py-3 px-4 text-right font-semibold">שעה</th>
                      <th className="py-3 px-4 text-right font-semibold">צבע</th>
                      <th className="py-3 px-4 text-right font-semibold">סטטוס</th>
                    </tr>
                  </thead>
                  <tbody>
                    {profile.appointments.map((appt) => {
                      const statusInfo = STATUS_LABELS[appt.status] || STATUS_LABELS.pending;
                      return (
                        <tr key={appt.id} className="border-t border-gray-50 hover:bg-gray-50">
                          <td className="py-3 px-4 text-gray-700">{formatDate(appt.date)}</td>
                          <td className="py-3 px-4 text-gray-500" dir="ltr">{formatTime(appt.time)}</td>
                          <td className="py-3 px-4">
                            {appt.color_name && (
                              <div className="flex items-center gap-2">
                                {appt.color_hex && (
                                  <div
                                    className="rounded-full border border-gray-200 flex-shrink-0"
                                    style={{ width: 20, height: 20, backgroundColor: appt.color_hex }}
                                  />
                                )}
                                <span className="text-gray-600">{appt.color_name}</span>
                              </div>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${statusInfo.color}`}>
                              {statusInfo.label}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Mobile card list */}
          <div className="md:hidden flex flex-col gap-3">
            {profile?.appointments?.map((appt) => {
              const statusInfo = STATUS_LABELS[appt.status] || STATUS_LABELS.pending;
              return (
                <div
                  key={appt.id}
                  className="bg-white rounded-2xl shadow-sm p-4 flex flex-col gap-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-gray-700 text-sm">
                      {formatDate(appt.date)}
                    </span>
                    <span
                      className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${statusInfo.color}`}
                    >
                      {statusInfo.label}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm text-gray-500">
                    <span dir="ltr">{formatTime(appt.time)}</span>
                    {appt.color_name && (
                      <div className="flex items-center gap-2">
                        {appt.color_hex && (
                          <div
                            className="rounded-full border border-gray-200 flex-shrink-0"
                            style={{ width: 20, height: 20, backgroundColor: appt.color_hex }}
                          />
                        )}
                        <span>{appt.color_name}</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Book new appointment */}
          <button
            onClick={() => navigate(-1)}
            className="w-full py-3 rounded-xl font-bold text-white mt-2 max-w-sm"
            style={{ background: 'linear-gradient(135deg, #f8a5c2, #c56cd6)' }}
          >
            הזמן תור חדש
          </button>
        </div>
      </div>
    </div>
  );
}
