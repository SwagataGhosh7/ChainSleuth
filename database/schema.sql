-- ChainSleuth PostgreSQL Database Schema
-- Optimized for DigitalOcean Managed PostgreSQL (SSL enabled)

-- Extensions (UUID generation)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Investigations Table
CREATE TABLE IF NOT EXISTS investigations (
    id VARCHAR(64) PRIMARY KEY,
    wallet_address VARCHAR(42) NOT NULL,
    network VARCHAR(32) DEFAULT 'polygon',
    risk_score INTEGER NOT NULL CHECK (risk_score >= 0 AND risk_score <= 100),
    heuristics JSONB NOT NULL DEFAULT '[]'::jsonb,
    summary TEXT,
    total_volume_matic NUMERIC(28, 8) DEFAULT 0,
    total_volume_usd NUMERIC(28, 2) DEFAULT 0,
    node_count INTEGER DEFAULT 0,
    edge_count INTEGER DEFAULT 0,
    graph_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_investigations_wallet ON investigations(wallet_address);
CREATE INDEX IF NOT EXISTS idx_investigations_created_at ON investigations(created_at DESC);

-- 2. Wallet Tags & Aliases Table
CREATE TABLE IF NOT EXISTS wallet_tags (
    id VARCHAR(64) PRIMARY KEY,
    wallet_address VARCHAR(42) NOT NULL,
    case_id VARCHAR(64),
    tag VARCHAR(64) NOT NULL,
    category VARCHAR(32) DEFAULT 'CUSTOM',
    risk_level VARCHAR(16) DEFAULT 'MEDIUM',
    notes TEXT,
    investigator VARCHAR(64) DEFAULT 'Forensic Analyst',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_wallet_tags_wallet ON wallet_tags(wallet_address);
CREATE INDEX IF NOT EXISTS idx_wallet_tags_case ON wallet_tags(case_id);

-- 3. Case Notes Table
CREATE TABLE IF NOT EXISTS case_notes (
    id VARCHAR(64) PRIMARY KEY,
    case_id VARCHAR(64) NOT NULL,
    wallet_address VARCHAR(42),
    author VARCHAR(64) DEFAULT 'Lead Investigator',
    content TEXT NOT NULL,
    pinned BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_case_notes_case ON case_notes(case_id);

-- 4. Copilot Chat History & Memory Table
CREATE TABLE IF NOT EXISTS chat_history (
    id VARCHAR(64) PRIMARY KEY,
    case_id VARCHAR(64) NOT NULL,
    wallet_address VARCHAR(42),
    role VARCHAR(16) NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    message TEXT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_chat_history_case ON chat_history(case_id, created_at ASC);

-- 5. Seed Data: Multi-Hop DeFi Bridge Exploit Heist
INSERT INTO investigations (
    id, wallet_address, network, risk_score, heuristics, summary,
    total_volume_matic, total_volume_usd, node_count, edge_count, created_at
) VALUES (
    'case-poly-heist-001',
    '0x71c84192b3a9843074ac292947365cdd4379201c',
    'polygon',
    96,
    '["RAPID_PEEL_CHAIN", "MIXER_DEPOSIT_HOP", "FAN_OUT_DISPERSION", "HIGH_FREQUENCY_TRANSFERS", "FRESH_BURNER_NODES"]'::jsonb,
    'High-severity DeFi bridge drainer exploit detected. 1,450,000 MATIC (~$1.08M USD) siphoned across 4 rapid peeling hops into intermediate splitters, routing 420k MATIC to Tornado Cash router and peeling remaining funds through burner relayers toward OTC/CEX deposit addresses.',
    1450000.00000000,
    1087500.00,
    12,
    16,
    CURRENT_TIMESTAMP - INTERVAL '2 hours'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO wallet_tags (id, wallet_address, case_id, tag, category, risk_level, notes, investigator) VALUES
('tag-001', '0x71c84192b3a9843074ac292947365cdd4379201c', 'case-poly-heist-001', 'Primary Exploiter Root', 'EXPLOITER', 'CRITICAL', 'Initial compromised bridge hot wallet receiver. Dispersed 1.45M MATIC in under 9 minutes.', 'Sleuth-1'),
('tag-002', '0x1a8f9024c0847932bc39478fef123498a44b9211', 'case-poly-heist-001', 'Hop-1 Peel Node', 'PEEL_HOP', 'HIGH', 'Rapid split intermediary. Retained 150k MATIC, forwarded 1.3M MATIC to hop 2.', 'Sleuth-1'),
('tag-003', '0x498a0d7821feec09b384792a1042cb3a9089ef01', 'case-poly-heist-001', 'Tornado Cash Proxy Router', 'MIXER', 'CRITICAL', 'Direct contract interaction for 100 MATIC denominations (420k MATIC cumulative deposit).', 'Sleuth-2'),
('tag-004', '0x99238bf10248ad9081273849182049182390192a', 'case-poly-heist-001', 'Suspected CEX Deposit / KYC Risk', 'EXCHANGE', 'HIGH', 'Binance / OKX deposit endpoint receiving peeled tranche.', 'Sleuth-2')
ON CONFLICT (id) DO NOTHING;

INSERT INTO case_notes (id, case_id, wallet_address, author, content, pinned) VALUES
('note-001', 'case-poly-heist-001', '0x71c84192b3a9843074ac292947365cdd4379201c', 'Lead Forensics Investigator', 'Bridge contract re-entrancy attack occurred at block 58,192,042. Exploiter triggered consecutive 350k MATIC withdrawals before routing through 4 peel wallets. Target exchanges alerted with frozen deposit flags.', TRUE),
('note-002', 'case-poly-heist-001', '0x498a0d7821feec09b384792a1042cb3a9089ef01', 'Compliance Officer', 'OFAC-sanctioned mixer contract interaction confirmed. Submitting Suspicious Activity Report (SAR) dossier to FinCEN and chain security coalition.', FALSE)
ON CONFLICT (id) DO NOTHING;
