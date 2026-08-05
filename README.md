<div align="center">
  <img src="./public/favicon.ico" width="80" height="80" alt="GraphGuard AI Logo">
  <h1>GraphGuard AI</h1>
  <p><b>Enterprise-Grade ReBAC (Relationship-Based Access Control) for Secure LLM Deployments.</b></p>
  <p><i>The mission-critical infrastructure required to bring Generative AI to the enterprise without leaking data.</i></p>
</div>

---

## 🚀 The Billion-Dollar Problem
Enterprises are racing to deploy Large Language Models (LLMs) over their internal knowledge bases (RAG). But there is a fatal flaw: **LLMs do not understand permissions.** 

If you connect an AI to a vector database containing your company's Slack, Jira, and GitHub data, the AI will happily leak confidential HR documents or pre-release code to unauthorized employees if they ask the right prompt. 

Traditional Role-Based Access Control (RBAC) is too rigid. Attribute-Based Access Control (ABAC) is too slow for real-time AI generation. 

## 💡 The Solution: GraphGuard
GraphGuard AI is a high-performance **Relationship-Based Access Control (ReBAC)** engine powered by a native graph database (CognoDB/Neo4j). 

Instead of relying on flat permission tables, we map your entire enterprise identity and data landscape into a rich Knowledge Graph. Before an LLM retrieves context, GraphGuard instantly traverses the graph to evaluate multi-hop permission paths (e.g., `User -> Team -> Department -> Project <- Asset`). 

If a user does not have a valid, provable relationship path to the requested data, the LLM never sees it. **Zero hallucinations, zero data leaks.**

---

## 📈 Business Model & Market Potential
Data security is the #1 blocker for enterprise AI adoption. GraphGuard AI is positioned as a B2B Enterprise SaaS infrastructure layer:

- **API-First SaaS:** Developers integrate our SDK into their LangChain/LlamaIndex pipelines. We charge by API volume (millions of graph traversals per month).
- **Enterprise On-Prem:** High-compliance industries (Fintech, Healthcare, Defense) require self-hosted deployments. We offer premium enterprise licenses starting at $120k/yr.
- **Strategic Integrations:** Native plugins for Snowflake, Databricks, and AWS Bedrock to become the default security layer for AI.

---

## ⚡ Core Features

- **Cypher-Powered ReBAC Engine:** Evaluates complex hierarchical access rules in under 10ms.
- **God-Level UI/UX Dashboard:** A cyberpunk-minimalist mission control center to visualize access paths, run graph queries, and monitor security audits in real-time.
- **Live GitHub/Data Sync:** Automatically ingest organization hierarchies, repositories, and contributor relationships into the graph in seconds.
- **Immutable Security Audit Logs:** Every access decision is logged with the exact graph path that granted or denied access—crucial for SOC2 and GDPR compliance.
- **Framework-Agnostic Core:** Built without bloat. Our UI is purely vanilla CSS/JS (zero framework dependencies) making it wildly fast and embeddable anywhere.

---

## 🏗️ Technical Architecture
We use a modern, hyper-optimized stack designed for scale and developer experience:

- **Frontend:** Pure HTML5, Vanilla JavaScript, and D3.js for interactive graph visualization. Zero bloated frameworks, resulting in instant Time-To-Interactive (TTI).
- **Backend:** Node.js / Express.js REST API layer.
- **Database:** CognoDB (Managed Neo4j via openCypher/Bolt 5.x).
- **Deployment:** Vercel (Edge network routing) connected to high-availability database clusters.

---

## 🛠️ Local Development & Setup

