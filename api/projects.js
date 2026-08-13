const projectService = require('../server/src/services/projectService');
const cache = require('../server/src/config/queryCache');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const projects = await projectService.getAllProjects();
    return res.status(200).json(projects);
  } catch (err) {
    if (cache && cache.projects) {
      return res.status(200).json(cache.projects);
    }
    return res.status(500).json({ error: true, message: err.message });
  }
};
