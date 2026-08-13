const authService = require('../../server/src/services/authService');
const cache = require('../../server/src/config/queryCache');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const assets = await authService.getAllAssets();
    return res.status(200).json(assets);
  } catch (err) {
    if (cache && cache.assets) {
      return res.status(200).json(cache.assets);
    }
    return res.status(500).json({ error: true, message: err.message });
  }
};
