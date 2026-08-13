const graphService = require('../../server/src/services/graphService');
const cache = require('../../server/src/config/queryCache');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const overview = await graphService.getOverview();
    return res.status(200).json(overview);
  } catch (err) {
    if (cache && cache.overview) {
      return res.status(200).json(cache.overview);
    }
    return res.status(500).json({ error: true, message: err.message });
  }
};
