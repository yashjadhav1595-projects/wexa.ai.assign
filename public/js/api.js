/**
 * GraphGuard AI API Client
 * All fetch calls go through here. Handles errors consistently.
 */

const API = {
  base: '',

  async get(path) {
    const res = await fetch(this.base + path);
    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: `HTTP ${res.status}` }));
      throw new Error(err.message || `HTTP ${res.status}`);
    }
    return res.json();
  },

  // Graph
  graphStats:        () => API.get('/api/graph/stats'),
  graphOverview:     () => API.get('/api/graph/overview'),
  graphNeighborhood: (id) => API.get(`/api/graph/neighborhood/${id}`),

  // Entities
  contributors:    () => API.get('/api/contributors'),
  contributor:     (id) => API.get(`/api/contributors/${id}`),
  projects:        () => API.get('/api/projects'),
  project:         (id) => API.get(`/api/projects/${id}`),
  organizations:   () => API.get('/api/organizations'),
  organization:    (id) => API.get(`/api/organizations/${id}`),
  technologies:    () => API.get('/api/technologies'),

  // Queries
  collaborationNetwork: (id) => API.get(`/api/queries/collaboration-network/${id}`),
  supplyChainRisk:      ()  => API.get('/api/queries/supply-chain-risk'),
  techCooccurrence:     ()  => API.get('/api/queries/tech-cooccurrence'),
  dependencyChain:      (id) => API.get(`/api/queries/dependency-chain/${id}`),
  shortestPath:         (from, to) => API.get(`/api/queries/shortest-path?from=${from}&to=${to}`),

  // Health
  health: () => API.get('/api/health'),
  status: () => API.get('/api/status'),

  // Auth / ReBAC
  authAssets: () => API.get('/api/auth/assets'),
  checkAccess: (user, asset, passport) => {
    let url = `/api/auth/check-access?contributorId=${user}&assetId=${asset}`;
    if (passport) url += `&passport=${encodeURIComponent(passport)}`;
    return API.get(url);
  },

  // Agent OS & Ephemeral Passports
  agentList: () => API.get('/api/agent/list'),
  mintPassport: (data) => fetch('/api/agent/passport/mint', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  }).then(r => r.json()),
  verifyPassport: (token) => fetch('/api/agent/passport/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token })
  }).then(r => r.json()),
  simulateRag: (data) => fetch('/api/agent/simulate-rag', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  }).then(r => r.json()),

  // OpenFGA / Google Zanzibar
  openFgaTuples: () => API.get('/api/bridge/openfga/tuples'),
  openFgaCheck: (data) => fetch('/api/bridge/openfga/check', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  }).then(r => r.json())
};
