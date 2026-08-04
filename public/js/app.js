/**
 * TechPulse — Main Application Logic
 * SPA routing, rendering, query UI
 */

const state = {
  contributors: null,
  projects: null,
  organizations: null,
  graphLoaded: false,
};

// ─── Router ───────────────────────────────────────────────────────────────────
const pageTitles = {
  home: 'Dashboard Overview',
  graph: 'Graph Explorer',
  queries: 'Run Queries',
  contributors: 'Contributors',
  projects: 'Projects',
  organizations: 'Organizations',
  auth: 'Graph-Based Access Control'
};

function navigate(page) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(l => {
    l.classList.toggle('active', l.dataset.page === page);
  });
  
  const target = document.getElementById(`page-${page}`);
  if (target) target.classList.add('active');

  const breadcrumb = document.getElementById('topbar-breadcrumb');
  if (breadcrumb) breadcrumb.textContent = pageTitles[page] || 'Dashboard';

  if (page === 'home')          loadHome();
  if (page === 'graph')         loadGraph();
  if (page === 'contributors')  loadContributors();
  if (page === 'projects')      loadProjects();
  if (page === 'organizations') loadOrganizations();
  if (page === 'queries')       loadQueries();
  if (page === 'auth')          loadAuth();

  document.querySelector('.scroll-area').scrollTo({ top: 0, behavior: 'smooth' });
}

document.querySelectorAll('[data-page]').forEach(el => {
  el.addEventListener('click', (e) => navigate(e.currentTarget.dataset.page));
});

