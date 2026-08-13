const openFgaBridge = require('../../../server/src/services/openFgaBridge');
const cache = require('../../../server/src/config/queryCache');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const tuples = await openFgaBridge.exportZanzibarTuples();
    return res.status(200).json({
      model: 'openfga/graphguard-rebac-v1',
      total_tuples: tuples.length,
      tuples
    });
  } catch (err) {
    if (cache && cache.tuples) {
      return res.status(200).json({
        model: 'openfga/graphguard-rebac-v1',
        total_tuples: cache.tuples.length,
        tuples: cache.tuples
      });
    }
    return res.status(500).json({ error: true, message: err.message });
  }
};
