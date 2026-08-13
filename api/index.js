const express = require('express');
const cors = require('cors');
const apiRoutes = require('../server/src/routes/api');
const errorHandler = require('../server/src/middlewares/errorHandler');

const app = express();
app.set('trust proxy', 1);

app.use(cors());
app.use(express.json());

// Support both /api/... and direct route requests
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

module.exports = app;
