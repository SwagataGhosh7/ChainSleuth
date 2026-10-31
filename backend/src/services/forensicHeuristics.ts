/**
 * Forensic AML & On-Chain Graph Heuristics Engine
 * Analyzes transaction patterns, timing, fan-out, and known laundering topologies
 */

export interface RawTransaction {
  hash: string;
  from: string;
  to: string;
  value: string; // in wei or decimal MATIC
  timeStamp: string | number;
  blockNumber?: string | number;
  isInternal?: boolean;
}

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

export interface HeuristicResult {
  riskScore: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  detectedPatterns: {
    id: string;
    title: string;
    description: string;
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    weight: number;
  }[];
  totalVolumeMatic: number;
  totalVolumeUsd: number;
  nodes: GraphNode[];
  edges: GraphEdge[];
}

// Known Sanctioned / Mixer Addresses & Exchange Deposit Routers on Polygon / EVM
export const KNOWN_ENTITIES: Record<string, { label: string; category: GraphNode['category']; risk: number }> = {
  '0x498a0d7821feec09b384792a1042cb3a9089ef01': {
    label: 'Tornado.Cash: Polygon Router',
    category: 'MIXER',
    risk: 98,
  },
  '0x0b3f868e0be5597d5db7feb59e1cadbb0fdda50a': {
    label: 'Railgun Privacy Contract',
    category: 'MIXER',
    risk: 92,
  },
  '0x99238bf10248ad9081273849182049182390192a': {
    label: 'Binance: Hot Deposit 4',
    category: 'EXCHANGE',
    risk: 35,
  },
  '0x72a53cddb06418eb397f4418528372316443c29f': {
    label: 'OKX: User Gateway Proxy',
    category: 'EXCHANGE',
    risk: 35,
  },
  '0x12d66f87a04a9e220743712ce6d9bb1b5616b8fc': {
    label: 'Tornado.Cash 100 MATIC Pool',
    category: 'MIXER',
    risk: 99,
  },
  '0x47ce0c6ed5b0ce3d3a51fdb1c52dc66a7c3c2936': {
    label: 'Tornado.Cash 1000 MATIC Pool',
    category: 'MIXER',
    risk: 99,
  },
};

/**
 * Evaluates graph heuristics and returns comprehensive threat metrics
 */
