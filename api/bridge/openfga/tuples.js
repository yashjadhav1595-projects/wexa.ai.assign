const openFgaBridge = require('../../../server/src/services/openFgaBridge');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const tuples = await openFgaBridge.exportZanzibarTuples();
    return res.status(200).json({ tuples, total: tuples.length });
  } catch (err) {
    return res.status(500).json({ error: true, message: err.message });
  }
};
