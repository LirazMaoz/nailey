import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import jwt from 'jsonwebtoken';
import { pool } from '../lib/db.js';
import { requireAuth, requireSubscription } from '../middleware/auth.js';
import { sendAppointmentSMS } from '../services/sms.js';
import { sendPushToUser } from '../services/push.js';

const router = Router();

function generateSlots(startTime, endTime) {
  const slots = [];
  const [sh, sm] = startTime.split(':').map(Number);
  const [eh, em] = endTime.split(':').map(Number);
  let mins = sh * 60 + sm;
  const endMins = eh * 60 + em;
  while (mins < endMins) {
    slots.push(`${String(Math.floor(mins / 60)).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}`);
    mins += 30;
  }
  return slots;
}

// GET /api/appointments/slots?techId=&date=  (public)
router.get('/slots', async (req, res) => {
  const { techId, date } = req.query;
  if (!techId || !date) {
    return res.status(400).json({ error: 'techId and date are required' });
  }

  try {
    // Check date-specific override first
    const { rows: overrides } = await pool.query(
      'SELECT is_closed, note FROM availability_overrides WHERE tech_id = $1 AND date = $2',
      [techId, date]
    );
    if (overrides.length > 0 && overrides[0].is_closed) {
      return res.json({ slots: [], note: overrides[0].note });
    }

    // Check tech's availability for this day of week
    const dayOfWeek = new Date(date + 'T12:00:00').getDay(); // noon to avoid TZ shift
    const { rows: avail } = await pool.query(
      'SELECT is_open, start_time, end_time FROM availability WHERE tech_id = $1 AND day_of_week = $2',
      [techId, dayOfWeek]
    );

    let allSlots;
    if (avail.length > 0) {
      if (!avail[0].is_open) return res.json({ slots: [] });
      allSlots = generateSlots(
        String(avail[0].start_time).slice(0, 5),
        String(avail[0].end_time).slice(0, 5)
      );
    } else {
      // Default: 09:00-18:00, closed Sat
      if (dayOfWeek === 6) return res.json({ slots: [] });
      allSlots = generateSlots('09:00', '18:00');
    }

    const { rows } = await pool.query(
      "SELECT time FROM appointments WHERE tech_id = $1 AND date = $2 AND status NOT IN ('done','cancelled')",
      [techId, date]
    );

    const booked = new Set(rows.map((r) => String(r.time).slice(0, 5)));
    return res.json({ slots: allSlots.filter((s) => !booked.has(s)) });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'שגיאת שרת' });
  }
});

