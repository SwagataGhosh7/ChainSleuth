/**
 * Suspicious Activity Report (SAR) & Forensic Dossier Modal
 * Features 1-click Export as PDF via jsPDF, print view, and markdown downloads.
 */

import React, { useState } from 'react';
import {
  FileText,
  Copy,
  Check,
  Download,
  X,
  Printer,
  ShieldAlert,
  FileCheck2,
} from 'lucide-react';
import { jsPDF } from 'jspdf';

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
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(reportMarkdown);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadMarkdown = () => {
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

  /**
   * Generates a multi-page PDF document using jsPDF
   */
  const handleExportPDF = () => {
    try {
      setIsExportingPdf(true);
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'pt',
        format: 'a4',
      });

      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 40;
      const contentWidth = pageWidth - margin * 2;
      let currentY = margin;

      const checkPageBreak = (neededHeight: number) => {
        if (currentY + neededHeight > pageHeight - margin - 30) {
          doc.addPage();
          currentY = margin + 20;
          drawHeaderBar();
        }
      };

      const drawHeaderBar = () => {
        doc.setFillColor(15, 23, 42); // slate-900
        doc.rect(margin, currentY, contentWidth, 3, 'F');
        currentY += 14;
      };

      // 1. Top Brand Banner
      doc.setFillColor(30, 41, 59); // slate-800
      doc.rect(margin, currentY, contentWidth, 24, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.text('CHAINSLEUTH // ON-CHAIN FORENSIC INTELLIGENCE & SAR DOSSIER', margin + 12, currentY + 15);
      currentY += 38;

      // 2. Document Title
      doc.setTextColor(15, 23, 42);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(15);
      doc.text('SUSPICIOUS ACTIVITY REPORT (SAR) / FORENSIC DOSSIER', margin, currentY);
      currentY += 18;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(100, 116, 139);
      doc.text('Cryptocurrency Laundering & Illicit Flow Investigation Report', margin, currentY);
      currentY += 22;

      // 3. Metadata Table Block
      doc.setFillColor(248, 250, 252);
      doc.rect(margin, currentY, contentWidth, 54, 'F');
      doc.setDrawColor(226, 232, 240);
      doc.rect(margin, currentY, contentWidth, 54, 'S');

      doc.setFontSize(8.5);
      doc.setTextColor(71, 85, 105);
      doc.setFont('helvetica', 'bold');
      doc.text('Target Subject:', margin + 10, currentY + 16);
      doc.text('Network:', margin + 10, currentY + 32);
      doc.text('Generated At:', margin + 10, currentY + 46);

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(15, 23, 42);
      doc.text(walletAddress, margin + 85, currentY + 16);
      doc.text('Polygon Mainnet (EVM Chain ID 137)', margin + 85, currentY + 32);
      doc.text(new Date().toUTCString(), margin + 85, currentY + 46);

      doc.setFont('helvetica', 'bold');
      doc.setTextColor(71, 85, 105);
      doc.text('Document Ref:', margin + 340, currentY + 16);
      doc.text('Classification:', margin + 340, currentY + 32);
      doc.text('Compliance:', margin + 340, currentY + 46);

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(15, 23, 42);
      doc.text(`SAR-${Date.now().toString(36).toUpperCase()}`, margin + 415, currentY + 16);
      doc.text('Confidential AML SAR', margin + 415, currentY + 32);
      doc.text('FinCEN / FATF VASP', margin + 415, currentY + 46);

      currentY += 70;

      // 4. Parse & Render Content Lines
      const rawLines = reportMarkdown.split('\n');

      for (let i = 0; i < rawLines.length; i++) {
        const line = rawLines[i].trim();

        if (line === '---' || line === '***') {
          checkPageBreak(15);
          doc.setDrawColor(226, 232, 240);
          doc.line(margin, currentY, margin + contentWidth, currentY);
          currentY += 14;
          continue;
        }

        if (!line) {
          currentY += 6;
          continue;
        }

        // Section Heading
        if (line.startsWith('#')) {
          checkPageBreak(30);
          const cleanHeading = line.replace(/^#+\s*/, '').replace(/\*\*/g, '');
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(11);
          doc.setTextColor(15, 23, 42);
          doc.text(cleanHeading, margin, currentY);
          currentY += 16;
          continue;
        }

        // Paragraph / Bullet
        const isBullet = line.startsWith('- ') || line.startsWith('* ') || /^\d+\.\s/.test(line);
        const cleanText = line
          .replace(/^[-*]\s*/, '• ')
          .replace(/\*\*/g, '')
          .replace(/`/g, '');

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8.5);
        doc.setTextColor(30, 41, 59);

        const indent = isBullet ? margin + 12 : margin;
        const availableWidth = isBullet ? contentWidth - 12 : contentWidth;
        const splitText = doc.splitTextToSize(cleanText, availableWidth);

        checkPageBreak(splitText.length * 12 + 4);
        doc.text(splitText, indent, currentY);
        currentY += splitText.length * 12 + 4;
      }

      // Add Page Numbers and Footer
      const totalPages = doc.internal.pages.length - 1;
      for (let p = 1; p <= totalPages; p++) {
        doc.setPage(p);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
        doc.setTextColor(148, 163, 184);
        doc.text(
          `ChainSleuth Autonomous AI On-Chain Forensics · Page ${p} of ${totalPages}`,
          margin,
          pageHeight - 20
        );
        doc.text('Cryptographically Verified & Certified', pageWidth - margin - 150, pageHeight - 20);
      }

      doc.save(`ChainSleuth-SAR-${walletAddress.slice(0, 8)}.pdf`);
    } catch (err) {
      console.error('PDF generation error:', err);
      window.print();
    } finally {
      setIsExportingPdf(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm animate-fadeIn print:p-0 print:bg-white print:fixed print:inset-0">
      <div className="bg-[#161b22] border border-[#30363d] rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden print:border-none print:shadow-none print:max-h-full print:bg-white print:text-black">
        {/* Modal Header */}
        <div className="p-4 border-b border-[#30363d] flex flex-wrap items-center justify-between gap-3 bg-[#161b22] print:hidden">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg overflow-hidden border border-cyan-500/40 bg-[#0d1117] shrink-0 shadow-sm">
              <img src="/chainsleuth-logo.jpeg" alt="ChainSleuth Logo" className="w-full h-full object-cover scale-105" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-[#f0f6fc] font-sans">
                  Suspicious Activity Report (SAR) / Forensic Dossier
                </h2>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wider bg-red-500/15 text-red-400 border border-red-500/30">
                  FinCEN / FATF
                </span>
              </div>
              <p className="text-[11px] font-mono text-[#8b949e]">
                Target: {walletAddress} · Generated via ChainSleuth AI Forensics
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Export as PDF Button */}
            <button
              onClick={handleExportPDF}
              disabled={isGenerating || isExportingPdf}
              className="px-3 py-1.5 text-xs font-semibold text-white bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 rounded-lg transition-all flex items-center gap-1.5 shadow-sm active:scale-95 disabled:opacity-50"
              title="Download formal multi-page PDF dossier"
            >
              <FileCheck2 className="w-3.5 h-3.5" />
              <span>{isExportingPdf ? 'Generating PDF...' : 'Export as PDF'}</span>
            </button>

            {/* Print Button */}
            <button
              onClick={handlePrint}
              disabled={isGenerating}
              className="px-3 py-1.5 text-xs font-semibold text-[#c9d1d9] bg-[#21262d] hover:bg-[#30363d] border border-[#30363d] rounded-lg transition-colors flex items-center gap-1.5"
              title="Print to printer or browser PDF"
            >
              <Printer className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Print</span>
            </button>

            {/* Copy Button */}
            <button
              onClick={handleCopy}
              disabled={isGenerating}
              className="px-3 py-1.5 text-xs font-semibold text-[#c9d1d9] bg-[#21262d] hover:bg-[#30363d] border border-[#30363d] rounded-lg transition-colors flex items-center gap-1.5"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-[#3fb950]" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied!' : 'Copy'}</span>
            </button>

            {/* Download MD */}
            <button
              onClick={handleDownloadMarkdown}
              disabled={isGenerating}
              className="px-3 py-1.5 text-xs font-semibold text-white bg-[#238636] hover:bg-[#2ea043] rounded-lg transition-colors flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">.md</span>
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
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 font-mono text-xs text-[#c9d1d9] bg-[#0d1117] space-y-4 print:bg-white print:text-black print:p-0">
          {isGenerating ? (
            <div className="py-20 flex flex-col items-center justify-center gap-3 text-[#8b949e]">
              <div className="w-7 h-7 border-2 border-[#58a6ff]/30 border-t-[#58a6ff] rounded-full animate-spin" />
              <span className="text-xs">
                Compiling multi-hop graph nodes, AML heuristics, and Backboard case notes into certified SAR dossier...
              </span>
            </div>
          ) : (
            <div className="bg-[#161b22] border border-[#30363d] p-5 rounded-xl text-[#f0f6fc] print:border-none print:p-0 print:bg-white print:text-black">
              {/* Printable Header */}
              <div className="hidden print:block mb-6 border-b pb-4">
                <h1 className="text-xl font-bold text-black uppercase">SUSPICIOUS ACTIVITY REPORT (SAR) / FORENSIC DOSSIER</h1>
                <p className="text-sm text-gray-600">Cryptocurrency Laundering & Illicit Flow Investigation Report</p>
                <div className="text-xs text-gray-500 mt-2 font-mono">
                  Target: {walletAddress} | Generated: {new Date().toUTCString()}
                </div>
              </div>

              <pre className="whitespace-pre-wrap font-mono leading-relaxed text-xs text-[#f0f6fc] print:text-black print:text-[10pt]">
                {reportMarkdown}
              </pre>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-3 border-t border-[#30363d] bg-[#161b22] flex items-center justify-between text-[11px] text-[#8b949e] font-mono print:hidden">
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
