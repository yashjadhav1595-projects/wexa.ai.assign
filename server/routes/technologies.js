const express = require('express');
const router = express.Router();
const { getSession } = require('../db');

// GET /api/technologies
router.get('/', async (req, res) => {
  const session = getSession();
  try {
    const result = await session.run(
      `MATCH (t:Technology)
       OPTIONAL MATCH (p:Project)-[:USES_TECHNOLOGY]->(t)
       RETURN t, count(p) AS projectCount
       ORDER BY projectCount DESC`
    );
    const techs = result.records.map(r => ({
      ...r.get('t').properties,
      projectCount: r.get('projectCount').toNumber ? r.get('projectCount').toNumber() : r.get('projectCount'),
    }));
    res.json(techs);
  } catch (err) {
    res.status(503).json({ error: 'Database error', message: err.message });
  } finally {
    await session.close();
  }
});

module.exports = router;
