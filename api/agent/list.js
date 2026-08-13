const agentPassportService = require('../../server/src/services/agentPassportService');
const cache = require('../../server/src/config/queryCache');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const agents = await agentPassportService.listAgents();
    return res.status(200).json(agents);
  } catch (err) {
    if (cache && cache.agents) {
      return res.status(200).json(cache.agents);
    }
    return res.status(500).json({ error: true, message: err.message });
  }
};
