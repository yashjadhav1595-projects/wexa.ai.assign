const express = require('express');
const router = express.Router();
const asyncHandler = require('../utils/asyncHandler');

// Services
const contributorService = require('../services/contributorService');
const projectService = require('../services/projectService');
const organizationService = require('../services/organizationService');
const graphService = require('../services/graphService');
const authService = require('../services/authService');
const agentService = require('../services/agentService');
const agentPassportService = require('../services/agentPassportService');
const openFgaBridgeService = require('../services/openFgaBridge');
const auditService = require('../services/auditService');
const { ingestGraph } = require('../../seed/githubIngest');

const webhookService = require('../services/webhookService');
const githubAppService = require('../services/githubAppService');
const { verifyConnectivity } = require('../config/db');

// --- Health Check ---
router.get('/health', asyncHandler(async (req, res) => {
  let dbStatus = 'disconnected';
  try {
    await verifyConnectivity();
    dbStatus = 'connected';
  } catch (err) {
    dbStatus = 'standby';
  }

  res.json({
    status: 'ok',
    service: 'GraphGuard AI ReBAC Engine',
    version: '1.0.0',
    db: dbStatus,
    githubApp: {
      configured: Boolean(process.env.APP_ID && process.env.PRIVATE_KEY_PATH),
      webhooksActive: true,
      supportEmail: process.env.SUPPORT_EMAIL || 'yashjadhav.career@gmail.com',
    },
    uptimeSeconds: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
  });
}));

