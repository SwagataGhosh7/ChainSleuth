/**
 * DigitalOcean Managed PostgreSQL & In-Memory Fallback Persistence Service
 * Stores investigations, wallet_tags, case_notes, and chat_history
 */

import pg from 'pg';
const { Pool } = pg;

export interface DBInvestigation {
  id: string;
  walletAddress: string;
  network: string;
  riskScore: number;
  heuristics: string[];
  summary: string;
  totalVolumeMatic: number;
  totalVolumeUsd: number;
  nodeCount: number;
  edgeCount: number;
  graphData?: any;
  createdAt: string;
}

export interface DBWalletTag {
  id: string;
  walletAddress: string;
  caseId?: string;
  tag: string;
  category: string;
  riskLevel: string;
  notes?: string;
  investigator: string;
  createdAt: string;
}

export interface DBCaseNote {
  id: string;
  caseId: string;
  walletAddress?: string;
  author: string;
  content: string;
  pinned: boolean;
  createdAt: string;
}

export interface DBChatMessage {
  id: string;
  caseId: string;
  walletAddress?: string;
  role: 'user' | 'assistant' | 'system';
  message: string;
  metadata?: any;
  createdAt: string;
}

export class DBService {
  private pool: pg.Pool | null = null;
  public isConnectedToPostgres = false;

  // In-memory persistent fallbacks if DATABASE_URL is not set or offline
  private memoryInvestigations = new Map<string, DBInvestigation>();
  private memoryTags = new Map<string, DBWalletTag[]>(); // key: walletAddress lowercase
  private memoryNotes = new Map<string, DBCaseNote[]>(); // key: caseId
  private memoryChat = new Map<string, DBChatMessage[]>(); // key: caseId

  constructor() {
    this.seedDefaultMemory();
    this.initPostgres();
  }

  private seedDefaultMemory() {
    const demoCaseId = 'case-poly-heist-001';
    const demoWallet = '0x71c84192b3a9843074ac292947365cdd4379201c';

    this.memoryInvestigations.set(demoCaseId, {
      id: demoCaseId,
      walletAddress: demoWallet,
      network: 'polygon',
      riskScore: 96,
      heuristics: ['RAPID_PEEL_CHAIN', 'MIXER_DEPOSIT_HOP', 'FAN_OUT_DISPERSION', 'FRESH_BURNER_NODES'],
      summary: 'High-severity DeFi bridge drainer exploit detected. 1,450,000 MATIC siphoned across 4 rapid peeling hops.',
      totalVolumeMatic: 1450000,
      totalVolumeUsd: 1087500,
      nodeCount: 12,
      edgeCount: 16,
      createdAt: new Date().toISOString(),
    });

    this.memoryTags.set(demoWallet.toLowerCase(), [
      {
        id: 'tag-1',
        walletAddress: demoWallet,
        caseId: demoCaseId,
        tag: 'Primary Exploiter Root',
        category: 'EXPLOITER',
        riskLevel: 'CRITICAL',
        notes: 'Initial compromised bridge hot wallet receiver. Dispersed 1.45M MATIC in under 9 minutes.',
        investigator: 'Sleuth-Lead',
        createdAt: new Date().toISOString(),
      },
    ]);

    this.memoryNotes.set(demoCaseId, [
      {
        id: 'note-1',
        caseId: demoCaseId,
        walletAddress: demoWallet,
        author: 'Lead Forensics Investigator',
        content: 'Bridge contract re-entrancy attack occurred. Exploiter triggered consecutive withdrawals before routing through 4 peel wallets. Target exchanges alerted with frozen deposit flags.',
        pinned: true,
        createdAt: new Date().toISOString(),
      },
      {
        id: 'note-2',
        caseId: demoCaseId,
        author: 'Compliance Officer',
        content: 'OFAC-sanctioned mixer contract interaction confirmed with Tornado Cash. Submitting Suspicious Activity Report (SAR) dossier to FinCEN.',
        pinned: false,
        createdAt: new Date().toISOString(),
      },
    ]);
  }

  private async initPostgres() {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      console.log('ℹ️ DATABASE_URL not set; using resilient in-memory store.');
      return;
    }

