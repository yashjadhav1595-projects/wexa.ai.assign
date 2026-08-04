const express = require('express');
const router = express.Router();
const { getSession } = require('../db');

/**
 * GET /api/graph/overview
 * Returns all nodes and relationships for the full D3 force-directed graph.
 */
router.get('/overview', async (req, res) => {
  const session = getSession();
  try {
    const result = await session.run(
      `MATCH (n)
       OPTIONAL MATCH (n)-[r]->(m)
       RETURN n, r, m
       LIMIT 500`
    );

    const nodesMap = new Map();
    const links = [];

    result.records.forEach(record => {
      const n = record.get('n');
      const m = record.get('m');
      const r = record.get('r');

      if (n) {
        const id = n.properties.id || n.identity.toString();
        if (!nodesMap.has(id)) {
          nodesMap.set(id, {
            id,
            label: n.labels[0],
            name: n.properties.name || n.properties.title || n.properties.id,
            ...serializeProps(n.properties),
          });
        }
      }
      if (m) {
        const id = m.properties.id || m.identity.toString();
        if (!nodesMap.has(id)) {
          nodesMap.set(id, {
            id,
            label: m.labels[0],
            name: m.properties.name || m.properties.title || m.properties.id,
            ...serializeProps(m.properties),
          });
        }
      }
      if (r && n && m) {
        links.push({
          source: n.properties.id || n.identity.toString(),
          target: m.properties.id || m.identity.toString(),
          type: r.type,
          ...serializeProps(r.properties),
        });
      }
    });

    res.json({ nodes: Array.from(nodesMap.values()), links });
  } catch (err) {
    res.status(503).json({ error: 'Database error', message: err.message });
  } finally {
    await session.close();
  }
});

/**
 * GET /api/graph/neighborhood/:nodeId
 * Returns a node's direct neighbors (1-hop) for graph expansion.
 */
router.get('/neighborhood/:nodeId', async (req, res) => {
  const session = getSession();
  try {
    const result = await session.run(
      `MATCH (n {id: $nodeId})
       OPTIONAL MATCH (n)-[r]-(m)
       RETURN n, r, m`,
      { nodeId: req.params.nodeId }
    );

    const nodesMap = new Map();
    const links = [];

    result.records.forEach(record => {
      const n = record.get('n');
      const m = record.get('m');
      const r = record.get('r');

      [n, m].filter(Boolean).forEach(node => {
        const id = node.properties.id || node.identity.toString();
        if (!nodesMap.has(id)) {
          nodesMap.set(id, {
            id,
            label: node.labels[0],
            name: node.properties.name || node.properties.title || node.properties.id,
            ...serializeProps(node.properties),
          });
        }
      });

      if (r && n && m) {
        links.push({
          source: n.properties.id || n.identity.toString(),
          target: m.properties.id || m.identity.toString(),
          type: r.type,
        });
      }
    });

    res.json({ nodes: Array.from(nodesMap.values()), links });
  } catch (err) {
    res.status(503).json({ error: 'Database error', message: err.message });
  } finally {
    await session.close();
  }
});

/**
 * GET /api/graph/stats
 * Returns high-level graph statistics for the dashboard.
 */
router.get('/stats', async (req, res) => {
  const session = getSession();
  try {
    const result = await session.run(
      `MATCH (n)
       WITH count(n) AS nodeCount
       MATCH ()-[r]->()
       WITH nodeCount, count(r) AS relCount
       MATCH (c:Contributor) WITH nodeCount, relCount, count(c) AS contributors
       MATCH (p:Project) WITH nodeCount, relCount, contributors, count(p) AS projects
       MATCH (o:Organization) WITH nodeCount, relCount, contributors, projects, count(o) AS orgs
       MATCH (t:Technology) WITH nodeCount, relCount, contributors, projects, orgs, count(t) AS technologies
       RETURN nodeCount, relCount, contributors, projects, orgs, technologies`
    );
    const r = result.records[0];
    const toNum = v => (v?.toNumber ? v.toNumber() : v);
    res.json({
      nodes: toNum(r.get('nodeCount')),
      relationships: toNum(r.get('relCount')),
      contributors: toNum(r.get('contributors')),
      projects: toNum(r.get('projects')),
      organizations: toNum(r.get('orgs')),
      technologies: toNum(r.get('technologies')),
    });
  } catch (err) {
    res.status(503).json({ error: 'Database error', message: err.message });
  } finally {
    await session.close();
  }
});

function serializeProps(props) {
  const out = {};
  for (const [k, v] of Object.entries(props)) {
    out[k] = v?.toNumber ? v.toNumber() : v;
  }
  return out;
}

module.exports = router;