// ─── DB Status ────────────────────────────────────────────────────────────────
async function checkDBStatus() {
  const dot   = document.getElementById('db-dot');
  const label = document.getElementById('db-label');
  try {
    await API.health();
    dot.className = 'db-dot connected';
    label.textContent = 'CognoDB (3ms)';
  } catch {
    dot.className = 'db-dot error';
    label.textContent = 'Disconnected';
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatNum(n) { return Number(n).toLocaleString(); }
function emptyHtml(msg = 'No results') { return `<div class="empty-state">${msg}</div>`; }
function errorHtml(msg) { return `<div class="error-banner">⚠ ${msg}</div>`; }
function avatarHtml(c, size = 32) {
  const initials = (c.name || '').substring(0, 2).toUpperCase();
  return `<div class="avatar-sm" style="width:${size}px;height:${size}px;font-size:${size*0.4}px">${initials}</div>`;
}
function badgeHtml(text, type = '') {
  return `<span class="badge ${type}">${text}</span>`;
}

// ─── HOME ─────────────────────────────────────────────────────────────────────
async function loadHome() {
  try {
    const stats = await API.graphStats();
    document.getElementById('home-stats').innerHTML = `
      <div class="metric-card"><div style="color:var(--text-muted);font-size:0.75rem;text-transform:uppercase">Nodes</div><div style="font-size:1.8rem;font-weight:600;margin-top:8px">${formatNum(stats.nodes)}</div></div>
      <div class="metric-card"><div style="color:var(--text-muted);font-size:0.75rem;text-transform:uppercase">Relationships</div><div style="font-size:1.8rem;font-weight:600;margin-top:8px">${formatNum(stats.relationships)}</div></div>
      <div class="metric-card"><div style="color:var(--text-muted);font-size:0.75rem;text-transform:uppercase">Contributors</div><div style="font-size:1.8rem;font-weight:600;margin-top:8px">${formatNum(stats.contributors)}</div></div>
      <div class="metric-card"><div style="color:var(--text-muted);font-size:0.75rem;text-transform:uppercase">Projects</div><div style="font-size:1.8rem;font-weight:600;margin-top:8px">${formatNum(stats.projects)}</div></div>
    `;
  } catch (err) {
    document.getElementById('home-stats').innerHTML = errorHtml(err.message);
  }

  if (!state.contributors) { try { state.contributors = await API.contributors(); } catch { state.contributors = []; } }
  const topC = state.contributors.slice(0, 5);
  document.getElementById('home-contributors').innerHTML = topC.length
    ? topC.map(c => `
      <div class="list-item" data-id="${c.id}" onclick="openContributor('${c.id}')">
        ${avatarHtml(c)}
        <div>
          <div class="list-item-title">${c.name}</div>
          <div class="list-item-sub">@${c.username} · ${formatNum(c.followers)} followers</div>
        </div>
      </div>`).join('')
    : emptyHtml();

  if (!state.projects) { try { state.projects = await API.projects(); } catch { state.projects = []; } }
  const topP = state.projects.slice(0, 5);
  document.getElementById('home-projects').innerHTML = topP.length
    ? topP.map(p => `
      <div class="list-item" data-id="${p.id}" onclick="openProject('${p.id}')">
        <div style="width:32px;height:32px;background:var(--bg-active);border-radius:4px;display:flex;align-items:center;justify-content:center;font-size:12px">📦</div>
        <div>
          <div class="list-item-title">${p.name}</div>
          <div class="list-item-sub">${p.language || 'Unknown'} · ★ ${formatNum(p.stars)}</div>
        </div>
      </div>`).join('')
    : emptyHtml();
}

// ─── GRAPH ────────────────────────────────────────────────────────────────────
async function loadGraph() {
  if (state.graphLoaded) return;
  GraphViz.init('graph-container');
  try {
    const data = await API.graphOverview();
    GraphViz.load(data);
    state.graphLoaded = true;
  } catch (err) {
    document.getElementById('graph-loading').innerHTML = errorHtml('Could not load graph: ' + err.message);
  }
}

// ─── CONTRIBUTORS ─────────────────────────────────────────────────────────────
async function loadContributors() {
  if (!state.contributors) { try { state.contributors = await API.contributors(); } catch { state.contributors = []; } }
  const tb = document.getElementById('contributors-table-body');
  if (!tb) return;
  tb.innerHTML = state.contributors.length
    ? state.contributors.map(c => `
      <tr onclick="openContributor('${c.id}')">
        <td><div style="display:flex;align-items:center;gap:12px">${avatarHtml(c, 24)} <strong>${c.name}</strong> <span style="color:var(--text-muted)">@${c.username}</span></div></td>
        <td><div style="color:var(--primary); font-weight: 600;">⚡ ${formatNum(c.influenceScore)}</div></td>
        <td>${formatNum(c.followers)}</td>
        <td>${c.projectCount || 0}</td>
        <td>${c.org ? badgeHtml(c.org) : '<span style="color:var(--text-muted)">-</span>'}</td>
      </tr>`).join('')
    : `<tr><td colspan="5">${emptyHtml()}</td></tr>`;
}

async function openContributor(id) {
  navigate('contributors');
  document.getElementById('contributors-list-view').style.display = 'none';
  document.getElementById('contributors-detail-view').style.display = 'block';
  
  document.getElementById('contributor-sidebar').innerHTML = '<div class="skeleton" style="height:200px"></div>';
  document.getElementById('contributor-main').innerHTML = '<div class="skeleton" style="height:300px"></div>';

  try {
    const c = await API.contributor(id);
    document.getElementById('contributor-sidebar').innerHTML = `
      <div style="display:flex;align-items:center;gap:16px;margin-bottom:24px">
        ${avatarHtml(c, 64)}
        <div>
          <h2 style="font-size:1.1rem;font-weight:600">${c.name}</h2>
          <div style="color:var(--text-muted);font-family:monospace;font-size:0.8rem">@${c.username}</div>
        </div>
      </div>
      <p style="color:var(--text-secondary);font-size:0.85rem;margin-bottom:24px">${c.bio || ''}</p>
      <div style="display:flex;flex-direction:column;gap:12px;font-size:0.85rem;color:var(--text-secondary)">
        <div>📍 ${c.location || 'Unknown'}</div>
        <div>👥 ${formatNum(c.followers)} followers</div>
        ${c.orgs?.length ? `<div>🏢 ${c.orgs.map(o=>o.name).join(', ')}</div>` : ''}
      </div>
    `;

    let mainHtml = '';
    if (c.projects?.length) {
      mainHtml += `
        <div class="panel">
          <div class="panel-header"><h3 class="panel-title">Projects</h3></div>
          <div class="panel-body">
            ${c.projects.map(p => `
              <div class="list-item" onclick="openProject('${p.id}')">
                <div style="flex:1">
                  <div class="list-item-title">${p.name} ${badgeHtml(p.role)}</div>
                  <div class="list-item-sub">${p.language || ''} · ${formatNum(p.commits || 0)} commits</div>
                </div>
                <div style="font-size:0.85rem">★ ${formatNum(p.stars)}</div>
              </div>`).join('')}
          </div>
        </div>
      `;
    }
    document.getElementById('contributor-main').innerHTML = mainHtml || emptyHtml('No project data');
  } catch (err) {
    document.getElementById('contributor-sidebar').innerHTML = errorHtml(err.message);
  }
}

document.getElementById('contributors-back')?.addEventListener('click', () => {
  document.getElementById('contributors-list-view').style.display = 'block';
  document.getElementById('contributors-detail-view').style.display = 'none';
});

// ─── PROJECTS ─────────────────────────────────────────────────────────────────
async function loadProjects() {
  if (!state.projects) { try { state.projects = await API.projects(); } catch { state.projects = []; } }
  const tb = document.getElementById('projects-table-body');
  if (!tb) return;
  tb.innerHTML = state.projects.length
    ? state.projects.map(p => `
      <tr onclick="openProject('${p.id}')">
        <td><strong>${p.name}</strong> ${p.org ? `<span style="color:var(--text-muted);font-size:0.75rem">by ${p.org}</span>` : ''}</td>
        <td>${formatNum(p.stars)}</td>
        <td>${p.language ? badgeHtml(p.language) : '-'}</td>
        <td>${formatNum(p.forks)}</td>
      </tr>`).join('')
    : `<tr><td colspan="4">${emptyHtml()}</td></tr>`;
}

async function openProject(id) {
  navigate('projects');
  document.getElementById('projects-list-view').style.display = 'none';
  document.getElementById('projects-detail-view').style.display = 'block';
  
  document.getElementById('project-sidebar').innerHTML = '<div class="skeleton" style="height:200px"></div>';
  document.getElementById('project-main').innerHTML = '<div class="skeleton" style="height:300px"></div>';

  try {
    const p = await API.project(id);
    document.getElementById('project-sidebar').innerHTML = `
      <h2 style="font-size:1.1rem;font-weight:600">${p.name}</h2>
      ${p.org ? `<div style="color:var(--text-muted);font-size:0.8rem;margin-bottom:16px">by ${p.org.name || p.org}</div>` : ''}
      <p style="color:var(--text-secondary);font-size:0.85rem;margin-bottom:24px;line-height:1.6">${p.description || ''}</p>
      
      <div style="display:flex;flex-direction:column;gap:12px;font-size:0.85rem;color:var(--text-secondary)">
        <div>★ ${formatNum(p.stars)} stars</div>
        <div>🍴 ${formatNum(p.forks)} forks</div>
        <div>📄 ${p.license || 'N/A'}</div>
      </div>
      ${p.technologies?.length ? `
        <div style="margin-top:24px;display:flex;gap:8px;flex-wrap:wrap">
          ${p.technologies.map(t => badgeHtml(t.name)).join('')}
        </div>` : ''}
    `;

    let mainHtml = '';
    if (p.contributors?.length) {
      mainHtml += `
        <div class="panel">
          <div class="panel-header"><h3 class="panel-title">Top Contributors</h3></div>
          <div class="panel-body">
            ${p.contributors.map(c => `
              <div class="list-item" onclick="openContributor('${c.id}')">
                ${avatarHtml(c, 24)}
                <div style="flex:1">
                  <div class="list-item-title">${c.name}</div>
                  <div class="list-item-sub">@${c.username}</div>
                </div>
                <div>${badgeHtml(c.role)}</div>
              </div>`).join('')}
          </div>
        </div>
      `;
    }
    document.getElementById('project-main').innerHTML = mainHtml || emptyHtml('No contributor data');
  } catch(err) {
    document.getElementById('project-sidebar').innerHTML = errorHtml(err.message);
  }
}

document.getElementById('projects-back')?.addEventListener('click', () => {
  document.getElementById('projects-list-view').style.display = 'block';
  document.getElementById('projects-detail-view').style.display = 'none';
});

// ─── ORGANIZATIONS ────────────────────────────────────────────────────────────
async function loadOrganizations() {
  if (!state.organizations) { try { state.organizations = await API.organizations(); } catch { state.organizations = []; } }
  const tb = document.getElementById('orgs-table-body');
  if (!tb) return;
  tb.innerHTML = state.organizations.length
    ? state.organizations.map(o => `
      <tr>
        <td><strong>${o.name}</strong></td>
        <td>${badgeHtml(o.type)}</td>
        <td>${o.country}</td>
      </tr>`).join('')
    : `<tr><td colspan="3">${emptyHtml()}</td></tr>`;
}

// ─── QUERIES ──────────────────────────────────────────────────────────────────
function wireQueryTabs() {
  document.querySelectorAll('.query-nav-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      document.querySelectorAll('.query-nav-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.query-panel').forEach(p => p.style.display = 'none');
      
      e.currentTarget.classList.add('active');
      const qNum = e.currentTarget.dataset.q;
      document.getElementById(`q${qNum}-card`).style.display = 'block';
    });
  });
}

