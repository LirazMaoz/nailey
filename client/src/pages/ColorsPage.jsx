import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api.js';
import ColorSwatch from '../components/ColorSwatch.jsx';
import ColorScanner from '../components/ColorScanner.jsx';
import NavBar from '../components/NavBar.jsx';

function AddColorForm({ onAdded }) {
  const [form, setForm] = useState({ name: '', number: '', hex: '#f8a5c2' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) =>
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.number || !form.hex) {
      return setError('יש למלא את כל השדות');
    }
    setLoading(true);
    setError('');
    try {
      const newColor = await api.post('/api/colors', form);
      onAdded(newColor);
      setForm({ name: '', number: '', hex: '#f8a5c2' });
    } catch (err) {
      setError(err.message || 'שגיאה בהוספה');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="card flex flex-col gap-3 border-2 border-dashed border-purple-light">
      <h3 className="font-bold text-purple-deeper">+ הוספת צבע חדש</h3>
      {error && (
        <p className="text-red-500 text-sm">{error}</p>
      )}
      <div className="flex gap-2">
        <input
          name="name"
          value={form.name}
          onChange={handleChange}
          placeholder="שם הצבע"
          className="input-field text-sm py-2 flex-1"
        />
        <input
          name="number"
          value={form.number}
          onChange={handleChange}
          placeholder="מספר"
          className="input-field text-sm py-2 w-28"
          dir="ltr"
        />
      </div>
      <div className="flex items-center gap-3">
        <label className="text-sm text-gray-600 font-medium whitespace-nowrap">בחירת צבע:</label>
        <input
          type="color"
          name="hex"
          value={form.hex}
          onChange={handleChange}
          className="w-12 h-10 rounded-lg border border-gray-300 cursor-pointer p-0"
        />
        <span className="text-sm font-mono text-gray-600" dir="ltr">{form.hex}</span>
      </div>
      <button type="submit" className="btn-primary text-sm py-2" disabled={loading}>
        {loading ? 'מוסיפה...' : 'הוספה'}
      </button>
    </form>
  );
}

function ColorCard({ color, onToggle, onDelete }) {
  const [deleting, setDeleting] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [toggling, setToggling] = useState(false);

  const handleToggle = async () => {
    setToggling(true);
    try {
      await onToggle(color.id, !color.out_of_stock);
    } finally {
      setToggling(false);
    }
  };

  const handleDelete = async () => {
    if (!confirming) {
      setConfirming(true);
      return;
    }
    setDeleting(true);
    try {
      await onDelete(color.id);
    } finally {
      setDeleting(false);
      setConfirming(false);
    }
  };

  return (
    <div
      className={`card flex items-center gap-3 transition-opacity ${
        color.out_of_stock ? 'opacity-60' : ''
      }`}
    >
      <ColorSwatch hex={color.hex} size="w-10 h-10" />
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-gray-800 truncate">{color.name}</p>
        <p className="text-xs text-gray-400 font-mono" dir="ltr">{color.number}</p>
        {color.out_of_stock && (
          <span className="text-xs text-red-500 font-semibold">אזל מהמלאי</span>
        )}
      </div>
      <div className="flex flex-col items-end gap-1">
        <button
          onClick={handleToggle}
          disabled={toggling}
          className={`text-xs font-semibold px-2 py-1 rounded-full transition-colors ${
            color.out_of_stock
              ? 'bg-green-100 text-green-700'
              : 'bg-red-100 text-red-600'
          }`}
        >
          {toggling ? '...' : color.out_of_stock ? 'יש במלאי' : 'אזל'}
        </button>
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="text-xs text-red-400 underline"
        >
          {deleting ? 'מוחק...' : confirming ? 'בטוחה?' : 'מחיקה'}
        </button>
        {confirming && (
          <button
            onClick={() => setConfirming(false)}
            className="text-xs text-gray-400 underline"
          >
            ביטול
          </button>
        )}
      </div>
    </div>
  );
}

export default function ColorsPage() {
  const navigate = useNavigate();
  const [colors, setColors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showScanner, setShowScanner] = useState(false);

  useEffect(() => {
    api.get('/api/colors')
      .then(setColors)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const handleAdded = (color) => setColors((p) => [...p, color]);

  const handleToggle = async (id, outOfStock) => {
    const updated = await api.patch(`/api/colors/${id}`, { out_of_stock: outOfStock });
    setColors((p) => p.map((c) => (c.id === id ? updated : c)));
  };

  const handleDelete = async (id) => {
    await api.delete(`/api/colors/${id}`);
    setColors((p) => p.filter((c) => c.id !== id));
  };

  const handleScannerSave = async ({ name, number, hex }) => {
    const newColor = await api.post('/api/colors', { name, number, hex });
    setColors((p) => [...p, newColor]);
  };

  const inStock = colors.filter((c) => !c.out_of_stock);
  const outOfStock = colors.filter((c) => c.out_of_stock);

  return (
    <div dir="rtl" className="min-h-screen bg-gray-50 flex flex-col">
      <NavBar />

      <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-purple-900">ניהול צבעים 🎨</h1>
            <p className="text-gray-500 text-sm mt-0.5">{colors.length} צבעים בסך הכל</p>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 rounded-xl px-4 py-3 text-sm mb-4">
            {error}
          </div>
        )}

        {/* Desktop: two column layout; mobile: stacked */}
        <div className="lg:flex lg:gap-6">
          {/* Sidebar: scanner + add form */}
          <div className="lg:w-80 flex flex-col gap-4 mb-6 lg:mb-0">
            {/* Scanner toggle */}
            <button
              onClick={() => setShowScanner((p) => !p)}
              className="btn-outline text-sm py-2 flex items-center justify-center gap-2"
            >
              📷 {showScanner ? 'סגירת סורק' : 'פתיחת סורק צבעים'}
            </button>

            {showScanner && (
              <div className="card border-2 border-purple-light fade-in">
                <ColorScanner onSave={handleScannerSave} />
              </div>
            )}

            {/* Add form */}
            <AddColorForm onAdded={handleAdded} />
          </div>

          {/* Main: color lists */}
          <div className="flex-1 flex flex-col gap-4">
            {loading && (
              <div className="text-center text-gray-400 py-6">טוענת...</div>
            )}

            {/* In stock */}
            {inStock.length > 0 && (
              <div>
                <h3 className="text-sm font-bold text-gray-600 mb-2 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-green-400 inline-block" />
                  במלאי ({inStock.length})
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2">
                  {inStock.map((c) => (
                    <ColorCard
                      key={c.id}
                      color={c}
                      onToggle={handleToggle}
                      onDelete={handleDelete}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Out of stock */}
            {outOfStock.length > 0 && (
              <div>
                <h3 className="text-sm font-bold text-gray-600 mb-2 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-red-400 inline-block" />
                  אזל מהמלאי ({outOfStock.length})
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2">
                  {outOfStock.map((c) => (
                    <ColorCard
                      key={c.id}
                      color={c}
                      onToggle={handleToggle}
                      onDelete={handleDelete}
                    />
                  ))}
                </div>
              </div>
            )}

            {!loading && colors.length === 0 && (
              <div className="text-center py-8 text-gray-400">
                אין צבעים עדיין — הוסיפי את הראשון!
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