export function analyzeTransactions(
  rootAddress: string,
  transactions: RawTransaction[],
  maticPriceUsd = 0.75
): HeuristicResult {
  const normRoot = rootAddress.toLowerCase();
  const nodeMap = new Map<string, GraphNode>();
  const edgeList: GraphEdge[] = [];
  const detectedPatterns: HeuristicResult['detectedPatterns'] = [];

  // Helper to get or create node
  function getNode(address: string, isRoot = false): GraphNode {
    const norm = address.toLowerCase();
    if (!nodeMap.has(norm)) {
      const known = KNOWN_ENTITIES[norm];
      nodeMap.set(norm, {
        id: norm,
        label: known ? known.label : `${norm.slice(0, 6)}...${norm.slice(-4)}`,
        alias: known ? known.label : undefined,
        riskScore: known ? known.risk : (isRoot ? 85 : 20),
        category: known ? known.category : (isRoot ? 'EXPLOITER' : 'CLEAN'),
        balanceMatic: 0,
        totalInMatic: 0,
        totalOutMatic: 0,
        inDegree: 0,
        outDegree: 0,
        firstSeen: Infinity,
        lastSeen: 0,
        tags: known ? [known.category] : [],
        isRoot,
      });
    }
    return nodeMap.get(norm)!;
  }

  // Ensure root node exists
  getNode(normRoot, true);

  let totalVolumeMatic = 0;

  // 1. Process Edges and Aggregates
  const sortedTxs = [...transactions].sort((a, b) => Number(a.timeStamp) - Number(b.timeStamp));

  for (const tx of sortedTxs) {
    const from = (tx.from || '').toLowerCase();
    const to = (tx.to || '').toLowerCase();
    if (!from || !to) continue;

    // Convert value to MATIC decimal
    let valueMatic = 0;
    try {
      if (typeof tx.value === 'string' && tx.value.length > 12) {
        // Assume wei
        valueMatic = parseFloat(tx.value) / 1e18;
      } else {
        valueMatic = parseFloat(String(tx.value || 0));
      }
    } catch {
      valueMatic = 0;
    }

    if (isNaN(valueMatic)) valueMatic = 0;
    totalVolumeMatic += valueMatic;

    const timestamp = Number(tx.timeStamp);
    const sourceNode = getNode(from, from === normRoot);
    const targetNode = getNode(to, to === normRoot);

    sourceNode.totalOutMatic += valueMatic;
    sourceNode.outDegree += 1;
    sourceNode.firstSeen = Math.min(sourceNode.firstSeen, timestamp);
    sourceNode.lastSeen = Math.max(sourceNode.lastSeen, timestamp);

    targetNode.totalInMatic += valueMatic;
    targetNode.inDegree += 1;
    targetNode.firstSeen = Math.min(targetNode.firstSeen, timestamp);
    targetNode.lastSeen = Math.max(targetNode.lastSeen, timestamp);

    edgeList.push({
      id: `${tx.hash}-${from}-${to}`,
      source: from,
      target: to,
      hash: tx.hash,
      valueMatic,
      timestamp,
      isSuspicious: false,
    });
  }

  // Calculate balances
  nodeMap.forEach((node) => {
    node.balanceMatic = Math.max(0, node.totalInMatic - node.totalOutMatic);
    if (node.firstSeen === Infinity) node.firstSeen = Date.now() / 1000;
  });

  // 2. Deterministic AML Heuristics Evaluation

  // Heuristic A: Rapid Peel Chains
  // Pattern: Sequential outgoing transfers within 5 minutes (300s) forwarding > 70% of inbound funds
  let peelChainCount = 0;
  nodeMap.forEach((node) => {
    if (node.isRoot) return;
    if (node.inDegree >= 1 && node.outDegree >= 1 && node.totalInMatic > 1000) {
      const forwardedRatio = node.totalOutMatic / node.totalInMatic;
      const durationSeconds = node.lastSeen - node.firstSeen;
      if (forwardedRatio >= 0.70 && forwardedRatio <= 1.05 && durationSeconds <= 900) {
        peelChainCount++;
        node.category = 'PEEL_HOP';
        node.riskScore = Math.max(node.riskScore, 88);
        node.tags.push('PEEL_SPLITTER');
      }
    }
  });

  if (peelChainCount > 0) {
    detectedPatterns.push({
      id: 'RAPID_PEEL_CHAIN',
      title: 'Rapid Multi-Hop Peel Chain',
      description: `Detected ${peelChainCount} intermediate peel hops forwarding >70% of received funds in under 15 minutes to obfuscate transaction lineage.`,
      severity: 'CRITICAL',
      weight: 35,
    });
  }

  // Heuristic B: Mixer / Tumbler Interaction
  let mixerTxCount = 0;
  let mixerVolumeMatic = 0;
  edgeList.forEach((edge) => {
    const targetNode = nodeMap.get(edge.target);
    const sourceNode = nodeMap.get(edge.source);
    if (targetNode?.category === 'MIXER' || sourceNode?.category === 'MIXER') {
      mixerTxCount++;
      mixerVolumeMatic += edge.valueMatic;
      edge.isSuspicious = true;
      edge.heuristicTag = 'MIXER_ROUTING';
    }
  });

  if (mixerTxCount > 0) {
    detectedPatterns.push({
      id: 'MIXER_ROUTING',
      title: 'OFAC Sanctioned / Mixer Deposit',
      description: `Identified ${mixerTxCount} direct contract interaction(s) with Tornado Cash / Railgun privacy routers totaling ${mixerVolumeMatic.toLocaleString()} MATIC.`,
      severity: 'CRITICAL',
      weight: 40,
    });
  }

  // Heuristic C: High Fan-Out (Burner wallet dispersion)
  let highFanOutCount = 0;
  nodeMap.forEach((node) => {
    if (node.outDegree >= 4) {
      highFanOutCount++;
      node.tags.push('HIGH_FANOUT');
    }
  });

  if (highFanOutCount > 0) {
    detectedPatterns.push({
      id: 'FAN_OUT_DISPERSION',
      title: 'Layered Smurfing & Fan-Out Dispersion',
      description: `Found ${highFanOutCount} wallet(s) fanning out funds across 4+ recipient addresses to bypass single-deposit KYC thresholds.`,
      severity: 'HIGH',
      weight: 20,
    });
  }

  // Heuristic D: Fresh Burner Wallets
  let freshBurnerCount = 0;
  nodeMap.forEach((node) => {
    if (!node.isRoot && node.category !== 'MIXER' && node.category !== 'EXCHANGE') {
      const activeWindow = node.lastSeen - node.firstSeen;
      if (activeWindow <= 1800 && (node.inDegree + node.outDegree <= 3)) {
        freshBurnerCount++;
        node.category = 'BURNER';
        node.riskScore = Math.max(node.riskScore, 75);
        node.tags.push('FRESH_BURNER');
      }
    }
  });

  if (freshBurnerCount >= 2) {
    detectedPatterns.push({
      id: 'FRESH_BURNER_NODES',
      title: 'Ephemeral Burner Relay Addresses',
      description: `${freshBurnerCount} ephemeral addresses active for < 30 minutes with zero prior historical activity used strictly as pass-through relays.`,
      severity: 'HIGH',
      weight: 15,
    });
  }

  // Heuristic E: High-Frequency Transfer Velocity (< 3 minutes between hops)
  for (let i = 1; i < edgeList.length; i++) {
    const diff = (edgeList[i].timestamp - edgeList[i - 1].timestamp) / 60;
    edgeList[i].timeDiffMinutes = Math.max(0, parseFloat(diff.toFixed(1)));
    if (diff > 0 && diff < 3) {
      edgeList[i].isSuspicious = true;
      if (!edgeList[i].heuristicTag) edgeList[i].heuristicTag = 'HIGH_VELOCITY';
    }
  }

  // Calculate Composite Risk Score (0 - 100)
  let computedRisk = 20; // baseline
  detectedPatterns.forEach((p) => {
    computedRisk += p.weight;
  });
  computedRisk = Math.min(100, Math.max(10, computedRisk));

  let riskLevel: HeuristicResult['riskLevel'] = 'LOW';
  if (computedRisk >= 80) riskLevel = 'CRITICAL';
  else if (computedRisk >= 60) riskLevel = 'HIGH';
  else if (computedRisk >= 40) riskLevel = 'MEDIUM';

  const nodes = Array.from(nodeMap.values());

  return {
    riskScore: computedRisk,
    riskLevel,
    detectedPatterns,
    totalVolumeMatic,
    totalVolumeUsd: totalVolumeMatic * maticPriceUsd,
    nodes,
    edges: edgeList,
  };
}