let queriesLoaded = false;
async function loadQueries() {
  if (queriesLoaded) return;
  
  if (!state.contributors) { try { state.contributors = await API.contributors(); } catch { state.contributors = []; } }
  if (!state.projects) { try { state.projects = await API.projects(); } catch { state.projects = []; } }

  const opts = state.contributors.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
  ['q1-contributor-select', 'q5-from', 'q5-to'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.innerHTML = opts;
  });
  const q5to = document.getElementById('q5-to');
  if (q5to && q5to.options.length > 1) q5to.selectedIndex = 1;

  const projOpts = state.projects.map(p => `<option value="${p.id}">${p.name}</option>`).join('');
  const q4sel = document.getElementById('q4-project-select');
  if (q4sel) q4sel.innerHTML = projOpts;

  document.getElementById('q1-run')?.addEventListener('click', runQ1);
  document.getElementById('q2-run')?.addEventListener('click', runQ2);
  document.getElementById('q3-run')?.addEventListener('click', runQ3);
  document.getElementById('q4-run')?.addEventListener('click', runQ4);
  document.getElementById('q5-run')?.addEventListener('click', runQ5);

  wireQueryTabs();
  queriesLoaded = true;
}

function setLoading(el) {
  el.innerHTML = `<div style="display:flex;gap:8px;align-items:center;padding:12px;color:var(--text-muted);font-size:0.85rem">Running query...</div>`;
}

