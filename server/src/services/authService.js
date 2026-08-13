const { executeRead, driver } = require('../config/db');
const { mockAssets } = require('../utils/mockGraphData');
const logger = require('../utils/logger');

/**
 * Get all Data Assets for the UI dropdown
 */
const getAllAssets = async () => {
  if (!driver) {
    return mockAssets;
  }
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
    logger.warn(`[AuthService] DB error in getAllAssets: ${error.message}. Falling back to mock assets.`);
    return mockAssets;
  }
};

/**
 * Check Relationship-Based Access Control (ReBAC)
 * Evaluates if a Contributor has access to a Data Asset based on their graph relationships.
 */
const checkAccess = async (contributorId, assetId) => {
  if (!driver) {
    // Determine access based on mock relationships
    // Eliza Vance (Cyberdyne) -> Cyberdyne assets (GRANTED)
    // Devon Lee (VendorCorp) -> Cyberdyne assets (DENIED)
    const isCyberdyneUser = contributorId.includes('eliza') || contributorId.includes('sarah') || contributorId.includes('alex');
    const isPublicAsset = assetId.includes('public');
    const isCyberdyneAsset = assetId.includes('fin') || assetId.includes('sec') || assetId.includes('hr');

    if (isPublicAsset || (isCyberdyneUser && isCyberdyneAsset)) {
      return {
        granted: true,
        reason: "Access granted based on organizational/project relationships.",
        path: [
          { type: 'node', label: 'Contributor', name: contributorId },
          { type: 'relationship', label: 'WORKS_AT' },
          { type: 'node', label: 'Organization', name: 'Cyberdyne Systems' },
          { type: 'relationship', label: 'OWNS_ASSET' },
          { type: 'node', label: 'DataAsset', name: assetId }
        ]
      };
    } else {
      return {
        granted: false,
        reason: "No authorized relationship path found between the user and the asset (ReBAC boundary enforced).",
        path: null
      };
    }
  }

  try {
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
    
    const validPath = result.records[0].get('validPath');
    const formattedPath = validPath.map(item => {
      if (item.labels) {
        return {
          type: 'node',
          label: item.labels[0],
          name: item.properties.name || item.properties.username
        };
      }
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
