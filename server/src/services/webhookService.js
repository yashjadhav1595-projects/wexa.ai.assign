const crypto = require('crypto');
const { driver } = require('../config/db');
const auditService = require('./auditService');
const githubAppService = require('./githubAppService');
const logger = require('../utils/logger');
const { ingestGraph } = require('../../seed/githubIngest');

class WebhookService {
  /**
   * Verify HMAC SHA-256 signature from GitHub webhook header.
   */
  verifySignature(payloadBody, signatureHeader) {
    const secret = process.env.WEBHOOK_SECRET || 'default-webhook-secret';
    if (!signatureHeader) {
      // In development or simulation mode, warn if no secret header is present
      if (process.env.NODE_ENV === 'development' || !process.env.WEBHOOK_SECRET) {
        logger.warn('[Webhook] No signature header provided. Allowed in development/simulation.');
        return true;
      }
      return false;
    }

    try {
      const hmac = crypto.createHmac('sha256', secret);
      const computedSignature = `sha256=${hmac.update(payloadBody).digest('hex')}`;
      return crypto.timingSafeEqual(Buffer.from(signatureHeader), Buffer.from(computedSignature));
    } catch (err) {
      logger.error('[Webhook] Error validating signature:', err.message);
      return false;
    }
  }

  /**
   * Main entry point to process inbound GitHub webhook events.
   */
  async processEvent(eventName, payload) {
    logger.info(`📡 [Webhook Receiver] Processing event: ${eventName} (Action: ${payload.action || 'n/a'})`);

    switch (eventName) {
      case 'membership':
      case 'organization':
        return await this.handleMembershipEvent(payload);

      case 'member':
        return await this.handleRepoMemberEvent(payload);

      case 'repository':
        return await this.handleRepositoryEvent(payload);

      case 'installation':
        return await this.handleInstallationEvent(payload);

      case 'pull_request':
        return await this.handlePullRequestEvent(payload);

      case 'push':
        return await this.handlePushEvent(payload);

      default:
        logger.info(`[Webhook] Unhandled event '${eventName}', skipping graph mutation.`);
        return { handled: true, event: eventName, action: payload.action, message: 'Acknowledged' };
    }
  }

  /**
   * Handles user added/removed from an Organization
   */
  async handleMembershipEvent(payload) {
    const { action, member, organization } = payload;
    if (!member || !organization) return { handled: false, error: 'Missing member or organization in payload' };

    const username = member.login;
    const orgName = organization.login.toLowerCase();

    if (driver) {
      const session = driver.session();
      try {
        if (action === 'added') {
          await session.run(
            `MERGE (c:Contributor {id: $username})
             ON CREATE SET c.name = $username, c.createdAt = datetime()
             MERGE (o:Organization {id: $orgName})
             ON CREATE SET o.name = $orgName, o.createdAt = datetime()
             MERGE (c)-[r:WORKS_AT]->(o)
             SET r.role = $role, r.updatedAt = datetime()`,
            { username, orgName, role: payload.scope || 'member' }
          );
          logger.info(`[Graph Mutation] Added WORKS_AT relation: (${username})-[:WORKS_AT]->(${orgName})`);
        } else if (action === 'removed') {
          await session.run(
            `MATCH (c:Contributor {id: $username})-[r:WORKS_AT]->(o:Organization {id: $orgName})
             DELETE r`,
            { username, orgName }
          );
          logger.info(`[Graph Mutation] Removed WORKS_AT relation: (${username}) -> (${orgName})`);
        }
      } finally {
        await session.close();
      }
    }

    await auditService.logAccess(
      username,
      'MEMBERSHIP_SYNC',
      'Organization',
      orgName,
      'GRANTED',
      `Live Webhook processed membership '${action}' for ${username} in ${orgName}.`
    );

    return { success: true, event: 'membership', action, username, organization: orgName };
  }

