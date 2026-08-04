require('dotenv').config();
const neo4j = require('neo4j-driver');
const logger = require('../utils/logger');

const URI = process.env.COGNODB_URI;
const USER = process.env.COGNODB_USER || 'cognodb';
const PASSWORD = process.env.COGNODB_PASSWORD;

if (!URI || !PASSWORD) {
  logger.error('COGNODB_URI and COGNODB_PASSWORD must be set in environment variables.');
  process.exit(1);
}

const driver = neo4j.driver(URI, neo4j.auth.basic(USER, PASSWORD), {
  maxConnectionPoolSize: 50,
  connectionAcquisitionTimeout: 10000,
  connectionTimeout: 10000,
});

async function verifyConnectivity() {
  try {
    await driver.verifyConnectivity();
    logger.info('Connected to CognoDB successfully.');
  } catch (error) {
    logger.error('Failed to connect to CognoDB', { error: error.message });
    throw error;
  }
}

/**
 * Execute a read transaction with automatic retries for transient errors.
 * This is the industry-standard way to query Neo4j.
 */
async function executeRead(cypher, params = {}) {
  const session = driver.session({ database: 'neo4j' });
  try {
    return await session.executeRead(tx => tx.run(cypher, params));
  } finally {
    await session.close();
  }
}

async function closeDriver() {
  await driver.close();
}

module.exports = {
  driver,
  verifyConnectivity,
  executeRead,
  closeDriver
};
