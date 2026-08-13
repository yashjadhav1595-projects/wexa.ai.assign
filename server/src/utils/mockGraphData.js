/**
 * Rich mock data for GraphGuard AI when CognoDB / Neo4j is in standby/demo mode.
 */

const mockContributors = [
  {
    id: 'user-eliza-dev',
    name: 'Eliza Vance',
    username: 'eliza-dev',
    role: 'Staff Security Engineer',
    avatarColor: '#6366f1',
    followers: 1420,
    projectCount: 6,
    org: 'Cyberdyne Systems',
    influenceScore: 94,
    skills: ['Rust', 'Cypher', 'OAuth 2.0', 'Zero Trust'],
  },
  {
    id: 'user-marcus-ai',
    name: 'Marcus Chen',
    username: 'marcus-ai',
    role: 'Principal LLM Architect',
    avatarColor: '#ec4899',
    followers: 3200,
    projectCount: 8,
    org: 'OpenWeave AI',
    influenceScore: 98,
    skills: ['Python', 'PyTorch', 'LangChain', 'ReBAC'],
  },
  {
    id: 'user-sarah-sec',
    name: 'Sarah Connor',
    username: 'sarah-sec',
    role: 'CISO & Governance Lead',
    avatarColor: '#10b981',
    followers: 980,
    projectCount: 4,
    org: 'Cyberdyne Systems',
    influenceScore: 89,
    skills: ['SOC2', 'GDPR', 'Compliance', 'Audit Trail'],
  },
  {
    id: 'user-devon-contractor',
    name: 'Devon Lee (Contractor)',
    username: 'devon-contractor',
    role: 'External Frontend Contractor',
    avatarColor: '#f59e0b',
    followers: 310,
    projectCount: 2,
    org: 'VendorCorp',
    influenceScore: 62,
    skills: ['TypeScript', 'D3.js', 'React'],
  },
  {
    id: 'user-alex-core',
    name: 'Alex Mercer',
    username: 'alex-core',
    role: 'Core Systems Maintainer',
    avatarColor: '#0ea5e9',
    followers: 2100,
    projectCount: 7,
    org: 'Cyberdyne Systems',
    influenceScore: 91,
    skills: ['Go', 'Kubernetes', 'openCypher', 'Distributed Systems'],
  }
];

const mockProjects = [
  {
    id: 'repo-graph-guard-core',
    name: 'graph-guard-core',
    description: 'Ultra-low latency ReBAC authorization backplane for LLM RAG pipelines',
    stars: 3840,
    language: 'TypeScript',
    org: 'Cyberdyne Systems',
    technologies: ['Node.js', 'Neo4j', 'openCypher', 'Express'],
    contributorCount: 14,
    dependencies: [
      { project: { name: 'bolt-driver' }, version: '^5.20.0', type: 'core' },
      { project: { name: 'crypto-vault' }, version: '^2.1.0', type: 'security' }
    ]
  },
  {
    id: 'repo-neural-pipeline',
    name: 'neural-pipeline',
    description: 'Multi-tenant enterprise agent execution engine and context router',
    stars: 5120,
    language: 'Python',
    org: 'OpenWeave AI',
    technologies: ['Python', 'FastAPI', 'LangChain', 'LlamaIndex'],
    contributorCount: 22,
    dependencies: [
      { project: { name: 'graph-guard-core' }, version: '^1.0.0', type: 'auth-layer' }
    ]
  },
  {
    id: 'repo-audit-sentinel',
    name: 'audit-sentinel',
    description: 'Cryptographic access audit ledger and compliance reporting suite',
    stars: 1890,
    language: 'Rust',
    org: 'Cyberdyne Systems',
    technologies: ['Rust', 'WebAssembly', 'SQLite'],
    contributorCount: 8,
    dependencies: []
  }
];

const mockOrganizations = [
  {
    id: 'org-cyberdyne-systems',
    name: 'Cyberdyne Systems',
    description: 'Enterprise defense and AI infrastructure security',
    employeeCount: 420,
    sponsoredCount: 12,
    ownedCount: 8,
  },
  {
    id: 'org-openweave-ai',
    name: 'OpenWeave AI',
    description: 'Generative AI knowledge platforms and developer tooling',
    employeeCount: 180,
    sponsoredCount: 6,
    ownedCount: 5,
  },
  {
    id: 'org-vendorcorp',
    name: 'VendorCorp',
    description: 'Outsourced engineering and staff augmentation',
    employeeCount: 95,
    sponsoredCount: 1,
    ownedCount: 2,
  }
];

