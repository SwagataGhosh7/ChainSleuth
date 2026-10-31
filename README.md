# ChainSleuth — AI-Powered On-Chain Forensics Copilot

[![License: Apache-2.0](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
[![Polygon EVM](https://img.shields.io/badge/Network-Polygon%20%7C%20EVM-purple.svg)](https://polygonscan.com)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED.svg)](https://www.docker.com/)
[![Hacktoberfest](https://img.shields.io/badge/Hacktoberfest-2026-orange.svg)](https://hacktoberfest.com/)

> **Autonomous on-chain forensics copilot that maps multi-hop EVM cryptocurrency transactions, isolates laundering peel chains, preserves persistent case memory via Backboard, and generates human-readable forensic reports using Gemini & Tinker.**

---

## 🏛️ Monorepo Architecture

```
chain-sleuth/
├── frontend/             # React 19 + Tailwind CSS + Interactive Canvas/SVG Graph
├── backend/              # Node.js + Express REST API Orchestrator (CORS, pg, axios)
│   └── src/services/
│       ├── blockchainService.ts  # Polygonscan API & 12-Node DeFi Heist Dataset
│       ├── dbService.ts          # DigitalOcean PostgreSQL & In-Memory Store
│       ├── backboardService.ts   # Backboard Persistent Case Memory & Tags
│       ├── aiService.ts          # Gemini 2.5 Flash / Tinker Reasoning Engine
│       └── forensicHeuristics.ts # Deterministic AML Graph Algorithms
├── database/             # schema.sql for DigitalOcean Managed PostgreSQL
├── docker-compose.yml    # Multi-container orchestration (DB, API, Web)
├── .env.example          # Environment variable template
└── CONTRIBUTING.md       # Hacktoberfest contributor roadmap
```

---

## 🚀 Key Features

1. **Interactive Multi-Hop Transaction Graph**:
   - Directed force-directed node-link visualizer rendering wallets, transfer amounts, velocities, and risk color coding.
   - Interactive node inspection, custom alias tagging, and filtering.

2. **Deterministic AML Heuristics Engine**:
   - **Rapid Peel Chains**: Flags sequential transfers forwarding >70% of funds in <15 minutes.
   - **Mixer / Tumbler Detection**: Identifies contract interactions with Tornado Cash and Railgun.
   - **Layered Smurfing**: Detects high fan-out dispersion into fresh ephemeral burner wallets.
   - **Composite Threat Gauge**: Computes 0–100 risk score and threat classification.

3. **Persistent Case Memory (Backboard & PostgreSQL)**:
   - Synchronizes investigator tags (e.g. *Suspected Exploiter*, *CEX Deposit*) and notes.
   - Restores case memory across investigator sessions.

4. **Autonomous AI Forensics Copilot**:
   - Natural language investigator chat powered by Gemini 2.5 Flash / Tinker.
   - 1-Click **Suspicious Activity Report (SAR)** markdown generation ready for law enforcement and FinCEN compliance filing.

5. **Built-in 12-Node Demo Heist Dataset**:
   - Zero-configuration live demonstration mode simulating a 1.45M MATIC bridge exploit with peel hops and mixer cashouts.

---

## 🛠️ Quick Start

### Option A: Local Development (Unified Server)
```bash
# 1. Clone repository
git clone https://github.com/chainsleuth/chainsleuth.git
cd chainsleuth

# 2. Copy environment template
cp .env.example .env

# 3. Install dependencies
npm install

# 4. Start full-stack dev server (Vite + Express on Port 3000)
npm run dev
```

### Option B: Docker Compose (Full Stack with PostgreSQL)
```bash
docker compose up --build
```
- **Web App**: http://localhost:3000
- **Backend API**: http://localhost:5000
- **PostgreSQL**: localhost:5432 (`chainsleuth`)

---

## 📡 REST API Reference

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/health` | Health checks for Render, PostgreSQL, Backboard, and Gemini |
| `POST` | `/api/scan` | Ingests `{ walletAddress, network }` and returns threat analysis |
| `POST` | `/api/chat` | Conversational forensic copilot query with graph & memory context |
| `POST` | `/api/tags` | Saves wallet alias and investigator classification |
| `GET` | `/api/tags/:walletAddress` | Retrieves tags and notes for an address |
| `POST` | `/api/notes` | Attaches a pinned case note to an active investigation |
| `POST` | `/api/export-sar` | Compiles a formatted Suspicious Activity Report (SAR) |

---

## 🔒 Security & Privacy
ChainSleuth operates in a non-custodial capacity and strictly parses public distributed ledger state. No private keys or wallet signatures are ever requested or stored.
