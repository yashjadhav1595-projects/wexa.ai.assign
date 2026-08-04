const express = require('express');
const router = express.Router();
const { getSession } = require('../db');

// GET /api/organizations
router.get('/', async (req, res) => {
  const session = getSession();
  try {
    const result = await session.run(
      `MATCH (o:Organization)
       OPTIONAL MATCH (c:Contributor)-[:WORKS_AT]->(o)
       OPTIONAL MATCH (o)-[:SPONSORS]->(p:Project)
       OPTIONAL MATCH (proj:Project)-[:PART_OF]->(o)
       RETURN o,
              count(DISTINCT c) AS employeeCount,
              count(DISTINCT p) AS sponsoredCount,
              count(DISTINCT proj) AS ownedCount
       ORDER BY o.name`
    );
    const orgs = result.records.map(r => {
      const toNum = v => (v?.toNumber ? v.toNumber() : v);
      return {
        ...r.get('o').properties,
        founded: toNum(r.get('o').properties.founded),
        employeeCount: toNum(r.get('employeeCount')),
        sponsoredCount: toNum(r.get('sponsoredCount')),
        ownedCount: toNum(r.get('ownedCount')),
      };
    });
    res.json(orgs);
  } catch (err) {
    res.status(503).json({ error: 'Database error', message: err.message });
  } finally {
    await session.close();
  }
});

// GET /api/organizations/:id
router.get('/:id', async (req, res) => {
  const session = getSession();
  try {
    const result = await session.run(
      `MATCH (o:Organization {id: $id})
       OPTIONAL MATCH (c:Contributor)-[wa:WORKS_AT]->(o)
       OPTIONAL MATCH (o)-[sp:SPONSORS]->(sponsored:Project)
       OPTIONAL MATCH (owned:Project)-[:PART_OF]->(o)
       RETURN o,
              collect(DISTINCT {contributor: c, since: wa.since, role: wa.role}) AS employees,
              collect(DISTINCT {project: sponsored, amount: sp.amount, since: sp.since}) AS sponsoring,
              collect(DISTINCT owned) AS ownedProjects`,
      { id: req.params.id }
    );
    if (!result.records.length) return res.status(404).json({ error: 'Organization not found' });
    const r = result.records[0];
    const toNum = v => (v?.toNumber ? v.toNumber() : v);
    const o = r.get('o').properties;

    res.json({
      ...o,
      founded: toNum(o.founded),
      employees: r.get('employees').filter(x => x.contributor).map(x => ({
        ...x.contributor.properties,
        followers: toNum(x.contributor.properties.followers),
        since: toNum(x.since),
        role: x.role,
      })),
      sponsoring: r.get('sponsoring').filter(x => x.project).map(x => ({
        ...x.project.properties,
        stars: toNum(x.project.properties.stars),
        amount: toNum(x.amount),
        since: toNum(x.since),
      })),
      ownedProjects: r.get('ownedProjects').filter(p => p).map(p => ({
        ...p.properties,
        stars: toNum(p.properties.stars),
      })),
    });
  } catch (err) {
    res.status(503).json({ error: 'Database error', message: err.message });
  } finally {
    await session.close();
  }
});

module.exports = router;