// GET /api/appointments/calendar?year= — dates with appointment counts for year calendar
router.get('/calendar', requireAuth, requireSubscription, async (req, res) => {
  const year = parseInt(req.query.year) || new Date().getFullYear();
  try {
    const { rows } = await pool.query(
      `SELECT date::text, COUNT(*) AS count
       FROM appointments
       WHERE tech_id = $1 AND status NOT IN ('cancelled') AND EXTRACT(YEAR FROM date) = $2
       GROUP BY date ORDER BY date`,
      [req.user.id, year]
    );
    return res.json(rows);
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
      WHERE appointments.tech_id = $1 AND appointments.status != 'cancelled'
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
    body('clientName').custom((value, { req }) => {
      if (!req.body.clientToken && !value) throw new Error('שם לקוח חסר');
      return true;
    }),
    body('clientPhone').custom((value, { req }) => {
      if (!req.body.clientToken && !value) throw new Error('טלפון לקוח חסר');
      return true;
    }),
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

      let resolvedName = clientName;
      let resolvedPhone = clientPhone;

      if (clientToken) {
        // Authenticated client booking
        try {
          const payload = jwt.verify(clientToken, process.env.JWT_SECRET);
          if (payload.role === 'client') {
            clientId = payload.id;
            // Look up name/phone from DB in case they're missing from the request
            const { rows: clientRows } = await pool.query(
              'SELECT name, phone FROM clients WHERE id = $1',
              [clientId]
            );
            if (clientRows.length > 0) {
              resolvedName = resolvedName || clientRows[0].name;
              resolvedPhone = resolvedPhone || clientRows[0].phone;
            }
          }
        } catch {
          // Invalid token — fall through to upsert by phone
        }
      }

      if (!clientId) {
        // Upsert client (find by phone + techId)
        const { rows: existingClients } = await pool.query(
          'SELECT id FROM clients WHERE tech_id = $1 AND phone = $2',
          [techId, resolvedPhone]
        );

        if (existingClients.length > 0) {
          clientId = existingClients[0].id;
          await pool.query('UPDATE clients SET name = $1 WHERE id = $2', [resolvedName, clientId]);
        } else {
          const { rows: newClient } = await pool.query(
            'INSERT INTO clients (tech_id, name, phone) VALUES ($1, $2, $3) RETURNING id',
            [techId, resolvedName, resolvedPhone]
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
      appt.client_name = resolvedName;
      appt.client_phone = resolvedPhone;
      appt.color_name = colorName;

      // Send SMS confirmation
      const smsResult = await sendAppointmentSMS(resolvedPhone, {
        clientName: resolvedName,
        date,
        time,
        colorName,
      });

      // Push notification to tech when client books
      if (bookedBy === 'client') {
        sendPushToUser(techId, 'tech', {
          title: 'תור חדש נקבע 💅',
          body: `${resolvedName} קבעה תור ל-${date} בשעה ${time}`,
        });
      }

      return res.status(201).json({ appointment: appt, sms: smsResult });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'שגיאת שרת' });
    }
  }
);

// PATCH /api/appointments/:id — update status (tech)
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

// DELETE /api/appointments/:id — tech cancels/deletes appointment
router.delete('/:id', requireAuth, requireSubscription, async (req, res) => {
  const { id } = req.params;
  try {
    const { rows } = await pool.query(
      "UPDATE appointments SET status = 'cancelled' WHERE id = $1 AND tech_id = $2 RETURNING id, client_id, date, time",
      [id, req.user.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'תור לא נמצא' });

    // Push notification to client
    const appt = rows[0];
    if (appt.client_id) {
      const dateStr = String(appt.date).split('T')[0];
      const timeStr = String(appt.time).slice(0, 5);
      sendPushToUser(appt.client_id, 'client', {
        title: 'התור שלך בוטל',
        body: `התור שקבעת ל-${dateStr} בשעה ${timeStr} בוטל על ידי הטכנאית`,
      });
    }

    return res.json({ message: 'התור בוטל' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'שגיאת שרת' });
  }
});

// PATCH /api/appointments/:id/cancel — client cancels their own appointment (24h rule)
router.patch('/:id/cancel', async (req, res) => {
  const { id } = req.params;
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    if (payload.role !== 'client') return res.status(403).json({ error: 'Forbidden' });

    const { rows: apptRows } = await pool.query(
      'SELECT id, date, time, status, client_id FROM appointments WHERE id = $1',
      [id]
    );
    if (apptRows.length === 0) return res.status(404).json({ error: 'תור לא נמצא' });
    const appt = apptRows[0];
    if (appt.client_id !== payload.id) return res.status(403).json({ error: 'Forbidden' });
    if (appt.status !== 'pending') return res.status(400).json({ error: 'ניתן לבטל רק תורים ממתינים' });

    // Enforce 24-hour cancellation window
    const dateStr = String(appt.date).split('T')[0];
    const timeStr = String(appt.time).slice(0, 5);
    const apptDateTime = new Date(`${dateStr}T${timeStr}:00`);
    const hoursUntil = (apptDateTime - new Date()) / (1000 * 60 * 60);
    if (hoursUntil < 24) {
      return res.status(400).json({ error: 'לא ניתן לבטל תור פחות מ-24 שעות לפני המועד' });
    }

    await pool.query("UPDATE appointments SET status = 'cancelled' WHERE id = $1", [id]);

    // Push notification to tech
    const { rows: techRows } = await pool.query(
      'SELECT tech_id FROM appointments WHERE id = $1',
      [id]
    );
    if (techRows.length > 0) {
      const clientRows2 = await pool.query('SELECT name, phone FROM clients WHERE id = $1', [appt.client_id]);
      const clientInfo = clientRows2.rows[0];
      sendPushToUser(techRows[0].tech_id, 'tech', {
        title: 'לקוחה ביטלה תור',
        body: `${clientInfo?.name || 'לקוחה'} ביטלה את התור ל-${dateStr} בשעה ${timeStr}`,
      });
    }

    return res.json({ message: 'התור בוטל' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'שגיאת שרת' });
  }
});

export default router;
