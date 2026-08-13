const { executeRead, driver } = require('../config/db');
const { parseNeo4jNumber, parseNodeProperties } = require('../utils/neo4jUtils');
const { mockStats, mockGraphOverview } = require('../utils/mockGraphData');
const logger = require('../utils/logger');

class GraphService {
  async getStats() {
    if (!driver) {
      return mockStats;
    }
    try {
      const cypher = `
        CALL { MATCH (n) RETURN count(n) AS nodeCount }
        CALL { MATCH ()-[r]->() RETURN count(r) AS relCount }
        CALL { MATCH (c:Contributor) RETURN count(c) AS contributors }
        CALL { MATCH (p:Project) RETURN count(p) AS projects }
        CALL { MATCH (o:Organization) RETURN count(o) AS orgs }
        CALL { MATCH (t:Technology) RETURN count(t) AS technologies }
        RETURN nodeCount, relCount, contributors, projects, orgs, technologies
      `;
      const result = await executeRead(cypher);
      const r = result.records[0];
      return {
        nodes: parseNeo4jNumber(r.get('nodeCount')),
        relationships: parseNeo4jNumber(r.get('relCount')),
        contributors: parseNeo4jNumber(r.get('contributors')),
        projects: parseNeo4jNumber(r.get('projects')),
        organizations: parseNeo4jNumber(r.get('orgs')),
        technologies: parseNeo4jNumber(r.get('technologies')),
      };
    } catch (err) {
      logger.warn(`[GraphService] Error fetching stats from DB: ${err.message}. Falling back to mock data.`);
      return mockStats;
    }
  }

  async getOverview() {
    if (!driver) {
      return mockGraphOverview;
    }
    try {
      const cypher = `
        MATCH (n)
        OPTIONAL MATCH (n)-[r]->(m)
        RETURN n, r, m
        LIMIT 500
      `;
      const result = await executeRead(cypher);
      return this._formatGraphResult(result);
    } catch (err) {
      logger.warn(`[GraphService] Error fetching overview from DB: ${err.message}. Falling back to mock overview.`);
      return mockGraphOverview;
    }
  }

  async getCollaborationNetwork(contributorId) {
    if (!driver) {
      return [
        { id: 'user-marcus-ai', name: 'Marcus Chen', sharedProjects: ['graph-guard-core'], hops: 1 },
        { id: 'user-sarah-sec', name: 'Sarah Connor', sharedProjects: ['audit-sentinel'], hops: 1 },
      ];
    }
    try {
      const cypher = `
        MATCH path = (start:Contributor {id: $id})-[:CONTRIBUTED_TO*1..2]->(p:Project)<-[:CONTRIBUTED_TO]-(peer:Contributor)
        WHERE peer <> start
        WITH start, peer, collect(DISTINCT p.name) AS sharedProjects, length(path) AS hops
        RETURN peer, sharedProjects, min(hops) AS minHops
        ORDER BY size(sharedProjects) DESC, minHops ASC
        LIMIT 20
      `;
      const result = await executeRead(cypher, { id: contributorId });
      return result.records.map(r => ({
        ...parseNodeProperties(r.get('peer')),
        sharedProjects: r.get('sharedProjects'),
        hops: parseNeo4jNumber(r.get('minHops')),
      }));
    } catch (err) {
      return [
        { id: 'user-marcus-ai', name: 'Marcus Chen', sharedProjects: ['graph-guard-core'], hops: 1 }
      ];
    }
  }