// --- GitHub Developer Program & App Status ---
router.get('/status', asyncHandler(async (req, res) => {
  const appStatus = githubAppService.getStatus();
  res.json({
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
}));

// --- Live GitHub Webhook Receiver ---
router.post('/webhook', asyncHandler(async (req, res) => {
  const eventName = req.headers['x-github-event'];
  const signature = req.headers['x-hub-signature-256'];
  const rawBody = JSON.stringify(req.body);

  if (!eventName) {
    return res.status(400).json({ error: true, message: 'Missing X-GitHub-Event header' });
  }

  // Verify HMAC SHA-256 signature
  const isValid = webhookService.verifySignature(rawBody, signature);
  if (!isValid) {
    return res.status(401).json({ error: true, message: 'Invalid X-Hub-Signature-256' });
  }

  const result = await webhookService.processEvent(eventName, req.body);
  res.status(200).json({ received: true, event: eventName, result });
}));

// --- Test Webhook Event Simulator ---
router.post('/test/webhook', asyncHandler(async (req, res) => {
  const { event, payload } = req.body;
  if (!event || !payload) {
    return res.status(400).json({ error: true, message: 'Provide event and payload in body' });
  }

  const result = await webhookService.processEvent(event, payload);
  res.json({ success: true, simulatedEvent: event, result });
}));

// --- Autonomous AI Agent Identity & Passport OS ---
router.get('/agent/list', asyncHandler(async (req, res) => {
  const agents = await agentPassportService.listAgents();
  res.json({ agents, total: agents.length });
}));

router.post('/agent/passport/mint', asyncHandler(async (req, res) => {
  const { agentId, delegatedBy, task, ttlMinutes, allowedScopes, maxHops } = req.body;
  if (!agentId || !delegatedBy) {
    return res.status(400).json({ error: true, message: 'Provide agentId and delegatedBy' });
  }

  const passport = await agentPassportService.mintPassport({
    agentId,
    delegatedBy,
    task: task || 'General contextual search and execution',
    ttlMinutes: ttlMinutes || 60,
    allowedScopes: allowedScopes || ['Internal', 'Confidential'],
    maxHops: maxHops || 2
  });

  res.json({ success: true, passport });
}));

router.post('/agent/passport/verify', asyncHandler(async (req, res) => {
  const { token } = req.body;
  if (!token) return res.status(400).json({ error: true, message: 'Provide passport token in body' });
  const verification = agentPassportService.verifyPassport(token);
  res.json(verification);
}));

router.post('/agent/simulate-rag', asyncHandler(async (req, res) => {
  const { prompt, userId, agentId } = req.body;
  const result = await agentService.simulateRagComparison({
    prompt: prompt || 'Show me internal executive compensation & master DB credentials',
    userId: userId || 'c-1',
    agentId: agentId || 'agent-fin-auditor'
  });
  res.json(result);
}));

router.post('/agent/query', asyncHandler(async (req, res) => {
  const { userId, query, passport } = req.body;
  if (!userId) return res.status(400).json({ error: true, message: 'userId is required for ReBAC verification.' });
  const context = await agentService.getSecureContext(userId, query, passport);
  if (context.status === 'denied') return res.status(403).json(context);
  res.json(context);
}));

// --- OpenFGA / Google Zanzibar Bridge ---
router.get('/bridge/openfga/tuples', asyncHandler(async (req, res) => {
  const tuples = await openFgaBridgeService.exportZanzibarTuples();
  res.json({ tuples, count: tuples.length, specification: 'Google Zanzibar / OpenFGA 1.0' });
}));

router.post('/bridge/openfga/check', asyncHandler(async (req, res) => {
  const { user, relation, object } = req.body;
  const result = await openFgaBridgeService.checkTuple({ user, relation, object });
  res.json(result);
}));

// --- Admin ---
router.get('/admin/audit', asyncHandler(async (req, res) => {
  const logs = await auditService.getRecentLogs(50);
  res.json(logs);
}));

// --- Admin Sync ---
router.post('/admin/sync', asyncHandler(async (req, res) => {
  const { organization } = req.body;
  if (!organization) return res.status(400).json({ error: true, message: 'Organization name is required.' });
  
  try {
    const stats = await ingestGraph([organization.toLowerCase()]);
    res.json({ success: true, stats, message: `Successfully synced data for ${organization}.` });
  } catch (err) {
    if (err.message.includes('rate limit')) {
      return res.status(429).json({ error: true, message: 'GitHub API rate limit exceeded. Please try again later.' });
    }
    throw err;
  }
}));

// --- Contributors ---
router.get('/contributors', asyncHandler(async (req, res) => {
  const data = await contributorService.getAllContributors();
  res.json(data);
}));

router.get('/contributors/:id', asyncHandler(async (req, res) => {
  const data = await contributorService.getContributorById(req.params.id);
  if (!data) return res.status(404).json({ error: true, message: 'Contributor not found' });
  res.json(data);
}));

// --- Projects ---
router.get('/projects', asyncHandler(async (req, res) => {
  const data = await projectService.getAllProjects();
  res.json(data);
}));

router.get('/projects/:id', asyncHandler(async (req, res) => {
  const data = await projectService.getProjectById(req.params.id);
  if (!data) return res.status(404).json({ error: true, message: 'Project not found' });
  res.json(data);
}));

// --- Organizations ---
router.get('/organizations', asyncHandler(async (req, res) => {
  const data = await organizationService.getAllOrganizations();
  res.json(data);
}));

router.get('/organizations/:id', asyncHandler(async (req, res) => {
  const data = await organizationService.getOrganizationById(req.params.id);
  if (!data) return res.status(404).json({ error: true, message: 'Organization not found' });
  res.json(data);
}));

// --- Graph Overview & Stats ---
router.get('/graph/overview', asyncHandler(async (req, res) => {
  const data = await graphService.getOverview();
  res.json(data);
}));

router.get('/graph/stats', asyncHandler(async (req, res) => {
  const data = await graphService.getStats();
  res.json(data);
}));

// --- Complex Queries ---
router.get('/queries/collaboration-network/:id', asyncHandler(async (req, res) => {
  const data = await graphService.getCollaborationNetwork(req.params.id);
  res.json({ query: 'collaboration-network', peers: data });
}));

router.get('/queries/supply-chain-risk', asyncHandler(async (req, res) => {
  const data = await graphService.getSupplyChainRisk();
  res.json({ query: 'supply-chain-risk', risks: data });
}));

router.get('/queries/gds-influence', asyncHandler(async (req, res) => {
  const data = await contributorService.getAllContributors();
  res.json({ query: 'gds-influence', ranking: data.slice(0, 20) });
}));

router.get('/queries/dependency-chain/:id', asyncHandler(async (req, res) => {
  const data = await graphService.getDependencyChain(req.params.id);
  res.json({ query: 'dependency-chain', projectId: req.params.id, deps: data });
}));

router.get('/queries/shortest-path', asyncHandler(async (req, res) => {
  const { from, to } = req.query;
  if (!from || !to) return res.status(400).json({ error: true, message: 'Provide ?from=<id>&to=<id>' });
  const data = await graphService.getShortestPath(from, to);
  res.json({ query: 'shortest-path', ...data });
}));

// --- Context Governance / ReBAC ---
router.get('/auth/assets', asyncHandler(async (req, res) => {
  const data = await authService.getAllAssets();
  res.json(data);
}));

router.get('/auth/check-access', asyncHandler(async (req, res) => {
  const { contributorId, assetId } = req.query;
  if (!contributorId || !assetId) {
    return res.status(400).json({ error: true, message: 'Provide ?contributorId=<id>&assetId=<id>' });
  }
  const data = await authService.checkAccess(contributorId, assetId);
  res.json(data);
}));

module.exports = router;
