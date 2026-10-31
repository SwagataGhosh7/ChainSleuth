/**
 * Top Command Bar for ChainSleuth / LedgerLens.tech
 */

import React, { useState } from 'react';
import {
  ShieldAlert,
  Search,
  Zap,
  Server,
  Database,
  Brain,
  Cpu,
  Layers,
  Sparkles,
  ExternalLink,
} from 'lucide-react';
import { SystemHealth } from '../types.js';

interface HeaderProps {
  currentAddress: string;
  network: string;
  isScanning: boolean;
  systemHealth: SystemHealth | null;
  onScan: (address: string, network: string) => void;
  onLoadDemoHeist: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentAddress,
  network,
  isScanning,
  systemHealth,
  onScan,
  onLoadDemoHeist,
}) => {
  const [searchInput, setSearchInput] = useState(currentAddress);
  const [selectedNetwork, setSelectedNetwork] = useState(network);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchInput.trim()) {
      onScan(searchInput.trim(), selectedNetwork);
    }
  };

  const getStatusColor = (status?: string) => {
    if (!status) return 'text-[#8b949e] border-[#30363d]';
    if (status.includes('online') || status.includes('connected') || status.includes('active')) {
      return 'text-[#3fb950] border-[#238636]/40 bg-[#238636]/10';
    }
    return 'text-[#d29922] border-[#d29922]/40 bg-[#d29922]/10';
  };

  return (
    <header className="border-b border-[#21262d] bg-[#161b22]/95 backdrop-blur-md sticky top-0 z-40 px-4 lg:px-6 py-2.5">
      <div className="flex flex-col lg:flex-row items-center justify-between gap-3 max-w-[1700px] mx-auto">
        {/* Brand & Wordmark */}
        <div className="flex items-center gap-3 shrink-0 self-start lg:self-center">
          <div className="flex items-center justify-center w-8 h-8 rounded bg-[#1f6feb]/20 border border-[#388bfd]/40 text-[#58a6ff]">
            <ShieldAlert className="w-5 h-5 text-[#58a6ff]" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-base font-bold tracking-tight text-[#f0f6fc] font-sans">
              LedgerLens.tech
            </span>
            <span className="text-xs text-[#8b949e] hidden sm:inline font-mono">
              / AI On-Chain Forensics
            </span>
          </div>
        </div>

        {/* Command Search Bar & Actions */}
        <form
          onSubmit={handleSubmit}
          className="flex flex-wrap sm:flex-nowrap items-center gap-2 w-full lg:max-w-2xl"
        >
          {/* Network Selector */}
          <div className="relative shrink-0">
            <select
              value={selectedNetwork}
              onChange={(e) => setSelectedNetwork(e.target.value)}
              className="appearance-none bg-[#0d1117] border border-[#30363d] hover:border-[#58a6ff]/50 rounded-lg text-xs font-medium text-[#c9d1d9] px-3 py-2 pr-7 focus:outline-none focus:ring-1 focus:ring-[#58a6ff] cursor-pointer"
            >
              <option value="polygon">Polygon Mainnet</option>
              <option value="ethereum">Ethereum Mainnet</option>
            </select>
            <Layers className="w-3.5 h-3.5 text-[#8b949e] absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Search Input */}
          <div className="relative flex-1 min-w-[240px]">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#8b949e]">
              <Search className="w-4 h-4" />
            </div>
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search EVM wallet (0x...) or transaction hash"
              className="w-full bg-[#0d1117] border border-[#30363d] focus:border-[#58a6ff] rounded-lg pl-9 pr-3 py-2 text-xs font-mono text-[#f0f6fc] placeholder-[#6e7681] focus:outline-none focus:ring-1 focus:ring-[#58a6ff]"
              spellCheck={false}
            />
          </div>

          {/* Scan Button */}
          <button
            type="submit"
            disabled={isScanning}
            className="px-4 py-2 text-xs font-semibold text-white bg-[#238636] hover:bg-[#2ea043] disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors flex items-center gap-1.5 shrink-0 whitespace-nowrap shadow-sm"
          >
            {isScanning ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Tracing...</span>
              </>
            ) : (
              <>
                <Zap className="w-3.5 h-3.5" />
                <span>Scan Wallet</span>
              </>
            )}
          </button>

          {/* Load Demo Heist Button */}
          <button
            type="button"
            onClick={onLoadDemoHeist}
            className="px-3 py-2 text-xs font-semibold text-[#58a6ff] bg-[#1f6feb]/10 hover:bg-[#1f6feb]/20 border border-[#388bfd]/30 rounded-lg transition-colors flex items-center gap-1.5 shrink-0 whitespace-nowrap"
            title="Load 1.45M MATIC DeFi Bridge Exploit & Rapid Peel Chain Scenario"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Load Demo Heist</span>
          </button>
        </form>

        {/* Infrastructure Status Indicators */}
        <div className="hidden xl:flex items-center gap-2 shrink-0 text-[11px] font-mono">
          <div
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md border ${getStatusColor(
              systemHealth?.connections.renderApi.status
            )}`}
            title="Express API Orchestrator (Render / AI Studio)"
          >
            <Server className="w-3 h-3" />
            <span>API: {systemHealth?.connections.renderApi.status === 'online' ? 'Online' : 'Active'}</span>
          </div>

          <div
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md border ${getStatusColor(
              systemHealth?.connections.digitalOceanPostgres.status
            )}`}
            title="DigitalOcean Managed PostgreSQL Database with SSL & Memory Store"
          >
            <Database className="w-3 h-3" />
            <span>
              DO DB:{' '}
              {systemHealth?.connections.digitalOceanPostgres.status === 'connected'
                ? 'PG-SSL'
                : 'Local'}
            </span>
          </div>

          <div
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md border ${getStatusColor(
              systemHealth?.connections.backboardMemory.status
            )}`}
            title="Backboard Persistent Long-Term Case Memory Engine"
          >
            <Brain className="w-3 h-3" />
            <span>Backboard: {systemHealth?.connections.backboardMemory.configured ? 'Live' : 'Active'}</span>
          </div>

          <div
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md border ${getStatusColor(
              systemHealth?.connections.aiInference.status
            )}`}
            title="Gemini 2.5 Flash / Tinker Reasoning Engine"
          >
            <Cpu className="w-3 h-3" />
            <span>
              AI:{' '}
              {systemHealth?.connections.aiInference.geminiConfigured
                ? 'Gemini'
                : systemHealth?.connections.aiInference.tinkerConfigured
                ? 'Tinker'
                : 'Heuristic'}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
};
