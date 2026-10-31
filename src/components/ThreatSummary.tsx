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
  const handleTriggerTestAlert = async () => {
    setIsBroadcasting(true);
    try {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(
          JSON.stringify({
            type: 'TRIGGER_TEST_ALERT',
            walletAddress,
          })
        );
      } else {
        // Fallback to REST trigger
        await fetch('/api/alerts/broadcast', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ walletAddress }),
        });
      }
    } catch (err) {
      console.warn('Broadcast alert error:', err);
    } finally {
      setIsBroadcasting(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(walletAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!scanData) return null;

  // Color mappings based on risk score
  const getRiskColor = (score: number) => {
    if (score >= 80) return 'text-[#ff7b72] stroke-[#ff7b72]';
    if (score >= 50) return 'text-[#d29922] stroke-[#d29922]';
    return 'text-[#3fb950] stroke-[#3fb950]';
  };

  const getRiskBg = (score: number) => {
    if (score >= 80) return 'bg-[#ff7b72]/10 border-[#ff7b72]/30 text-[#ff7b72]';
    if (score >= 50) return 'bg-[#d29922]/10 border-[#d29922]/30 text-[#d29922]';
    return 'bg-[#3fb950]/10 border-[#3fb950]/30 text-[#3fb950]';
  };

  // SVG Gauge calculations
  const radius = 38;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (riskScore / 100) * circumference;

  return (
    <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-4 sm:p-5 shadow-sm space-y-4">
      {/* Real-Time WebSocket High-Risk Alert Banner (if active alert received) */}
      {activeAlert && (
        <div className="p-3.5 bg-[#ff7b72]/10 border border-[#ff7b72]/40 rounded-lg flex items-start justify-between gap-3 animate-fadeIn">
          <div className="flex items-start gap-2.5">
            <div className="p-1 rounded bg-[#ff7b72]/20 text-[#ff7b72] shrink-0 mt-0.5">
              <BellRing className="w-4 h-4 animate-bounce" />
            </div>
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[11px] font-bold font-mono px-2 py-0.5 rounded bg-[#ff7b72] text-[#0d1117]">
                  REAL-TIME HIGH RISK ALERT
                </span>
                <span className="text-xs font-semibold text-[#f0f6fc]">
                  {activeAlert.heuristic}
                </span>
                <span className="text-[11px] font-mono text-[#8b949e]">
                  {new Date(activeAlert.timestamp).toLocaleTimeString()}
                </span>
              </div>
              <p className="text-xs text-[#c9d1d9] leading-relaxed">
                {activeAlert.description}
              </p>
              <div className="flex items-center gap-4 text-[11px] font-mono text-[#8b949e] pt-0.5">
                <span>
                  Value:{' '}
                  <strong className="text-[#f0f6fc]">
                    {activeAlert.valueMatic.toLocaleString()} MATIC
                  </strong>{' '}
                  (~${activeAlert.valueUsd.toLocaleString()} USD)
                </span>
                <span>·</span>
                <a
                  href={`https://polygonscan.com/tx/${activeAlert.txHash}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[#58a6ff] hover:underline flex items-center gap-1"
                >
                  <span>Tx: {activeAlert.txHash.slice(0, 10)}...</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          </div>

          <button
            onClick={() => setActiveAlert(null)}
            className="text-[#8b949e] hover:text-[#f0f6fc] p-1 rounded hover:bg-[#ff7b72]/20 transition-colors shrink-0"
            title="Dismiss Alert"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main Threat Metrics Row */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-5">
        {/* Left: Risk Score Gauge + Target Overview */}
        <div className="flex items-center gap-4 sm:gap-6 w-full lg:w-auto">
          {/* Radial Circular Gauge */}
          <div className="relative flex items-center justify-center shrink-0 w-24 h-24">
            <svg className="w-full h-full transform -rotate-90">
              <circle
                cx="48"
                cy="48"
                r={radius}
                className="stroke-[#21262d]"
                strokeWidth="7"
                fill="transparent"
              />
              <circle
                cx="48"
                cy="48"
                r={radius}
                className={`transition-all duration-1000 ease-out ${getRiskColor(riskScore)}`}
                strokeWidth="7"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                fill="transparent"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
              <span className="text-xl font-extrabold font-mono tabular-nums leading-none text-[#f0f6fc]">
                {riskScore}
              </span>
              <span className="text-[10px] font-mono uppercase text-[#8b949e] tracking-wider mt-0.5">
                Threat
              </span>
            </div>
          </div>

          {/* Target Metadata & Classification */}
          <div className="space-y-1.5 flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`px-2 py-0.5 rounded text-[11px] font-bold border font-mono tracking-wide ${getRiskBg(riskScore)}`}>
                {riskLevel} THREAT
              </span>
              {dataSource === 'demo_heist_dataset' && (
                <span className="text-[11px] text-[#58a6ff] bg-[#58a6ff]/10 border border-[#58a6ff]/30 px-2 py-0.5 rounded font-mono">
                  DEMO HEIST SCENARIO
                </span>
              )}
              <span className="text-xs text-[#8b949e]">
                {network.toUpperCase()} PoS
              </span>

              {/* Real-time WebSocket Scope Listener Status Indicator */}
              <div
                className="flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-mono border bg-[#0d1117] border-[#30363d]"
                title={
                  wsConnected
                    ? `Live WebSocket listener active for scope: ${walletAddress}`
                    : 'Connecting to real-time alert stream...'
                }
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    wsConnected ? 'bg-[#3fb950] animate-pulse' : 'bg-[#d29922]'
                  }`}
                />
                <span className="text-[#8b949e]">Live Scope:</span>
                <span className={wsConnected ? 'text-[#3fb950] font-semibold' : 'text-[#d29922]'}>
                  {wsConnected ? 'Active' : 'Connecting'}
                </span>
                {alerts.length > 0 && (
                  <span className="bg-[#ff7b72]/20 text-[#ff7b72] px-1 rounded text-[9px] font-bold">
                    {alerts.length} alert{alerts.length > 1 ? 's' : ''}
                  </span>
                )}
              </div>
            </div>

            {/* Wallet Address with Copy, Explorer, and Test Alert Trigger */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-mono font-medium text-[#f0f6fc] truncate max-w-[280px] sm:max-w-md">
                {walletAddress}
              </span>
              <button
                onClick={handleCopy}
                className="p-1 text-[#8b949e] hover:text-[#f0f6fc] transition-colors rounded"
                title="Copy Address"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-[#3fb950]" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
              <a
                href={`https://polygonscan.com/address/${walletAddress}`}
                target="_blank"
                rel="noreferrer"
                className="p-1 text-[#8b949e] hover:text-[#58a6ff] transition-colors rounded"
                title="View on Polygonscan"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </a>

              {/* Trigger Real-Time Test Alert Button */}
              <button
                onClick={handleTriggerTestAlert}
                disabled={isBroadcasting}
                className="ml-1 text-[11px] font-mono text-[#58a6ff] hover:text-white bg-[#1f6feb]/15 hover:bg-[#1f6feb]/30 border border-[#388bfd]/30 px-2 py-0.5 rounded transition-colors flex items-center gap-1 disabled:opacity-50"
                title="Broadcast a test high-risk transaction alert over WebSocket"
              >
                <Radio className="w-3 h-3 text-[#58a6ff]" />
                <span>Trigger Test Alert</span>
              </button>
            </div>

            <div className="flex items-center gap-4 text-xs text-[#8b949e] font-mono">
              <span>{graph.nodes.length} Entitie(s)</span>
              <span>·</span>
              <span>{graph.edges.length} Hop(s)</span>
              <span>·</span>
              <span>{heuristics.length} AML Rule(s) Triggered</span>
            </div>
          </div>
        </div>

        {/* Center: Tracked Volume Figures */}
        <div className="grid grid-cols-2 gap-4 lg:gap-8 border-t lg:border-t-0 lg:border-l border-[#30363d] pt-3 lg:pt-0 lg:pl-6 w-full lg:w-auto shrink-0">
          <div>
            <div className="text-[11px] font-mono text-[#8b949e] uppercase tracking-wider">
              Total Volume Tracked
            </div>
            <div className="text-lg font-bold font-mono tabular-nums text-[#f0f6fc]">
              {totalVolumeMatic.toLocaleString(undefined, { maximumFractionDigits: 2 })}{' '}
              <span className="text-xs font-normal text-[#8b949e]">MATIC</span>
            </div>
            <div className="text-xs font-mono text-[#3fb950] tabular-nums">
              ≈ ${totalVolumeUsd.toLocaleString(undefined, { maximumFractionDigits: 0 })} USD
            </div>
          </div>

          <div>
            <div className="text-[11px] font-mono text-[#8b949e] uppercase tracking-wider">
              Primary Modus Operandi
            </div>
            <div className="text-sm font-semibold text-[#f0f6fc] mt-0.5">
              Rapid Peel & Mixer Smurfing
            </div>
            <div className="text-xs text-[#8b949e]">
              4 Intermediate Splitters
            </div>
          </div>
        </div>

        {/* Right: Export SAR Forensic Report Button */}
        <div className="w-full lg:w-auto shrink-0 self-end lg:self-center">
          <button
            onClick={onOpenSARModal}
            className="w-full lg:w-auto px-4 py-2.5 text-xs font-semibold text-[#f0f6fc] bg-[#21262d] hover:bg-[#30363d] border border-[#484f58] hover:border-[#58a6ff] rounded-lg transition-all flex items-center justify-center gap-2 shadow-sm"
          >
            <FileText className="w-4 h-4 text-[#58a6ff]" />
            <span>Export SAR Forensic Report</span>
          </button>
        </div>
      </div>

      {/* Flagged AML Heuristics Pattern Strip */}
      {heuristics.length > 0 && (
        <div className="pt-3 border-t border-[#30363d]/70 flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-[#8b949e] mr-2">
            <Flame className="w-3.5 h-3.5 text-[#ff7b72]" />
            <span>Flagged Laundering Topology:</span>
          </div>
          {heuristics.map((pattern: DetectedPattern) => (
            <div
              key={pattern.id}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#0d1117] border border-[#30363d] text-xs"
              title={pattern.description}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  pattern.severity === 'CRITICAL'
                    ? 'bg-[#ff7b72]'
                    : pattern.severity === 'HIGH'
                    ? 'bg-[#d29922]'
                    : 'bg-[#58a6ff]'
                }`}
              />
              <span className="font-medium text-[#c9d1d9]">{pattern.title}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
