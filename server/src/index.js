import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

import { runMigrations, pool } from './lib/db.js';
import authRouter from './routes/auth.js';
import colorsRouter from './routes/colors.js';
import appointmentsRouter from './routes/appointments.js';
import clientsRouter from './routes/clients.js';
import clientAuthRouter from './routes/clientAuth.js';
import statsRouter from './routes/stats.js';
import subscriptionsRouter from './routes/subscriptions.js';
import adminRouter from './routes/admin.js';
import availabilityRouter from './routes/availability.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3001;
const isProd = process.env.NODE_ENV === 'production';

// Middleware
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:3000', process.env.CLIENT_URL].filter(Boolean),
  credentials: true,
}));
app.use(express.json());

// Routes
app.use('/api/auth', authRouter);
app.use('/api/colors', colorsRouter);
app.use('/api/appointments', appointmentsRouter);
app.use('/api/clients', clientsRouter);
app.use('/api/client-auth', clientAuthRouter);
app.use('/api/stats', statsRouter);
app.use('/api/subscriptions', subscriptionsRouter);
app.use('/api/admin', adminRouter);
app.use('/api/availability', availabilityRouter);

// GET /api/tech/:techRef — public, returns { id, name, username } for booking page
app.get('/api/tech/:techRef', async (req, res) => {
  const { techRef } = req.params;
  try {
    const isNumeric = /^\d+$/.test(techRef);
    let rows;
    if (isNumeric) {
      ({ rows } = await pool.query('SELECT id, name, username FROM users WHERE id = $1', [techRef]));
    } else {
      ({ rows } = await pool.query('SELECT id, name, username FROM users WHERE username = $1', [techRef]));
    }
    if (rows.length === 0) return res.status(404).json({ error: 'Tech not found' });
    return res.json(rows[0]);
  } catch (err) {
    console.error('tech lookup error:', err);
    return res.status(500).json({ error: 'שגיאת שרת' });
  }
});

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Serve React app in production
if (isProd) {
  const clientDist = path.join(__dirname, '../../client/dist');
  app.use(express.static(clientDist));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });
} else {
  app.use((_req, res) => {
    res.status(404).json({ error: 'Route not found' });
  });
}

// Error handler
app.use((err, _req, res, _next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, async () => {
  console.log(`Naily server running on http://localhost:${PORT}`);
  await runMigrations();
});
