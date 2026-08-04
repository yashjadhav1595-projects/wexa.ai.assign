const express = require('express');
const router = express.Router();
const { getSession } = require('../db');

// GET /api/projects — list all projects
router.get('/', async (req, res) => {
  const session = getSession();
  try {
    const result = await session.run(
      `MATCH (p:Project)
       OPTIONAL MATCH (p)-[:USES_TECHNOLOGY]->(t:Technology)
       OPTIONAL MATCH (p)-[:PART_OF]->(o:Organization)
       OPTIONAL MATCH (c:Contributor)-[:CONTRIBUTED_TO]->(p)
       RETURN p,
              collect(DISTINCT t.name) AS technologies,
              o.name AS org,
              count(DISTINCT c) AS contributorCount
       ORDER BY p.stars DESC`
    );
    const projects = result.records.map(r => {
      const props = r.get('p').properties;
      return {
        ...props,
        stars: props.stars?.toNumber ? props.stars.toNumber() : props.stars,
        forks: props.forks?.toNumber ? props.forks.toNumber() : props.forks,
        createdYear: props.createdYear?.toNumber ? props.createdYear.toNumber() : props.createdYear,
        technologies: r.get('technologies'),
        org: r.get('org'),
        contributorCount: r.get('contributorCount').toNumber ? r.get('contributorCount').toNumber() : r.get('contributorCount'),
      };
    });
    res.json(projects);
  } catch (err) {
    res.status(503).json({ error: 'Database error', message: err.message });
  } finally {
    await session.close();
  }
});

// GET /api/projects/:id — single project with all relationships
router.get('/:id', async (req, res) => {
  const session = getSession();
  try {
    const result = await session.run(
      `MATCH (p:Project {id: $id})
       OPTIONAL MATCH (p)-[:USES_TECHNOLOGY]->(t:Technology)
       OPTIONAL MATCH (p)-[:PART_OF]->(o:Organization)
       OPTIONAL MATCH (c:Contributor)-[ct:CONTRIBUTED_TO]->(p)
       OPTIONAL MATCH (p)-[dep:DEPENDS_ON]->(dep_p:Project)
       OPTIONAL MATCH (dep_in:Project)-[:DEPENDS_ON]->(p)
       RETURN p,
              collect(DISTINCT t) AS technologies,
              o AS org,
              collect(DISTINCT {contributor: c, role: ct.role, commits: ct.commits}) AS contributors,
              collect(DISTINCT {project: dep_p, version: dep.version, type: dep.type}) AS dependencies,
              collect(DISTINCT {id: dep_in.id, name: dep_in.name}) AS dependents`,
      { id: req.params.id }
    );
    if (!result.records.length) return res.status(404).json({ error: 'Project not found' });
    const r = result.records[0];
    const p = r.get('p').properties;

    const toNum = v => (v?.toNumber ? v.toNumber() : v);

    res.json({
      ...p,
      stars: toNum(p.stars),
      forks: toNum(p.forks),
      createdYear: toNum(p.createdYear),
      technologies: r.get('technologies').filter(t => t).map(t => t.properties),
      org: r.get('org')?.properties || null,
      contributors: r.get('contributors')
        .filter(x => x.contributor)
        .map(x => ({
          ...x.contributor.properties,
          followers: toNum(x.contributor.properties.followers),
          role: x.role,
          commits: toNum(x.commits),
        })),
      dependencies: r.get('dependencies')
        .filter(x => x.project)
        .map(x => ({
          ...x.project.properties,
          stars: toNum(x.project.properties.stars),
          version: x.version,
          type: x.type,
        })),
      dependents: r.get('dependents').filter(x => x.id),
    });
  } catch (err) {
    res.status(503).json({ error: 'Database error', message: err.message });
  } finally {
    await session.close();
  }
});

module.exports = router;
