# ChainSleuth — AI-Powered On-Chain Forensics Copilot

An enterprise-grade, dark-mode cybersecurity and blockchain intelligence web application for investigating suspicious Polygon and EVM cryptocurrency transactions, mapping multi-hop laundering peel chains, maintaining persistent case memory via Backboard, and generating human-readable forensic and SAR reports.

---

### User Review & Critical Decisions

> [!IMPORTANT]
> The following architectural decisions were aligned during Phase 1 clarification:

- **Confirmed Decision 1 (Demo Scenario)**: Preconfigured with a high-profile DeFi Bridge Exploit scenario showcasing rapid peel-chain layering, mixer routing, round-number dispersal, and fresh burner wallet fan-out across a 12-node network.
- **Confirmed Decision 2 (Full-Stack Orchestration)**: Unified Express REST API + Vite server running on port 3000 for seamless single-port preview in Google AI Studio, paired with clean monorepo folder exports (`/frontend`, `/backend`, `/database`, `docker-compose.yml`, `README.md`, `CONTRIBUTING.md`) for independent microservice deployment.
- **Confirmed Decision 3 (AI Engine Fallback)**: Server-side Gemini 2.5 Flash reasoning via `@google/genai` (with intelligent deterministic forensic heuristic fallback), ready to route to Backboard memory and Tinker inference when API keys are configured.

---

### 1. Overview & Core Concept

**ChainSleuth** (*AI On-Chain Forensics Copilot*) bridges on-chain graph analysis with conversational AI reasoning for blockchain intelligence investigators, compliance officers, and Web3 security researchers.

- **Primary Goal**: Ingest any EVM/Polygon wallet address or pre-built exploit case, automatically reconstruct the directed transaction flow graph, flag suspicious anti-money-laundering (AML) heuristics (rapid peeling, wash trading, burner fan-out, mixer hops), and provide an autonomous AI Copilot that remembers investigator notes and tags across sessions.
- **Target Persona**: Web3 security analysts, incident responders, law enforcement forensic specialists, and DeFi protocol risk teams tracking stolen assets.
- **Key Value**: Replaces tedious manual block explorer lookup with an interactive node-link graph, real-time risk gauges, persistent Backboard case memory, and 1-click Suspicious Activity Report (SAR) markdown export.

---

### 2. User Experience & Visual Design

#### A. Aesthetic Direction & Theme Tokens
Built strictly in accordance with cybersecurity and SaaS enterprise design guidelines (WCAG AA contrast, tabular numerals, zero-pill text metadata discipline, and dark-mode optical compensation):
- **Canvas Neutral (60%)**: Deep cybersecurity obsidian slate (`#0d1117` background, `#161b22` structural panels, `#21262d` borders).
- **Structural Surfaces (30%)**: Hairline bordered card surfaces (`#161b22`), subtle dividers (`#30363d`), high-contrast muted text (`#8b949e`), crisp primary text (`#f0f6fc`).
- **Accent Budget (10%)**:
  - Threat High-Risk: Coral Crimson (`#ff7b72`)
  - Warning / Peel Suspicion: Amber Flame (`#d29922`)
  - Clean / Exchange Gateway: Emerald Mint (`#3fb950` / `#7ee787`)
  - Primary Action / Active Node: Electric Cyan/Blue (`#58a6ff`)

#### B. Typographic Hierarchy
- **Brand / Headers**: `Plus Jakarta Sans` / `Outfit` geometric display styling with `font-semibold` and `text-wrap: balance`.
- **Prose & Prompts**: `Plus Jakarta Sans` / `DM Sans` (14px–15px) for scannability and comfortable investigator notes.
- **Financial Figures, Hashes & Timestamps**: Tabular figures (`tabular-nums font-mono`) with automatic 0x truncation (`0x1a2b...9f8e`) and copy-to-clipboard affordances.
- **Zero-Pill Discipline**: Metadata uses clean text with typographic separators (`·` or `/`) instead of stacked colorful capsule pills.

#### C. Key User Workflows & Layout
1. **Top Command Bar**:
   - Single-line wordmark: **ChainSleuth** (`AI On-Chain Forensics`).
   - Network selector (`Polygon Mainnet` / `Ethereum`), live address search bar (`0x...`), "Scan Wallet" button, and 1-click "Load Demo Heist Case" button.
   - Connection status indicators for `Render API`, `DigitalOcean DB`, `Backboard Memory`, and `Gemini/Tinker AI`.
2. **Main Forensic Canvas (70% viewport)**:
   - **Threat Summary Metric Banner**: Risk score gauge (0–100 with dynamic gradient fill), Total Volume Analyzed (in MATIC & USD), Suspicious Pattern flags (Peel Chain, Mixer Hop, High Fan-out), and "Export SAR Forensic Report".
   - **Interactive Node-Link Transaction Graph**: Full Canvas/SVG renderer with physics-informed force layout, zoom/pan controls, directional animated particle flow representing asset volume, node risk coloring, and node-selection highlight.
   - **Investigator Node Inspector & Tag Drawer**: Clicking any wallet displays in/out flow, first/last seen, balance, and quick tag selector ("Suspected Exploiter", "Peel Intermediary", "CEX Deposit", "Tornado Cash Cashout").
   - **Transaction Ledger Data Grid**: Sortable, filterable table with Tx Hash, Direction, From, To, Value (MATIC), Timestamp, and Heuristic Risk Flag with direct polygonscan link.
