import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

const SIDEBAR_BG = '#1a0533';
const TABS = [
  { key: 'overview', label: 'סקירה כללית' },
  { key: 'techs', label: 'מטפלות' },
  { key: 'earnings', label: 'הכנסות' },
  { key: 'activity', label: 'פעילות אחרונה' },
];

function adminFetch(path, options = {}) {
  const token = localStorage.getItem('naily_admin_token');
  return fetch(path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  }).then(async (res) => {
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
    return data;
  });
}

function StatusBadge({ status }) {
  const colors = {
    trial: 'bg-yellow-100 text-yellow-800',
    active: 'bg-green-100 text-green-800',
    inactive: 'bg-red-100 text-red-700',
    cancelled: 'bg-gray-100 text-gray-600',
  };
  const labels = {
    trial: 'ניסיון',
    active: 'פעיל',
    inactive: 'לא פעיל',
    cancelled: 'בוטל',
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${colors[status] || 'bg-gray-100 text-gray-500'}`}>
      {labels[status] || status}
    </span>
  );
}

function StatCard({ label, value, sub, color }) {
  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 flex flex-col gap-1">
      <p className="text-sm text-gray-500 font-medium">{label}</p>
      <p className="text-3xl font-extrabold" style={{ color: color || '#1a0533' }}>{value}</p>
      {sub && <p className="text-xs text-gray-400">{sub}</p>}
    </div>
  );
}

// ── Overview Tab ──────────────────────────────────────────────────────────────
function OverviewTab() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    adminFetch('/api/admin/stats')
      .then(setStats)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-gray-400 py-10 text-center">טוענת...</div>;
  if (error) return <div className="text-red-500 py-10 text-center">{error}</div>;
  if (!stats) return null;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard label="סה״כ מטפלות" value={stats.total_techs} color="#7b2ff7" />
      <StatCard label="מנויים פעילים" value={stats.active_subscriptions} color="#16a34a" />
      <StatCard label="בניסיון" value={stats.trial_users} color="#ca8a04" />
      <StatCard label="ניסיון פג תוקף" value={stats.expired_trials} color="#dc2626" />
      <StatCard label="לא פעילים / בוטל" value={stats.inactive_users} color="#6b7280" />
      <StatCard label="סה״כ לקוחות" value={stats.total_clients} color="#0ea5e9" />
      <StatCard label="סה״כ תורים" value={stats.total_appointments} color="#8b5cf6" />
      <StatCard
        label="הכנסה חודשית משוערת"
        value={`₪${stats.monthly_revenue?.toFixed(0) ?? 0}`}
        color="#059669"
        sub="MRR"
      />
      <StatCard label="מטפלות חדשות (30 יום)" value={stats.new_techs_this_month} color="#f59e0b" />
    </div>
  );
}

// ── Techs Tab ─────────────────────────────────────────────────────────────────
function TechsTab() {
  const [techs, setTechs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  const loadTechs = useCallback(() => {
    setLoading(true);
    adminFetch('/api/admin/techs')
      .then(setTechs)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { loadTechs(); }, [loadTechs]);

  const startEdit = (tech) => {
    setEditingId(tech.id);
    setSaveError('');
    setEditForm({
      subscription_status: tech.subscription_status || 'trial',
      subscription_plan: tech.subscription_plan || '',
      trial_ends_at: tech.trial_ends_at ? tech.trial_ends_at.slice(0, 10) : '',
      subscription_ends_at: tech.subscription_ends_at ? tech.subscription_ends_at.slice(0, 10) : '',
    });
  };

  const handleSave = async (id) => {
    setSaving(true);
    setSaveError('');
    const body = { ...editForm };
    if (!body.subscription_plan) delete body.subscription_plan;
    if (!body.trial_ends_at) delete body.trial_ends_at;
    if (!body.subscription_ends_at) delete body.subscription_ends_at;
    try {
      await adminFetch(`/api/admin/techs/${id}/subscription`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      });
      setEditingId(null);
      loadTechs();
    } catch (e) {
      setSaveError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleActivateFree = async (id) => {
    const ends = new Date();
    ends.setDate(ends.getDate() + 30);
    try {
      await adminFetch(`/api/admin/techs/${id}/subscription`, {
        method: 'PATCH',
        body: JSON.stringify({
          subscription_status: 'active',
          subscription_ends_at: ends.toISOString().slice(0, 10),
        }),
      });
      loadTechs();
    } catch (e) {
      alert(e.message);
    }
  };

  if (loading) return <div className="text-gray-400 py-10 text-center">טוענת...</div>;
  if (error) return <div className="text-red-500 py-10 text-center">{error}</div>;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm bg-white rounded-2xl shadow-sm overflow-hidden">
        <thead>
          <tr className="text-xs text-gray-500 border-b border-gray-100 bg-gray-50">
            <th className="py-3 px-4 text-right font-semibold">שם</th>
            <th className="py-3 px-4 text-right font-semibold">אימייל</th>
            <th className="py-3 px-4 text-right font-semibold">שם משתמש</th>
            <th className="py-3 px-4 text-right font-semibold">סטטוס</th>
            <th className="py-3 px-4 text-right font-semibold">תוכנית</th>
            <th className="py-3 px-4 text-right font-semibold">תאריך סיום</th>
            <th className="py-3 px-4 text-right font-semibold">תורים</th>
            <th className="py-3 px-4 text-right font-semibold">לקוחות</th>
            <th className="py-3 px-4 text-right font-semibold">פעולות</th>
          </tr>
        </thead>
        <tbody>
          {techs.map((tech) => (
            <React.Fragment key={tech.id}>
              <tr className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                <td className="py-3 px-4 font-semibold text-gray-800">{tech.name}</td>
                <td className="py-3 px-4 text-gray-500 text-xs" dir="ltr">{tech.email}</td>
                <td className="py-3 px-4 text-gray-400 text-xs font-mono">{tech.username || '—'}</td>
                <td className="py-3 px-4"><StatusBadge status={tech.subscription_status} /></td>
                <td className="py-3 px-4 text-gray-500">
                  {tech.subscription_plan === 'monthly' ? 'חודשי' : tech.subscription_plan === 'yearly' ? 'שנתי' : '—'}
                </td>
                <td className="py-3 px-4 text-gray-400 text-xs" dir="ltr">
                  {tech.subscription_ends_at
                    ? new Date(tech.subscription_ends_at).toLocaleDateString('he-IL')
                    : tech.trial_ends_at
                    ? `ניסיון עד ${new Date(tech.trial_ends_at).toLocaleDateString('he-IL')}`
                    : '—'}
                </td>
                <td className="py-3 px-4 text-center font-bold text-purple-700">{tech.appointment_count}</td>
                <td className="py-3 px-4 text-center font-bold text-blue-600">{tech.client_count}</td>
                <td className="py-3 px-4">
                  <div className="flex gap-2 flex-wrap">
                    <button
                      onClick={() => editingId === tech.id ? setEditingId(null) : startEdit(tech)}
                      className="text-xs px-3 py-1.5 rounded-lg font-semibold border border-purple-200 text-purple-700 hover:bg-purple-50"
                    >
                      שנה מנוי
                    </button>
                    <button
                      onClick={() => handleActivateFree(tech.id)}
                      className="text-xs px-3 py-1.5 rounded-lg font-semibold bg-green-50 text-green-700 border border-green-200 hover:bg-green-100"
                    >
                      הפעל חינם
                    </button>
                  </div>
                </td>
              </tr>
              {editingId === tech.id && (
                <tr className="bg-purple-50 border-b border-purple-100">
                  <td colSpan={9} className="px-4 py-4">
                    <div className="flex flex-wrap gap-4 items-end">
                      <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1">סטטוס מנוי</label>
                        <select
                          value={editForm.subscription_status}
                          onChange={(e) => setEditForm((p) => ({ ...p, subscription_status: e.target.value }))}
                          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none"
                        >
                          <option value="trial">ניסיון</option>
                          <option value="active">פעיל</option>
                          <option value="inactive">לא פעיל</option>
                          <option value="cancelled">בוטל</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1">תוכנית</label>
                        <select
                          value={editForm.subscription_plan}
                          onChange={(e) => setEditForm((p) => ({ ...p, subscription_plan: e.target.value }))}
                          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none"
                        >
                          <option value="">ללא</option>
                          <option value="monthly">חודשי</option>
                          <option value="yearly">שנתי</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1">ניסיון עד</label>
                        <input
                          type="date"
                          value={editForm.trial_ends_at}
                          onChange={(e) => setEditForm((p) => ({ ...p, trial_ends_at: e.target.value }))}
                          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1">מנוי עד</label>
                        <input
                          type="date"
                          value={editForm.subscription_ends_at}
                          onChange={(e) => setEditForm((p) => ({ ...p, subscription_ends_at: e.target.value }))}
                          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none"
                        />
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleSave(tech.id)}
                          disabled={saving}
                          className="px-4 py-2 rounded-lg text-sm font-bold text-white"
                          style={{ background: 'linear-gradient(135deg, #c56cd6, #7b2ff7)' }}
                        >
                          {saving ? 'שומר...' : 'שמור'}
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="px-4 py-2 rounded-lg text-sm font-semibold text-gray-600 border border-gray-200"
                        >
                          ביטול
                        </button>
                      </div>
                    </div>
                    {saveError && (
                      <p className="text-red-500 text-xs mt-2">{saveError}</p>
                    )}
                  </td>
                </tr>
              )}
            </React.Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Earnings Tab ──────────────────────────────────────────────────────────────
function EarningsTab() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    adminFetch('/api/admin/earnings')
      .then(setRows)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-gray-400 py-10 text-center">טוענת...</div>;
  if (error) return <div className="text-red-500 py-10 text-center">{error}</div>;

  // Calculate MRR
  const mrr = rows.reduce((acc, r) => {
    const count = parseInt(r.count, 10);
    if (r.subscription_plan === 'monthly') return acc + count * 49;
    if (r.subscription_plan === 'yearly') return acc + (count * 399) / 12;
    return acc;
  }, 0);

  return (
    <div className="flex flex-col gap-4">
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 inline-flex flex-col gap-1 self-start">
        <p className="text-sm text-gray-500 font-medium">MRR משוער</p>
        <p className="text-3xl font-extrabold text-green-600">₪{mrr.toFixed(0)}</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm bg-white rounded-2xl shadow-sm overflow-hidden">
          <thead>
            <tr className="text-xs text-gray-500 border-b border-gray-100 bg-gray-50">
              <th className="py-3 px-4 text-right font-semibold">חודש</th>
              <th className="py-3 px-4 text-right font-semibold">תוכנית</th>
              <th className="py-3 px-4 text-right font-semibold">כמות מנויים</th>
              <th className="py-3 px-4 text-right font-semibold">הכנסה</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={4} className="py-10 text-center text-gray-400">אין נתונים</td>
              </tr>
            ) : rows.map((r, i) => {
              const count = parseInt(r.count, 10);
              const revenue = r.subscription_plan === 'monthly'
                ? count * 49
                : r.subscription_plan === 'yearly'
                ? count * 399
                : 0;
              return (
                <tr key={i} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="py-3 px-4 text-gray-700" dir="ltr">
                    {new Date(r.month).toLocaleDateString('he-IL', { year: 'numeric', month: 'long' })}
                  </td>
                  <td className="py-3 px-4 text-gray-500">
                    {r.subscription_plan === 'monthly' ? 'חודשי' : r.subscription_plan === 'yearly' ? 'שנתי' : '—'}
                  </td>
                  <td className="py-3 px-4 font-bold text-purple-700">{count}</td>
                  <td className="py-3 px-4 font-bold text-green-600">₪{revenue}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Activity Tab ──────────────────────────────────────────────────────────────
function ActivityTab() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    adminFetch('/api/admin/activity')
      .then(setRows)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-gray-400 py-10 text-center">טוענת...</div>;
  if (error) return <div className="text-red-500 py-10 text-center">{error}</div>;

  const statusLabel = { pending: 'ממתין', arrived: 'הגיעה', done: 'בוצע' };
  const statusColor = { pending: 'text-yellow-600', arrived: 'text-blue-600', done: 'text-green-600' };

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm bg-white rounded-2xl shadow-sm overflow-hidden">
        <thead>
          <tr className="text-xs text-gray-500 border-b border-gray-100 bg-gray-50">
            <th className="py-3 px-4 text-right font-semibold">מטפלת</th>
            <th className="py-3 px-4 text-right font-semibold">לקוחה</th>
            <th className="py-3 px-4 text-right font-semibold">צבע</th>
            <th className="py-3 px-4 text-right font-semibold">תאריך</th>
            <th className="py-3 px-4 text-right font-semibold">שעה</th>
            <th className="py-3 px-4 text-right font-semibold">סטטוס</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={6} className="py-10 text-center text-gray-400">אין פעילות</td>
            </tr>
          ) : rows.map((r) => (
            <tr key={r.id} className="border-b border-gray-50 hover:bg-gray-50">
              <td className="py-3 px-4 font-semibold text-gray-800">{r.tech_name || '—'}</td>
              <td className="py-3 px-4 text-gray-600">{r.client_name || '—'}</td>
              <td className="py-3 px-4">
                <div className="flex items-center gap-2">
                  {r.color_hex && (
                    <div
                      className="w-5 h-5 rounded-full border border-gray-200 flex-shrink-0"
                      style={{ backgroundColor: r.color_hex }}
                    />
                  )}
                  <span className="text-gray-500 text-xs">{r.color_name || '—'}</span>
                </div>
              </td>
              <td className="py-3 px-4 text-gray-500 text-xs" dir="ltr">
                {new Date(r.date).toLocaleDateString('he-IL')}
              </td>
              <td className="py-3 px-4 text-gray-500 text-xs" dir="ltr">
                {String(r.time).slice(0, 5)}
              </td>
              <td className="py-3 px-4">
                <span className={`font-semibold text-xs ${statusColor[r.status] || 'text-gray-500'}`}>
                  {statusLabel[r.status] || r.status}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Main Dashboard ────────────────────────────────────────────────────────────
export default function AdminDashboardPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');

  const adminUser = (() => {
    try {
      return JSON.parse(localStorage.getItem('naily_admin_user') || '{}');
    } catch {
      return {};
    }
  })();

  const handleLogout = () => {
    localStorage.removeItem('naily_admin_token');
    localStorage.removeItem('naily_admin_user');
    navigate('/admin/login');
  };

  const tabContent = {
    overview: <OverviewTab />,
    techs: <TechsTab />,
    earnings: <EarningsTab />,
    activity: <ActivityTab />,
  };

  return (
    <div dir="rtl" className="min-h-screen flex" style={{ background: '#f3f0f8' }}>
      {/* Sidebar */}
      <aside
        className="w-56 flex-shrink-0 flex flex-col py-6"
        style={{ background: SIDEBAR_BG, minHeight: '100vh' }}
      >
        {/* Logo */}
        <div className="px-6 mb-8">
          <div className="flex items-center gap-2">
            <span className="text-2xl">💅</span>
            <div>
              <p className="text-white font-extrabold text-lg leading-none">Naily</p>
              <p className="text-purple-300 text-xs">Admin</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 flex flex-col gap-1 px-3">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className="w-full text-right px-4 py-2.5 rounded-xl text-sm font-semibold transition-all"
              style={{
                background: activeTab === tab.key ? 'rgba(255,255,255,0.15)' : 'transparent',
                color: activeTab === tab.key ? 'white' : 'rgba(255,255,255,0.6)',
              }}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        {/* User + logout */}
        <div className="px-4 mt-4 border-t border-white/10 pt-4">
          <p className="text-purple-300 text-xs mb-1">{adminUser.email}</p>
          <button
            onClick={handleLogout}
            className="text-xs text-white/50 hover:text-white/80 underline"
          >
            יציאה
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 p-6 overflow-auto">
        <div className="max-w-5xl mx-auto">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-2xl font-extrabold" style={{ color: '#1a0533' }}>
              {TABS.find((t) => t.key === activeTab)?.label}
            </h1>
          </div>
          {tabContent[activeTab]}
        </div>
      </main>
    </div>
  );
}
