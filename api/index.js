const express = require('express');
const cors = require('cors');
const apiRoutes = require('../server/src/routes/api');
const errorHandler = require('../server/src/middlewares/errorHandler');

const app = express();
app.set('trust proxy', 1);

app.use(cors());
app.use(express.json());

// Support both /api and root subpaths in serverless invocation
app.use('/api', apiRoutes);
app.use('/', apiRoutes);

app.use(errorHandler);

module.exports = app;
