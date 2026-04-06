import React, { useEffect, useState } from 'react';
import { api } from '../lib/api.js';
import NavBar from '../components/NavBar.jsx';

const DAY_NAMES = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];

const DEFAULT_SCHEDULE = DAY_NAMES.map((_, i) => ({
  day_of_week: i,
  is_open: i !== 6,
  start_time: '09:00',
  end_time: '18:00',
}));

function localISO(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export default function AvailabilityPage() {
  const [schedule, setSchedule] = useState(DEFAULT_SCHEDULE);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  // Date overrides
  const [overrides, setOverrides] = useState([]);
  const [newDate, setNewDate] = useState('');
  const [newNote, setNewNote] = useState('');
  const [savingOverride, setSavingOverride] = useState(false);

  useEffect(() => {
    Promise.all([
      api.get('/api/availability'),
      api.get('/api/availability/overrides'),
    ])
      .then(([sched, ovr]) => {
        setSchedule(sched);
        setOverrides(ovr);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const updateDay = (dayIndex, field, value) => {
    setSchedule((prev) =>
      prev.map((d) => (d.day_of_week === dayIndex ? { ...d, [field]: value } : d))
    );
    setSaved(false);
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      await api.put('/api/availability', schedule);
      setSaved(true);
    } catch (err) {
      setError(err.message || 'שגיאה בשמירה');
    } finally {
      setSaving(false);
    }
  };

  const handleAddOverride = async () => {
    if (!newDate) return;
    setSavingOverride(true);
    try {
      await api.put('/api/availability/overrides', { date: newDate, is_closed: true, note: newNote || null });
      const fresh = await api.get('/api/availability/overrides');
      setOverrides(fresh);
      setNewDate('');
      setNewNote('');
    } catch (err) {
      alert(err.message || 'שגיאה');
    } finally {
      setSavingOverride(false);
    }
  };

  const handleDeleteOverride = async (date) => {
    try {
      await api.delete(`/api/availability/overrides/${date}`);
      setOverrides((prev) => prev.filter((o) => o.date !== date));
    } catch (err) {
      alert(err.message || 'שגיאה');
    }
  };

  const formatDate = (dateStr) =>
    new Date(dateStr + 'T12:00:00').toLocaleDateString('he-IL', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    });

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <NavBar />
        <div className="flex-1 flex items-center justify-center text-purple-dark animate-pulse">טוענת...</div>
      </div>
    );
  }

  return (
    <div dir="rtl" className="min-h-screen bg-gray-50 flex flex-col">
      <NavBar />
      <div className="max-w-2xl mx-auto w-full px-4 py-6 flex flex-col gap-8">

        {/* Weekly schedule */}
        <section className="flex flex-col gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-purple-900">שעות עבודה קבועות</h1>
            <p className="text-sm text-gray-500 mt-1">הגדירי את הימים והשעות הרגילים שלך</p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 rounded-xl px-4 py-3 text-sm">{error}</div>
          )}

          <div className="flex flex-col gap-3">
            {schedule.map((day) => (
              <div
                key={day.day_of_week}
                className={`bg-white rounded-2xl shadow-sm border p-4 flex flex-col gap-3 transition-colors ${
                  day.is_open ? 'border-purple-100' : 'border-gray-100 opacity-60'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-gray-800">יום {DAY_NAMES[day.day_of_week]}</span>
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <span className="text-sm text-gray-500">{day.is_open ? 'פתוח' : 'סגור'}</span>
                    <div
                      onClick={() => updateDay(day.day_of_week, 'is_open', !day.is_open)}
                      className={`relative w-11 h-6 rounded-full transition-colors cursor-pointer ${
                        day.is_open ? 'bg-purple-500' : 'bg-gray-300'
                      }`}
                    >
                      <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${day.is_open ? 'right-1' : 'left-1'}`} />
                    </div>
                  </label>
                </div>
                {day.is_open && (
                  <div className="flex items-center gap-4" dir="ltr">
                    <div className="flex items-center gap-2">
                      <label className="text-xs text-gray-500 font-semibold" dir="rtl">משעה</label>
                      <input type="time" value={day.start_time}
                        onChange={(e) => updateDay(day.day_of_week, 'start_time', e.target.value)}
                        className="border-2 border-purple-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-purple-400" />
                    </div>
                    <div className="flex items-center gap-2">
                      <label className="text-xs text-gray-500 font-semibold" dir="rtl">עד שעה</label>
                      <input type="time" value={day.end_time}
                        onChange={(e) => updateDay(day.day_of_week, 'end_time', e.target.value)}
                        className="border-2 border-purple-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-purple-400" />
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          <button onClick={handleSave} disabled={saving}
            className="w-full py-3 rounded-xl font-bold text-white disabled:opacity-60 transition-opacity"
            style={{ background: 'linear-gradient(135deg, #f8a5c2, #c56cd6)' }}>
            {saving ? 'שומרת...' : saved ? '✓ נשמר' : 'שמירת שינויים'}
          </button>
        </section>

        {/* Date-specific overrides */}
        <section className="flex flex-col gap-4">
          <div>
            <h2 className="text-xl font-extrabold text-purple-900">ימים חריגים וחסימות</h2>
            <p className="text-sm text-gray-500 mt-1">חסמי תאריך ספציפי להזמנות והוסיפי הודעה ללקוחות</p>
          </div>

          {/* Add override */}
          <div className="bg-white rounded-2xl border border-purple-100 shadow-sm p-4 flex flex-col gap-3">
            <h3 className="font-semibold text-gray-700">חסימת תאריך חדש</h3>
            <div>
              <label className="block text-sm font-semibold text-gray-600 mb-1">תאריך</label>
              <input type="date" value={newDate} min={localISO()}
                onChange={(e) => setNewDate(e.target.value)}
                className="w-full border-2 border-purple-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-purple-400" dir="ltr" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-600 mb-1">הודעה ללקוחות (אופציונלי)</label>
              <input type="text" value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                placeholder='לדוגמה: "חופשה", "חג", "אין זמינות"'
                className="w-full border-2 border-purple-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-purple-400" />
            </div>
            <button onClick={handleAddOverride} disabled={savingOverride || !newDate}
              className="w-full py-2.5 rounded-xl font-bold text-white disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg, #f8a5c2, #c56cd6)' }}>
              {savingOverride ? 'שומרת...' : '🚫 חסימת תאריך'}
            </button>
          </div>

          {/* Existing overrides */}
          {overrides.length === 0 ? (
            <p className="text-center text-sm text-gray-400 py-4">אין חסימות תאריך</p>
          ) : (
            <div className="flex flex-col gap-2">
              {overrides.map((o) => (
                <div key={o.date} className="bg-white rounded-2xl border border-red-100 shadow-sm px-4 py-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-gray-800 text-sm">{formatDate(o.date)}</p>
                    {o.note && <p className="text-xs text-gray-500 mt-0.5">{o.note}</p>}
                  </div>
                  <button onClick={() => handleDeleteOverride(o.date)}
                    className="text-xs text-red-400 underline font-semibold flex-shrink-0">
                    הסרה
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

      </div>
    </div>
  );
}
