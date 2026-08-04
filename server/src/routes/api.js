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
const auditService = require('../services/auditService');
const { ingestGraph } = require('../../seed/githubIngest');

// --- AI Agent OS ---
router.post('/agent/query', asyncHandler(async (req, res) => {
  const { userId, query } = req.body;
  if (!userId) return res.status(400).json({ error: true, message: 'userId is required for ReBAC verification.' });
  const context = await agentService.getSecureContext(userId, query);
  if (context.status === 'denied') return res.status(403).json(context);
  res.json(context);
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
