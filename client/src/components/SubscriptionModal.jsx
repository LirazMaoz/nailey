import React, { useState } from 'react';
import { api } from '../lib/api';

const PLANS = [
  {
    key: 'monthly',
    label: 'חודשי',
    price: '₪49',
    period: 'לחודש',
    badge: null,
    highlight: false,
  },
  {
    key: 'yearly',
    label: 'שנתי',
    price: '₪399',
    period: 'לשנה',
    badge: 'חסכי 32%',
    highlight: true,
  },
];

export default function SubscriptionModal({ status }) {
  const [loadingPlan, setLoadingPlan] = useState(null);
  const [error, setError] = useState('');

  const isExpiredTrial = status?.access === 'trial_expired';
  const daysLeft = status?.days_left ?? 0;

  const handleChoosePlan = async (planKey) => {
    setLoadingPlan(planKey);
    setError('');
    try {
      const data = await api.post('/api/subscriptions/checkout', { plan: planKey });
      if (data.url) {
        window.open(data.url, '_blank');
      }
    } catch (err) {
      setError(err.message || 'שגיאה בפתיחת עמוד תשלום');
    } finally {
      setLoadingPlan(null);
    }
  };

  return (
    <div
      dir="rtl"
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{
        background: 'linear-gradient(135deg, #f8a5c2 0%, #c56cd6 40%, #7b2ff7 100%)',
      }}
    >
      <div className="w-full max-w-2xl mx-4 flex flex-col items-center text-center gap-6">
        {/* Logo */}
        <div>
          <div className="text-6xl mb-2">💅</div>
          <h1 className="text-4xl font-extrabold text-white drop-shadow">Naily</h1>
        </div>

        {/* Status message */}
        <div className="bg-white/20 backdrop-blur-sm rounded-2xl px-6 py-4 text-white w-full">
          {isExpiredTrial ? (
            <>
              <p className="text-xl font-bold mb-1">הניסיון החינמי שלך הסתיים</p>
              <p className="text-white/80 text-sm">בחרי תוכנית כדי להמשיך להשתמש ב-Naily</p>
            </>
          ) : (
            <>
              <p className="text-xl font-bold mb-1">הגיע הזמן להירשם!</p>
              {daysLeft > 0 ? (
                <p className="text-white/80 text-sm">נותרו לך {daysLeft} ימים בניסיון החינמי</p>
              ) : (
                <p className="text-white/80 text-sm">שדרגי כדי להמשיך ליהנות מכל הפיצ'רים</p>
              )}
            </>
          )}
        </div>

        {/* Plan cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
          {PLANS.map((plan) => (
            <div
              key={plan.key}
              className="rounded-2xl p-5 flex flex-col items-center gap-3 relative"
              style={{
                background: plan.highlight ? 'white' : 'rgba(255,255,255,0.2)',
                backdropFilter: 'blur(8px)',
                border: plan.highlight ? '2px solid white' : '2px solid rgba(255,255,255,0.4)',
              }}
            >
              {plan.badge && (
                <span
                  className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full text-xs font-bold text-white shadow"
                  style={{ background: 'linear-gradient(90deg, #f8a5c2, #c56cd6)' }}
                >
                  {plan.badge}
                </span>
              )}
              <p
                className="font-bold text-base"
                style={{ color: plan.highlight ? '#7b2ff7' : 'white' }}
              >
                {plan.label}
              </p>
              <div style={{ color: plan.highlight ? '#1a0533' : 'white' }}>
                <span className="text-3xl font-extrabold">{plan.price}</span>
                <span className="text-sm font-medium"> {plan.period}</span>
              </div>
              <button
                onClick={() => handleChoosePlan(plan.key)}
                disabled={loadingPlan !== null}
                className="w-full py-2.5 rounded-xl font-bold text-sm transition-all active:scale-95"
                style={{
                  background: plan.highlight
                    ? 'linear-gradient(135deg, #f8a5c2, #c56cd6)'
                    : 'rgba(255,255,255,0.3)',
                  color: plan.highlight ? 'white' : 'white',
                  border: plan.highlight ? 'none' : '1px solid rgba(255,255,255,0.6)',
                }}
              >
                {loadingPlan === plan.key ? 'טוענת...' : 'בחרי תוכנית'}
              </button>
            </div>
          ))}
        </div>

        {error && (
          <div className="bg-white/20 rounded-xl px-4 py-2 text-white text-sm">
            {error}
          </div>
        )}

        {/* Footer */}
        <p className="text-white/70 text-sm">
          יש לך שאלות?{' '}
          <a
            href="mailto:support@naily.app"
            className="text-white underline font-semibold"
          >
            צרי קשר
          </a>
        </p>
      </div>
    </div>
  );
}
