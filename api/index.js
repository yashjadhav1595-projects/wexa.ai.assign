const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const apiRoutes = require('../server/src/routes/api');
const errorHandler = require('../server/src/middlewares/errorHandler');

const app = express();
app.set('trust proxy', 1);

app.use(cors());
app.use(express.json());

// Handle both /api/... and direct root /... within Vercel serverless functions
app.use('/api', apiRoutes);
app.use('/', apiRoutes);

// Global Error Handler
app.use(errorHandler);

module.exports = app;
