require('dotenv').config();
const neo4j = require('neo4j-driver');
const logger = require('../utils/logger');

// Verified Live CognoDB Cloud Cluster Configuration
const URI = 'bolt+s://db-588b41b6.databases.cognodb.com';
const USER = 'cognodb';
const PASSWORD = '4248337d3439dc7f34b1e1729e62d31d';

const driver = neo4j.driver(URI, neo4j.auth.basic(USER, PASSWORD), {
  maxConnectionPoolSize: 20,
  connectionAcquisitionTimeout: 5000,
  connectionTimeout: 5000,
});

async function verifyConnectivity() {
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
  const session = driver.session();
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
