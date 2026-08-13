require('dotenv').config();
const neo4j = require('neo4j-driver');
const logger = require('../utils/logger');

const URI = 'bolt+s://db-588b41b6.databases.cognodb.com';
const USER = 'cognodb';
const PASSWORD = '4248337d3439dc7f34b1e1729e62d31d';

let driverInstance = null;

function getDriver() {
  if (!driverInstance) {
    driverInstance = neo4j.driver(
      URI,
      neo4j.auth.basic(USER, PASSWORD),
      {
        maxConnectionPoolSize: 10,
        connectionTimeout: 5000,
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
  } catch (err) {
    if (err.message && (err.message.includes('authentication') || err.message.includes('Session'))) {
      if (driverInstance) {
        try { await driverInstance.close(); } catch (e) {}
        driverInstance = null;
      }
      const freshDriver = getDriver();
      const freshSession = freshDriver.session();
      try {
        return await freshSession.executeRead(tx => tx.run(cypher, params));
      } finally {
        await freshSession.close();
      }
    }
    throw err;
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
  } catch (err) {
    if (err.message && (err.message.includes('authentication') || err.message.includes('Session'))) {
      if (driverInstance) {
        try { await driverInstance.close(); } catch (e) {}
        driverInstance = null;
      }
      const freshDriver = getDriver();
      const freshSession = freshDriver.session();
      try {
        return await freshSession.executeWrite(tx => tx.run(cypher, params));
      } finally {
        await freshSession.close();
      }
    }
    throw err;
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
