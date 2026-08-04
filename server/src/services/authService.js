const { executeRead } = require('../config/db');
const logger = require('../utils/logger');

/**
 * Get all Data Assets for the UI dropdown
 */
const getAllAssets = async () => {
  try {
    const query = `
      MATCH (d:DataAsset)
      RETURN d
      ORDER BY d.name
    `;
    const result = await executeRead(query);
    
    return result.records.map(record => {
      const node = record.get('d').properties;
      return {
        id: node.id,
        name: node.name,
        classification: node.classification,
        sensitivity: node.sensitivity,
        description: node.description
      };
    });
  } catch (error) {
    logger.error('Error in getAllAssets', { error: error.message });
    throw error;
  }
};

/**
 * Check Relationship-Based Access Control (ReBAC)
 * Evaluates if a Contributor has access to a Data Asset based on their graph relationships.
 */
const checkAccess = async (contributorId, assetId) => {
  try {
    // We look for a valid path between the Contributor and the DataAsset.
    // Authorized paths:
    // 1. Contributor WORKS_AT an Organization that OWNS the Asset
    // 2. Contributor CONTRIBUTED_TO a Project that HAS_ACCESS_TO the Asset
    // We return the path if found, which allows us to explain *why* they have access.
    
    const query = `
      MATCH (c:Contributor {id: $contributorId})
      MATCH (d:DataAsset {id: $assetId})
      
      // Look for authorized paths
      OPTIONAL MATCH p1 = (c)-[r1:WORKS_AT]->(o:Organization)-[r2:OWNS_ASSET]->(d)
      OPTIONAL MATCH p2 = (c)-[r3:CONTRIBUTED_TO]->(p:Project)-[r4:HAS_ACCESS_TO]->(d)
      
      WITH CASE 
        WHEN p1 IS NOT NULL THEN [c, r1, o, r2, d]
        WHEN p2 IS NOT NULL THEN [c, r3, p, r4, d]
        ELSE NULL
      END AS validPath
      
      WHERE validPath IS NOT NULL
      RETURN validPath LIMIT 1
    `;
    
    const result = await executeRead(query, { contributorId, assetId });
    
    if (result.records.length === 0) {
      return {
        granted: false,
        reason: "No authorized relationship path found between the user and the asset.",
        path: null
      };
    }
    
    // An authorized path was found! Let's format it to explain *why*.
    const validPath = result.records[0].get('validPath');
    
    // Format the nodes and relationships in the path for the UI
    // validPath is an array: [Node, Relationship, Node, Relationship, Node]
    const formattedPath = validPath.map(item => {
      // If item has 'labels', it's a Node
      if (item.labels) {
        return {
          type: 'node',
          label: item.labels[0],
          name: item.properties.name || item.properties.username
        };
      }
      // If item has 'type', it's a Relationship
      if (item.type) {
        return {
          type: 'relationship',
          label: item.type
        };
      }
      return item;
    });
    
    return {
      granted: true,
      reason: "Access granted based on organizational/project relationships.",
      path: formattedPath
    };
    
  } catch (error) {
    logger.error('Error in checkAccess', { error: error.message, contributorId, assetId });
    throw error;
  }
};

module.exports = {
  getAllAssets,
  checkAccess
};
