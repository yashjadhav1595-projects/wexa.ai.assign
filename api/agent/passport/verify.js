const agentPassportService = require('../../../server/src/services/agentPassportService');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { token } = req.body || {};

  try {
    const result = agentPassportService.verifyPassport(token);
    return res.status(200).json(result);
  } catch (err) {
    return res.status(500).json({ error: true, message: err.message });
  }
};