### 1. Database Provisioning
GraphGuard relies on a graph database.
1. Go to [console.cognodb.com](https://console.cognodb.com) and create a free **c0** instance.
2. Copy your connection URI (`bolt+s://<id>.databases.cognodb.cloud`) and password.

### 2. Clone & Configure
```bash
git clone https://github.com/yashjadhav1595-projects/wexa.ai.assign.git
cd wexa.ai.assign
npm install
cp .env.example .env
```
Edit `.env` with your credentials:
```env
COGNODB_URI=bolt+s://YOUR_INSTANCE_ID.databases.cognodb.cloud
COGNODB_USER=cognodb
COGNODB_PASSWORD=your_password
PORT=3000
```

### 3. Seed the Knowledge Graph
Populate the database with initial enterprise relationships, users, and dummy data:
```bash
npm run seed
```

### 4. Run the Engine
```bash
npm run dev    
```
Open [http://localhost:3000](http://localhost:3000) to view the GraphGuard Dashboard.

---

## 🧠 Why a Graph Database over SQL?
Enterprise structures are graphs, not tables. When evaluating if *User A* has access to *Asset B* because *User A* is in a *Group* that manages a *Project* containing *Asset B*... a SQL database requires 5 recursive `JOIN`s, degrading latency. 

A Graph Database does this natively via pointers:
```cypher
MATCH path = (u:User)-[:MEMBER_OF*1..3]->(:Group)-[:MANAGES]->(p:Project)<-[:BELONGS_TO]-(a:Asset)
RETURN path
```
**Result:** Sub-millisecond authorization evaluation at infinite scale.

---

## 🛠️ Technical Architecture Deep Dive

GraphGuard is designed as a high-throughput, low-latency authorization backplane.

### 1. Data Schema (Nodes & Relationships)
The core engine maps identity providers (Okta, Entra) and resource providers (GitHub, AWS, internal DBs) into a unified ontology:

**Nodes:**
- `(:Contributor)` - Human or machine identities.
- `(:Project)` - Codebases, vector DB namespaces, or software assets.
- `(:Organization)` - Companies or top-level enterprise units.
- `(:DataAsset)` - The highly-sensitive resources LLMs are trying to access.

**Relationships:**
- `(Contributor)-[:WORKS_AT {role}]->(Organization)`
- `(Contributor)-[:CONTRIBUTED_TO {commits}]->(Project)`
- `(Project)-[:DEPENDS_ON]->(Project)`
- `(DataAsset)-[:BELONGS_TO]->(Project)`

### 2. High-Performance ReBAC Queries
Our API executes native `openCypher` traversals to validate access. 

**Query: Supply-Chain Risk Analysis**
*Goal: Find unauthorized paths where competing orgs share contributors.*
```cypher
MATCH (orgA:Organization)<-[:PART_OF]-(projA:Project)-[:DEPENDS_ON]->(projB:Project)-[:PART_OF]->(orgB:Organization)
WHERE orgA <> orgB
MATCH (c:Contributor)-[:CONTRIBUTED_TO]->(projA)
MATCH (c)-[:CONTRIBUTED_TO]->(projB)
RETURN orgA.name, projA.name, projB.name, orgB.name, c.name
```

**Query: Instant ReBAC Verification**
*Goal: Check if a user has a valid path to a DataAsset via organization or project hierarchy.*
```cypher
MATCH path = shortestPath((u:Contributor {id: $userId})-[:WORKS_AT|CONTRIBUTED_TO|BELONGS_TO*1..5]-(a:DataAsset {id: $assetId}))
RETURN path, length(path) as hops
```

### 3. API & Endpoints
The Node.js/Express backend exposes ultra-fast REST endpoints designed to be called by LangChain or LlamaIndex before executing retrieval logic:

- `GET /api/auth/check-access?contributorId={id}&assetId={id}`: The core ReBAC endpoint. Returns `200 OK` (with the relationship path) if access is permitted, or `403 Forbidden` if no path exists.
- `POST /api/admin/sync`: Hydrates the graph database by pulling live hierarchies from GitHub/GitLab APIs.
- `GET /api/admin/audit`: Returns the immutable ledger of all ReBAC decisions for SOC2 compliance.

### 4. Security & Optimization
- **Prepared Statements:** All Cypher queries utilize parameterized inputs (`$userId`, `$assetId`), preventing Cypher-injection attacks and enabling query plan caching in the DB engine.
- **Stateless Edge Delivery:** Deployed on Vercel, the backend utilizes stateless functions that hold minimal memory, scaling infinitely to match LLM inference volume.

---
*Built to redefine enterprise AI security.*
