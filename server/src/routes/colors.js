import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import { pool } from '../lib/db.js';
import { requireAuth, requireSubscription } from '../middleware/auth.js';

const router = Router();

// GET /api/colors — tech's colors
router.get('/', requireAuth, requireSubscription, async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM colors WHERE tech_id = $1 ORDER BY created_at',
      [req.user.id]
    );
    return res.json(rows);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'שגיאת שרת' });
  }
});

// GET /api/colors/public/:techRef — public, for booking flow (no auth)
// techRef can be numeric id OR username slug
router.get('/public/:techRef', async (req, res) => {
  const { techRef } = req.params;
  try {
    // Determine if techRef is numeric ID or username slug
    const isNumeric = /^\d+$/.test(techRef);
    let techId;
    if (isNumeric) {
      techId = parseInt(techRef, 10);
    } else {
      const { rows: userRows } = await pool.query(
        'SELECT id FROM users WHERE username = $1',
        [techRef]
      );
      if (userRows.length === 0) return res.status(404).json({ error: 'Tech not found' });
      techId = userRows[0].id;
    }
    const { rows } = await pool.query(
      'SELECT * FROM colors WHERE tech_id = $1 AND out_of_stock = false ORDER BY created_at',
      [techId]
    );
    return res.json(rows);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'שגיאת שרת' });
  }
});

// POST /api/colors — add color
router.post(
  '/',
  requireAuth,
  requireSubscription,
  [
    body('name').notEmpty().withMessage('שם צבע חובה'),
    body('number').notEmpty().withMessage('מספר צבע חובה'),
    body('hex').matches(/^#[0-9A-Fa-f]{6}$/).withMessage('קוד צבע לא תקין'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { name, number, hex } = req.body;

    try {
      const { rows } = await pool.query(
        'INSERT INTO colors (tech_id, name, number, hex, out_of_stock) VALUES ($1, $2, $3, $4, false) RETURNING *',
        [req.user.id, name, number, hex]
      );
      return res.status(201).json(rows[0]);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'שגיאת שרת' });
    }
  }
);

// PATCH /api/colors/:id — update fields (name, number, hex, out_of_stock)
router.patch('/:id', requireAuth, requireSubscription, async (req, res) => {
  const { id } = req.params;
  const updates = req.body;

  const allowed = ['name', 'number', 'hex', 'out_of_stock'];
  const sanitized = Object.fromEntries(
    Object.entries(updates).filter(([k]) => allowed.includes(k))
  );

  if (Object.keys(sanitized).length === 0) {
    return res.status(400).json({ error: 'אין שדות לעדכון' });
  }

  const setClauses = Object.keys(sanitized).map((k, i) => `${k} = $${i + 1}`).join(', ');
  const values = [...Object.values(sanitized), id, req.user.id];

  try {
    const { rows } = await pool.query(
      `UPDATE colors SET ${setClauses} WHERE id = $${values.length - 1} AND tech_id = $${values.length} RETURNING *`,
      values
    );
    if (rows.length === 0) return res.status(404).json({ error: 'צבע לא נמצא' });
    return res.json(rows[0]);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'שגיאת שרת' });
  }
});

// DELETE /api/colors/:id
router.delete('/:id', requireAuth, requireSubscription, async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM colors WHERE id = $1 AND tech_id = $2', [id, req.user.id]);
    return res.json({ success: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'שגיאת שרת' });
  }
});

export default router;