3. **Right Sidebar: AI Detective Copilot & Case Vault (30% viewport)**:
   - "Backboard Case Memory: Active" status toggle with saved case tags.
   - Quick-analysis chips: *"Explain the laundering trail"*, *"Identify cash-out endpoints"*, *"Draft law enforcement summary"*, *"Detect fresh burner addresses"*.
   - Streaming/formatted markdown conversation interface with investigator note pinning.
   - Persistent Investigator Case Notes drawer synced to Backboard and PostgreSQL.

---

### 3. Key Product Decisions & Trade-Offs

- **Dual-Mode Persistence (PostgreSQL + Local Memory Fallback)**:
  - *Decision*: Support direct connection to DigitalOcean PostgreSQL via `DATABASE_URL` (`pg` client with SSL support) with an automatic in-memory / local storage fallback if the database URL is not yet configured.
  - *Rationale*: Guarantees zero crashes on initial boot or in isolated sandbox environments while maintaining full production readiness.
- **Deterministic Heuristics Engine + LLM Hybrid**:
  - *Decision*: Deterministic pattern detectors compute risk scores, peel chains, wash trades, and mixer interactions directly from raw transaction graphs, which are then passed as rich structured context to Gemini 2.5 Flash / Tinker.
  - *Rationale*: Eliminates LLM hallucination of transaction numbers or hashes while leveraging LLM strengths for human-readable synthesis and legal report generation.
- **Clean Monorepo Organization**:
  - *Decision*: Organize full monorepo artifacts:
    - `/frontend` (React + Tailwind + Lucide + SVG/Canvas Visualizer)
    - `/backend` (Express API + `blockchainService` + `dbService` + `backboardService` + `aiService`)
    - `/database` (`schema.sql` with migrations and sample heist seed data)
    - `docker-compose.yml`, `README.md`, `CONTRIBUTING.md` (Hacktoberfest-ready).
  - *AI Studio Dev Runner*: Unified Express app serving the Vite build or proxying client assets so the app runs instantaneously on port 3000.

---

### 4. Technical Architecture & Data Strategy

```
┌────────────────────────────────────────────────────────────────────────┐
│                        ChainSleuth Monorepo                             │
├───────────────────────────────────┬────────────────────────────────────┤
│           /frontend               │              /backend              │
│  React 19 + Tailwind CSS + Lucide │  Node.js + Express REST API        │
│  Interactive Canvas/SVG Graph     │  Port 3000 (Unified Server)        │
└─────────────────┬─────────────────┴──────────────────┬─────────────────┘
                  │                                    │
                  │ Fetch / Scan / Chat / Tags         │
                  ▼                                    ▼
       ┌─────────────────────┐              ┌─────────────────────┐
       │   Client Browser    │              │  Express Endpoints  │
       │  - Graph Canvas     │◄────────────►│  - GET /api/health  │
       │  - Threat Gauges    │              │  - POST /api/scan   │
       │  - Copilot Sidebar  │              │  - POST /api/chat   │
       │  - SAR Exporter     │              │  - POST /api/tags   │
       └─────────────────────┘              └──────────┬──────────┘
                                                       │
         ┌───────────────────┬─────────────────────────┼───────────────────┐
         ▼                   ▼                         ▼                   ▼
┌──────────────────┐┌──────────────────┐┌──────────────────┐┌──────────────────┐
│blockchainService ││    dbService     ││ backboardService ││    aiService     │
│- Polygonscan API ││- DigitalOcean PG ││- Backboard Memory││- Gemini 2.5 Flash│
│- Wei/MATIC Math  ││- Fallback Store  ││- Case Context    ││- Tinker Inference│
│- AML Heuristics  ││- Schema Auto-init││- Entity Tags     ││- Heuristic Engine│
└──────────────────┘└──────────────────┘└──────────────────┘└──────────────────┘
```

#### Core Data Models
- **Investigation**: `{ id, walletAddress, network, riskScore, heuristics, totalVolumeMatic, totalVolumeUsd, nodeCount, edgeCount, createdAt }`
- **GraphNode**: `{ id: address, label, alias, riskScore, category: 'EXPLOITER'|'PEEL_HOP'|'MIXER'|'EXCHANGE'|'BURNER'|'CLEAN', balance, isRoot }`
- **GraphEdge**: `{ id, source, target, hash, valueMatic, timestamp, heuristic: 'PEEL_SPLIT'|'RAPID_TRANSFER'|'FAN_OUT'|'STANDARD' }`
- **WalletTag / CaseNote**: `{ id, caseId, walletAddress, tag, note, investigator: 'Analyst', createdAt }`
- **ChatMessage**: `{ id, role: 'user'|'copilot'|'system', content, timestamp, citations }`
