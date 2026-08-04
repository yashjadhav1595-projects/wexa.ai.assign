/**
 * TechPulse — Live GitHub Data Ingestion
 * 
 * Fetches real organization, repository, and contributor data from GitHub's REST API.
 * Designed to stay under the 60 req/hr unauthenticated rate limit by fetching a compact,
 * highly-connected subset of the GitHub graph (top orgs, top repos, core maintainers).
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const neo4j = require('neo4j-driver');
const https = require('https');

const URI = process.env.COGNODB_URI;
const USER = process.env.COGNODB_USER || 'cognodb';
const PASSWORD = process.env.COGNODB_PASSWORD;

if (!URI || !PASSWORD) {
  console.error('[Ingest] ERROR: Set COGNODB_URI and COGNODB_PASSWORD in your .env file.');
  process.exit(1);
}

const driver = neo4j.driver(URI, neo4j.auth.basic(USER, PASSWORD));

// Target high-profile organizations
const TARGET_ORGS = ['vercel', 'facebook', 'hashicorp'];

// Helper to make HTTPS requests to GitHub API
function fetchGitHub(endpoint) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.github.com',
      path: endpoint,
      method: 'GET',
      headers: {
        'User-Agent': 'TechPulse-Graph-App',
        'Accept': 'application/vnd.github.v3+json'
      }
    };
    
    // If a token is provided in env, use it to boost rate limit to 5000/hr
    if (process.env.GITHUB_TOKEN) {
      options.headers['Authorization'] = `token ${process.env.GITHUB_TOKEN}`;
    }

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode >= 400) {
          reject(new Error(`GitHub API Error (${res.statusCode}): ${data}`));
        } else {
          resolve(JSON.parse(data));
        }
      });
    });

    req.on('error', reject);
    req.end();
  });
}

async function clearDatabase(session) {
  console.log('[Ingest] Clearing existing data...');
  await session.run('MATCH (n) DETACH DELETE n');
}

async function createConstraints(session) {
  console.log('[Ingest] Creating constraints...');
  const constraints = [
    'CREATE CONSTRAINT IF NOT EXISTS FOR (c:Contributor) REQUIRE c.id IS UNIQUE',
    'CREATE CONSTRAINT IF NOT EXISTS FOR (p:Project) REQUIRE p.id IS UNIQUE',
    'CREATE CONSTRAINT IF NOT EXISTS FOR (o:Organization) REQUIRE o.id IS UNIQUE',
    'CREATE CONSTRAINT IF NOT EXISTS FOR (d:DataAsset) REQUIRE d.id IS UNIQUE',
  ];
  for (const query of constraints) {
    await session.run(query);
  }
}

// Generate realistic synthetic data assets for ReBAC demonstration
const syntheticAssets = {
  'vercel': { id: 'da-v1', name: 'Vercel Production Keys', classification: 'Restricted', sensitivity: 'Critical' },
  'facebook': { id: 'da-f1', name: 'React Analytics Dataset', classification: 'Confidential', sensitivity: 'High' },
  'hashicorp': { id: 'da-h1', name: 'Terraform Signing Certs', classification: 'Restricted', sensitivity: 'Critical' }
};

const colors = ['#6366f1', '#ec4899', '#14b8a6', '#f59e0b', '#22c55e', '#a855f7', '#ef4444', '#0ea5e9'];

async function ingestGraph() {
  const session = driver.session({ database: 'neo4j' });
  
  try {
    await clearDatabase(session);
    await createConstraints(session);
    
    console.log('[Ingest] Fetching real data from GitHub...');
    
    let totalNodes = 0;
    let totalRels = 0;

    for (const orgName of TARGET_ORGS) {
      console.log(`\n> Processing Organization: ${orgName}`);
      
      // 1. Fetch Org
      const orgData = await fetchGitHub(`/orgs/${orgName}`);
      await session.run(
        `CREATE (o:Organization {id: $id, name: $name, type: 'Corporation', country: $location, description: $description, avatarUrl: $avatar})`,
        { 
          id: `org-${orgData.id}`, 
          name: orgData.name || orgData.login, 
          location: orgData.location || 'Global', 
          description: orgData.description || '',
          avatar: orgData.avatar_url
        }
      );
      totalNodes++;
      
      // Seed synthetic data asset for ReBAC
      const asset = syntheticAssets[orgName];
      await session.run(
        `MATCH (o:Organization {id: $orgId})
         CREATE (d:DataAsset {id: $id, name: $name, classification: $classification, sensitivity: $sensitivity})
         CREATE (o)-[:OWNS_ASSET]->(d)`,
        { orgId: `org-${orgData.id}`, ...asset }
      );
      totalNodes++; totalRels++;

      // 2. Fetch Top Repos (Limit 3 per org to save API requests)
      const repos = await fetchGitHub(`/orgs/${orgName}/repos?sort=stargazers&per_page=3`);
      
      for (const repo of repos) {
        console.log(`  - Project: ${repo.name} (⭐ ${repo.stargazers_count})`);
        
        await session.run(
          `MATCH (o:Organization {id: $orgId})
           CREATE (p:Project {id: $id, name: $name, description: $description, stars: $stars, forks: $forks, language: $language})
           CREATE (p)-[:PART_OF]->(o)
           WITH p
           MATCH (d:DataAsset {id: $assetId})
           CREATE (p)-[:HAS_ACCESS_TO]->(d)`,
          {
            orgId: `org-${orgData.id}`,
            assetId: asset.id,
            id: `repo-${repo.id}`,
            name: repo.name,
            description: repo.description || '',
            stars: repo.stargazers_count,
            forks: repo.forks_count,
            language: repo.language || 'Unknown'
          }
        );
        totalNodes++; totalRels += 2; // PART_OF and HAS_ACCESS_TO

        // 3. Fetch Top Contributors (Limit 5 per repo)
        const contributors = await fetchGitHub(`/repos/${orgName}/${repo.name}/contributors?per_page=5`);
        
        for (const contributor of contributors) {
          // Use MERGE so cross-repo contributors share the same node
          await session.run(
            `MERGE (c:Contributor {id: $id})
             ON CREATE SET c.username = $username, c.name = $username, c.avatarUrl = $avatar, c.followers = 0, c.avatarColor = $color
             WITH c
             MATCH (p:Project {id: $projectId})
             CREATE (c)-[:CONTRIBUTED_TO {commits: $commits, role: 'Maintainer'}]->(p)
             WITH c
             MATCH (o:Organization {id: $orgId})
             MERGE (c)-[:WORKS_AT {role: 'Open Source Contributor'}]->(o)`,
            {
              id: `user-${contributor.id}`,
              username: contributor.login,
              avatar: contributor.avatar_url,
              color: colors[Math.floor(Math.random() * colors.length)],
              projectId: `repo-${repo.id}`,
              orgId: `org-${orgData.id}`,
              commits: contributor.contributions
            }
          );
          totalNodes++; // MERGE handles idempotency, roughly adds ~5-15 nodes
          totalRels += 2; // CONTRIBUTED_TO and WORKS_AT
        }
      }
    }
    
    console.log(`\n[Ingest] ✅ Live GitHub Data Ingestion Complete!`);
    console.log(`[Ingest] Estimated Graph Size: ~${totalNodes} Nodes, ~${totalRels} Relationships generated.`);
    
  } catch (err) {
    console.error('\n[Ingest] FATAL ERROR:', err.message);
    if (err.message.includes('403') || err.message.includes('rate limit')) {
      console.log('💡 TIP: You hit the GitHub API unauthenticated rate limit (60 req/hr).');
      console.log('Provide a GITHUB_TOKEN in your .env file to boost the limit to 5000/hr.');
    }
  } finally {
    await session.close();
    await driver.close();
  }
}

ingestGraph();
