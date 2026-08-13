const organizationService = require('../server/src/services/organizationService');
const cache = require('../server/src/config/queryCache');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const orgs = await organizationService.getAllOrganizations();
    return res.status(200).json(orgs);
  } catch (err) {
    if (cache && cache.organizations) {
      return res.status(200).json(cache.organizations);
    }
    return res.status(500).json({ error: true, message: err.message });
  }
};
