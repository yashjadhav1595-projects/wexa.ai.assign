const express = require('express');
const cors = require('cors');
const apiRoutes = require('../server/src/routes/api');
const errorHandler = require('../server/src/middlewares/errorHandler');

const app = express();
app.set('trust proxy', 1);

app.use(cors());
app.use(express.json());

// Normalize URLs so both /api/health and /health work
app.use('/api', apiRoutes);
app.use('/', apiRoutes);

// Fallback 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: true,
    message: `Route not found: ${req.method} ${req.originalUrl || req.url}`
  });
});

// Global Error Handler
app.use(errorHandler);

// Standalone request handler wrapper for Vercel Serverless
module.exports = (req, res) => {
  return app(req, res);
};
