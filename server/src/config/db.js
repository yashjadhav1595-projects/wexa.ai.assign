require('dotenv').config();
const neo4j = require('neo4j-driver');
const logger = require('../utils/logger');

// Live CognoDB Cloud Cluster Configuration
const URI = process.env.COGNODB_URI || 'bolt+s://db-588b41b6.databases.cognodb.com';
const USER = process.env.COGNODB_USER || 'cognodb';
const PASSWORD = process.env.COGNODB_PASSWORD || '4248337d3439dc7f34b1e1729e62d31d';

const driver = neo4j.driver(URI, neo4j.auth.basic(USER, PASSWORD), {
  maxConnectionPoolSize: 50,
  connectionAcquisitionTimeout: 10000,
  connectionTimeout: 10000,
});

async function verifyConnectivity() {
  try {
    await driver.verifyConnectivity();
    logger.info('Connected to CognoDB successfully.');
    return true;
  } catch (error) {
    logger.error('Failed to connect to CognoDB', { error: error.message });
    throw error;
  }
}

/**
 * Execute a read transaction with automatic retries for transient errors.
 */
async function executeRead(cypher, params = {}) {
  const session = driver.session({ database: 'neo4j' });
  try {
    return await session.executeRead(tx => tx.run(cypher, params));
  } finally {
    await session.close();
  }
}

/**
 * Execute a write transaction with automatic retries for transient errors.
 */
async function executeWrite(cypher, params = {}) {
  const session = driver.session({ database: 'neo4j' });
  try {
    return await session.executeWrite(tx => tx.run(cypher, params));
  } finally {
    await session.close();
  }
}

async function closeDriver() {
  if (driver) {
    await driver.close();
  }
}

module.exports = {
  driver,
  verifyConnectivity,
  executeRead,
  executeWrite,
  closeDriver
};
