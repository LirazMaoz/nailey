import { Router } from 'express';
import { pool } from '../lib/db.js';

const router = Router();

// GET /api/stats/top-colors?techId=
router.get('/top-colors', async (req, res) => {
  const { techId } = req.query;
  if (!techId) {
    return res.status(400).json({ error: 'techId is required' });
  }

  try {
    const { rows } = await pool.query(
      `SELECT c.id, c.name, c.hex, c.number, COUNT(a.id) as count
       FROM colors c
       LEFT JOIN appointments a ON a.color_id = c.id AND a.tech_id = $1
       WHERE c.tech_id = $1
       GROUP BY c.id, c.name, c.hex, c.number
       ORDER BY count DESC
       LIMIT 10`,
      [techId]
    );
    return res.json(rows);
  } catch (err) {
    console.error('Top colors error:', err);
    return res.status(500).json({ error: 'שגיאת שרת' });
  }
});

// GET /api/stats/top-colors/stream?techId=  (SSE)
router.get('/top-colors/stream', async (req, res) => {
  const { techId } = req.query;
  if (!techId) {
    return res.status(400).json({ error: 'techId is required' });
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const sendData = async () => {
    try {
      const { rows } = await pool.query(
        `SELECT c.id, c.name, c.hex, c.number, COUNT(a.id) as count
         FROM colors c
         LEFT JOIN appointments a ON a.color_id = c.id AND a.tech_id = $1
         WHERE c.tech_id = $1
         GROUP BY c.id, c.name, c.hex, c.number
         ORDER BY count DESC
         LIMIT 10`,
        [techId]
      );
      res.write(`data: ${JSON.stringify(rows)}\n\n`);
    } catch (err) {
      console.error('SSE query error:', err);
    }
  };

  // Send immediately, then every 5 seconds
  await sendData();
  const interval = setInterval(sendData, 5000);

  req.on('close', () => {
    clearInterval(interval);
  });
});

export default router;
