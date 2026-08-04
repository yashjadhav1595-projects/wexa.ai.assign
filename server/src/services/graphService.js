const { executeRead } = require('../config/db');
const { parseNeo4jNumber, parseNodeProperties } = require('../utils/neo4jUtils');

class GraphService {
  async getStats() {
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
  }

  async getOverview() {
    const cypher = `
      MATCH (n)
      OPTIONAL MATCH (n)-[r]->(m)
      RETURN n, r, m
      LIMIT 500
    `;
    const result = await executeRead(cypher);
    return this._formatGraphResult(result);
  }

  async getCollaborationNetwork(contributorId) {
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
  }

  async getSupplyChainRisk() {
    const cypher = `
      MATCH (orgA:Organization)<-[:PART_OF]-(projA:Project)-[:DEPENDS_ON]->(projB:Project)-[:PART_OF]->(orgB:Organization)
      WHERE orgA <> orgB
      MATCH (c:Contributor)-[:CONTRIBUTED_TO]->(projA)
      MATCH (c)-[:CONTRIBUTED_TO]->(projB)
      RETURN orgA.name AS orgA, projA.name AS projectA,
             projB.name AS projectB, orgB.name AS orgB,
             c.name AS sharedContributor, c.id AS contributorId,
             c.avatarColor AS avatarColor
      ORDER BY orgA.name
    `;
    const result = await executeRead(cypher);
    return result.records.map(r => ({
      orgA: r.get('orgA'),
      projectA: r.get('projectA'),
      projectB: r.get('projectB'),
      orgB: r.get('orgB'),
      sharedContributor: r.get('sharedContributor'),
      contributorId: r.get('contributorId'),
      avatarColor: r.get('avatarColor'),
    }));
  }

  async getTechCooccurrence() {
    const cypher = `
      MATCH (t1:Technology)<-[:USES_TECHNOLOGY]-(p:Project)-[:USES_TECHNOLOGY]->(t2:Technology)
      WHERE id(t1) < id(t2)
      RETURN t1.name AS tech1, t2.name AS tech2,
             t1.category AS cat1, t2.category AS cat2,
             count(p) AS coOccurrences,
             collect(p.name) AS projects
      ORDER BY coOccurrences DESC
      LIMIT 20
    `;
    const result = await executeRead(cypher);
    return result.records.map(r => ({
      tech1: r.get('tech1'),
      tech2: r.get('tech2'),
      cat1: r.get('cat1'),
      cat2: r.get('cat2'),
      coOccurrences: parseNeo4jNumber(r.get('coOccurrences')),
      projects: r.get('projects'),
    }));
  }

  async getDependencyChain(projectId) {
    const cypher = `
      MATCH path = (start:Project {id: $id})-[:DEPENDS_ON*1..5]->(dep:Project)
      RETURN dep, length(path) AS depth, [n IN nodes(path) | n.name] AS chain
      ORDER BY depth ASC
    `;
    const result = await executeRead(cypher, { id: projectId });
    return result.records.map(r => ({
      ...parseNodeProperties(r.get('dep')),
      depth: parseNeo4jNumber(r.get('depth')),
      chain: r.get('chain'),
    }));
  }

  async getShortestPath(fromId, toId) {
    const cypher = `
      MATCH (start:Contributor {id: $from}), (end:Contributor {id: $to})
      MATCH path = shortestPath((start)-[:CONTRIBUTED_TO|FOLLOWS*..6]-(end))
      RETURN [node IN nodes(path) | {
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
