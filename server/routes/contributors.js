const express = require('express');
const router = express.Router();
const { getSession } = require('../db');

// GET /api/contributors — list all contributors
router.get('/', async (req, res) => {
  const session = getSession();
  try {
    const result = await session.run(
      `MATCH (c:Contributor)
       OPTIONAL MATCH (c)-[:CONTRIBUTED_TO]->(p:Project)
       OPTIONAL MATCH (c)-[:WORKS_AT]->(o:Organization)
       RETURN c,
              count(DISTINCT p) AS projectCount,
              collect(DISTINCT o.name) AS orgList
       ORDER BY c.followers DESC`
    );
    const contributors = result.records.map(r => ({
      ...r.get('c').properties,
      followers: r.get('c').properties.followers.toNumber ? r.get('c').properties.followers.toNumber() : r.get('c').properties.followers,
      projectCount: r.get('projectCount').toNumber ? r.get('projectCount').toNumber() : r.get('projectCount'),
      org: r.get('orgList')[0],
    }));
    res.json(contributors);
  } catch (err) {
    res.status(503).json({ error: 'Database error', message: err.message });
  } finally {
    await session.close();
  }
});

// GET /api/contributors/:id — single contributor with all relationships
router.get('/:id', async (req, res) => {
  const session = getSession();
  try {
    const result = await session.run(
      `MATCH (c:Contributor {id: $id})
       OPTIONAL MATCH (c)-[ct:CONTRIBUTED_TO]->(p:Project)
       OPTIONAL MATCH (c)-[wa:WORKS_AT]->(o:Organization)
       OPTIONAL MATCH (c)-[:AUTHORED]->(i:Issue)
       OPTIONAL MATCH (c)-[:FOLLOWS]->(f:Contributor)
       RETURN c,
              collect(DISTINCT {project: p, role: ct.role, commits: ct.commits}) AS projects,
              collect(DISTINCT {org: o, since: wa.since, role: wa.role}) AS orgs,
              collect(DISTINCT i) AS issues,
              collect(DISTINCT {id: f.id, name: f.name, username: f.username, avatarColor: f.avatarColor}) AS following`,
      { id: req.params.id }
    );
    if (!result.records.length) return res.status(404).json({ error: 'Contributor not found' });
    const r = result.records[0];
    const c = r.get('c').properties;

    const projects = r.get('projects')
      .filter(x => x.project)
      .map(x => ({
        ...x.project.properties,
        stars: x.project.properties.stars?.toNumber ? x.project.properties.stars.toNumber() : x.project.properties.stars,
        forks: x.project.properties.forks?.toNumber ? x.project.properties.forks.toNumber() : x.project.properties.forks,
        createdYear: x.project.properties.createdYear?.toNumber ? x.project.properties.createdYear.toNumber() : x.project.properties.createdYear,
        role: x.role,
        commits: x.commits?.toNumber ? x.commits.toNumber() : x.commits,
      }));

    const orgs = r.get('orgs')
      .filter(x => x.org)
      .map(x => ({
        ...x.org.properties,
        since: x.since?.toNumber ? x.since.toNumber() : x.since,
        role: x.role,
      }));

    res.json({
      ...c,
      followers: c.followers?.toNumber ? c.followers.toNumber() : c.followers,
      projects,
      orgs,
      issues: r.get('issues').map(i => i.properties),
      following: r.get('following').filter(f => f.id),
    });
  } catch (err) {
    res.status(503).json({ error: 'Database error', message: err.message });
  } finally {
    await session.close();
  }
});

module.exports = router;
