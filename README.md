# TechPulse — Developer Ecosystem Intelligence Graph

> A graph-native application that maps open-source contributors, projects, organizations, technologies, and issues — revealing the connections that define the modern developer ecosystem.

**Tech stack:** Node.js · Express · CognoDB (openCypher/Bolt) · D3.js · Vanilla HTML/CSS/JS  
**Database:** [CognoDB](https://console.cognodb.com) — managed graph database, openCypher over Bolt 5.x, compatible with the official Neo4j driver

---

## Live Demo

🔗 **[https://techpulse-wexa.vercel.app](https://techpulse-wexa.vercel.app)** *(deploy in progress — see setup below to run locally)*

📹 **[Screen recording](./docs/demo.webm)**

---

## Why a graph database?

This use case is defined by relationships, not rows. Here's why a graph database earns its place over a relational schema:

| Question | Relational approach | Graph approach |
|---|---|---|
| Who shares a contributor with a competing org's project that depends on mine? | 4-5 self-joins across 3 tables | One `MATCH` pattern |
| Shortest collaboration path between two engineers | BFS with recursive CTE | `shortestPath()` built-in |
| Full transitive dependency tree | Recursive CTE, depth-limited | `DEPENDS_ON*1..N` variable-depth |
| Which contributors bridge multiple org boundaries? | GROUP BY + HAVING with multiple joins | Single multi-hop MATCH + WHERE size() |
| Which tech stacks co-occur most? | Cartesian product self-join | Bipartite MATCH, no self-join |

**The fundamental insight:** the data *is* a graph. Contributors, projects, organizations, and technologies are nodes connected by typed, property-rich relationships. A relational schema flattens this into bridge tables and loses the traversal semantics. A graph database makes the structure first-class.

---

## Data Model

```
(:Contributor {id, name, username, email, location, bio, followers, avatarColor})
(:Project     {id, name, description, stars, forks, language, license, createdYear})
(:Organization{id, name, type, country, founded, description})
(:Technology  {id, name, category, description})
(:Issue       {id, title, type, severity, status, createdAt})
```

**Relationships:**

```
(Contributor)-[:CONTRIBUTED_TO {commits, role}]->(Project)
(Contributor)-[:WORKS_AT {since, role}]->(Organization)
(Contributor)-[:AUTHORED]->(Issue)
(Contributor)-[:FOLLOWS]->(Contributor)
(Project)-[:DEPENDS_ON {version, type}]->(Project)
(Project)-[:USES_TECHNOLOGY]->(Technology)
(Project)-[:PART_OF]->(Organization)
(Organization)-[:SPONSORS {amount, since}]->(Project)
```

### Diagram

```
[Organization] ──SPONSORS──> [Project] ──DEPENDS_ON──> [Project]
      ↑                          ↑                          ↑
   WORKS_AT                CONTRIBUTED_TO             PART_OF
      │                          │
[Contributor] ──FOLLOWS──> [Contributor]
      │
   AUTHORED
      ↓
   [Issue]
      │
[Project] ──USES_TECHNOLOGY──> [Technology]
```

---

## Queries

### ① Collaboration Network (2-hop traversal)

Finds all contributors within 2 hops of a given contributor via shared project contributions.

```cypher
// 2-hop traversal: contributor → projects → peer contributors
MATCH path = (start:Contributor {id: $id})-[:CONTRIBUTED_TO*1..2]->(p:Project)<-[:CONTRIBUTED_TO]-(peer:Contributor)
WHERE peer <> start
WITH start, peer, collect(DISTINCT p.name) AS sharedProjects, length(path) AS hops
RETURN peer, sharedProjects, min(hops) AS minHops
ORDER BY size(sharedProjects) DESC, minHops ASC
LIMIT 20
```

**Why it's hard in SQL:** This is a variable-depth traversal through a many-to-many relationship. In SQL you'd need to join `contributor_projects` to itself, then join back to contributors — and extending to 3 hops means another self-join layer.

---

### ② Supply-Chain Risk (graph-only pattern)

Finds organizations sharing maintainers across projects with a dependency relationship — a supply-chain risk signal.

```cypher
// Org A's project depends on Org B's project, and they share a contributor
MATCH (orgA:Organization)<-[:PART_OF]-(projA:Project)-[:DEPENDS_ON]->(projB:Project)-[:PART_OF]->(orgB:Organization)
WHERE orgA <> orgB
MATCH (c:Contributor)-[:CONTRIBUTED_TO]->(projA)
MATCH (c)-[:CONTRIBUTED_TO]->(projB)
RETURN orgA.name, projA.name, projB.name, orgB.name, c.name
ORDER BY orgA.name
```

**Why it's hard in SQL:** This pattern traverses 5 node types and 4 relationship types in a single coherent pattern. SQL requires INNER JOINs across multiple bridge tables — and the query grows combinatorially with each hop added.

---

### ③ Technology Co-occurrence

Which technology pairs appear most often together across projects?

```cypher
// Bipartite co-occurrence — id() trick avoids (A,B) and (B,A) duplicates
MATCH (t1:Technology)<-[:USES_TECHNOLOGY]-(p:Project)-[:USES_TECHNOLOGY]->(t2:Technology)
WHERE id(t1) < id(t2)
RETURN t1.name AS tech1, t2.name AS tech2,
       count(p) AS coOccurrences,
       collect(p.name) AS projects
ORDER BY coOccurrences DESC LIMIT 20
```

**Why it's hard in SQL:** The `id(t1) < id(t2)` deduplication trick has no clean SQL equivalent. You'd need a self-join on the technology table through a bridge table, then a GREATEST/LEAST trick to deduplicate pairs.

---

### ④ Transitive Dependency Chain (variable-depth traversal)

Full recursive dependency tree of a project — up to 5 hops.

```cypher
MATCH path = (start:Project {id: $id})-[:DEPENDS_ON*1..5]->(dep:Project)
RETURN dep, length(path) AS depth,
       [n IN nodes(path) | n.name] AS chain
ORDER BY depth ASC
```

**Why it's hard in SQL:** This requires a recursive CTE (`WITH RECURSIVE`). The `*1..5` syntax in Cypher expresses this naturally. Extracting the full path as a list (`[n IN nodes(path) | n.name]`) has no SQL equivalent without complex string aggregation.

---

### ⑤ Shortest Collaboration Path (graph-only)

Shortest path between two contributors via shared projects or follows.

```cypher
MATCH (start:Contributor {id: $from}), (end:Contributor {id: $to})
MATCH path = shortestPath((start)-[:CONTRIBUTED_TO|FOLLOWS*..6]-(end))
RETURN [node IN nodes(path) | {labels: labels(node), name: coalesce(node.name, node.title), id: node.id}] AS pathNodes,
       length(path) AS pathLength
```

**Why it's hard in SQL:** Shortest path over a multi-hop, multi-relationship type graph requires implementing BFS in SQL — a recursive CTE that tracks visited nodes, queues, and path arrays. Native graph engines expose `shortestPath()` as a first-class function.

---

## Screenshots

| Home Dashboard | Interactive Graph |
|---|---|
| ![Home](./docs/screenshot-home.png) | ![Graph](./docs/screenshot-graph.png) |

| Contributors | Supply-Chain Risk Query |
|---|---|
| ![Contributors](./docs/screenshot-contributors.png) | ![Queries](./docs/screenshot-queries.png) |

---

## Setup

### 1. Create a CognoDB instance

1. Go to [console.cognodb.com/signup](https://console.cognodb.com/signup) and create a free account.
2. Create a free **c0** instance. Pick any region.
3. Once provisioned, copy your connection URI (`bolt+s://<id>.databases.cognodb.cloud`) and the generated password (shown once — save it now).

### 2. Clone and configure

```bash
git clone https://github.com/YOUR_USERNAME/techpulse.git
cd techpulse
npm install
cp .env.example .env
```

Edit `.env`:

```env
COGNODB_URI=bolt+s://YOUR_INSTANCE_ID.databases.cognodb.cloud
COGNODB_USER=cognodb
COGNODB_PASSWORD=your_generated_password_here
PORT=3000
```

### 3. Seed the database

```bash
npm run seed
```

This creates ~60 nodes and ~130 relationships in under 10 seconds.

### 4. Run the application

```bash
npm run dev    # development (with auto-reload via nodemon)
# or
npm start      # production
```

Open [http://localhost:3000](http://localhost:3000)

---

## Project Structure

```
techpulse/
├── server/
│   ├── index.js              # Express entry point, graceful shutdown
│   ├── db.js                 # CognoDB driver (env vars only, no hardcoded creds)
│   ├── routes/
│   │   ├── contributors.js   # GET /api/contributors, /api/contributors/:id
│   │   ├── projects.js       # GET /api/projects, /api/projects/:id
│   │   ├── organizations.js  # GET /api/organizations, /api/organizations/:id
│   │   ├── technologies.js   # GET /api/technologies
│   │   ├── graph.js          # GET /api/graph/overview, /stats, /neighborhood/:id
│   │   └── queries.js        # 5 graph-native query endpoints
│   └── seed/
│       └── seed.js           # Idempotent data loader with constraints
├── public/
│   ├── index.html            # SPA entry, semantic HTML, ARIA roles
│   ├── css/styles.css        # Full design system (dark mode, glassmorphism)
│   └── js/
│       ├── api.js            # Fetch wrappers for all endpoints
│       ├── graph.js          # D3.js force-directed graph with zoom/filter
│       └── app.js            # SPA router and all page logic
├── .env.example              # Template (never commit .env)
├── .gitignore
├── package.json
└── README.md
```

---

## Engineering decisions

**All Cypher queries are parameterized** — the Neo4j driver's parameterization prevents injection and enables query plan caching. No string concatenation is used anywhere in the query layer.

**Graceful error handling** — the server exits with a clear message if CognoDB is unreachable at startup. API routes return `503` with structured error objects rather than stack traces. The frontend shows inline error banners per section, not full-page crashes.

**Connection details are environment-only** — `server/db.js` reads from `process.env` and calls `process.exit(1)` if either `COGNODB_URI` or `COGNODB_PASSWORD` is missing. `.env` is in `.gitignore`.

**No build step** — the frontend is vanilla HTML/CSS/JS with D3.js loaded from CDN. This keeps the codebase walkable line-by-line without a bundler.

---

## Keep your instance running

Per the assignment requirements, the CognoDB instance will remain active until you confirm receipt of this submission.
# Wexa-AI-Technical-Assessment
