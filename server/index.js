require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { verifyConnectivity, closeDriver } = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// Routes
app.use('/api/contributors', require('./routes/contributors'));
app.use('/api/projects', require('./routes/projects'));
app.use('/api/technologies', require('./routes/technologies'));
app.use('/api/organizations', require('./routes/organizations'));
app.use('/api/graph', require('./routes/graph'));
app.use('/api/queries', require('./routes/queries'));

// Health check
app.get('/api/health', async (req, res) => {
  try {
    await verifyConnectivity();
    res.json({ status: 'ok', db: 'connected' });
  } catch (err) {
    res.status(503).json({ status: 'error', db: 'unreachable', message: err.message });
  }
});

// Catch-all: serve index.html for SPA routing
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('[Server Error]', err);
  res.status(500).json({ error: 'Internal server error', message: err.message });
});

// Start server
async function start() {
  try {
    await verifyConnectivity();
    app.listen(PORT, () => {
      console.log(`[Server] TechPulse running at http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('[Server] Could not connect to CognoDB:', err.message);
    console.error('[Server] Check your COGNODB_URI and COGNODB_PASSWORD environment variables.');
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n[Server] Shutting down gracefully...');
  await closeDriver();
  process.exit(0);
});

start();