const mockAssets = [
  {
    id: 'asset-fin-q3-projections',
    name: 'Q3 Financial & Valuation Projections',
    classification: 'RESTRICTED',
    sensitivity: 'HIGH',
    description: 'Unreleased company valuation and investor cap table projections.',
    ownedBy: 'Cyberdyne Systems',
  },
  {
    id: 'asset-sec-master-keys',
    name: 'Production HSM Root Certificate Authority',
    classification: 'TOP_SECRET',
    sensitivity: 'CRITICAL',
    description: 'Core asymmetric cryptographic keys for enterprise token minting.',
    ownedBy: 'Cyberdyne Systems',
  },
  {
    id: 'asset-hr-compensation',
    name: 'Executive Compensation & Performance Ledger',
    classification: 'CONFIDENTIAL',
    sensitivity: 'HIGH',
    description: 'Salary bands, equity refresh grants, and executive reviews.',
    ownedBy: 'Cyberdyne Systems',
  },
  {
    id: 'asset-public-docs',
    name: 'Developer API Reference & SDK Specs',
    classification: 'PUBLIC',
    sensitivity: 'LOW',
    description: 'OpenAPI schemas, client SDKs, and developer tutorials.',
    ownedBy: 'OpenWeave AI',
  }
];

const mockGraphOverview = {
  nodes: [
    { id: 'user-eliza-dev', label: 'Contributor', name: 'Eliza Vance', color: '#6366f1', size: 16 },
    { id: 'user-marcus-ai', label: 'Contributor', name: 'Marcus Chen', color: '#ec4899', size: 18 },
    { id: 'user-sarah-sec', label: 'Contributor', name: 'Sarah Connor', color: '#10b981', size: 14 },
    { id: 'user-devon-contractor', label: 'Contributor', name: 'Devon Lee', color: '#f59e0b', size: 10 },
    { id: 'org-cyberdyne', label: 'Organization', name: 'Cyberdyne Systems', color: '#8b5cf6', size: 24 },
    { id: 'org-openweave', label: 'Organization', name: 'OpenWeave AI', color: '#a855f7', size: 22 },
    { id: 'org-vendorcorp', label: 'Organization', name: 'VendorCorp', color: '#64748b', size: 16 },
    { id: 'repo-graph-guard', label: 'Project', name: 'graph-guard-core', color: '#06b6d4', size: 20 },
    { id: 'repo-neural-pipe', label: 'Project', name: 'neural-pipeline', color: '#0ea5e9', size: 20 },
    { id: 'asset-fin-q3', label: 'DataAsset', name: 'Q3 Financials', color: '#ef4444', size: 14 },
    { id: 'asset-sec-keys', label: 'DataAsset', name: 'Root Keys', color: '#f43f5e', size: 16 },
    { id: 'asset-public-docs', label: 'DataAsset', name: 'API Docs', color: '#22c55e', size: 12 },
  ],
  links: [
    { source: 'user-eliza-dev', target: 'org-cyberdyne', label: 'WORKS_AT' },
    { source: 'user-eliza-dev', target: 'repo-graph-guard', label: 'CONTRIBUTED_TO' },
    { source: 'user-sarah-sec', target: 'org-cyberdyne', label: 'WORKS_AT' },
    { source: 'user-marcus-ai', target: 'org-openweave', label: 'WORKS_AT' },
    { source: 'user-marcus-ai', target: 'repo-neural-pipe', label: 'CONTRIBUTED_TO' },
    { source: 'user-devon-contractor', target: 'org-vendorcorp', label: 'WORKS_AT' },
    { source: 'org-cyberdyne', target: 'asset-fin-q3', label: 'OWNS_ASSET' },
    { source: 'org-cyberdyne', target: 'asset-sec-keys', label: 'OWNS_ASSET' },
    { source: 'org-openweave', target: 'asset-public-docs', label: 'OWNS_ASSET' },
    { source: 'org-cyberdyne', target: 'repo-graph-guard', label: 'OWNS_ASSET' },
    { source: 'org-openweave', target: 'repo-neural-pipe', label: 'OWNS_ASSET' },
    { source: 'repo-neural-pipe', target: 'repo-graph-guard', label: 'DEPENDS_ON' }
  ]
};

const mockStats = {
  nodes: 142,
  relationships: 328,
  contributors: 48,
  projects: 18,
  organizations: 6,
  technologies: 24,
};

module.exports = {
  mockContributors,
  mockProjects,
  mockOrganizations,
  mockAssets,
  mockGraphOverview,
  mockStats
};
