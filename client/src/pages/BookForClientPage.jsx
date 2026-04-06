import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { api } from '../lib/api.js';
import ColorSwatch from '../components/ColorSwatch.jsx';
import NavBar from '../components/NavBar.jsx';

// Generate next 7 days, skip Saturdays
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
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

const STEPS = ['לקוח', 'תאריך', 'שעה', 'צבע', 'אישור'];

export default function BookForClientPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState(0);

  // Step 0: client
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const searchTimeout = useRef(null);

  // Step 1: date
  const [selectedDate, setSelectedDate] = useState(null);
  const dates = getAvailableDates();

  // Step 2: time
  const [slots, setSlots] = useState([]);
  const [selectedTime, setSelectedTime] = useState('');
  const [loadingSlots, setLoadingSlots] = useState(false);

  // Step 3: color
  const [colors, setColors] = useState([]);
  const [selectedColor, setSelectedColor] = useState(null);

  // Submit
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [confirmed, setConfirmed] = useState(null);

  // Load colors once
  useEffect(() => {
    if (!user) return;
    api.get('/api/colors').then((data) => {
      setColors((data || []).filter((c) => !c.out_of_stock));
    });
  }, [user]);

  // Load slots when date changes
  useEffect(() => {
    if (!selectedDate || !user) return;
    setSlots([]);
    setSelectedTime('');
    setLoadingSlots(true);
    api
      .get(`/api/appointments/slots?techId=${user.id}&date=${dateToISO(selectedDate)}`)
      .then((d) => setSlots(d.slots || []))
      .catch((e) => setError(e.message))
      .finally(() => setLoadingSlots(false));
  }, [selectedDate, user]);

  // Client search autocomplete
  const handleClientNameChange = (val) => {
    setClientName(val);
    clearTimeout(searchTimeout.current);
    if (val.trim().length < 1) {
      setSuggestions([]);
      return;
    }
    searchTimeout.current = setTimeout(async () => {
      setLoadingSuggestions(true);
      try {
        const data = await api.get(`/api/clients/search?q=${encodeURIComponent(val)}`);
        setSuggestions(data || []);
      } catch {
        setSuggestions([]);
      } finally {
        setLoadingSuggestions(false);
      }
    }, 300);
  };

  const selectSuggestion = (client) => {
    setClientName(client.name);
    setClientPhone(client.phone);
    setSuggestions([]);
  };

  const handleConfirm = async () => {
    if (!clientName.trim() || !clientPhone.trim()) {
      return setError('יש למלא שם ומספר טלפון');
    }
    setSubmitting(true);
    setError('');
    try {
      const result = await api.post('/api/appointments', {
        techId: user.id,
        clientName: clientName.trim(),
        clientPhone: clientPhone.trim(),
        colorId: selectedColor.id,
        date: dateToISO(selectedDate),
        time: selectedTime,
        bookedBy: 'tech',
      });
      setConfirmed(result.appointment);
      setStep(5);
    } catch (err) {
      setError(err.message || 'שגיאה בקביעת תור');
    } finally {
      setSubmitting(false);
    }
  };

  // Success
  if (step === 5 && confirmed) {
    return (
      <div dir="rtl" className="min-h-screen bg-card-gradient flex flex-col items-center justify-center px-6 text-center">
        <div className="text-6xl mb-4">💅</div>
        <h1 className="text-2xl font-extrabold text-purple-deeper mb-2">התור נקבע!</h1>
        <p className="text-gray-600 mb-6">הלקוחה תקבל הודעת SMS לאישור</p>
        <div className="card w-full max-w-sm text-right mb-4">
          <div className="flex flex-col gap-2">
            <Row label="שם" value={clientName} />
            <Row label="טלפון" value={clientPhone} />
            <Row label="תאריך" value={formatDateHebrew(selectedDate)} />
            <Row label="שעה" value={selectedTime} />
            {selectedColor && (
              <div className="flex items-center justify-between py-1 border-b border-gray-100">
                <span className="font-semibold text-gray-500 text-sm">צבע</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-800">{selectedColor.name}</span>
                  <ColorSwatch hex={selectedColor.hex} size="w-5 h-5" />
                </div>
              </div>
            )}
          </div>
        </div>
        <button onClick={() => navigate('/dashboard')} className="btn-primary max-w-xs">
          חזרה לדשבורד
        </button>
      </div>
    );
  }

  return (
    <div dir="rtl" className="min-h-screen bg-gray-50 flex flex-col">
      <NavBar />

      <div className="max-w-lg mx-auto w-full px-4 py-5 flex flex-col gap-4">
        <div className="flex items-center gap-3 mb-2">
          <h1 className="text-xl md:text-2xl font-bold text-purple-900">קביעת תור ללקוחה 📅</h1>
        </div>

        {/* Step indicator */}
        <div className="flex justify-center gap-2">
          {STEPS.map((label, i) => (
            <div key={i} className="flex flex-col items-center gap-1">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                  i < step
                    ? 'bg-purple-dark text-white'
                    : i === step
                    ? 'bg-tech-gradient text-white shadow-md'
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

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 rounded-xl px-4 py-3 text-sm">
            {error}
          </div>
        )}

        {/* Step 0: Client */}
        {step === 0 && (
          <div className="fade-in flex flex-col gap-4">
            <h2 className="text-lg font-bold text-purple-deeper">פרטי לקוחה</h2>

            <div className="relative">
              <label className="block text-sm font-semibold text-gray-600 mb-1">שם הלקוחה</label>
              <input
                type="text"
                value={clientName}
                onChange={(e) => handleClientNameChange(e.target.value)}
                className="input-field"
                placeholder="חיפוש לפי שם..."
                autoComplete="off"
              />
              {loadingSuggestions && (
                <div className="absolute left-3 top-10 text-gray-400 text-xs">מחפשת...</div>
              )}
              {suggestions.length > 0 && (
                <div className="absolute z-10 w-full bg-white border-2 border-purple-light rounded-xl mt-1 shadow-lg overflow-hidden">
                  {suggestions.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => selectSuggestion(s)}
                      className="w-full text-right px-4 py-2.5 hover:bg-purple-light/30 flex justify-between items-center"
                    >
                      <span className="font-semibold text-gray-800">{s.name}</span>
                      <span className="text-gray-400 text-sm" dir="ltr">{s.phone}</span>
                    </button>
                  ))}
                </div>
              )}
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

            <button
              onClick={() => {
                if (!clientName.trim() || !clientPhone.trim()) {
                  setError('יש למלא שם ומספר טלפון');
                  return;
                }
                setError('');
                setStep(1);
              }}
              className="btn-primary"
            >
              המשך
            </button>
          </div>
        )}

        {/* Step 1: Date */}
        {step === 1 && (
          <div className="fade-in flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <button onClick={() => setStep(0)} className="text-purple-dark text-sm">&#8592; חזרה</button>
              <h2 className="text-lg font-bold text-purple-deeper">בחרי תאריך</h2>
            </div>
            {dates.map((d) => (
              <button
                key={d.toISOString()}
                onClick={() => {
                  setSelectedDate(d);
                  setStep(2);
                }}
                className="card text-right flex items-center justify-between active:scale-95 transition-transform"
              >
                <span className="font-semibold text-gray-800">{formatDateHebrew(d)}</span>
                <span className="text-gray-400 text-sm" dir="ltr">{dateToISO(d)}</span>
              </button>
            ))}
          </div>
        )}

        {/* Step 2: Time */}
        {step === 2 && (
          <div className="fade-in flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <button onClick={() => setStep(1)} className="text-purple-dark text-sm">&#8592; חזרה</button>
              <h2 className="text-lg font-bold text-purple-deeper">בחרי שעה</h2>
            </div>
            <p className="text-sm text-gray-500">{selectedDate && formatDateHebrew(selectedDate)}</p>
            {loadingSlots && <p className="text-center text-gray-400">טוענת שעות...</p>}
            {!loadingSlots && slots.length === 0 && (
              <div className="text-center py-6 text-gray-500">אין שעות פנויות</div>
            )}
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
              {slots.map((slot) => (
                <button
                  key={slot}
                  onClick={() => {
                    setSelectedTime(slot);
                    setStep(3);
                  }}
                  className="bg-white border-2 border-purple-light rounded-xl py-3 font-semibold text-purple-dark active:scale-95 transition-transform hover:border-purple-DEFAULT"
                  dir="ltr"
                >
                  {slot}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 3: Color */}
        {step === 3 && (
          <div className="fade-in flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <button onClick={() => setStep(2)} className="text-purple-dark text-sm">&#8592; חזרה</button>
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
                    setStep(4);
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

        {/* Step 4: Confirm */}
        {step === 4 && (
          <div className="fade-in flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <button onClick={() => setStep(3)} className="text-purple-dark text-sm">&#8592; חזרה</button>
              <h2 className="text-lg font-bold text-purple-deeper">אישור תור</h2>
            </div>

            <div className="card flex flex-col gap-2">
              <Row label="לקוחה" value={clientName} />
              <Row label="טלפון" value={clientPhone} />
              <Row label="תאריך" value={selectedDate ? formatDateHebrew(selectedDate) : ''} />
              <Row label="שעה" value={selectedTime} />
              {selectedColor && (
                <div className="flex items-center justify-between py-1 border-b border-gray-100">
                  <span className="font-semibold text-gray-500 text-sm">צבע</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-800">{selectedColor.name}</span>
                    <ColorSwatch hex={selectedColor.hex} size="w-5 h-5" />
                  </div>
                </div>
              )}
            </div>

            <p className="text-xs text-gray-400 text-center">
              לאחר האישור תישלח הודעת SMS ללקוחה
            </p>

            <button
              onClick={handleConfirm}
              className="btn-primary"
              disabled={submitting}
            >
              {submitting ? 'קובעת...' : 'קביעת תור'}
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