    try {
      this.pool = new Pool({
        connectionString: databaseUrl,
        ssl: {
          rejectUnauthorized: false,
        },
        max: 10,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 5000,
      });

      // Test connection and auto-initialize tables
      const client = await this.pool.connect();
      try {
        await client.query(`
          CREATE TABLE IF NOT EXISTS investigations (
            id VARCHAR(64) PRIMARY KEY,
            wallet_address VARCHAR(42) NOT NULL,
            network VARCHAR(32) DEFAULT 'polygon',
            risk_score INTEGER NOT NULL,
            heuristics JSONB NOT NULL DEFAULT '[]'::jsonb,
            summary TEXT,
            total_volume_matic NUMERIC(28, 8) DEFAULT 0,
            total_volume_usd NUMERIC(28, 2) DEFAULT 0,
            node_count INTEGER DEFAULT 0,
            edge_count INTEGER DEFAULT 0,
            graph_data JSONB,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
          );

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

          CREATE TABLE IF NOT EXISTS case_notes (
            id VARCHAR(64) PRIMARY KEY,
            case_id VARCHAR(64) NOT NULL,
            wallet_address VARCHAR(42),
            author VARCHAR(64) DEFAULT 'Lead Investigator',
            content TEXT NOT NULL,
            pinned BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
          );

          CREATE TABLE IF NOT EXISTS chat_history (
            id VARCHAR(64) PRIMARY KEY,
            case_id VARCHAR(64) NOT NULL,
            wallet_address VARCHAR(42),
            role VARCHAR(16) NOT NULL,
            message TEXT NOT NULL,
            metadata JSONB DEFAULT '{}'::jsonb,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
          );
        `);
        this.isConnectedToPostgres = true;
        console.log('✅ DigitalOcean PostgreSQL connected and schemas verified.');
      } finally {
        client.release();
      }
    } catch (err) {
      console.warn('⚠️ Could not connect to PostgreSQL; falling back to in-memory store:', (err as any)?.message);
      this.isConnectedToPostgres = false;
    }
  }

  // --- Investigations ---
  async saveInvestigation(inv: DBInvestigation): Promise<void> {
    this.memoryInvestigations.set(inv.id, inv);
    if (this.isConnectedToPostgres && this.pool) {
      try {
        await this.pool.query(
          `INSERT INTO investigations (id, wallet_address, network, risk_score, heuristics, summary, total_volume_matic, total_volume_usd, node_count, edge_count, graph_data, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
           ON CONFLICT (id) DO UPDATE SET risk_score = $4, heuristics = $5, summary = $6, total_volume_matic = $7, total_volume_usd = $8, node_count = $9, edge_count = $10, graph_data = $11;`,
          [
            inv.id,
            inv.walletAddress,
            inv.network,
            inv.riskScore,
            JSON.stringify(inv.heuristics),
            inv.summary,
            inv.totalVolumeMatic,
            inv.totalVolumeUsd,
            inv.nodeCount,
            inv.edgeCount,
            JSON.stringify(inv.graphData || {}),
            inv.createdAt,
          ]
        );
      } catch (err) {
        console.error('Error saving investigation to Postgres:', err);
      }
    }
  }

  async getInvestigation(id: string): Promise<DBInvestigation | null> {
    if (this.isConnectedToPostgres && this.pool) {
      try {
        const res = await this.pool.query('SELECT * FROM investigations WHERE id = $1', [id]);
        if (res.rows.length > 0) {
          const row = res.rows[0];
          return {
            id: row.id,
            walletAddress: row.wallet_address,
            network: row.network,
            riskScore: row.risk_score,
            heuristics: Array.isArray(row.heuristics) ? row.heuristics : JSON.parse(row.heuristics || '[]'),
            summary: row.summary,
            totalVolumeMatic: parseFloat(row.total_volume_matic),
            totalVolumeUsd: parseFloat(row.total_volume_usd),
            nodeCount: row.node_count,
            edgeCount: row.edge_count,
            graphData: row.graph_data,
            createdAt: row.created_at,
          };
        }
      } catch (err) {
        console.warn('Postgres query failed, checking memory:', err);
      }
    }
    return this.memoryInvestigations.get(id) || null;
  }

  async listInvestigations(): Promise<DBInvestigation[]> {
    if (this.isConnectedToPostgres && this.pool) {
      try {
        const res = await this.pool.query('SELECT * FROM investigations ORDER BY created_at DESC LIMIT 20');
        return res.rows.map((row) => ({
          id: row.id,
          walletAddress: row.wallet_address,
          network: row.network,
          riskScore: row.risk_score,
          heuristics: Array.isArray(row.heuristics) ? row.heuristics : JSON.parse(row.heuristics || '[]'),
          summary: row.summary,
          totalVolumeMatic: parseFloat(row.total_volume_matic),
          totalVolumeUsd: parseFloat(row.total_volume_usd),
          nodeCount: row.node_count,
          edgeCount: row.edge_count,
          createdAt: row.created_at,
        }));
      } catch (err) {
        console.warn('Postgres query failed, returning memory list:', err);
      }
    }
    return Array.from(this.memoryInvestigations.values());
  }

  // --- Wallet Tags ---
  async saveTag(tag: DBWalletTag): Promise<void> {
    const key = tag.walletAddress.toLowerCase();
    const existing = this.memoryTags.get(key) || [];
    this.memoryTags.set(key, [tag, ...existing.filter((t) => t.id !== tag.id)]);

    if (this.isConnectedToPostgres && this.pool) {
      try {
        await this.pool.query(
          `INSERT INTO wallet_tags (id, wallet_address, case_id, tag, category, risk_level, notes, investigator, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
           ON CONFLICT (id) DO UPDATE SET tag = $4, category = $5, risk_level = $6, notes = $7;`,
          [
            tag.id,
            tag.walletAddress.toLowerCase(),
            tag.caseId,
            tag.tag,
            tag.category,
            tag.riskLevel,
            tag.notes || '',
            tag.investigator,
            tag.createdAt,
          ]
        );
      } catch (err) {
        console.error('Error saving wallet tag to Postgres:', err);
      }
    }
  }

  async getTags(walletAddress?: string): Promise<DBWalletTag[]> {
    if (walletAddress) {
      const key = walletAddress.toLowerCase();
      if (this.isConnectedToPostgres && this.pool) {
        try {
          const res = await this.pool.query(
            'SELECT * FROM wallet_tags WHERE LOWER(wallet_address) = $1 ORDER BY created_at DESC',
            [key]
          );
          if (res.rows.length > 0) {
            return res.rows.map((r) => ({
              id: r.id,
              walletAddress: r.wallet_address,
              caseId: r.case_id,
              tag: r.tag,
              category: r.category,
              riskLevel: r.risk_level,
              notes: r.notes,
              investigator: r.investigator,
              createdAt: r.created_at,
            }));
          }
        } catch (err) {
          console.warn('Postgres tag query error:', err);
        }
      }
      return this.memoryTags.get(key) || [];
    }

    // Return all tags
    if (this.isConnectedToPostgres && this.pool) {
      try {
        const res = await this.pool.query('SELECT * FROM wallet_tags ORDER BY created_at DESC LIMIT 50');
        return res.rows.map((r) => ({
          id: r.id,
          walletAddress: r.wallet_address,
          caseId: r.case_id,
          tag: r.tag,
          category: r.category,
          riskLevel: r.risk_level,
          notes: r.notes,
          investigator: r.investigator,
          createdAt: r.created_at,
        }));
      } catch (err) {
        console.warn('Postgres all tags query error:', err);
      }
    }

    const all: DBWalletTag[] = [];
    this.memoryTags.forEach((tags) => all.push(...tags));
    return all;
  }

  // --- Case Notes ---
  async saveNote(note: DBCaseNote): Promise<void> {
    const existing = this.memoryNotes.get(note.caseId) || [];
    this.memoryNotes.set(note.caseId, [note, ...existing]);

    if (this.isConnectedToPostgres && this.pool) {
      try {
        await this.pool.query(
          `INSERT INTO case_notes (id, case_id, wallet_address, author, content, pinned, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           ON CONFLICT (id) DO UPDATE SET content = $5, pinned = $6;`,
          [
            note.id,
            note.caseId,
            note.walletAddress || null,
            note.author,
            note.content,
            note.pinned,
            note.createdAt,
          ]
        );
      } catch (err) {
        console.error('Error saving case note to Postgres:', err);
      }
    }
  }

  async getNotes(caseId: string): Promise<DBCaseNote[]> {
    if (this.isConnectedToPostgres && this.pool) {
      try {
        const res = await this.pool.query(
          'SELECT * FROM case_notes WHERE case_id = $1 ORDER BY pinned DESC, created_at DESC',
          [caseId]
        );
        if (res.rows.length > 0) {
          return res.rows.map((r) => ({
            id: r.id,
            caseId: r.case_id,
            walletAddress: r.wallet_address,
            author: r.author,
            content: r.content,
            pinned: r.pinned,
            createdAt: r.created_at,
          }));
        }
      } catch (err) {
        console.warn('Postgres notes query error:', err);
      }
    }
    return this.memoryNotes.get(caseId) || [];
  }

  // --- Chat History ---
  async saveChatMessage(msg: DBChatMessage): Promise<void> {
    const existing = this.memoryChat.get(msg.caseId) || [];
    this.memoryChat.set(msg.caseId, [...existing, msg]);

    if (this.isConnectedToPostgres && this.pool) {
      try {
        await this.pool.query(
          `INSERT INTO chat_history (id, case_id, wallet_address, role, message, metadata, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            msg.id,
            msg.caseId,
            msg.walletAddress || null,
            msg.role,
            msg.message,
            JSON.stringify(msg.metadata || {}),
            msg.createdAt,
          ]
        );
      } catch (err) {
        console.error('Error saving chat message to Postgres:', err);
      }
    }
  }

  async getChatHistory(caseId: string): Promise<DBChatMessage[]> {
    if (this.isConnectedToPostgres && this.pool) {
      try {
        const res = await this.pool.query(
          'SELECT * FROM chat_history WHERE case_id = $1 ORDER BY created_at ASC',
          [caseId]
        );
        if (res.rows.length > 0) {
          return res.rows.map((r) => ({
            id: r.id,
            caseId: r.case_id,
            walletAddress: r.wallet_address,
            role: r.role,
            message: r.message,
            metadata: r.metadata,
            createdAt: r.created_at,
          }));
        }
      } catch (err) {
        console.warn('Postgres chat history error:', err);
      }
    }
    return this.memoryChat.get(caseId) || [];
  }
}

export const dbService = new DBService();
