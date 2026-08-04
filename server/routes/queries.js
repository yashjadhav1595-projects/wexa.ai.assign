const express = require('express');
const router = express.Router();
const { getSession } = require('../db');

const toNum = v => (v?.toNumber ? v.toNumber() : v);

/**
 * GET /api/queries/collaboration-network/:contributorId
 *
 * MULTI-HOP TRAVERSAL (2+ hops):
 * Find all contributors within 2 hops of a given contributor,
 * connected via shared projects. Shows the collaboration neighborhood.
 */
router.get('/collaboration-network/:contributorId', async (req, res) => {
  const session = getSession();
  try {
    const result = await session.run(
      `MATCH path = (start:Contributor {id: $id})-[:CONTRIBUTED_TO*1..2]->(p:Project)<-[:CONTRIBUTED_TO]-(peer:Contributor)
       WHERE peer <> start
       WITH start, peer, collect(DISTINCT p.name) AS sharedProjects, length(path) AS hops
       RETURN peer, sharedProjects, min(hops) AS minHops
       ORDER BY size(sharedProjects) DESC, minHops ASC
       LIMIT 20`,
      { id: req.params.contributorId }
    );
    const peers = result.records.map(r => ({
      ...r.get('peer').properties,
      followers: toNum(r.get('peer').properties.followers),
      sharedProjects: r.get('sharedProjects'),
      hops: toNum(r.get('minHops')),
    }));
    res.json({ query: 'collaboration-network', peers });
  } catch (err) {
    res.status(503).json({ error: 'Database error', message: err.message });
  } finally {
    await session.close();
  }
});

/**
 * GET /api/queries/supply-chain-risk
 *
 * GRAPH-SPECIFIC QUERY (awkward in SQL):
 * Find organizations that share maintainers across projects with dependency relationships.
 * I.e., org A and org B share a contributor, AND one of their projects depends on the other's.
 * This is a supply-chain risk indicator.
 */
router.get('/supply-chain-risk', async (req, res) => {
  const session = getSession();
  try {
    const result = await session.run(
      `MATCH (orgA:Organization)<-[:PART_OF]-(projA:Project)-[:DEPENDS_ON]->(projB:Project)-[:PART_OF]->(orgB:Organization)
       WHERE orgA <> orgB
       MATCH (c:Contributor)-[:CONTRIBUTED_TO]->(projA)
       MATCH (c)-[:CONTRIBUTED_TO]->(projB)
       RETURN orgA.name AS orgA, projA.name AS projectA,
              projB.name AS projectB, orgB.name AS orgB,
              c.name AS sharedContributor, c.id AS contributorId,
              c.avatarColor AS avatarColor
       ORDER BY orgA.name`
    );
    const risks = result.records.map(r => ({
      orgA: r.get('orgA'),
      projectA: r.get('projectA'),
      projectB: r.get('projectB'),
      orgB: r.get('orgB'),
      sharedContributor: r.get('sharedContributor'),
      contributorId: r.get('contributorId'),
      avatarColor: r.get('avatarColor'),
    }));
    res.json({ query: 'supply-chain-risk', risks });
  } catch (err) {
    res.status(503).json({ error: 'Database error', message: err.message });
  } finally {
    await session.close();
  }
});

/**
 * GET /api/queries/tech-cooccurrence
 *
 * Find technology pairs that co-occur most frequently across projects.
 * Reveals the tech stack combinations that dominate the ecosystem.
 */
router.get('/tech-cooccurrence', async (req, res) => {
  const session = getSession();
  try {
    const result = await session.run(
      `MATCH (t1:Technology)<-[:USES_TECHNOLOGY]-(p:Project)-[:USES_TECHNOLOGY]->(t2:Technology)
       WHERE id(t1) < id(t2)
       RETURN t1.name AS tech1, t2.name AS tech2,
              t1.category AS cat1, t2.category AS cat2,
              count(p) AS coOccurrences,
              collect(p.name) AS projects
       ORDER BY coOccurrences DESC
       LIMIT 20`
    );
    const pairs = result.records.map(r => ({
      tech1: r.get('tech1'),
      tech2: r.get('tech2'),
      cat1: r.get('cat1'),
      cat2: r.get('cat2'),
      coOccurrences: toNum(r.get('coOccurrences')),
      projects: r.get('projects'),
    }));
    res.json({ query: 'tech-cooccurrence', pairs });
  } catch (err) {
    res.status(503).json({ error: 'Database error', message: err.message });
  } finally {
    await session.close();
  }
});

