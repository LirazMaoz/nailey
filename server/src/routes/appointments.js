import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import jwt from 'jsonwebtoken';
import { pool } from '../lib/db.js';
import { requireAuth, requireSubscription } from '../middleware/auth.js';
import { sendAppointmentSMS } from '../services/sms.js';

const router = Router();

// Generate time slots 09:00–18:00 every 30 minutes
function generateAllSlots() {
  const slots = [];
  for (let h = 9; h < 18; h++) {
    slots.push(`${String(h).padStart(2, '0')}:00`);
    slots.push(`${String(h).padStart(2, '0')}:30`);
  }
  return slots;
}
const ALL_SLOTS = generateAllSlots();

// GET /api/appointments/slots?techId=&date=  (public)
router.get('/slots', async (req, res) => {
  const { techId, date } = req.query;
  if (!techId || !date) {
    return res.status(400).json({ error: 'techId and date are required' });
  }

  try {
    const { rows } = await pool.query(
      "SELECT time FROM appointments WHERE tech_id = $1 AND date = $2 AND status != 'done'",
      [techId, date]
    );

    const booked = new Set(rows.map((r) => String(r.time).slice(0, 5)));
    const available = ALL_SLOTS.filter((s) => !booked.has(s));
    return res.json({ slots: available });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'שגיאת שרת' });
  }
});

// GET /api/appointments — tech's appointments (optional ?date=)
router.get('/', requireAuth, requireSubscription, async (req, res) => {
  const { date } = req.query;

  try {
    let queryText = `
      SELECT
        appointments.*,
        clients.name  AS client_name,
        clients.phone AS client_phone,
        colors.name   AS color_name,
        colors.hex    AS color_hex
      FROM appointments
      LEFT JOIN clients ON appointments.client_id = clients.id
      LEFT JOIN colors  ON appointments.color_id  = colors.id
      WHERE appointments.tech_id = $1
    `;
    const params = [req.user.id];

    if (date) {
      params.push(date);
      queryText += ` AND appointments.date = $${params.length}`;
    }

    queryText += ' ORDER BY appointments.date, appointments.time';

    const { rows } = await pool.query(queryText, params);
    return res.json(rows);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'שגיאת שרת' });
  }
});

// POST /api/appointments — create appointment (client or tech)
router.post(
  '/',
  [
    body('techId').notEmpty().withMessage('techId חסר'),
    body('clientName').notEmpty().withMessage('שם לקוח חסר'),
    body('clientPhone').notEmpty().withMessage('טלפון לקוח חסר'),
    body('colorId').notEmpty().withMessage('colorId חסר'),
    body('date').isDate().withMessage('תאריך לא תקין'),
    body('time').matches(/^\d{2}:\d{2}$/).withMessage('שעה לא תקינה'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { techId, clientName, clientPhone, colorId, date, time, bookedBy = 'client', clientToken } = req.body;

    try {
      // Verify slot is still available
      const { rows: existing } = await pool.query(
        "SELECT id FROM appointments WHERE tech_id = $1 AND date = $2 AND time = $3 AND status != 'done'",
        [techId, date, time]
      );
      if (existing.length > 0) {
        return res.status(409).json({ error: 'השעה כבר תפוסה' });
      }

      // Determine client_id
      let clientId = null;

      if (clientToken) {
        // Authenticated client booking
        try {
          const payload = jwt.verify(clientToken, process.env.JWT_SECRET);
          if (payload.role === 'client') {
            clientId = payload.id;
          }
        } catch {
          // Invalid token — fall through to upsert by phone
        }
      }

      if (!clientId) {
        // Upsert client (find by phone + techId)
        const { rows: existingClients } = await pool.query(
          'SELECT id FROM clients WHERE tech_id = $1 AND phone = $2',
          [techId, clientPhone]
        );

        if (existingClients.length > 0) {
          clientId = existingClients[0].id;
          await pool.query('UPDATE clients SET name = $1 WHERE id = $2', [clientName, clientId]);
        } else {
          const { rows: newClient } = await pool.query(
            'INSERT INTO clients (tech_id, name, phone) VALUES ($1, $2, $3) RETURNING id',
            [techId, clientName, clientPhone]
          );
          clientId = newClient[0].id;
        }
      }

      // Fetch color name for SMS
      const { rows: colorRows } = await pool.query('SELECT name FROM colors WHERE id = $1', [colorId]);
      const colorName = colorRows[0]?.name || 'לא ידוע';

      // Create appointment
      const { rows: apptRows } = await pool.query(
        `INSERT INTO appointments (tech_id, client_id, color_id, date, time, status, booked_by)
         VALUES ($1, $2, $3, $4, $5, 'pending', $6)
         RETURNING *`,
        [techId, clientId, colorId, date, time, bookedBy]
      );
      const appt = apptRows[0];

      // Enrich with joined data
      appt.client_name = clientName;
      appt.client_phone = clientPhone;
      appt.color_name = colorName;

      // Send SMS confirmation
      const smsResult = await sendAppointmentSMS(clientPhone, {
        clientName,
        date,
        time,
        colorName,
      });

      return res.status(201).json({ appointment: appt, sms: smsResult });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'שגיאת שרת' });
    }
  }
);

// PATCH /api/appointments/:id — update status
router.patch('/:id', requireAuth, requireSubscription, async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  const validStatuses = ['pending', 'arrived', 'done'];
  if (status && !validStatuses.includes(status)) {
    return res.status(400).json({ error: 'סטטוס לא תקין' });
  }

  try {
    const { rows } = await pool.query(
      'UPDATE appointments SET status = $1 WHERE id = $2 AND tech_id = $3 RETURNING *',
      [status, id, req.user.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'תור לא נמצא' });
    return res.json(rows[0]);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'שגיאת שרת' });
  }
});

export default router;
