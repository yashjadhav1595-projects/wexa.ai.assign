const fs = require('fs');
const path = require('path');
const { Octokit } = require('@octokit/rest');
const logger = require('../utils/logger');

class GitHubAppService {
  constructor() {
    this.appId = process.env.APP_ID ? parseInt(process.env.APP_ID, 10) : undefined;
    this.webhookSecret = process.env.WEBHOOK_SECRET || 'default-webhook-secret';
    this.clientId = process.env.GITHUB_CLIENT_ID;
    this.clientSecret = process.env.GITHUB_CLIENT_SECRET;
    this.supportEmail = process.env.SUPPORT_EMAIL || 'yashjadhav.career@gmail.com';
    this.privateKey = this._loadPrivateKey();
    this.isConfigured = Boolean(this.appId && this.privateKey);

    if (this.isConfigured) {
      logger.info(`[GitHub App] Initialized GitHub App authentication for App ID: ${this.appId}`);
    } else {
      logger.info('[GitHub App] Running in Standby / Simulation Mode. Set APP_ID and PRIVATE_KEY in .env for live multi-tenant authentication.');
    }
  }

  _loadPrivateKey() {
    if (process.env.PRIVATE_KEY) {
      return process.env.PRIVATE_KEY.replace(/\\n/g, '\n');
    }
    if (process.env.PRIVATE_KEY_PATH) {
      const keyPath = path.resolve(process.cwd(), process.env.PRIVATE_KEY_PATH);
      if (fs.existsSync(keyPath)) {
        return fs.readFileSync(keyPath, 'utf8');
      }
    }
    return undefined;
  }

  /**
   * Get authenticated Octokit client for a specific installation ID.
   */
  async getInstallationOctokit(installationId) {
    if (!this.isConfigured) {
      logger.warn('[GitHub App] App not configured with private key. Falling back to public/unauthenticated Octokit.');
      return new Octokit({
        auth: process.env.GITHUB_TOKEN || undefined,
      });
    }

    try {
      const { createAppAuth } = await import('@octokit/auth-app');
      const auth = createAppAuth({
        appId: this.appId,
        privateKey: this.privateKey,
        clientId: this.clientId,
        clientSecret: this.clientSecret,
      });

      const installationAuth = await auth({
        type: 'installation',
        installationId,
      });

      return new Octokit({
        auth: installationAuth.token,
      });
    } catch (err) {
      logger.error(`[GitHub App] Failed to authenticate installation #${installationId}: ${err.message}`);
      throw err;
    }
  }

  getStatus() {
    return {
      appId: this.appId || null,
      isConfigured: this.isConfigured,
      webhookSecretConfigured: Boolean(process.env.WEBHOOK_SECRET),
      supportEmail: this.supportEmail,
      programEligibility: {
        apiIntegration: 'Active (ReBAC Graph + Webhooks + Octokit)',
        supportEmail: this.supportEmail,
        status: 'Eligible for GitHub Developer Program',
      },
    };
  }
}

module.exports = new GitHubAppService();
