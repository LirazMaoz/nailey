import { Router } from 'express';
import { pool } from '../lib/db.js';
import { requireAuth, requireSubscription } from '../middleware/auth.js';

const router = Router();

// GET /api/clients/search?q= — autocomplete client name for tech
router.get('/search', requireAuth, requireSubscription, async (req, res) => {
  const { q } = req.query;

  if (!q || q.trim().length === 0) {
    return res.json([]);
  }

  try {
    const { rows } = await pool.query(
      'SELECT id, name, phone FROM clients WHERE tech_id = $1 AND name ILIKE $2 ORDER BY name LIMIT 10',
      [req.user.id, `%${q.trim()}%`]
    );
    return res.json(rows);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'שגיאת שרת' });
  }
});

// GET /api/clients — list all clients for tech
router.get('/', requireAuth, requireSubscription, async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM clients WHERE tech_id = $1 ORDER BY name',
      [req.user.id]
    );
    return res.json(rows);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'שגיאת שרת' });
  }
});

export default router;