async function runQ1() {
  const el = document.getElementById('q1-results'); setLoading(el);
  try {
    const data = await API.collaborationNetwork(document.getElementById('q1-contributor-select').value);
    el.innerHTML = data.peers.length
      ? data.peers.map(p => `<div class="list-item">
          ${avatarHtml(p, 24)}
          <div style="flex:1"><div class="list-item-title">${p.name} ${badgeHtml(p.hops + ' hops')}</div><div class="list-item-sub">Shared: ${p.sharedProjects.join(', ')}</div></div>
        </div>`).join('')
      : emptyHtml('No peers found');
  } catch (err) { el.innerHTML = errorHtml(err.message); }
}

async function runQ2() {
  const el = document.getElementById('q2-results'); setLoading(el);
  try {
    const data = await API.supplyChainRisk();
    el.innerHTML = data.risks.length
      ? `<table class="data-table"><thead><tr><th>Risk Path</th><th>Shared Contributor</th></tr></thead><tbody>
         ${data.risks.map(r => `<tr><td>${r.orgA} → ${r.projectA} → ${r.projectB} → ${r.orgB}</td><td>${r.sharedContributor}</td></tr>`).join('')}
         </tbody></table>`
      : emptyHtml('No risks found');
  } catch (err) { el.innerHTML = errorHtml(err.message); }
}

async function runQ3() {
  const el = document.getElementById('q3-results'); setLoading(el);
  try {
    const data = await fetch('/api/queries/gds-influence').then(r=>r.json());
    if (!data.ranking.length) return el.innerHTML = emptyHtml('No contributors found');
    el.innerHTML = `
      <table class="data-table" style="margin:0">
        <thead><tr><th>Rank</th><th>Contributor</th><th>Influence Score</th><th>Projects</th><th>Org</th></tr></thead>
        <tbody>
          ${data.ranking.map((c, i) => `<tr>
            <td>#${i + 1}</td>
            <td><div style="display:flex;align-items:center;gap:12px">${avatarHtml(c, 24)} <strong>${c.name}</strong></div></td>
            <td><strong style="color:var(--primary)">⚡ ${c.influenceScore}</strong></td>
            <td>${c.projectCount}</td>
            <td>${c.org ? badgeHtml(c.org) : '-'}</td>
          </tr>`).join('')}
        </tbody>
      </table>
    `;
  } catch(e) { el.innerHTML = `<div style="color:var(--danger)">Error: ${e.message}</div>`; }
}

