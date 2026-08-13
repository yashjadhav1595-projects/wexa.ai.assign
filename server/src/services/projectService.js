const { executeRead, driver } = require('../config/db');
const { parseNeo4jNumber, parseNodeProperties } = require('../utils/neo4jUtils');
const { mockProjects } = require('../utils/mockGraphData');
const logger = require('../utils/logger');

class ProjectService {
  async getAllProjects() {
    if (!driver) {
      return mockProjects;
    }
    try {
      const cypher = `
        MATCH (p:Project)
        OPTIONAL MATCH (p)-[:USES_TECHNOLOGY]->(t:Technology)
        OPTIONAL MATCH (p)-[:PART_OF]->(o:Organization)
        OPTIONAL MATCH (c:Contributor)-[:CONTRIBUTED_TO]->(p)
        RETURN p,
               collect(DISTINCT t.name) AS technologies,
               o.name AS org,
               count(DISTINCT c) AS contributorCount
        ORDER BY p.stars DESC
      `;
      const result = await executeRead(cypher);
      
      return result.records.map(r => {
        const p = parseNodeProperties(r.get('p'));
        return {
          ...p,
          technologies: r.get('technologies'),
          org: r.get('org'),
          contributorCount: parseNeo4jNumber(r.get('contributorCount')),
        };
      });
    } catch (err) {
      logger.warn(`[ProjectService] DB error: ${err.message}. Falling back to mock projects.`);
      return mockProjects;
    }
  }

  async getProjectById(id) {
    if (!driver) {
      const found = mockProjects.find(p => p.id === id || p.name === id);
      return found || mockProjects[0];
    }
    try {
      const cypher = `
        MATCH (p:Project {id: $id})
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
               collect(DISTINCT {id: dep_in.id, name: dep_in.name}) AS dependents
      `;
      const result = await executeRead(cypher, { id });
      if (!result.records.length) return null;

      const r = result.records[0];
      const p = parseNodeProperties(r.get('p'));

      return {
        ...p,
        technologies: r.get('technologies').filter(Boolean).map(parseNodeProperties),
        org: r.get('org') ? parseNodeProperties(r.get('org')) : null,
        contributors: r.get('contributors')
          .filter(x => x.contributor)
          .map(x => ({
            ...parseNodeProperties(x.contributor),
            role: x.role,
            commits: parseNeo4jNumber(x.commits),
          })),
        dependencies: r.get('dependencies')
          .filter(x => x.project)
          .map(x => ({
            ...parseNodeProperties(x.project),
            version: x.version,
            type: x.type,
          })),
        dependents: r.get('dependents').filter(x => x.id),
      };
    } catch (err) {
      return mockProjects[0];
    }
  }
}

module.exports = new ProjectService();