  async getSupplyChainRisk() {
    if (!driver) {
      return [
        {
          orgA: 'Cyberdyne Systems',
          projA: 'graph-guard-core',
          projB: 'neural-pipeline',
          orgB: 'OpenWeave AI',
          contributor: 'Eliza Vance',
          riskLevel: 'HIGH',
          reason: 'Cross-organization maintainer with write access across critical auth components.'
        }
      ];
    }
    try {
      const cypher = `
        MATCH (orgA:Organization)<-[:PART_OF]-(projA:Project)-[:DEPENDS_ON]->(projB:Project)-[:PART_OF]->(orgB:Organization)
        WHERE orgA <> orgB
        MATCH (c:Contributor)-[:CONTRIBUTED_TO]->(projA)
        MATCH (c)-[:CONTRIBUTED_TO]->(projB)
        RETURN orgA.name AS orgA, projA.name AS projA, projB.name AS projB, orgB.name AS orgB, c.name AS contributor
        LIMIT 20
      `;
      const result = await executeRead(cypher);
      return result.records.map(r => ({
        orgA: r.get('orgA'),
        projA: r.get('projA'),
        projB: r.get('projB'),
        orgB: r.get('orgB'),
        contributor: r.get('contributor'),
      }));
    } catch (err) {
      return [];
    }
  }

  async getDependencyChain(projectId) {
    if (!driver) {
      return [
        { id: 'bolt-driver', name: 'bolt-driver', version: '^5.20.0', type: 'core' },
        { id: 'crypto-vault', name: 'crypto-vault', version: '^2.1.0', type: 'security' }
      ];
    }
    try {
      const cypher = `
        MATCH path = (p:Project {id: $id})-[:DEPENDS_ON*1..5]->(dep:Project)
        WITH dep, min(length(path)) AS depth
        OPTIONAL MATCH (dep)-[:USES_TECHNOLOGY]->(t:Technology)
        RETURN dep, depth, collect(DISTINCT t.name) AS technologies
        ORDER BY depth ASC
      `;
      const result = await executeRead(cypher, { id: projectId });
      return result.records.map(r => ({
        ...parseNodeProperties(r.get('dep')),
        depth: parseNeo4jNumber(r.get('depth')),
        technologies: r.get('technologies'),
      }));
    } catch (err) {
      return [];
    }
  }

  async getShortestPath(fromId, toId) {
    if (!driver) {
      return {
        found: true,
        pathNodes: [
          { id: fromId, name: fromId, label: 'Contributor' },
          { id: 'rel-works-at', name: 'WORKS_AT', label: 'WORKS_AT' },
          { id: toId, name: toId, label: 'Organization' }
        ],
        pathLength: 2,
      };
    }
    try {
      const cypher = `
        MATCH (start {id: $from}), (target {id: $to})
        MATCH path = shortestPath((start)-[*]-(target))
        RETURN [node in nodes(path) | {
          labels: labels(node),
          name: coalesce(node.name, node.title),
          id: node.id,
          avatarColor: node.avatarColor
        }] AS pathNodes,
        length(path) AS pathLength
      `;
      const result = await executeRead(cypher, { from: fromId, to: toId });
      if (!result.records.length) {
        return { found: false, pathNodes: [], pathLength: 0 };
      }
      const r = result.records[0];
      return {
        found: true,
        pathNodes: r.get('pathNodes'),
        pathLength: parseNeo4jNumber(r.get('pathLength')),
      };
    } catch (err) {
      return { found: false, pathNodes: [], pathLength: 0 };
    }
  }

  _formatGraphResult(result) {
    const nodesMap = new Map();
    const links = [];

    result.records.forEach(record => {
      const n = record.get('n');
      const m = record.get('m');
      const r = record.get('r');

      if (n) {
        const id = n.properties.id || n.identity.toString();
        if (!nodesMap.has(id)) {
          nodesMap.set(id, { id, label: n.labels[0], name: n.properties.name || n.properties.title || n.properties.id, ...parseNodeProperties(n) });
        }
      }
      if (m) {
        const id = m.properties.id || m.identity.toString();
        if (!nodesMap.has(id)) {
          nodesMap.set(id, { id, label: m.labels[0], name: m.properties.name || m.properties.title || m.properties.id, ...parseNodeProperties(m) });
        }
      }
      if (r && n && m) {
        links.push({
          source: n.properties.id || n.identity.toString(),
          target: m.properties.id || m.identity.toString(),
          type: r.type,
          ...parseNodeProperties(r),
        });
      }
    });

    return { nodes: Array.from(nodesMap.values()), links };
  }
}

module.exports = new GraphService();
