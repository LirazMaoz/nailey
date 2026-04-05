import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../lib/api.js';
import ColorSwatch from '../components/ColorSwatch.jsx';

// Generate next 7 days, skip Saturdays (6)
function getAvailableDates() {
  const dates = [];
  const d = new Date();
  while (dates.length < 7) {
    if (d.getDay() !== 6) {
      dates.push(new Date(d));
    }
    d.setDate(d.getDate() + 1);
  }
  return dates;
}

function formatDateHebrew(date) {
  return date.toLocaleDateString('he-IL', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
}

function dateToISO(date) {
  return date.toISOString().split('T')[0];
}

const STEPS = ['תאריך', 'שעה', 'צבע', 'פרטים', 'אישור'];

export default function BookingPage() {
  const { techId } = useParams();
  const navigate = useNavigate();
  const [techInfo, setTechInfo] = useState(null);

  // Load tech info (name) to show in header
  useEffect(() => {
    api.get(`/api/tech/${techId}`)
      .then(setTechInfo)
      .catch(() => setTechInfo(null));
  }, [techId]);

  // Resolve numeric techId for slots API (slots API expects numeric id)
  const resolvedTechId = techInfo?.id || techId;

  // Client auth state
  const [clientUser, setClientUser] = useState(() => {
    try {
      const stored = localStorage.getItem('naily_client_user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });
  const [clientToken] = useState(() => localStorage.getItem('naily_client_token') || null);
  // null = not decided yet, true = proceed, false = go to login
  const [authDecision, setAuthDecision] = useState(clientUser ? true : null);

  const [step, setStep] = useState(0);
  const [selectedDate, setSelectedDate] = useState(null);
  const [slots, setSlots] = useState([]);
  const [selectedTime, setSelectedTime] = useState('');
  const [colors, setColors] = useState([]);
  const [selectedColor, setSelectedColor] = useState(null);
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [confirmed, setConfirmed] = useState(null);

  const dates = getAvailableDates();

  // Load slots when date selected
  useEffect(() => {
    if (!selectedDate) return;
    setSlots([]);
    setSelectedTime('');
    setLoading(true);
    api
      .get(`/api/appointments/slots?techId=${resolvedTechId}&date=${dateToISO(selectedDate)}`)
      .then((d) => setSlots(d.slots || []))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [selectedDate, resolvedTechId]);

  // Load colors once
  useEffect(() => {
    api
      .get(`/api/colors/public/${techId}`)
      .catch(() => [])
      .then((data) => setColors(Array.isArray(data) ? data : []));
  }, [techId]);

  const handleClientLogout = () => {
    localStorage.removeItem('naily_client_token');
    localStorage.removeItem('naily_client_user');
    setClientUser(null);
    setAuthDecision(null);
  };

  const handleConfirm = async () => {
    if (!clientUser && (!clientName.trim() || !clientPhone.trim())) {
      return setError('יש למלא שם ומספר טלפון');
    }
    setLoading(true);
    setError('');
    try {
      const body = {
        techId: resolvedTechId,
        clientName: clientUser ? clientUser.name : clientName.trim(),
        clientPhone: clientUser ? (clientUser.phone || clientPhone.trim()) : clientPhone.trim(),
        colorId: selectedColor.id,
        date: dateToISO(selectedDate),
        time: selectedTime,
        bookedBy: 'client',
      };
      if (clientToken && clientUser) {
        body.clientToken = clientToken;
      }
      const result = await api.post('/api/appointments', body);
      setConfirmed(result.appointment);
      setStep(4);
    } catch (err) {
      setError(err.message || 'שגיאה בקביעת תור');
    } finally {
      setLoading(false);
    }
  };

  // Auth decision screen
  if (authDecision === null) {
    return (
      <div dir="rtl" className="min-h-screen bg-card-gradient flex flex-col items-center justify-center px-4">
        <div className="w-full max-w-md flex flex-col gap-5 text-center">
          <div className="text-5xl">💅</div>
          <h1 className="text-2xl font-extrabold text-purple-deeper">קביעת תור</h1>
          <p className="text-gray-500 text-sm">רוצה לשמור את היסטוריית התורים שלך?</p>
          <div className="flex flex-col gap-3">
            <Link
              to={`/client/login?redirect=back`}
              className="w-full py-3 rounded-xl font-bold text-white text-center block"
              style={{ background: 'linear-gradient(135deg, #f8a5c2, #c56cd6)' }}
            >
              התחברי לחשבון
            </Link>
            <button
              onClick={() => setAuthDecision(true)}
              className="w-full py-3 rounded-xl font-semibold text-purple-700 border-2 border-purple-200 bg-white"
            >
              המשך ללא התחברות
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Success screen
  if (step === 4 && confirmed) {
    return (
      <div dir="rtl" className="min-h-screen bg-card-gradient flex flex-col items-center justify-center px-6 text-center">
        <div className="text-6xl mb-4">💅</div>
        <h1 className="text-2xl font-extrabold text-purple-deeper mb-2">התור נקבע!</h1>
        <p className="text-gray-600 mb-6">
          אישור נשלח לטלפון שלך
        </p>
        <div className="card w-full max-w-sm text-right">
          <div className="flex flex-col gap-2">
            <Row label="שם" value={clientUser?.name || clientName} />
            <Row label="תאריך" value={formatDateHebrew(selectedDate)} />
            <Row label="שעה" value={selectedTime} />
            {selectedColor && (
              <div className="flex items-center justify-between py-1 border-b border-gray-100">
                <span className="font-semibold text-gray-500 text-sm">צבע</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-800">{selectedColor.name}</span>
                  <ColorSwatch hex={selectedColor.hex} size="w-6 h-6" />
                </div>
              </div>
            )}
          </div>
        </div>
        {clientUser && (
          <Link
            to="/client/profile"
            className="mt-5 text-purple-600 font-semibold underline text-sm"
          >
            צפי בהיסטוריית התורים שלך
          </Link>
        )}
        <p className="text-xs text-gray-400 mt-4">ניתן לסגור את הדף</p>
      </div>
    );
  }

  return (
    <div dir="rtl" className="min-h-screen bg-card-gradient flex flex-col">
      {/* Header */}
      <div className="bg-client-gradient text-white text-center py-8 px-6 rounded-b-3xl">
        <div className="text-4xl mb-1">💅</div>
        <h1 className="text-2xl font-extrabold">קביעת תור</h1>
        <p className="text-white/80 text-sm mt-1">
          {techInfo?.name ? `הזמן תור אצל ${techInfo.name}` : 'Naily'}
        </p>
      </div>

      {/* Client welcome banner */}
      {clientUser && (
        <div className="mx-4 mt-4 bg-purple-50 border border-purple-200 rounded-2xl px-4 py-3 flex items-center justify-between text-sm">
          <span className="text-purple-700 font-semibold">ברוכה הבאה, {clientUser.name}! ממשיכים להזמנה</span>
          <button onClick={handleClientLogout} className="text-gray-400 text-xs underline">
            יציאה
          </button>
        </div>
      )}

      {/* Step indicator */}
      <div className="px-4 pt-5 flex justify-center gap-2">
        {STEPS.map((label, i) => (
          <div key={i} className="flex flex-col items-center gap-1">
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                i < step
                  ? 'bg-purple-dark text-white'
                  : i === step
                  ? 'bg-client-gradient text-white shadow-md'
                  : 'bg-gray-200 text-gray-400'
              }`}
            >
              {i < step ? '✓' : i + 1}
            </div>
            <span className={`text-xs ${i === step ? 'text-purple-dark font-semibold' : 'text-gray-400'}`}>
              {label}
            </span>
          </div>
        ))}
      </div>

      <div className="flex-1 px-4 py-5 max-w-lg mx-auto w-full flex flex-col gap-4">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 rounded-xl px-4 py-3 text-sm">
            {error}
          </div>
        )}

        {/* Step 0: Date */}
        {step === 0 && (
          <div className="fade-in flex flex-col gap-3">
            <h2 className="text-lg font-bold text-purple-deeper">בחרי תאריך</h2>
            {dates.map((d) => (
              <button
                key={d.toISOString()}
                onClick={() => {
                  setSelectedDate(d);
                  setStep(1);
                }}
                className="card text-right flex items-center justify-between active:scale-95 transition-transform"
              >
                <span className="font-semibold text-gray-800">{formatDateHebrew(d)}</span>
                <span className="text-gray-400 text-sm" dir="ltr">{dateToISO(d)}</span>
              </button>
            ))}
          </div>
        )}

        {/* Step 1: Time */}
        {step === 1 && (
          <div className="fade-in flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <button onClick={() => setStep(0)} className="text-purple-dark text-sm">&#8592; חזרה</button>
              <h2 className="text-lg font-bold text-purple-deeper">בחרי שעה</h2>
            </div>
            <p className="text-sm text-gray-500">{selectedDate && formatDateHebrew(selectedDate)}</p>
            {loading && <p className="text-center text-gray-400">טוענת שעות...</p>}
            {!loading && slots.length === 0 && (
              <div className="text-center py-6 text-gray-500">
                אין שעות פנויות בתאריך זה
              </div>
            )}
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
              {slots.map((slot) => (
                <button
                  key={slot}
                  onClick={() => {
                    setSelectedTime(slot);
                    setStep(2);
                  }}
                  className="bg-white border-2 border-purple-light rounded-xl py-3 text-center font-semibold text-purple-dark active:scale-95 transition-transform hover:border-purple-DEFAULT"
                  dir="ltr"
                >
                  {slot}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 2: Color */}
        {step === 2 && (
          <div className="fade-in flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <button onClick={() => setStep(1)} className="text-purple-dark text-sm">&#8592; חזרה</button>
              <h2 className="text-lg font-bold text-purple-deeper">בחרי צבע</h2>
            </div>
            {colors.length === 0 && (
              <p className="text-gray-400 text-sm text-center py-4">אין צבעים זמינים</p>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {colors.map((c) => (
                <button
                  key={c.id}
                  onClick={() => {
                    setSelectedColor(c);
                    setStep(3);
                  }}
                  className="card flex items-center gap-3 active:scale-95 transition-transform border-2 border-transparent hover:border-purple-light"
                >
                  <ColorSwatch hex={c.hex} size="w-10 h-10" />
                  <div className="text-right">
                    <p className="font-semibold text-gray-800">{c.name}</p>
                    <p className="text-xs text-gray-400 font-mono" dir="ltr">{c.number}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 3: Client details */}
        {step === 3 && (
          <div className="fade-in flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <button onClick={() => setStep(2)} className="text-purple-dark text-sm">&#8592; חזרה</button>
              <h2 className="text-lg font-bold text-purple-deeper">פרטים אישיים</h2>
            </div>

            {/* Summary */}
            <div className="card bg-purple-light/20 flex flex-col gap-1 text-sm">
              <p><span className="text-gray-500">תאריך:</span> {selectedDate && formatDateHebrew(selectedDate)}</p>
              <p><span className="text-gray-500">שעה:</span> <span dir="ltr">{selectedTime}</span></p>
              {selectedColor && (
                <div className="flex items-center gap-2">
                  <span className="text-gray-500">צבע:</span>
                  <ColorSwatch hex={selectedColor.hex} size="w-4 h-4" />
                  <span>{selectedColor.name}</span>
                </div>
              )}
            </div>

            {clientUser ? (
              <div className="bg-purple-50 border border-purple-200 rounded-xl px-4 py-3 text-sm text-purple-700">
                <p className="font-semibold">{clientUser.name}</p>
                <p className="text-purple-500 text-xs">{clientUser.phone}</p>
              </div>
            ) : (
              <>
                <div>
                  <label className="block text-sm font-semibold text-gray-600 mb-1">שם מלא</label>
                  <input
                    type="text"
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    className="input-field"
                    placeholder="שם שלך"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-600 mb-1">מספר טלפון</label>
                  <input
                    type="tel"
                    value={clientPhone}
                    onChange={(e) => setClientPhone(e.target.value)}
                    className="input-field"
                    placeholder="050-0000000"
                    dir="ltr"
                  />
                </div>
              </>
            )}

            <button
              onClick={handleConfirm}
              className="btn-pink"
              disabled={loading}
            >
              {loading ? 'קובעת...' : 'אישור קביעת תור'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex items-center justify-between py-1 border-b border-gray-100">
      <span className="font-semibold text-gray-500 text-sm">{label}</span>
      <span className="text-sm text-gray-800">{value}</span>
    </div>
  );
}
