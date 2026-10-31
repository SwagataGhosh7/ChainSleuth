/**
 * Shared Type Definitions for ChainSleuth Frontend
 */

export interface GraphNode {
  id: string; // 0x address
  label: string;
  alias?: string;
  riskScore: number;
  category: 'EXPLOITER' | 'PEEL_HOP' | 'MIXER' | 'EXCHANGE' | 'BURNER' | 'CLEAN' | 'CONTRACT';
  balanceMatic: number;
  totalInMatic: number;
  totalOutMatic: number;
  inDegree: number;
  outDegree: number;
  firstSeen: number;
  lastSeen: number;
  tags: string[];
  isRoot?: boolean;
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  hash: string;
  valueMatic: number;
  timestamp: number;
  timeDiffMinutes?: number;
  heuristicTag?: string;
  isSuspicious: boolean;
}

export interface DetectedPattern {
  id: string;
  title: string;
  description: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  weight: number;
}

export interface RawTransaction {
  hash: string;
  from: string;
  to: string;
  value: string | number;
  timeStamp: string | number;
  blockNumber?: string | number;
  isInternal?: boolean;
}

export interface ScanResponse {
  caseId: string;
  walletAddress: string;
  network: string;
  summary: string;
  riskScore: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  totalVolumeMatic: number;
  totalVolumeUsd: number;
  heuristics: DetectedPattern[];
  graph: {
    nodes: GraphNode[];
    links: GraphEdge[];
    edges: GraphEdge[];
  };
  transactions: RawTransaction[];
  dataSource: 'live_polygonscan' | 'demo_heist_dataset';
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  provider?: string;
}

export interface WalletTag {
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

export interface CaseNote {
  id: string;
  caseId: string;
  walletAddress?: string;
  author: string;
  content: string;
  pinned: boolean;
  createdAt: string;
}

export interface SystemHealth {
  status: string;
  connections: {
    renderApi: { status: string; environment: string; port: number };
    digitalOceanPostgres: { status: string; ssl: boolean; configured: boolean };
    backboardMemory: { status: string; configured: boolean };
    polygonscanExplorer?: { status: string; configured: boolean; provider: string };
    aiInference: { status: string; tinkerConfigured: boolean; geminiConfigured: boolean; activeModel: string };
  };
}

export interface HighRiskAlert {
  id: string;
  type: 'HIGH_RISK_ALERT';
  walletAddress: string;
  txHash: string;
  from: string;
  to: string;
  valueMatic: number;
  valueUsd: number;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM';
  heuristic: string;
  description: string;
  timestamp: number;
}
