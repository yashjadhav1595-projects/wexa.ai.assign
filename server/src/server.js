const app = require('./app');
const { verifyConnectivity, closeDriver } = require('./config/db');
const logger = require('./utils/logger');

const PORT = process.env.PORT || 3000;

async function startServer() {
  try {
    // Ensure DB is connected before listening
    await verifyConnectivity();
    
    app.listen(PORT, () => {
      logger.info(`Server running at http://localhost:${PORT}`);
      logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (error) {
    logger.error('Failed to start server due to database connectivity issues.', { error: error.message });
    process.exit(1);
  }
}

// Graceful Shutdown
process.on('SIGINT', async () => {
  logger.info('SIGINT received. Shutting down gracefully...');
  await closeDriver();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  logger.info('SIGTERM received. Shutting down gracefully...');
  await closeDriver();
  process.exit(0);
});

startServer();
