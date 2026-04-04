import { Router } from 'express';
import { pool } from '../lib/db.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

const PLANS = {
  monthly: {
    price: 4900,
    currency: 'ils',
    label: '₪49 לחודש',
    interval: 'month',
    stripe_price_id: 'price_monthly_placeholder',
  },
  yearly: {
    price: 39900,
    currency: 'ils',
    label: '₪399 לשנה',
    interval: 'year',
    stripe_price_id: 'price_yearly_placeholder',
    savings: 'חסכי 32%',
  },
};

// GET /api/subscriptions/status — requireAuth
router.get('/status', requireAuth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT subscription_status, subscription_plan, trial_ends_at, subscription_ends_at FROM users WHERE id = $1',
      [req.user.id]
    );
    const user = rows[0];
    if (!user) return res.status(404).json({ error: 'User not found' });

    const now = new Date();
    let access = 'blocked';
    let days_left = 0;

    if (user.subscription_status === 'trial') {
      const trialEnd = new Date(user.trial_ends_at);
      if (trialEnd > now) {
        access = 'trial_active';
        days_left = Math.ceil((trialEnd - now) / (1000 * 60 * 60 * 24));
      } else {
        access = 'trial_expired';
      }
    } else if (user.subscription_status === 'active') {
      if (!user.subscription_ends_at || new Date(user.subscription_ends_at) > now) {
        access = 'active';
        if (user.subscription_ends_at) {
          days_left = Math.ceil((new Date(user.subscription_ends_at) - now) / (1000 * 60 * 60 * 24));
        }
      } else {
        access = 'blocked';
      }
    }

    return res.json({
      subscription_status: user.subscription_status,
      subscription_plan: user.subscription_plan,
      trial_ends_at: user.trial_ends_at,
      subscription_ends_at: user.subscription_ends_at,
      access,
      days_left,
    });
  } catch (err) {
    console.error('subscription status error:', err);
    return res.status(500).json({ error: 'שגיאת שרת' });
  }
});

// GET /api/subscriptions/plans — public
router.get('/plans', (_req, res) => {
  return res.json(PLANS);
});

// POST /api/subscriptions/checkout — requireAuth
router.post('/checkout', requireAuth, async (req, res) => {
  const { plan } = req.body;
  if (!PLANS[plan]) {
    return res.status(400).json({ error: 'תוכנית לא תקינה' });
  }
  console.log('Stripe not configured — returning mock checkout URL for plan:', plan);
  return res.json({
    url: 'https://buy.stripe.com/placeholder',
    plan,
    message: 'Stripe not configured yet',
  });
});

// POST /api/subscriptions/webhook — Stripe webhook placeholder
router.post('/webhook', (req, res) => {
  console.log('Stripe webhook received (not configured):', req.body);
  return res.json({ received: true });
});

export default router;
