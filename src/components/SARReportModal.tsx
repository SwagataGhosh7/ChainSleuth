/**
 * Suspicious Activity Report (SAR) & Forensic Dossier Modal
 */

import React, { useState } from 'react';
import {
  FileText,
  Copy,
  Check,
  Download,
  X,
  ShieldAlert,
  Printer,
} from 'lucide-react';

interface SARReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  reportMarkdown: string;
  isGenerating: boolean;
  walletAddress: string;
}

export const SARReportModal: React.FC<SARReportModalProps> = ({
  isOpen,
  onClose,
  reportMarkdown,
  isGenerating,
  walletAddress,
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(reportMarkdown);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([reportMarkdown], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `ChainSleuth-SAR-${walletAddress.slice(0, 8)}-${Date.now()}.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
      <div className="bg-[#161b22] border border-[#30363d] rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="p-4 border-b border-[#30363d] flex items-center justify-between bg-[#161b22]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#1f6feb]/20 border border-[#388bfd]/40 flex items-center justify-center text-[#58a6ff]">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-[#f0f6fc] font-sans">
                Suspicious Activity Report (SAR) / Forensic Dossier
              </h2>
              <p className="text-[11px] font-mono text-[#8b949e]">
                Target: {walletAddress} · Generated via ChainSleuth AI Forensics
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              disabled={isGenerating}
              className="px-3 py-1.5 text-xs font-semibold text-[#c9d1d9] bg-[#21262d] hover:bg-[#30363d] border border-[#30363d] rounded-lg transition-colors flex items-center gap-1.5"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-[#3fb950]" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied!' : 'Copy Markdown'}</span>
            </button>

            <button
              onClick={handleDownload}
              disabled={isGenerating}
              className="px-3 py-1.5 text-xs font-semibold text-white bg-[#238636] hover:bg-[#2ea043] rounded-lg transition-colors flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download .md</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 text-[#8b949e] hover:text-[#f0f6fc] rounded-lg hover:bg-[#21262d] transition-colors ml-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Body with Markdown Text */}
        <div className="flex-1 overflow-y-auto p-6 font-mono text-xs text-[#c9d1d9] bg-[#0d1117] space-y-4">
          {isGenerating ? (
            <div className="py-20 flex flex-col items-center justify-center gap-3 text-[#8b949e]">
              <div className="w-7 h-7 border-2 border-[#58a6ff]/30 border-t-[#58a6ff] rounded-full animate-spin" />
              <span className="text-xs">
                Compiling multi-hop graph nodes, AML heuristics, and Backboard case notes into certified SAR dossier...
              </span>
            </div>
          ) : (
            <pre className="whitespace-pre-wrap font-mono leading-relaxed bg-[#161b22] border border-[#30363d] p-5 rounded-xl text-[#f0f6fc]">
              {reportMarkdown}
            </pre>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-3 border-t border-[#30363d] bg-[#161b22] flex items-center justify-between text-[11px] text-[#8b949e] font-mono">
          <span>Compliant with FinCEN & FATF Virtual Asset Service Provider (VASP) guidelines.</span>
          <button
            onClick={onClose}
            className="px-3 py-1 text-xs text-[#c9d1d9] hover:text-[#f0f6fc] font-sans"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
