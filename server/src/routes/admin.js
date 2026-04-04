import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { pool } from '../lib/db.js';
import { requireAdmin } from '../middleware/auth.js';

const router = Router();

// POST /api/admin/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'אימייל וסיסמה נדרשים' });
  }

  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminEmail || !adminPassword) {
    return res.status(503).json({ error: 'Admin not configured' });
  }

  if (email !== adminEmail) {
    return res.status(401).json({ error: 'פרטי התחברות שגויים' });
  }

  // Support both plain text (dev) and bcrypt hashed passwords
  let valid = false;
  if (adminPassword.startsWith('$2')) {
    valid = await bcrypt.compare(password, adminPassword);
  } else {
    valid = password === adminPassword;
  }

  if (!valid) {
    return res.status(401).json({ error: 'פרטי התחברות שגויים' });
  }

  const token = jwt.sign(
    { email: adminEmail, role: 'admin' },
    process.env.JWT_SECRET,
    { expiresIn: '12h' }
  );

  return res.json({ token, user: { email: adminEmail, role: 'admin' } });
});

// GET /api/admin/stats — requireAdmin
router.get('/stats', requireAdmin, async (req, res) => {
  try {
    const now = new Date();

    const [
      totalTechsResult,
      activeSubsResult,
      trialUsersResult,
      expiredTrialsResult,
      inactiveUsersResult,
      totalClientsResult,
      totalAppointmentsResult,
      monthlyRevenueResult,
      yearlyRevenueResult,
      newTechsResult,
    ] = await Promise.all([
      pool.query('SELECT COUNT(*) FROM users'),
      pool.query("SELECT COUNT(*) FROM users WHERE subscription_status = 'active'"),
      pool.query("SELECT COUNT(*) FROM users WHERE subscription_status = 'trial' AND trial_ends_at > NOW()"),
      pool.query("SELECT COUNT(*) FROM users WHERE subscription_status = 'trial' AND trial_ends_at <= NOW()"),
      pool.query("SELECT COUNT(*) FROM users WHERE subscription_status IN ('inactive','cancelled')"),
      pool.query('SELECT COUNT(*) FROM clients'),
      pool.query('SELECT COUNT(*) FROM appointments'),
      pool.query("SELECT COUNT(*) FROM users WHERE subscription_status = 'active' AND subscription_plan = 'monthly'"),
      pool.query("SELECT COUNT(*) FROM users WHERE subscription_status = 'active' AND subscription_plan = 'yearly'"),
      pool.query("SELECT COUNT(*) FROM users WHERE created_at >= NOW() - INTERVAL '30 days'"),
    ]);

    const monthlyCount = parseInt(monthlyRevenueResult.rows[0].count, 10);
    const yearlyCount = parseInt(yearlyRevenueResult.rows[0].count, 10);
    const monthly_revenue = (monthlyCount * 4900) / 100;
    const yearly_mrr = (yearlyCount * 39900) / 100 / 12;

    return res.json({
      total_techs: parseInt(totalTechsResult.rows[0].count, 10),
      active_subscriptions: parseInt(activeSubsResult.rows[0].count, 10),
      trial_users: parseInt(trialUsersResult.rows[0].count, 10),
      expired_trials: parseInt(expiredTrialsResult.rows[0].count, 10),
      inactive_users: parseInt(inactiveUsersResult.rows[0].count, 10),
      total_clients: parseInt(totalClientsResult.rows[0].count, 10),
      total_appointments: parseInt(totalAppointmentsResult.rows[0].count, 10),
      monthly_revenue: monthly_revenue + yearly_mrr,
      new_techs_this_month: parseInt(newTechsResult.rows[0].count, 10),
    });
  } catch (err) {
    console.error('admin stats error:', err);
    return res.status(500).json({ error: 'שגיאת שרת' });
  }
});

// GET /api/admin/techs — requireAdmin
router.get('/techs', requireAdmin, async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT
        u.id, u.name, u.email, u.username, u.phone,
        u.subscription_status, u.subscription_plan,
        u.trial_ends_at, u.subscription_ends_at, u.created_at,
        (SELECT COUNT(*) FROM appointments a WHERE a.tech_id = u.id) AS appointment_count,
        (SELECT COUNT(*) FROM clients c WHERE c.tech_id = u.id) AS client_count
      FROM users u
      ORDER BY u.created_at DESC
    `);
    return res.json(rows);
  } catch (err) {
    console.error('admin techs error:', err);
    return res.status(500).json({ error: 'שגיאת שרת' });
  }
});

// PATCH /api/admin/techs/:id/subscription — requireAdmin
router.patch('/techs/:id/subscription', requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { subscription_status, subscription_plan, subscription_ends_at, trial_ends_at } = req.body;

  const allowed = { subscription_status, subscription_plan, subscription_ends_at, trial_ends_at };
  const updates = Object.fromEntries(
    Object.entries(allowed).filter(([, v]) => v !== undefined)
  );

  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ error: 'אין שדות לעדכון' });
  }

  const setClauses = Object.keys(updates).map((k, i) => `${k} = $${i + 1}`).join(', ');
  const values = [...Object.values(updates), id];

  try {
    const { rows } = await pool.query(
      `UPDATE users SET ${setClauses} WHERE id = $${values.length} RETURNING id, name, subscription_status, subscription_plan, subscription_ends_at, trial_ends_at`,
      values
    );
    if (rows.length === 0) return res.status(404).json({ error: 'משתמש לא נמצא' });
    return res.json(rows[0]);
  } catch (err) {
    console.error('admin patch subscription error:', err);
    return res.status(500).json({ error: 'שגיאת שרת' });
  }
});

// GET /api/admin/earnings — requireAdmin
router.get('/earnings', requireAdmin, async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT
        DATE_TRUNC('month', created_at) AS month,
        subscription_plan,
        COUNT(*) AS count
      FROM users
      WHERE subscription_status IN ('active','cancelled')
      GROUP BY month, subscription_plan
      ORDER BY month DESC
    `);
    return res.json(rows);
  } catch (err) {
    console.error('admin earnings error:', err);
    return res.status(500).json({ error: 'שגיאת שרת' });
  }
});

// GET /api/admin/activity — requireAdmin
router.get('/activity', requireAdmin, async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT
        a.id, a.date, a.time, a.status, a.booked_by, a.created_at,
        u.name AS tech_name,
        c.name AS client_name,
        col.name AS color_name,
        col.hex AS color_hex
      FROM appointments a
      LEFT JOIN users u ON a.tech_id = u.id
      LEFT JOIN clients c ON a.client_id = c.id
      LEFT JOIN colors col ON a.color_id = col.id
      ORDER BY a.created_at DESC
      LIMIT 20
    `);
    return res.json(rows);
  } catch (err) {
    console.error('admin activity error:', err);
    return res.status(500).json({ error: 'שגיאת שרת' });
  }
});

export default router;
