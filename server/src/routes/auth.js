import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { pool } from '../lib/db.js';

const SEED_COLORS = [
  { name: 'ורוד קלאסי', number: 'OPI-001', hex: '#f8a5c2' },
  { name: 'אדום תשוקה', number: 'OPI-002', hex: '#e74c3c' },
  { name: 'סגול מלכותי', number: 'OPI-003', hex: '#9b59b6' },
  { name: "בז' נייטרל", number: 'OPI-004', hex: '#d4b896' },
  { name: 'כחול לילה', number: 'OPI-005', hex: '#2c3e50' },
];

const router = Router();

// Generate username slug from display name
function toSlug(name) {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')        // spaces → dashes
    .replace(/[^a-z0-9-]/g, '') // remove non-alphanumeric except dash
    .replace(/-+/g, '-')         // collapse consecutive dashes
    .replace(/^-|-$/g, '');      // trim leading/trailing dashes
}

async function generateUniqueUsername(name) {
  const base = toSlug(name) || 'tech';
  let candidate = base;
  let attempt = 0;
  while (true) {
    const { rows } = await pool.query('SELECT id FROM users WHERE username = $1', [candidate]);
    if (rows.length === 0) return candidate;
    attempt += 1;
    candidate = `${base}-${attempt}`;
  }
}

// POST /api/auth/signup
router.post(
  '/signup',
  [
    body('email').isEmail().withMessage('אימייל לא תקין'),
    body('password').isLength({ min: 6 }).withMessage('סיסמה חייבת להכיל לפחות 6 תווים'),
    body('name').notEmpty().withMessage('שם הוא שדה חובה'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password, name, phone } = req.body;

    try {
      // Check if email already exists
      const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
      if (existing.rows.length > 0) {
        return res.status(400).json({ error: 'אימייל כבר קיים במערכת' });
      }

      const password_hash = await bcrypt.hash(password, 10);
      const username = await generateUniqueUsername(name);

      const userResult = await pool.query(
        `INSERT INTO users (name, email, password_hash, phone, username)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, name, email, phone, username, subscription_status, trial_ends_at, subscription_ends_at`,
        [name, email, password_hash, phone || null, username]
      );
      const user = userResult.rows[0];

      // Seed 5 default colors
      for (const color of SEED_COLORS) {
        await pool.query(
          'INSERT INTO colors (tech_id, name, number, hex, out_of_stock) VALUES ($1, $2, $3, $4, false)',
          [user.id, color.name, color.number, color.hex]
        );
      }

      const token = jwt.sign(
        { id: user.id, email: user.email, name: user.name, username: user.username, role: 'tech' },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );

      return res.status(201).json({
        message: 'נרשמת בהצלחה',
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          username: user.username,
          subscription_status: user.subscription_status,
          trial_ends_at: user.trial_ends_at,
          subscription_ends_at: user.subscription_ends_at,
        },
      });
    } catch (err) {
      console.error('Signup error:', err);
      return res.status(500).json({ error: 'שגיאת שרת' });
    }
  }
);

// POST /api/auth/login
router.post(
  '/login',
  [
    body('email').isEmail().withMessage('אימייל לא תקין'),
    body('password').notEmpty().withMessage('סיסמה חסרה'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    try {
      const result = await pool.query(
        `SELECT id, name, email, phone, password_hash, username,
                subscription_status, trial_ends_at, subscription_ends_at
         FROM users WHERE email = $1`,
        [email]
      );

      if (result.rows.length === 0) {
        return res.status(401).json({ error: 'אימייל או סיסמה שגויים' });
      }

      const user = result.rows[0];
      const valid = await bcrypt.compare(password, user.password_hash);
      if (!valid) {
        return res.status(401).json({ error: 'אימייל או סיסמה שגויים' });
      }

      const token = jwt.sign(
        { id: user.id, email: user.email, name: user.name, username: user.username, role: 'tech' },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );

      return res.json({
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          username: user.username,
          subscription_status: user.subscription_status,
          trial_ends_at: user.trial_ends_at,
          subscription_ends_at: user.subscription_ends_at,
        },
      });
    } catch (err) {
      console.error('Login error:', err);
      return res.status(500).json({ error: 'שגיאת שרת' });
    }
  }
);

export default router;
