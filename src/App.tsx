/**
 * ChainSleuth — AI-Powered On-Chain Forensics Copilot
 * Main Application Component
 */

import React, { useState, useEffect } from 'react';
import { Header } from './components/Header.js';
import { ThreatSummary } from './components/ThreatSummary.js';
import { GraphCanvas } from './components/GraphCanvas.js';
import { TransactionLedger } from './components/TransactionLedger.js';
import { AICopilotSidebar } from './components/AICopilotSidebar.js';
import { SARReportModal } from './components/SARReportModal.js';
import {
  ScanResponse,
  GraphNode,
  ChatMessage,
  WalletTag,
  CaseNote,
  SystemHealth,
  HighRiskAlert,
} from './types.js';

const DEFAULT_DEMO_WALLET = '0x71c84192b3a9843074ac292947365cdd4379201c';

export default function App() {
  const [currentAddress, setCurrentAddress] = useState(DEFAULT_DEMO_WALLET);
  const [network, setNetwork] = useState('polygon');
  const [isScanning, setIsScanning] = useState(false);
  const [scanData, setScanData] = useState<ScanResponse | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  // System Health
  const [systemHealth, setSystemHealth] = useState<SystemHealth | null>(null);

  // Chat & Case Memory State
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [walletTags, setWalletTags] = useState<WalletTag[]>([]);
  const [caseNotes, setCaseNotes] = useState<CaseNote[]>([]);

  // SAR Report Modal State
  const [isSARModalOpen, setIsSARModalOpen] = useState(false);
  const [sarReportMarkdown, setSarReportMarkdown] = useState('');
  const [isGeneratingSAR, setIsGeneratingSAR] = useState(false);

  // Initial load: Fetch health and trigger initial demo heist scan
  useEffect(() => {
    fetchHealth();
    handleScan(DEFAULT_DEMO_WALLET, 'polygon');
  }, []);

  const fetchHealth = async () => {
    try {
      const res = await fetch('/api/health');
      if (res.ok) {
        const data = await res.json();
        setSystemHealth(data);
      }
    } catch (err) {
      console.warn('Health check failed:', err);
    }
  };

  const handleScan = async (addressToScan: string, net: string) => {
    setIsScanning(true);
    setCurrentAddress(addressToScan);
    setNetwork(net);
    setSelectedNodeId(null);

    try {
      const res = await fetch('/api/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress: addressToScan, network: net }),
      });

      if (!res.ok) throw new Error('Scan failed');
      const data: ScanResponse = await res.json();
      setScanData(data);

      // Load associated tags and notes for this case
      fetchTags(addressToScan);
      fetchNotes(data.caseId);

      // Initialize welcome chat message
      setChatMessages([
        {
          id: 'welcome-1',
          role: 'assistant',
          content: `### ChainSleuth Forensic Investigation Initialized
Identified target \`${data.walletAddress}\` on **${data.network.toUpperCase()}**.
- **Composite Threat Score**: **${data.riskScore}/100** (${data.riskLevel})
- **Tracked Laundering Volume**: **${data.totalVolumeMatic.toLocaleString()} MATIC** (~$${data.totalVolumeUsd.toLocaleString()} USD)
- **Topological Flags**: ${data.heuristics.map((h) => h.title).join(', ')}.

I have synchronized the multi-hop transaction graph with **Backboard Case Memory**. Click any node on the graph to inspect counterparties, or ask me an investigator inquiry below.`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          provider: 'system',
        },
      ]);
    } catch (err) {
      console.error('Scan error:', err);
    } finally {
      setIsScanning(false);
    }
  };

  const fetchTags = async (address?: string) => {
    try {
      const url = address ? `/api/tags/${address}` : '/api/tags';
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setWalletTags(data.tags || []);
      }
    } catch (err) {
      console.warn('Failed to fetch tags:', err);
    }
  };

  const fetchNotes = async (caseId: string) => {
    try {
      const res = await fetch(`/api/notes/${caseId}`);
      if (res.ok) {
        const data = await res.json();
        setCaseNotes(data.notes || []);
      }
    } catch (err) {
      console.warn('Failed to fetch notes:', err);
    }
  };

  const handleSendMessage = async (userPrompt: string) => {
    if (!userPrompt.trim()) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: userPrompt,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setChatMessages((prev) => [...prev, userMsg]);
    setIsChatLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          caseId: scanData?.caseId || 'default-case',
          walletAddress: currentAddress,
          message: userPrompt,
          selectedNodeId,
          graphContext: scanData
            ? {
                riskScore: scanData.riskScore,
                riskLevel: scanData.riskLevel,
                totalVolumeMatic: scanData.totalVolumeMatic,
                totalVolumeUsd: scanData.totalVolumeUsd,
                nodes: scanData.graph.nodes,
                edges: scanData.graph.edges,
                detectedPatterns: scanData.heuristics,
              }
            : undefined,
        }),
      });

      if (!res.ok) throw new Error('Chat failed');
      const data = await res.json();

      const aiMsg: ChatMessage = {
        id: `ai-${Date.now()}`,
        role: 'assistant',
        content: data.reply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        provider: data.provider,
      };

      setChatMessages((prev) => [...prev, aiMsg]);
    } catch (err: any) {
      setChatMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: 'assistant',
          content: 'Apologies, I encountered an error while processing the forensic query. Please retry or rephrase.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setIsChatLoading(false);
    }
  };

  const handleSaveTag = async (tag: string, category: string, notes?: string) => {
    if (!selectedNodeId) return;
    try {
      const res = await fetch('/api/tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletAddress: selectedNodeId,
          caseId: scanData?.caseId,
          tag,
          category,
          notes,
          riskLevel: 'HIGH',
        }),
      });

      if (res.ok) {
        fetchTags(selectedNodeId);
        if (scanData) {
          setScanData({
            ...scanData,
            graph: {
              ...scanData.graph,
              nodes: scanData.graph.nodes.map((n) =>
                n.id.toLowerCase() === selectedNodeId.toLowerCase()
                  ? { ...n, alias: tag, category: category as any }
                  : n
              ),
            },
          });
        }
      }
    } catch (err) {
      console.error('Save tag error:', err);
    }
  };

  const handleSaveNote = async (content: string) => {
    if (!scanData?.caseId) return;
    try {
      const res = await fetch('/api/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          caseId: scanData.caseId,
          walletAddress: selectedNodeId || currentAddress,
          content,
          author: 'Lead Forensic Investigator',
          pinned: true,
        }),
      });

      if (res.ok) {
        fetchNotes(scanData.caseId);
      }
    } catch (err) {
      console.error('Save note error:', err);
    }
  };

  const handleOpenSARModal = async () => {
    setIsSARModalOpen(true);
    setIsGeneratingSAR(true);

    try {
      const res = await fetch('/api/export-sar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          caseId: scanData?.caseId,
          walletAddress: currentAddress,
          graphContext: scanData
            ? {
                riskScore: scanData.riskScore,
                riskLevel: scanData.riskLevel,
                totalVolumeMatic: scanData.totalVolumeMatic,
                totalVolumeUsd: scanData.totalVolumeUsd,
                nodes: scanData.graph.nodes,
                edges: scanData.graph.edges,
                detectedPatterns: scanData.heuristics,
              }
            : undefined,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setSarReportMarkdown(data.markdown);
      }
    } catch (err) {
      console.error('SAR export error:', err);
    } finally {
      setIsGeneratingSAR(false);
    }
  };

  const handleNewRealtimeAlert = (alert: HighRiskAlert) => {
    setChatMessages((prev) => [
      ...prev,
      {
        id: `alert-msg-${alert.id}`,
        role: 'assistant',
        content: `🚨 **REAL-TIME HIGH-RISK ALERT BROADCAST**
- **Hash**: \`${alert.txHash}\`
- **From**: \`${alert.from}\` → **To**: \`${alert.to}\`
- **Volume**: **${alert.valueMatic.toLocaleString()} MATIC** (~$${alert.valueUsd.toLocaleString()} USD)
- **Detected Heuristic**: **${alert.heuristic}**
- **Forensic Assessment**: ${alert.description}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        provider: 'realtime_websocket',
      },
    ]);

    if (scanData) {
      const exists = scanData.transactions.some((t) => t.hash === alert.txHash);
      if (!exists) {
        setScanData((prev) => {
          if (!prev) return null;
          return {
            ...prev,
            transactions: [
              {
                hash: alert.txHash,
                from: alert.from,
                to: alert.to,
                value: String(alert.valueMatic),
                timeStamp: Math.floor(alert.timestamp / 1000),
                isInternal: false,
              },
              ...prev.transactions,
            ],
            graph: {
              ...prev.graph,
              edges: [
                {
                  id: `${alert.txHash}-${alert.from}-${alert.to}`,
                  source: alert.from,
                  target: alert.to,
                  hash: alert.txHash,
                  valueMatic: alert.valueMatic,
                  timestamp: Math.floor(alert.timestamp / 1000),
                  heuristicTag: alert.heuristic,
                  isSuspicious: true,
                },
                ...prev.graph.edges,
              ],
            },
          };
        });
      }
    }
  };

  const selectedNode = scanData?.graph.nodes.find(
    (n) => n.id.toLowerCase() === selectedNodeId?.toLowerCase()
  ) || null;

  return (
    <div className="min-h-screen bg-[#0d1117] text-[#f0f6fc] flex flex-col font-sans">
      {/* Top Command Bar */}
      <Header
        currentAddress={currentAddress}
        network={network}
        isScanning={isScanning}
        systemHealth={systemHealth}
        onScan={handleScan}
        onLoadDemoHeist={() => handleScan(DEFAULT_DEMO_WALLET, 'polygon')}
      />

      {/* Main Workspace: 70% Left Workspace + 30% Right AI Copilot Sidebar */}
      <main className="flex-1 max-w-[1700px] w-full mx-auto p-3 sm:p-4 lg:p-6 grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left & Center Workspace (70% on desktop: 8 of 12 cols) */}
        <section className="lg:col-span-8 flex flex-col gap-5 min-w-0">
          {/* Threat Metric Summary Banner with Real-time WebSocket Alert Listener */}
          <ThreatSummary
            scanData={scanData}
            onOpenSARModal={handleOpenSARModal}
            onNewAlert={handleNewRealtimeAlert}
          />

          {/* Interactive Multi-Hop Transaction Graph Visualizer */}
          <GraphCanvas
            nodes={scanData?.graph.nodes || []}
            edges={scanData?.graph.edges || []}
            selectedNodeId={selectedNodeId}
            onSelectNode={setSelectedNodeId}
          />

          {/* Transaction Ledger Table */}
          <TransactionLedger
            transactions={scanData?.transactions || []}
            edges={scanData?.graph.edges || []}
            selectedNodeId={selectedNodeId}
            onSelectNode={setSelectedNodeId}
          />
        </section>

        {/* Right Sidebar: AI Detective Copilot & Case Vault (30% on desktop: 4 of 12 cols) */}
        <aside className="lg:col-span-4 min-w-0">
          <AICopilotSidebar
            caseId={scanData?.caseId || 'default-case'}
            walletAddress={currentAddress}
            scanData={scanData}
            selectedNode={selectedNode}
            chatMessages={chatMessages}
            isChatLoading={isChatLoading}
            walletTags={walletTags}
            caseNotes={caseNotes}
            onSendMessage={handleSendMessage}
            onSaveTag={handleSaveTag}
            onSaveNote={handleSaveNote}
            onClearSelectedNode={() => setSelectedNodeId(null)}
          />
        </aside>
      </main>

      {/* Suspicious Activity Report (SAR) Modal with PDF Export Option */}
      <SARReportModal
        isOpen={isSARModalOpen}
        onClose={() => setIsSARModalOpen(false)}
        reportMarkdown={sarReportMarkdown}
        isGenerating={isGeneratingSAR}
        walletAddress={currentAddress}
      />
    </div>
  );
}
