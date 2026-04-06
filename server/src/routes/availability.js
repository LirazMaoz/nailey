import { Router } from 'express';
import { pool } from '../lib/db.js';
import { requireAuth, requireSubscription } from '../middleware/auth.js';

const router = Router();

const DAYS = [0,1,2,3,4,5,6];

// GET /api/availability — returns all 7 days for the logged-in tech
router.get('/', requireAuth, requireSubscription, async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT day_of_week, is_open, start_time, end_time FROM availability WHERE tech_id = $1 ORDER BY day_of_week',
      [req.user.id]
    );

    // Build a full 7-day array, filling defaults for missing days
    const byDay = {};
    rows.forEach(r => { byDay[r.day_of_week] = r; });

    const result = DAYS.map(d => ({
      day_of_week: d,
      is_open: byDay[d] ? byDay[d].is_open : (d !== 6), // Sat closed by default
      start_time: byDay[d] ? String(byDay[d].start_time).slice(0,5) : '09:00',
      end_time:   byDay[d] ? String(byDay[d].end_time).slice(0,5)   : '18:00',
    }));

    return res.json(result);
  } catch (err) {
    console.error('availability GET error:', err);
    return res.status(500).json({ error: 'שגיאת שרת' });
  }
});

// PUT /api/availability — upsert schedule for the logged-in tech
// Body: [ { day_of_week, is_open, start_time, end_time }, ... ]
router.put('/', requireAuth, requireSubscription, async (req, res) => {
  const days = req.body;
  if (!Array.isArray(days) || days.length !== 7) {
    return res.status(400).json({ error: 'יש לשלוח 7 ימים' });
  }

  try {
    for (const d of days) {
      await pool.query(
        `INSERT INTO availability (tech_id, day_of_week, is_open, start_time, end_time)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (tech_id, day_of_week) DO UPDATE
           SET is_open = EXCLUDED.is_open,
               start_time = EXCLUDED.start_time,
               end_time = EXCLUDED.end_time`,
        [req.user.id, d.day_of_week, d.is_open, d.start_time, d.end_time]
      );
    }
    return res.json({ message: 'נשמר בהצלחה' });
  } catch (err) {
    console.error('availability PUT error:', err);
    return res.status(500).json({ error: 'שגיאת שרת' });
  }
});

// GET /api/availability/overrides — list date-specific overrides for tech
router.get('/overrides', requireAuth, requireSubscription, async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT id, date::text, is_closed, note FROM availability_overrides WHERE tech_id = $1 ORDER BY date',
      [req.user.id]
    );
    return res.json(rows);
  } catch (err) {
    console.error('overrides GET error:', err);
    return res.status(500).json({ error: 'שגיאת שרת' });
  }
});

// PUT /api/availability/overrides — upsert a single date override
// Body: { date, is_closed, note }
router.put('/overrides', requireAuth, requireSubscription, async (req, res) => {
  const { date, is_closed, note } = req.body;
  if (!date) return res.status(400).json({ error: 'תאריך חסר' });
  try {
    await pool.query(
      `INSERT INTO availability_overrides (tech_id, date, is_closed, note)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (tech_id, date) DO UPDATE
         SET is_closed = EXCLUDED.is_closed, note = EXCLUDED.note`,
      [req.user.id, date, is_closed ?? true, note || null]
    );
    return res.json({ message: 'נשמר' });
  } catch (err) {
    console.error('overrides PUT error:', err);
    return res.status(500).json({ error: 'שגיאת שרת' });
  }
});

// DELETE /api/availability/overrides/:date — remove override for a date
router.delete('/overrides/:date', requireAuth, requireSubscription, async (req, res) => {
  try {
    await pool.query(
      'DELETE FROM availability_overrides WHERE tech_id = $1 AND date = $2',
      [req.user.id, req.params.date]
    );
    return res.json({ message: 'נמחק' });
  } catch (err) {
    console.error('overrides DELETE error:', err);
    return res.status(500).json({ error: 'שגיאת שרת' });
  }
});

export default router;
