import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { pool } from '../lib/db.js';
import { requireClientAuth } from '../middleware/auth.js';

const router = Router();

// POST /api/client-auth/signup
router.post(
  '/signup',
  [
    body('name').notEmpty().withMessage('שם הוא שדה חובה'),
    body('phone').notEmpty().withMessage('טלפון הוא שדה חובה'),
    body('email').isEmail().withMessage('אימייל לא תקין'),
    body('password').isLength({ min: 6 }).withMessage('סיסמה חייבת להכיל לפחות 6 תווים'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, phone, email, password } = req.body;

    try {
      const existing = await pool.query('SELECT id FROM clients WHERE email = $1', [email]);
      if (existing.rows.length > 0) {
        return res.status(400).json({ error: 'אימייל כבר קיים במערכת' });
      }

      const password_hash = await bcrypt.hash(password, 10);

      const { rows } = await pool.query(
        'INSERT INTO clients (tech_id, name, phone, email, password_hash) VALUES (null, $1, $2, $3, $4) RETURNING id, name, phone, email',
        [name, phone, email, password_hash]
      );
      const client = rows[0];

      const token = jwt.sign(
        { id: client.id, name: client.name, email: client.email, role: 'client' },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );

      return res.status(201).json({
        message: 'נרשמת בהצלחה',
        token,
        user: { id: client.id, name: client.name, email: client.email, phone: client.phone },
      });
    } catch (err) {
      console.error('Client signup error:', err);
      return res.status(500).json({ error: 'שגיאת שרת' });
    }
  }
);

// POST /api/client-auth/login
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
        'SELECT id, name, phone, email, password_hash FROM clients WHERE email = $1',
        [email]
      );

      if (result.rows.length === 0) {
        return res.status(401).json({ error: 'אימייל או סיסמה שגויים' });
      }

      const client = result.rows[0];

      if (!client.password_hash) {
        return res.status(401).json({ error: 'חשבון זה לא הוגדר עם סיסמה, נסי להתחבר בדרך אחרת' });
      }

      const valid = await bcrypt.compare(password, client.password_hash);
      if (!valid) {
        return res.status(401).json({ error: 'אימייל או סיסמה שגויים' });
      }

      const token = jwt.sign(
        { id: client.id, name: client.name, email: client.email, role: 'client' },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );

      return res.json({
        token,
        user: { id: client.id, name: client.name, email: client.email, phone: client.phone },
      });
    } catch (err) {
      console.error('Client login error:', err);
      return res.status(500).json({ error: 'שגיאת שרת' });
    }
  }
);

// GET /api/client-auth/me
router.get('/me', requireClientAuth, async (req, res) => {
  try {
    const clientResult = await pool.query(
      'SELECT id, name, phone, email FROM clients WHERE id = $1',
      [req.client.id]
    );

    if (clientResult.rows.length === 0) {
      return res.status(404).json({ error: 'לקוח לא נמצא' });
    }

    const client = clientResult.rows[0];

    const apptResult = await pool.query(
      `SELECT a.*, c.name as color_name, c.hex as color_hex
       FROM appointments a
       LEFT JOIN colors c ON a.color_id = c.id
       WHERE a.client_id = $1
       ORDER BY a.created_at DESC
       LIMIT 5`,
      [req.client.id]
    );

    return res.json({
      ...client,
      appointments: apptResult.rows,
    });
  } catch (err) {
    console.error('Client me error:', err);
    return res.status(500).json({ error: 'שגיאת שרת' });
  }
});

export default router;
