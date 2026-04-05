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

export default function AvailabilityPage() {
  const [schedule, setSchedule] = useState(DEFAULT_SCHEDULE);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/api/availability')
      .then(setSchedule)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const update = (dayIndex, field, value) => {
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
      <div className="max-w-2xl mx-auto w-full px-4 py-6 flex flex-col gap-5">
        <div>
          <h1 className="text-2xl font-extrabold text-purple-900">זמינות ושעות עבודה</h1>
          <p className="text-sm text-gray-500 mt-1">הגדירי את הימים והשעות שבהן את זמינה לקבל לקוחות</p>
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
                    onClick={() => update(day.day_of_week, 'is_open', !day.is_open)}
                    className={`relative w-11 h-6 rounded-full transition-colors cursor-pointer ${
                      day.is_open ? 'bg-purple-500' : 'bg-gray-300'
                    }`}
                  >
                    <div
                      className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${
                        day.is_open ? 'right-1' : 'left-1'
                      }`}
                    />
                  </div>
                </label>
              </div>

              {day.is_open && (
                <div className="flex items-center gap-4" dir="ltr">
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-gray-500 font-semibold" dir="rtl">משעה</label>
                    <input
                      type="time"
                      value={day.start_time}
                      onChange={(e) => update(day.day_of_week, 'start_time', e.target.value)}
                      className="border-2 border-purple-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-purple-400"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-gray-500 font-semibold" dir="rtl">עד שעה</label>
                    <input
                      type="time"
                      value={day.end_time}
                      onChange={(e) => update(day.day_of_week, 'end_time', e.target.value)}
                      className="border-2 border-purple-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-purple-400"
                    />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full py-3 rounded-xl font-bold text-white disabled:opacity-60 transition-opacity"
          style={{ background: 'linear-gradient(135deg, #f8a5c2, #c56cd6)' }}
        >
          {saving ? 'שומרת...' : saved ? '✓ נשמר' : 'שמירת שינויים'}
        </button>
      </div>
    </div>
  );
}
