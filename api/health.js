const { verifyConnectivity } = require('../server/src/config/db');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  let dbStatus = 'disconnected';
  try {
    await verifyConnectivity();
    dbStatus = 'connected';
  } catch (err) {
    dbStatus = 'standby';
  }

  return res.status(200).json({
    status: 'ok',
    service: 'GraphGuard AI ReBAC Engine',
    version: '1.0.0',
    db: dbStatus,
    githubApp: {
      configured: Boolean(process.env.APP_ID && process.env.PRIVATE_KEY_PATH),
      webhooksActive: true,
      supportEmail: process.env.SUPPORT_EMAIL || 'yashjadhav.career@gmail.com',
    },
    uptimeSeconds: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
  });
};
