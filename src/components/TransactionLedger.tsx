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
      const num = Number(ts);
      const date = num > 1e11 ? new Date(num) : new Date(num * 1000);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    } catch {
      return String(ts);
    }
  };

  const handleExportToCSV = () => {
    const listToExport = filteredTxs.length > 0 ? filteredTxs : parsedTxs;
    if (listToExport.length === 0) return;

    const headers = [
      'Transaction Hash',
      'From Address',
      'To Address',
      'Value (MATIC)',
      'Estimated Value (USD)',
      'Timestamp (UTC)',
      'Raw Timestamp',
      'Heuristic Risk Tag',
      'Suspicious Flag',
    ];

    const escapeCSV = (val: string | number | boolean | undefined | null) => {
      if (val === undefined || val === null) return '""';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    const rows = listToExport.map((tx) => {
      let dateIso = '';
      try {
        const num = Number(tx.timeStamp);
        const d = num > 1e11 ? new Date(num) : new Date(num * 1000);
        dateIso = d.toISOString();
      } catch {
        dateIso = String(tx.timeStamp);
      }

      return [
        escapeCSV(tx.hash),
        escapeCSV(tx.from),
        escapeCSV(tx.to),
        tx.valueMatic.toFixed(6),
        (tx.valueUsd || tx.valueMatic * 0.75).toFixed(2),
        escapeCSV(dateIso),
        escapeCSV(tx.timeStamp),
        escapeCSV(tx.heuristicTag || 'Standard Hop'),
        escapeCSV(tx.isSuspicious ? 'TRUE' : 'FALSE'),
      ].join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const filterSuffix = selectedNodeId ? `-${selectedNodeId.slice(0, 8)}` : '';
    link.download = `ChainSleuth-audit-transactions${filterSuffix}-${Date.now()}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Alias for backward compatibility
  const handleDownloadCSV = handleExportToCSV;

  return (
    <div className="bg-[#161b22] border border-[#30363d] rounded-xl overflow-hidden shadow-sm flex flex-col">
      {/* Table Header Controls */}
      <div className="p-3.5 border-b border-[#30363d] flex flex-wrap items-center justify-between gap-3 bg-[#161b22]/70">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-[#f0f6fc] font-sans">
            Forensic Transaction Ledger
          </span>
          <span className="text-[11px] text-[#8b949e] font-mono">
            ({filteredTxs.length} of {parsedTxs.length} transfers)
          </span>
          {selectedNodeId && (
            <span className="text-[11px] bg-[#58a6ff]/10 text-[#58a6ff] border border-[#388bfd]/30 px-2 py-0.5 rounded font-mono flex items-center gap-1">
              <span>Filtered by {selectedNodeId.slice(0, 6)}...{selectedNodeId.slice(-4)}</span>
              <button onClick={() => onSelectNode(null)} className="hover:text-white font-bold ml-1">
                ×
              </button>
            </span>
          )}
        </div>

        {/* Search, Sort & Export Controls */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-56">
            <Search className="w-3.5 h-3.5 text-[#8b949e] absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
              placeholder="Filter by hash or 0x..."
              className="w-full bg-[#0d1117] border border-[#30363d] rounded-md pl-8 pr-2.5 py-1 text-xs font-mono text-[#f0f6fc] placeholder-[#6e7681] focus:outline-none focus:border-[#58a6ff]"
            />
          </div>

          <button
            onClick={() => {
              if (sortField === 'value') setSortAsc(!sortAsc);
              else {
                setSortField('value');
                setSortAsc(false);
              }
            }}
            className={`px-2.5 py-1 text-xs font-mono rounded-md border transition-colors ${
              sortField === 'value'
                ? 'bg-[#21262d] text-[#58a6ff] border-[#388bfd]/40'
                : 'text-[#8b949e] border-[#30363d] hover:bg-[#21262d]'
            }`}
          >
            Sort by Value
          </button>

          <button
            onClick={handleExportToCSV}
            disabled={parsedTxs.length === 0}
            className="px-2.5 py-1 text-xs font-mono rounded-md border border-[#30363d] hover:border-[#58a6ff]/50 bg-[#21262d] hover:bg-[#30363d] text-[#c9d1d9] hover:text-[#f0f6fc] transition-colors flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
            title="Export to CSV for external audit"
            aria-label="Export to CSV"
            data-testid="export-to-csv"
          >
            <Download className="w-3.5 h-3.5 text-[#58a6ff]" />
            <span>Export to CSV</span>
          </button>
        </div>
      </div>

      {/* Ledger Table */}
      <div className="overflow-x-auto min-h-[300px] max-h-[360px] overflow-y-auto">
        <table className="w-full text-left text-xs font-mono">
          <thead className="bg-[#0d1117] text-[#8b949e] border-b border-[#30363d] sticky top-0 z-10 uppercase text-[10px] tracking-wider">
            <tr>
              <th className="py-2.5 px-3">Tx Hash</th>
              <th className="py-2.5 px-3">From</th>
              <th className="py-2.5 px-3">To</th>
              <th className="py-2.5 px-3 text-right">Value (MATIC)</th>
              <th className="py-2.5 px-3">Timestamp</th>
              <th className="py-2.5 px-3">Heuristic Flag</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#21262d]">
            {filteredTxs.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-[#8b949e]">
                  No transactions match the selected filter criteria.
                </td>
              </tr>
            ) : (
              filteredTxs.map((tx) => (
                <tr
                  key={tx.hash}
                  className="hover:bg-[#21262d]/50 transition-colors group text-[#c9d1d9]"
                >
                  {/* Hash */}
                  <td className="py-2 px-3 whitespace-nowrap">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[#58a6ff] font-mono">
                        {tx.hash.slice(0, 10)}...{tx.hash.slice(-6)}
                      </span>
                      <button
                        onClick={() => handleCopy(tx.hash)}
                        className="text-[#8b949e] hover:text-[#f0f6fc] opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded"
                        title="Copy Hash"
                      >
                        {copiedHash === tx.hash ? (
                          <Check className="w-3 h-3 text-[#3fb950]" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </button>
                      <a
                        href={`https://polygonscan.com/tx/${tx.hash}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[#8b949e] hover:text-[#58a6ff] opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded"
                        title="View on Polygonscan"
                      >
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </td>

                  {/* From */}
                  <td className="py-2 px-3 whitespace-nowrap">
                    <button
                      onClick={() => onSelectNode(tx.from)}
                      className="hover:text-[#58a6ff] hover:underline transition-colors text-left font-mono"
                    >
                      {tx.from.slice(0, 6)}...{tx.from.slice(-4)}
                    </button>
                  </td>

                  {/* To */}
                  <td className="py-2 px-3 whitespace-nowrap">
                    <button
                      onClick={() => onSelectNode(tx.to)}
                      className="hover:text-[#58a6ff] hover:underline transition-colors text-left font-mono"
                    >
                      {tx.to.slice(0, 6)}...{tx.to.slice(-4)}
                    </button>
                  </td>

                  {/* Value */}
                  <td className="py-2 px-3 text-right whitespace-nowrap tabular-nums">
                    <span className="font-bold text-[#f0f6fc]">
                      {tx.valueMatic.toLocaleString(undefined, { maximumFractionDigits: 2 })}{' '}
                    </span>
                    <span className="text-[10px] text-[#8b949e]">MATIC</span>
                  </td>

                  {/* Timestamp */}
                  <td className="py-2 px-3 whitespace-nowrap text-[#8b949e] tabular-nums">
                    {formatTime(tx.timeStamp)}
                  </td>

                  {/* Heuristic Flag */}
                  <td className="py-2 px-3 whitespace-nowrap">
                    {tx.heuristicTag ? (
                      <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded bg-[#ff7b72]/10 text-[#ff7b72] border border-[#ff7b72]/30 font-mono">
                        <Flame className="w-3 h-3" />
                        <span>{tx.heuristicTag}</span>
                      </span>
                    ) : (
                      <span className="text-[11px] text-[#8b949e]">Standard Hop</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
