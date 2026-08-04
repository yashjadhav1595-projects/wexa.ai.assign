const { driver } = require('../config/db');
const crypto = require('crypto');

class AuditService {
  async logAccess(userId, action, resourceType, resourceId, decision, reason) {
    const session = driver.session();
    try {
      const result = await session.run(
        `CREATE (a:AuditLog {
           id: $id,
           timestamp: timestamp(),
           userId: $userId,
           action: $action,
           resourceType: $resourceType,
           resourceId: $resourceId,
           decision: $decision,
           reason: $reason
         })
         RETURN a`,
        { id: crypto.randomUUID(), userId, action, resourceType, resourceId, decision, reason }
      );
      return result.records[0].get('a').properties;
    } finally {
      await session.close();
    }
  }

  async getRecentLogs(limit = 50) {
    const session = driver.session();
    try {
      const result = await session.run(
        `MATCH (a:AuditLog)
         RETURN a
         ORDER BY a.timestamp DESC
         LIMIT toInteger($limit)`,
        { limit }
      );
      return result.records.map(record => {
        const props = record.get('a').properties;
        // Format timestamp string safely
        if (props.timestamp) {
          if (typeof props.timestamp.toNumber === 'function') {
            props.timestamp = props.timestamp.toNumber();
          } else if (typeof props.timestamp.toString === 'function') {
            props.timestamp = props.timestamp.toString();
          }
        }
        return props;
      });
    } finally {
      await session.close();
    }
  }
}

module.exports = new AuditService();