async function runQ4() {
  const el = document.getElementById('q4-results'); setLoading(el);
  try {
    const data = await API.dependencyChain(document.getElementById('q4-project-select').value);
    el.innerHTML = data.deps.length
      ? `<table class="data-table"><thead><tr><th>Dependency</th><th>Depth</th><th>Chain</th></tr></thead><tbody>
         ${data.deps.map(d => `<tr><td><strong>${d.name}</strong></td><td>${d.depth}</td><td style="color:var(--text-secondary);font-size:0.75rem">${d.chain.join(' → ')}</td></tr>`).join('')}
         </tbody></table>`
      : emptyHtml();
  } catch (err) { el.innerHTML = errorHtml(err.message); }
}

async function runQ5() {
  const el = document.getElementById('q5-results'); setLoading(el);
  try {
    const data = await API.shortestPath(document.getElementById('q5-from').value, document.getElementById('q5-to').value);
    el.innerHTML = data.found
      ? `<div style="padding:16px"><div style="margin-bottom:12px">${badgeHtml('Length: ' + data.pathLength)}</div><div style="font-family:monospace;font-size:0.8rem;color:var(--text-secondary)">${data.pathNodes.map(n=>n.name).join(' → ')}</div></div>`
      : emptyHtml('No path found');
  } catch (err) { el.innerHTML = errorHtml(err.message); }
}

// ─── AUTH / REBAC ─────────────────────────────────────────────────────────────
let authLoaded = false;
async function loadAuth() {
  if (authLoaded) return;
  
  if (!state.contributors) { try { state.contributors = await API.contributors(); } catch { state.contributors = []; } }
  
  const userSelect = document.getElementById('auth-user-select');
  if (userSelect) {
    userSelect.innerHTML = state.contributors.map(c => `<option value="${c.id}">${c.name} (@${c.username})</option>`).join('');
  }
  
  try {
    const assets = await API.authAssets();
    const assetSelect = document.getElementById('auth-asset-select');
    if (assetSelect) {
      assetSelect.innerHTML = assets.map(a => `<option value="${a.id}">${a.name} [${a.classification}]</option>`).join('');
    }
  } catch (err) {
    console.error('Failed to load assets', err);
  }
  
  document.getElementById('auth-evaluate-btn')?.addEventListener('click', evaluateAccess);
  authLoaded = true;
}

async function evaluateAccess() {
  const userId = document.getElementById('auth-user-select').value;
  const assetId = document.getElementById('auth-asset-select').value;
  const resultArea = document.getElementById('auth-result-area');
  const banner = document.getElementById('auth-status-banner');
  const pathContainer = document.getElementById('auth-path-container');
  const pathVisual = document.getElementById('auth-path-visual');
  
  resultArea.style.display = 'block';
  banner.style.background = 'var(--bg-active)';
  banner.style.color = 'var(--text-secondary)';
  banner.innerHTML = 'Evaluating...';
  pathContainer.style.display = 'none';
  
  try {
    const data = await API.checkAccess(userId, assetId);
    
    if (data.granted) {
      banner.style.background = 'rgba(52, 211, 153, 0.1)';
      banner.style.color = 'var(--emerald)';
      banner.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg> Access Granted`;
      
      if (data.path && data.path.length > 0) {
        pathContainer.style.display = 'block';
        pathVisual.innerHTML = data.path.map((item, idx) => {
          if (item.type === 'node') {
            return `<div class="badge" style="font-size:0.85rem; padding:6px 12px; white-space: nowrap; flex-shrink: 0; background: var(--bg-active); border: 1px solid var(--border);">${item.name} <span style="opacity:0.5; margin-left: 4px;">:${item.label}</span></div>`;
          } else {
            return `<div style="color:var(--text-muted); font-size:0.75rem; display:flex; align-items:center; gap:6px; white-space: nowrap; flex-shrink: 0;"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg> ${item.label}</div>`;
          }
        }).join('');
      }
    } else {
      banner.style.background = 'rgba(251, 113, 133, 0.1)';
      banner.style.color = 'var(--rose)';
      banner.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg> Access Denied`;
      
      pathContainer.style.display = 'block';
      pathVisual.innerHTML = `<div style="color:var(--text-muted); font-size:0.85rem">${data.reason}</div>`;
    }
  } catch (err) {
    banner.style.background = 'rgba(251, 113, 133, 0.1)';
    banner.style.color = 'var(--rose)';
    banner.innerHTML = `Error: ${err.message}`;
  }
}

// ─── INIT ─────────────────────────────────────────────────────────────────────
checkDBStatus();
loadHome();
