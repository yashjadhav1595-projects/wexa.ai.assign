const express = require('express');
const cors = require('cors');
const apiRoutes = require('../server/src/routes/api');
const errorHandler = require('../server/src/middlewares/errorHandler');

const app = express();
app.set('trust proxy', 1);

app.use(cors());
app.use(express.json());

// Normalize URL for Vercel Serverless routing
app.use((req, res, next) => {
  if (req.url.startsWith('/api/')) {
    req.url = req.url.substring(4); // transforms /api/health -> /health
  } else if (req.url === '/api') {
    req.url = '/';
  }
  next();
});

// Mount all API routes
app.use('/', apiRoutes);

// Fallback 404 handler so serverless function never hangs
app.use((req, res) => {
  res.status(404).json({ error: true, message: `Route not found on Vercel: ${req.method} ${req.originalUrl || req.url}` });
});

// Global Error Handler
app.use(errorHandler);

module.exports = app;
