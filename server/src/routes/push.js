import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { pool } from '../lib/db.js';

const router = Router();

// GET /api/push/vapid-public-key — public
router.get('/vapid-public-key', (_req, res) => {
  res.json({ key: process.env.VAPID_PUBLIC_KEY || '' });
});

// POST /api/push/subscribe — save push subscription (tech or client)
router.post('/subscribe', async (req, res) => {
  const { subscription } = req.body;
  const token = req.headers.authorization?.split(' ')[1];
  if (!token || !subscription) return res.status(400).json({ error: 'Missing data' });

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    await pool.query(
      `INSERT INTO push_subscriptions (user_id, role, subscription)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id, role) DO UPDATE SET subscription = EXCLUDED.subscription`,
      [payload.id, payload.role, JSON.stringify(subscription)]
    );
    return res.json({ message: 'ok' });
  } catch (err) {
    console.error('Push subscribe error:', err);
    return res.status(500).json({ error: 'שגיאת שרת' });
  }
});

export default router;
