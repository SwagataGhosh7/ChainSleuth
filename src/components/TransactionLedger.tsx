/**
 * High-Density Transaction Ledger Data Grid
 * Shows multi-hop transfers, converts Wei to MATIC, and highlights suspicious tags.
 */

import React, { useState, useMemo } from 'react';
import {
  ArrowUpRight,
  ArrowDownLeft,
  Search,
  ExternalLink,
  Copy,
  Check,
  Filter,
  Flame,
  Clock,
  Download,
} from 'lucide-react';
import { RawTransaction, GraphEdge } from '../types.js';

interface TransactionLedgerProps {
  transactions: RawTransaction[];
  edges: GraphEdge[];
  selectedNodeId: string | null;
  onSelectNode: (nodeId: string | null) => void;
}

export const TransactionLedger: React.FC<TransactionLedgerProps> = ({
  transactions,
  edges,
  selectedNodeId,
  onSelectNode,
}) => {
  const [filterQuery, setFilterQuery] = useState('');
  const [copiedHash, setCopiedHash] = useState<string | null>(null);
  const [sortField, setSortField] = useState<'value' | 'time'>('time');
  const [sortAsc, setSortAsc] = useState(false);

  // Parse transaction values
  const parsedTxs = useMemo(() => {
    return transactions.map((tx) => {
      let valueMatic = 0;
      if (typeof tx.value === 'string' && tx.value.length > 12) {
        valueMatic = parseFloat(tx.value) / 1e18;
      } else {
        valueMatic = parseFloat(String(tx.value || 0));
      }

      // Check if this tx corresponds to an edge with heuristic tags
      const matchingEdge = edges.find((e) => e.hash === tx.hash);

      return {
        ...tx,
        valueMatic,
        valueUsd: valueMatic * 0.75,
        heuristicTag: matchingEdge?.heuristicTag || (valueMatic >= 100000 ? 'HIGH_VALUE_FLOW' : undefined),
        isSuspicious: matchingEdge?.isSuspicious || valueMatic >= 100000,
      };
    });
  }, [transactions, edges]);

  // Filter based on selected node and search input
  const filteredTxs = useMemo(() => {
    return parsedTxs
      .filter((tx) => {
        if (selectedNodeId) {
          const normSel = selectedNodeId.toLowerCase();
          const matchesNode =
            tx.from.toLowerCase() === normSel || tx.to.toLowerCase() === normSel;
          if (!matchesNode) return false;
        }

        if (filterQuery.trim()) {
          const q = filterQuery.toLowerCase();
          return (
            tx.hash.toLowerCase().includes(q) ||
            tx.from.toLowerCase().includes(q) ||
            tx.to.toLowerCase().includes(q)
          );
        }

        return true;
      })
      .sort((a, b) => {
        if (sortField === 'value') {
          return sortAsc ? a.valueMatic - b.valueMatic : b.valueMatic - a.valueMatic;
        }
        return sortAsc
          ? Number(a.timeStamp) - Number(b.timeStamp)
          : Number(b.timeStamp) - Number(a.timeStamp);
      });
  }, [parsedTxs, selectedNodeId, filterQuery, sortField, sortAsc]);

  const handleCopy = (hash: string) => {
    navigator.clipboard.writeText(hash);
    setCopiedHash(hash);
    setTimeout(() => setCopiedHash(null), 1500);
  };

  const formatTime = (ts: string | number) => {
    try {
      const d = new Date(Number(ts) * 1000);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    } catch {
      return String(ts);
    }
  };

  return (
    <div className="bg-[#161b22] border border-[#30363d] rounded-2xl overflow-hidden shadow-lg flex flex-col">
      {/* Table Header & Controls */}
      <div className="p-3.5 sm:p-4 border-b border-[#21262d] flex flex-wrap items-center justify-between gap-3 bg-[#161b22]">
        <div className="flex items-center gap-2">
          <h3 className="text-xs font-bold text-[#f0f6fc] font-sans flex items-center gap-2">
            <span>On-Chain Transaction Ledger</span>
            <span className="text-[11px] font-mono text-[#8b949e] font-normal">
              ({filteredTxs.length} records)
            </span>
          </h3>
        </div>

        {/* Search Filter */}
        <div className="relative min-w-[200px]">
          <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-[#8b949e]">
            <Search className="w-3.5 h-3.5" />
          </div>
          <input
            type="text"
            value={filterQuery}
            onChange={(e) => setFilterQuery(e.target.value)}
            placeholder="Filter hash, sender, recipient..."
            className="w-full bg-[#0d1117] border border-[#30363d] focus:border-[#58a6ff] rounded-lg pl-8 pr-2.5 py-1 text-xs font-mono text-[#f0f6fc] placeholder-[#6e7681] focus:outline-none"
          />
        </div>
      </div>

      {/* Table Data */}
      <div className="overflow-x-auto max-h-[360px] overflow-y-auto">
        <table className="w-full text-left border-collapse font-mono text-xs">
          <thead className="bg-[#0d1117]/80 sticky top-0 border-b border-[#21262d] text-[11px] text-[#8b949e] uppercase select-none">
            <tr>
              <th className="py-2.5 px-3">Tx Hash</th>
              <th
                className="py-2.5 px-3 cursor-pointer hover:text-[#f0f6fc]"
                onClick={() => {
                  setSortField('time');
                  setSortAsc(!sortAsc);
                }}
              >
                Time {sortField === 'time' && (sortAsc ? '↑' : '↓')}
              </th>
              <th className="py-2.5 px-3">From Address</th>
              <th className="py-2.5 px-3">To Address</th>
              <th
                className="py-2.5 px-3 text-right cursor-pointer hover:text-[#f0f6fc]"
                onClick={() => {
                  setSortField('value');
                  setSortAsc(!sortAsc);
                }}
              >
                Amount {sortField === 'value' && (sortAsc ? '↑' : '↓')}
              </th>
              <th className="py-2.5 px-3 text-center">Heuristic Tag</th>
              <th className="py-2.5 px-2 text-center">Explorer</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#21262d] text-[#c9d1d9]">
            {filteredTxs.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-[#8b949e]">
                  No matching transactions found for current filter.
                </td>
              </tr>
            ) : (
              filteredTxs.map((tx) => {
                const isSelectedHash = tx.hash === copiedHash;

                return (
                  <tr
                    key={tx.hash}
                    className="hover:bg-[#21262d]/50 transition-colors group text-[11px]"
                  >
                    {/* Hash */}
                    <td className="py-2 px-3 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleCopy(tx.hash)}
                          className="text-[#58a6ff] hover:underline font-mono"
                          title="Copy Full Transaction Hash"
                        >
                          {tx.hash.slice(0, 10)}...{tx.hash.slice(-6)}
                        </button>
                        {isSelectedHash ? (
                          <Check className="w-3 h-3 text-[#3fb950]" />
                        ) : (
                          <button
                            onClick={() => handleCopy(tx.hash)}
                            className="opacity-0 group-hover:opacity-100 text-[#8b949e] hover:text-[#f0f6fc]"
                          >
                            <Copy className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </td>

                    {/* Timestamp */}
                    <td className="py-2 px-3 whitespace-nowrap text-[#8b949e]">
                      {formatTime(tx.timeStamp)}
                    </td>

                    {/* From */}
                    <td className="py-2 px-3 whitespace-nowrap">
                      <button
                        onClick={() => onSelectNode(tx.from)}
                        className={`hover:underline font-mono ${
                          selectedNodeId?.toLowerCase() === tx.from.toLowerCase()
                            ? 'text-[#58a6ff] font-bold'
                            : 'text-[#c9d1d9]'
                        }`}
                      >
                        {tx.from.slice(0, 6)}...{tx.from.slice(-4)}
                      </button>
                    </td>

                    {/* To */}
                    <td className="py-2 px-3 whitespace-nowrap">
                      <button
                        onClick={() => onSelectNode(tx.to)}
                        className={`hover:underline font-mono ${
                          selectedNodeId?.toLowerCase() === tx.to.toLowerCase()
                            ? 'text-[#58a6ff] font-bold'
                            : 'text-[#c9d1d9]'
                        }`}
                      >
                        {tx.to.slice(0, 6)}...{tx.to.slice(-4)}
                      </button>
                    </td>

                    {/* Amount */}
                    <td className="py-2 px-3 whitespace-nowrap text-right">
                      <span className="font-bold text-[#f0f6fc]">
                        {tx.valueMatic.toLocaleString(undefined, { maximumFractionDigits: 2 })}{' '}
                        <span className="text-[#8b949e] text-[10px] font-normal">MATIC</span>
                      </span>
                      <span className="text-[10px] text-[#8b949e] block">
                        ~${tx.valueUsd.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                      </span>
                    </td>

                    {/* Heuristic Tag */}
                    <td className="py-2 px-3 whitespace-nowrap text-center">
                      {tx.heuristicTag ? (
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            tx.isSuspicious
                              ? 'bg-[#f85149]/15 text-[#f85149] border border-[#f85149]/30'
                              : 'bg-[#21262d] text-[#c9d1d9] border border-[#30363d]'
                          }`}
                        >
                          {tx.heuristicTag.replace(/_/g, ' ')}
                        </span>
                      ) : (
                        <span className="text-[10px] text-[#8b949e]">—</span>
                      )}
                    </td>

                    {/* Explorer */}
                    <td className="py-2 px-2 text-center whitespace-nowrap">
                      <a
                        href={`https://polygonscan.com/tx/${tx.hash}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[#8b949e] hover:text-[#58a6ff] inline-block p-1"
                        title="View on Polygonscan"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
