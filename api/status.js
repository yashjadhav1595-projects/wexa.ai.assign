const githubAppService = require('../server/src/services/githubAppService');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const appStatus = githubAppService.getStatus();
    return res.status(200).json({
      programReady: true,
      app: appStatus,
      checklist: [
        {
          id: 'api_integration',
          title: 'Active GitHub API & Graph Engine',
          status: 'complete',
          detail: 'Neo4j ReBAC Graph Engine with live REST & Webhook Ingestion.',
        },
        {
          id: 'webhooks',
          title: 'Real-Time Webhook Receivers',
          status: 'complete',
          detail: 'Listening on /api/webhook for (membership, repository, team, installation, pull_request, push).',
        },
        {
          id: 'support_email',
          title: 'Dedicated Support Channel',
          status: 'complete',
          detail: appStatus.supportEmail,
        },
        {
          id: 'registration',
          title: 'GitHub Developer Program Submission',
          status: 'ready',
          detail: 'Register at https://github.com/developer/register',
        },
      ],
    });
  } catch (err) {
    return res.status(500).json({ error: true, message: err.message });
  }
};