/**
 * GET /api/queries/dependency-chain/:projectId
 *
 * MULTI-HOP TRAVERSAL (variable depth):
 * Finds the full transitive dependency tree of a project.
 * A SQL recursive CTE can do this, but graph traversal is natural.
 */
router.get('/dependency-chain/:projectId', async (req, res) => {
  const session = getSession();
  try {
    const result = await session.run(
      `MATCH path = (start:Project {id: $id})-[:DEPENDS_ON*1..5]->(dep:Project)
       RETURN dep, length(path) AS depth, [n IN nodes(path) | n.name] AS chain
       ORDER BY depth ASC`,
      { id: req.params.projectId }
    );
    const deps = result.records.map(r => ({
      ...r.get('dep').properties,
      stars: toNum(r.get('dep').properties.stars),
      depth: toNum(r.get('depth')),
      chain: r.get('chain'),
    }));
    res.json({ query: 'dependency-chain', projectId: req.params.projectId, deps });
  } catch (err) {
    res.status(503).json({ error: 'Database error', message: err.message });
  } finally {
    await session.close();
  }
});

/**
 * GET /api/queries/bridge-contributors
 *
 * GRAPH-SPECIFIC QUERY:
 * Find contributors who contribute to projects from multiple different organizations.
 * These are "bridge" contributors — they cross organizational boundaries and represent
 * both influence and supply-chain risk.
 */
router.get('/bridge-contributors', async (req, res) => {
  const session = getSession();
  try {
    const result = await session.run(
      `MATCH (c:Contributor)-[:CONTRIBUTED_TO]->(p:Project)-[:PART_OF]->(o:Organization)
       WITH c, collect(DISTINCT o.name) AS orgs, collect(DISTINCT p.name) AS projects
       WHERE size(orgs) >= 2
       RETURN c, orgs, projects, size(orgs) AS orgSpan
       ORDER BY orgSpan DESC, size(projects) DESC`
    );
    const bridges = result.records.map(r => ({
      ...r.get('c').properties,
      followers: toNum(r.get('c').properties.followers),
      orgs: r.get('orgs'),
      projects: r.get('projects'),
      orgSpan: toNum(r.get('orgSpan')),
    }));
    res.json({ query: 'bridge-contributors', bridges });
  } catch (err) {
    res.status(503).json({ error: 'Database error', message: err.message });
  } finally {
    await session.close();
  }
});

/**
 * GET /api/queries/shortest-path?from=c-1&to=c-8
 *
 * GRAPH-SPECIFIC QUERY (impossible in SQL without recursive CTEs):
 * Shortest collaboration path between two contributors via shared projects.
 */
router.get('/shortest-path', async (req, res) => {
  const { from, to } = req.query;
  if (!from || !to) return res.status(400).json({ error: 'Provide ?from=<id>&to=<id>' });
  const session = getSession();
  try {
    const result = await session.run(
      `MATCH (start:Contributor {id: $from}), (end:Contributor {id: $to})
       MATCH path = shortestPath((start)-[:CONTRIBUTED_TO|FOLLOWS*..6]-(end))
       RETURN [node IN nodes(path) | {
         labels: labels(node),
         name: coalesce(node.name, node.title),
         id: node.id,
         avatarColor: node.avatarColor
       }] AS pathNodes,
       length(path) AS pathLength`,
      { from, to }
    );
    if (!result.records.length) {
      return res.json({ query: 'shortest-path', found: false, pathNodes: [], pathLength: 0 });
    }
    const r = result.records[0];
    res.json({
      query: 'shortest-path',
      found: true,
      pathNodes: r.get('pathNodes'),
      pathLength: toNum(r.get('pathLength')),
    });
  } catch (err) {
    res.status(503).json({ error: 'Database error', message: err.message });
  } finally {
    await session.close();
  }
});

module.exports = router;
