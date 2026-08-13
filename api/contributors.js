const contributorService = require('../server/src/services/contributorService');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const list = await contributorService.getAllContributors();
    return res.status(200).json(list);
  } catch (err) {
    return res.status(500).json({ error: true, message: err.message });
  }
};
