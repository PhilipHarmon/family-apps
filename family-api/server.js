require('dotenv').config();

const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
const requireKey = require('./middleware/requireKey');

const menuRoutes = require('./routes/menu');
const triviaRoutes = require('./routes/trivia');
const mediaRoutes = require('./routes/media');

const app = express();
const PORT = process.env.PORT || 5000;

// CORS: restrict to CLIENT_URL origins (comma-separated) when set;
// allow all origins when unset (dev default).
const clientUrl = (process.env.CLIENT_URL || '').trim();
app.use(
  cors(
    clientUrl
      ? { origin: clientUrl.split(',').map((s) => s.trim()).filter(Boolean) }
      : undefined,
  ),
);
app.use(express.json());

// Request logging.
app.use((req, _res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
  next();
});

// Health check: no family key required.
app.get('/api/health', (_req, res) => res.json({ ok: true }));

// Everything else under /api requires the shared family key.
app.use('/api', requireKey);
app.use('/api', menuRoutes);
app.use('/api', triviaRoutes);
app.use('/api', mediaRoutes);

// 404 for unknown API routes.
app.use('/api', (_req, res) => res.status(404).json({ error: 'Not found' }));

// Centralized error handler.
app.use((err, _req, res, _next) => {
  console.error(err);
  const status = err && err.name === 'ValidationError' ? 400 : 500;
  res.status(status).json({ error: err.message || 'Server error' });
});

async function start() {
  await connectDB();
  app.listen(PORT, () => console.log(`family-api listening on port ${PORT}`));
}

start();
