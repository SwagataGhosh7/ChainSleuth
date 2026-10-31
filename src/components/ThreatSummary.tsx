/**
 * Top Threat Summary Banner & Threat Score Gauge
 * Features Real-Time WebSocket Listener for Immediate High-Risk Transaction Alerts
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  AlertTriangle,
  FileText,
  Copy,
  Check,
  ExternalLink,
  ShieldAlert,
  Flame,
  ArrowRight,
  Radio,
  BellRing,
  X,
  Zap,
} from 'lucide-react';
import { ScanResponse, DetectedPattern, HighRiskAlert } from '../types.js';

interface ThreatSummaryProps {
  scanData: ScanResponse | null;
  onOpenSARModal: () => void;
  onNewAlert?: (alert: HighRiskAlert) => void;
}

export const ThreatSummary: React.FC<ThreatSummaryProps> = ({
  scanData,
  onOpenSARModal,
  onNewAlert,
}) => {
  const [copied, setCopied] = useState(false);
  const [wsConnected, setWsConnected] = useState(false);
  const [alerts, setAlerts] = useState<HighRiskAlert[]>([]);
  const [activeAlert, setActiveAlert] = useState<HighRiskAlert | null>(null);
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);

  const walletAddress = scanData?.walletAddress || '';
  const network = scanData?.network || 'polygon';
  const riskScore = scanData?.riskScore || 0;
  const riskLevel = scanData?.riskLevel || 'LOW';
  const totalVolumeMatic = scanData?.totalVolumeMatic || 0;
  const totalVolumeUsd = scanData?.totalVolumeUsd || 0;
  const heuristics = scanData?.heuristics || [];
  const graph = scanData?.graph || { nodes: [], edges: [] };
  const dataSource = scanData?.dataSource || 'live_polygonscan';

  // WebSocket Listener: Connect and monitor active investigative scope
  useEffect(() => {
    if (!walletAddress) return;

    let isSubscribed = true;
    let reconnectTimeout: any = null;

    const connectWebSocket = () => {
      try {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}/ws`;
        const socket = new WebSocket(wsUrl);
        wsRef.current = socket;

        socket.onopen = () => {
          if (!isSubscribed) return;
          setWsConnected(true);
          // Subscribe to transactions involving current wallet scope
          socket.send(
            JSON.stringify({
              type: 'SUBSCRIBE_SCOPE',
              walletAddress,
            })
          );
        };

        socket.onmessage = (event) => {
          if (!isSubscribed) return;
          try {
            const data = JSON.parse(event.data);
            if (data.type === 'HIGH_RISK_ALERT') {
              const alert = data as HighRiskAlert;
              setAlerts((prev) => [alert, ...prev].slice(0, 10));
              setActiveAlert(alert);
              if (onNewAlert) onNewAlert(alert);
            }
          } catch (e) {
            console.warn('Failed to parse WebSocket message:', e);
          }
        };

        socket.onclose = () => {
          if (!isSubscribed) return;
          setWsConnected(false);
          // Auto-reconnect after 4s
          reconnectTimeout = setTimeout(connectWebSocket, 4000);
        };

        socket.onerror = () => {
          if (!isSubscribed) return;
          setWsConnected(false);
          socket.close();
        };
      } catch (err) {
        console.warn('WebSocket connection error:', err);
      }
    };

    connectWebSocket();

    return () => {
      isSubscribed = false;
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [walletAddress, onNewAlert]);

  // Manually trigger a test real-time alert across the scope
  const handleBroadcastTestAlert = async () => {
    try {
      setIsBroadcasting(true);
      await fetch('/api/alerts/broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletAddress,
          valueMatic: 185000,
          heuristic: 'RAPID_PEEL_SPLIT',
          description: `Live Alert: 185,000 MATIC peeled to Tornado Cash proxy router in under 60 seconds.`,
        }),
      });
    } catch (e) {
      console.warn('Broadcast failed:', e);
    } finally {
      setIsBroadcasting(false);
    }
  };

  const handleCopyAddress = () => {
    if (walletAddress) {
      navigator.clipboard.writeText(walletAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const getRiskScoreColor = (score: number) => {
    if (score >= 80) return 'text-[#f85149] border-[#f85149]/30 bg-[#f85149]/10';
    if (score >= 60) return 'text-[#d29922] border-[#d29922]/30 bg-[#d29922]/10';
    return 'text-[#3fb950] border-[#3fb950]/30 bg-[#3fb950]/10';
  };

  return (
    <div className="bg-[#161b22] border border-[#30363d] rounded-2xl p-4 sm:p-5 shadow-lg flex flex-col gap-4 relative overflow-hidden">
      {/* Real-time Broadcast Pop-Up Toast */}
      {activeAlert && (
        <div className="bg-[#1f6feb]/20 border border-[#388bfd]/50 p-3 rounded-xl flex items-center justify-between gap-3 animate-slideDown shadow-lg">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-2.5 h-2.5 rounded-full bg-[#f85149] animate-ping shrink-0" />
            <div className="text-xs font-mono text-[#f0f6fc] truncate">
              <span className="font-bold text-[#f85149]">REAL-TIME ALERT:</span>{' '}
              {activeAlert.description}
            </div>
          </div>
          <button
            onClick={() => setActiveAlert(null)}
            className="p-1 text-[#8b949e] hover:text-[#f0f6fc] rounded hover:bg-[#21262d] shrink-0"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Top Row: Address Bar & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#21262d] pb-3.5">
        <div className="flex flex-wrap items-center gap-2 min-w-0">
          <span className="text-xs font-mono text-[#8b949e] uppercase tracking-wider px-2 py-0.5 bg-[#0d1117] rounded-md border border-[#30363d]">
            Target Entity
          </span>

          <span className="text-xs sm:text-sm font-mono font-bold text-[#f0f6fc] truncate max-w-[280px] sm:max-w-md">
            {walletAddress || 'No Wallet Scanned'}
          </span>

          {walletAddress && (
            <button
              onClick={handleCopyAddress}
              className="p-1 text-[#8b949e] hover:text-[#f0f6fc] rounded hover:bg-[#21262d] transition-colors"
              title="Copy Address"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-[#3fb950]" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          )}

          <span className="text-[11px] font-mono text-[#8b949e] px-2 py-0.5 bg-[#0d1117] rounded border border-[#30363d]">
            {network.toUpperCase()}
          </span>

          {/* Real-time Status Badge */}
          <div
            className={`flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded border ${
              wsConnected
                ? 'text-[#3fb950] border-[#238636]/30 bg-[#238636]/10'
                : 'text-[#8b949e] border-[#30363d] bg-[#0d1117]'
            }`}
            title="Real-Time WebSocket Transaction Stream"
          >
            <Radio className={`w-3 h-3 ${wsConnected ? 'animate-pulse text-[#3fb950]' : ''}`} />
            <span>{wsConnected ? 'Live Feed' : 'Connecting...'}</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Simulate Real-Time Alert Broadcast */}
          <button
            onClick={handleBroadcastTestAlert}
            disabled={isBroadcasting}
            className="px-2.5 py-1.5 text-xs font-medium text-[#c9d1d9] bg-[#21262d] hover:bg-[#30363d] border border-[#30363d] rounded-lg transition-colors flex items-center gap-1.5 disabled:opacity-50"
            title="Broadcast a synthetic real-time laundering alert over the WebSocket channel"
          >
            <Zap className="w-3.5 h-3.5 text-[#f0883e]" />
            <span className="hidden md:inline">Test Realtime Alert</span>
          </button>

          {/* SAR Export Button */}
          <button
            onClick={onOpenSARModal}
            className="px-3 py-1.5 text-xs font-semibold text-white bg-[#1f6feb] hover:bg-[#388bfd] rounded-lg transition-colors flex items-center gap-1.5 shadow-sm active:scale-95"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Export SAR Report</span>
          </button>
        </div>
      </div>

      {/* Main Metric Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {/* Threat Score Card */}
        <div className="bg-[#0d1117] border border-[#30363d] rounded-xl p-3 flex flex-col justify-between">
          <span className="text-[11px] font-mono text-[#8b949e] uppercase flex items-center gap-1">
            <ShieldAlert className="w-3 h-3 text-[#f85149]" />
            Composite Threat Score
          </span>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className={`text-2xl font-bold font-mono ${getRiskScoreColor(riskScore)}`}>
              {riskScore}
            </span>
            <span className="text-xs font-mono text-[#8b949e]">/100</span>
          </div>
          <span className="text-[10px] font-mono text-[#f85149] mt-1 font-semibold">
            {riskLevel} RISK THREAT
          </span>
        </div>

        {/* Tracked Laundering Volume Card */}
        <div className="bg-[#0d1117] border border-[#30363d] rounded-xl p-3 flex flex-col justify-between">
          <span className="text-[11px] font-mono text-[#8b949e] uppercase flex items-center gap-1">
            <Flame className="w-3 h-3 text-[#f0883e]" />
            Tracked Laundering Volume
          </span>
          <div className="mt-2">
            <span className="text-lg font-bold font-mono text-[#f0f6fc]">
              {totalVolumeMatic.toLocaleString()}
            </span>
            <span className="text-xs font-mono text-[#8b949e] ml-1">MATIC</span>
          </div>
          <span className="text-[10px] font-mono text-[#8b949e] mt-1">
            ~${totalVolumeUsd.toLocaleString()} USD
          </span>
        </div>

        {/* Graph Breadth Card */}
        <div className="bg-[#0d1117] border border-[#30363d] rounded-xl p-3 flex flex-col justify-between">
          <span className="text-[11px] font-mono text-[#8b949e] uppercase">Graph Breadth</span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-lg font-bold font-mono text-[#58a6ff]">
              {graph.nodes.length}
            </span>
            <span className="text-xs font-mono text-[#8b949e]">entities</span>
          </div>
          <span className="text-[10px] font-mono text-[#8b949e] mt-1">
            {graph.edges.length} multi-hop transfers
          </span>
        </div>

        {/* Data Source Card */}
        <div className="bg-[#0d1117] border border-[#30363d] rounded-xl p-3 flex flex-col justify-between">
          <span className="text-[11px] font-mono text-[#8b949e] uppercase">Data Source</span>
          <div className="mt-2">
            <span className="text-xs font-mono font-semibold text-[#3fb950] block truncate">
              {dataSource === 'live_polygonscan' ? 'Polygonscan v2' : 'DeFi Heist Dataset'}
            </span>
          </div>
          <span className="text-[10px] font-mono text-[#8b949e] mt-1">
            Etherscan / Polygonscan API
          </span>
        </div>
      </div>

      {/* Heuristic Flags Banner */}
      {heuristics.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-[#21262d]">
          <span className="text-[11px] font-mono text-[#8b949e] uppercase font-semibold">
            Flagged Heuristics:
          </span>
          {heuristics.map((h) => (
            <div
              key={h.id}
              className={`px-2.5 py-1 rounded-lg border text-xs font-mono flex items-center gap-1.5 transition-all ${
                h.severity === 'CRITICAL'
                  ? 'bg-[#f85149]/15 text-[#f85149] border-[#f85149]/40'
                  : 'bg-[#d29922]/15 text-[#d29922] border-[#d29922]/40'
              }`}
              title={h.description}
            >
              <div
                className={`w-1.5 h-1.5 rounded-full ${
                  h.severity === 'CRITICAL' ? 'bg-[#f85149]' : 'bg-[#d29922]'
                }`}
              />
              <span className="font-semibold">{h.title}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
