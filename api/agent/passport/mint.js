const agentPassportService = require('../../../server/src/services/agentPassportService');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { agentId, delegatedBy, task, ttlMinutes, allowedScopes, maxHops } = req.body || {};

  try {
    const passport = await agentPassportService.mintPassport({
      agentId,
      delegatedBy,
      task,
      ttlMinutes,
      allowedScopes,
      maxHops
    });
    return res.status(200).json({ success: true, passport });
  } catch (err) {
    return res.status(500).json({ error: true, message: err.message });
  }
};
