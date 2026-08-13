const auditService = require('../../server/src/services/auditService');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const logs = await auditService.getLogs(50);
    return res.status(200).json(logs);
  } catch (err) {
    return res.status(500).json({ error: true, message: err.message });
  }
};
