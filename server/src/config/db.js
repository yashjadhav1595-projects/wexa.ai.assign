require('dotenv').config();
const neo4j = require('neo4j-driver');
const logger = require('../utils/logger');

// CognoDB Cloud Cluster Configuration
const URI = process.env.COGNODB_URI || 'bolt+s://db-588b41b6.databases.cognodb.com';
const USER = process.env.COGNODB_USER || 'cognodb';
const PASSWORD = process.env.COGNODB_PASSWORD || '4248337d3439dc7f34b1e1729e62d31d';

let driverInstance = null;

function getDriver() {
  if (!driverInstance) {
    driverInstance = neo4j.driver(
      URI,
      neo4j.auth.basic(USER, PASSWORD),
      {
        maxConnectionPoolSize: 20,
        connectionTimeout: 8000,
      }
    );
  }
  return driverInstance;
}

async function verifyConnectivity() {
  const driver = getDriver();
  const session = driver.session();
  try {
    await session.run('RETURN 1 AS ping');
    return true;
  } catch (error) {
    logger.error('Failed to connect to CognoDB', { error: error.message });
    throw error;
  } finally {
    await session.close();
  }
}

/**
 * Execute a read transaction with automatic retries for transient errors.
 */
async function executeRead(cypher, params = {}) {
  const driver = getDriver();
  const session = driver.session();
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
  const driver = getDriver();
  const session = driver.session();
  try {
    return await session.executeWrite(tx => tx.run(cypher, params));
  } finally {
    await session.close();
  }
}

async function closeDriver() {
  if (driverInstance) {
    await driverInstance.close();
    driverInstance = null;
  }
}

module.exports = {
  driver: getDriver(),
  getDriver,
  verifyConnectivity,
  executeRead,
  executeWrite,
  closeDriver
};
