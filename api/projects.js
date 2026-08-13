const projectService = require('../server/src/services/projectService');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const list = await projectService.getAllProjects();
    return res.status(200).json(list);
  } catch (err) {
    return res.status(500).json({ error: true, message: err.message });
  }
};
