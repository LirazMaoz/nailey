import jwt from 'jsonwebtoken';
import { pool } from '../lib/db.js';

export function requireAuth(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
}

export function requireClientAuth(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    if (payload.role !== 'client') return res.status(403).json({ error: 'Forbidden' });
    req.client = payload;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
}

export async function requireSubscription(req, res, next) {
  // Must be used after requireAuth
  try {
    const { rows } = await pool.query(
      'SELECT subscription_status, trial_ends_at, subscription_ends_at FROM users WHERE id = $1',
      [req.user.id]
    );
    const user = rows[0];
    if (!user) return res.status(401).json({ error: 'User not found' });

    const now = new Date();
    const isTrial = user.subscription_status === 'trial' && new Date(user.trial_ends_at) > now;
    const isActive =
      user.subscription_status === 'active' &&
      (!user.subscription_ends_at || new Date(user.subscription_ends_at) > now);

    if (!isTrial && !isActive) {
      return res.status(402).json({
        error: 'subscription_required',
        subscription_status: user.subscription_status,
      });
    }
    next();
  } catch (err) {
    console.error('requireSubscription error:', err);
    return res.status(500).json({ error: 'שגיאת שרת' });
  }
}

export function requireAdmin(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    if (payload.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
    req.admin = payload;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
}
