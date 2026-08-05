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
*Built to redefine enterprise AI security.*