  /**
   * Handles collaborator added/removed from a repository
   */
  async handleRepoMemberEvent(payload) {
    const { action, member, repository } = payload;
    if (!member || !repository) return { handled: false, error: 'Missing member or repository' };

    const username = member.login;
    const repoId = repository.name.toLowerCase();

    if (driver) {
      const session = driver.session();
      try {
        if (action === 'added') {
          await session.run(
            `MERGE (c:Contributor {id: $username})
             MERGE (p:Project {id: $repoId})
             MERGE (c)-[r:CONTRIBUTED_TO]->(p)
             SET r.role = 'collaborator', r.updatedAt = datetime()`,
            { username, repoId }
          );
        } else if (action === 'removed') {
          await session.run(
            `MATCH (c:Contributor {id: $username})-[r:CONTRIBUTED_TO]->(p:Project {id: $repoId})
             DELETE r`,
            { username, repoId }
          );
        }
      } finally {
        await session.close();
      }
    }

    return { success: true, event: 'member', action, username, repository: repoId };
  }

  /**
   * Handles repository creation/deletion/renaming
   */
  async handleRepositoryEvent(payload) {
    const { action, repository } = payload;
    if (!repository) return { handled: false, error: 'Missing repository' };

    const repoName = repository.name;
    const repoId = repoName.toLowerCase();
    const orgName = (repository.owner?.login || 'default').toLowerCase();

    if (driver) {
      const session = driver.session();
      try {
        if (action === 'created' || action === 'publicized') {
          await session.run(
            `MERGE (p:Project {id: $repoId})
             ON CREATE SET p.name = $repoName, p.stars = $stars, p.language = $language, p.createdAt = datetime()
             MERGE (o:Organization {id: $orgName})
             MERGE (o)-[:OWNS_ASSET]->(p)`,
            {
              repoId,
              repoName,
              stars: repository.stargazers_count || 0,
              language: repository.language || 'Unknown',
              orgName,
            }
          );
          logger.info(`[Graph Mutation] Created Project '${repoId}' owned by Organization '${orgName}'`);
        } else if (action === 'deleted') {
          await session.run(
            `MATCH (p:Project {id: $repoId})
             DETACH DELETE p`,
            { repoId }
          );
          logger.info(`[Graph Mutation] Deleted Project '${repoId}' from Knowledge Graph.`);
        }
      } finally {
        await session.close();
      }
    }

    return { success: true, event: 'repository', action, repository: repoId, organization: orgName };
  }

  /**
   * Handles GitHub App Installation created on an organization
   */
  async handleInstallationEvent(payload) {
    const { action, installation } = payload;
    if (!installation) return { handled: false, error: 'Missing installation payload' };

    const account = installation.account?.login;
    logger.info(`🚀 [GitHub App Installation] Event '${action}' for account: ${account}`);

    if (action === 'created' && account) {
      try {
        // Automatically sync the newly installed organization into the ReBAC graph!
        const stats = await ingestGraph([account.toLowerCase()]);
        return { success: true, event: 'installation', action, account, autoSyncStats: stats };
      } catch (err) {
        logger.error(`[GitHub App Installation] Failed to auto-ingest ${account}: ${err.message}`);
        return { success: true, event: 'installation', action, account, syncError: err.message };
      }
    }

    return { success: true, event: 'installation', action, account };
  }

  /**
   * Handles Pull Request events
   */
  async handlePullRequestEvent(payload) {
    const { action, pull_request, repository } = payload;
    const author = pull_request.user?.login;
    const repoId = repository.name.toLowerCase();

    await auditService.logAccess(
      author || 'unknown',
      'PULL_REQUEST_ACTIVITY',
      'Project',
      repoId,
      'GRANTED',
      `PR #${pull_request.number} '${action}' by ${author} on ${repository.full_name}.`
    );

    return { success: true, event: 'pull_request', action, prNumber: pull_request.number, author };
  }

  /**
   * Handles Push events
   */
  async handlePushEvent(payload) {
    const pusher = payload.pusher?.name || payload.sender?.login || 'unknown';
    const repoId = payload.repository?.name?.toLowerCase() || 'unknown';
    const commitCount = payload.commits?.length || 0;

    await auditService.logAccess(
      pusher,
      'CODE_PUSH',
      'Project',
      repoId,
      'GRANTED',
      `Pushed ${commitCount} commit(s) to ${payload.ref} on ${repoId}.`
    );

    return { success: true, event: 'push', repoId, commitCount, pusher };
  }
}

module.exports = new WebhookService();
