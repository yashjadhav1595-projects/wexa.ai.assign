require('dotenv').config();
const neo4j = require('neo4j-driver');

const URI = process.env.COGNODB_URI;
const USER = process.env.COGNODB_USER || 'cognodb';
const PASSWORD = process.env.COGNODB_PASSWORD;

if (!URI || !PASSWORD) {
  console.error('[DB] ERROR: COGNODB_URI and COGNODB_PASSWORD must be set in environment variables.');
  process.exit(1);
}

const driver = neo4j.driver(URI, neo4j.auth.basic(USER, PASSWORD), {
  maxConnectionPoolSize: 50,
  connectionAcquisitionTimeout: 10000,
  connectionTimeout: 10000,
});

/**
 * Verifies connectivity to CognoDB. Throws on failure.
 */
async function verifyConnectivity() {
  await driver.verifyConnectivity();
  console.log('[DB] Connected to CognoDB successfully.');
}

/**
 * Returns a new driver session.
 */
function getSession() {
  return driver.session({ database: 'neo4j' });
}

/**
 * Gracefully closes the driver.
 */
async function closeDriver() {
  await driver.close();
}

module.exports = { driver, verifyConnectivity, getSession, closeDriver };
