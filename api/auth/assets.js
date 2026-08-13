const authService = require('../../server/src/services/authService');

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
    return res.status(500).json({ error: true, message: err.message });
  }
};
