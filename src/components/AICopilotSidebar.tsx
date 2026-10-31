/**
 * AI Detective Copilot & Persistent Case Memory Sidebar
 * Connects with Backboard memory, PostgreSQL case vault, and Gemini/Tinker reasoning.
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  Brain,
  Send,
  Sparkles,
  Tag,
  Bookmark,
  Pin,
  Clock,
  User,
  Shield,
  Layers,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import {
  ChatMessage,
  GraphNode,
  WalletTag,
  CaseNote,
  ScanResponse,
} from '../types.js';

interface AICopilotSidebarProps {
  caseId: string;
  walletAddress: string;
  scanData: ScanResponse | null;
  selectedNode: GraphNode | null;
  chatMessages: ChatMessage[];
  isChatLoading: boolean;
  walletTags: WalletTag[];
  caseNotes: CaseNote[];
  onSendMessage: (message: string) => void;
  onSaveTag: (tag: string, category: string, notes?: string) => Promise<void>;
  onSaveNote: (content: string) => Promise<void>;
  onClearSelectedNode: () => void;
}

export const AICopilotSidebar: React.FC<AICopilotSidebarProps> = ({
  caseId,
  walletAddress,
  scanData,
  selectedNode,
  chatMessages,
  isChatLoading,
  walletTags,
  caseNotes,
  onSendMessage,
  onSaveTag,
  onSaveNote,
  onClearSelectedNode,
}) => {
  const [activeTab, setActiveTab] = useState<'copilot' | 'case_notes'>('copilot');
  const [inputText, setInputText] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [tagCategory, setTagCategory] = useState('CUSTOM');
  const [noteInput, setNoteInput] = useState('');
  const [isSubmittingTag, setIsSubmittingTag] = useState(false);
  const [isSubmittingNote, setIsSubmittingNote] = useState(false);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);

  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll chat to bottom smoothly without shifting window scroll
  useEffect(() => {
    if (activeTab === 'copilot' && chatContainerRef.current) {
      chatContainerRef.current.scrollTo({
        top: chatContainerRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }
  }, [chatMessages, isChatLoading, activeTab]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputText.trim() && !isChatLoading) {
      onSendMessage(inputText.trim());
      setInputText('');
    }
  };

  const handleQuickPrompt = (promptText: string) => {
    if (!isChatLoading) {
      onSendMessage(promptText);
    }
  };

  const handleAddTag = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tagInput.trim() || !selectedNode) return;
    setIsSubmittingTag(true);
    try {
      await onSaveTag(tagInput.trim(), tagCategory);
      setTagInput('');
    } finally {
      setIsSubmittingTag(false);
    }
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteInput.trim()) return;
    setIsSubmittingNote(true);
    try {
      await onSaveNote(noteInput.trim());
      setNoteInput('');
    } finally {
      setIsSubmittingNote(false);
    }
  };

  const handleCopyMessage = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedMessageId(id);
    setTimeout(() => setCopiedMessageId(null), 1500);
  };

  return (
    <div className="bg-[#161b22] border border-[#30363d] rounded-2xl flex flex-col h-full min-h-[600px] shadow-lg overflow-hidden">
      {/* Sidebar Header & Tabs */}
      <div className="border-b border-[#21262d] bg-[#161b22] p-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg overflow-hidden border border-cyan-500/40 bg-[#0d1117] shrink-0 shadow-sm">
            <img src="/chainsleuth-logo.jpeg" alt="ChainSleuth Logo" className="w-full h-full object-cover scale-105" />
          </div>
          <div>
            <h2 className="text-xs font-bold text-[#f0f6fc] font-sans">ChainSleuth AI Copilot</h2>
            <p className="text-[10px] font-mono text-[#8b949e]">
              Backboard Case Memory Active
            </p>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center p-0.5 bg-[#0d1117] border border-[#30363d] rounded-lg text-xs font-mono">
          <button
            onClick={() => setActiveTab('copilot')}
            className={`px-2.5 py-1 rounded transition-colors ${
              activeTab === 'copilot'
                ? 'bg-[#21262d] text-[#f0f6fc] font-semibold'
                : 'text-[#8b949e] hover:text-[#c9d1d9]'
            }`}
          >
            Copilot
          </button>
          <button
            onClick={() => setActiveTab('case_notes')}
            className={`px-2.5 py-1 rounded transition-colors flex items-center gap-1 ${
              activeTab === 'case_notes'
                ? 'bg-[#21262d] text-[#f0f6fc] font-semibold'
                : 'text-[#8b949e] hover:text-[#c9d1d9]'
            }`}
          >
            <span>Notes</span>
            {caseNotes.length > 0 && (
              <span className="w-4 h-4 rounded-full bg-[#1f6feb] text-white text-[9px] flex items-center justify-center font-bold">
                {caseNotes.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Selected Node Inspector Card */}
      {selectedNode && (
        <div className="p-3 bg-[#0d1117] border-b border-[#21262d] space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 border border-red-500/40 uppercase">
                {selectedNode.category}
              </span>
              <span className="text-xs font-mono font-bold text-[#f0f6fc] truncate">
                {selectedNode.alias || `${selectedNode.id.slice(0, 8)}...${selectedNode.id.slice(-6)}`}
              </span>
            </div>
            <button
              onClick={onClearSelectedNode}
              className="text-[11px] font-mono text-[#8b949e] hover:text-[#f0f6fc]"
            >
              Clear
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2 text-[11px] font-mono text-[#8b949e]">
            <div>
              <span>Risk: </span>
              <span className="font-bold text-[#f85149]">
                {selectedNode.riskScore}/100
              </span>
            </div>
            <div>
              <span>Balance: </span>
              <span className="font-bold text-[#f0f6fc]">
                {selectedNode.balanceMatic >= 1000
                  ? `${(selectedNode.balanceMatic / 1000).toFixed(0)}k`
                  : selectedNode.balanceMatic.toFixed(0)}{' '}
                MATIC
              </span>
            </div>
          </div>

          {/* Quick Tagging Form */}
          <form onSubmit={handleAddTag} className="flex items-center gap-1.5 pt-1">
            <select
              value={tagCategory}
              onChange={(e) => setTagCategory(e.target.value)}
              className="bg-[#161b22] border border-[#30363d] text-[11px] text-[#c9d1d9] rounded px-1.5 py-1 font-mono focus:outline-none"
            >
              <option value="EXPLOITER">Exploiter</option>
              <option value="PEEL_HOP">Peel Hop</option>
              <option value="MIXER">Mixer</option>
              <option value="EXCHANGE">CEX Deposit</option>
              <option value="BURNER">Burner</option>
              <option value="CUSTOM">Custom</option>
            </select>
            <input
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              placeholder="Add investigator alias/tag..."
              className="flex-1 bg-[#161b22] border border-[#30363d] text-[11px] font-mono text-[#f0f6fc] rounded px-2 py-1 placeholder-[#6e7681] focus:outline-none focus:border-[#58a6ff]"
            />
            <button
              type="submit"
              disabled={isSubmittingTag || !tagInput.trim()}
              className="px-2.5 py-1 text-[11px] font-semibold text-white bg-[#238636] hover:bg-[#2ea043] disabled:opacity-50 rounded transition-colors whitespace-nowrap"
            >
              Save Tag
            </button>
          </form>
        </div>
      )}

      {/* Main Tab Content */}
      {activeTab === 'copilot' ? (
        <div className="flex-1 flex flex-col min-h-0">
          {/* Quick Prompt Chips */}
          <div className="p-2.5 border-b border-[#30363d] bg-[#161b22]/50 flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] text-[#8b949e] font-mono mr-1">Quick Inquiries:</span>
            <button
              onClick={() => handleQuickPrompt('Explain the laundering trail and peel hops step-by-step')}
              className="text-[11px] px-2 py-1 rounded bg-[#21262d] hover:bg-[#30363d] text-[#c9d1d9] border border-[#30363d] hover:border-[#58a6ff] transition-colors"
            >
              Explain laundering trail
            </button>
            <button
              onClick={() => handleQuickPrompt('Identify all cash-out exchange endpoints and KYC deposit targets')}
              className="text-[11px] px-2 py-1 rounded bg-[#21262d] hover:bg-[#30363d] text-[#c9d1d9] border border-[#30363d] hover:border-[#58a6ff] transition-colors"
            >
              Identify cash-out endpoints
            </button>
            <button
              onClick={() => handleQuickPrompt('Draft a concise law enforcement briefing summary for this case')}
              className="text-[11px] px-2 py-1 rounded bg-[#21262d] hover:bg-[#30363d] text-[#c9d1d9] border border-[#30363d] hover:border-[#58a6ff] transition-colors"
            >
              Draft law enforcement summary
            </button>
            {selectedNode && (
              <button
                onClick={() =>
                  handleQuickPrompt(
                    `Analyze risk, counterparty flows, and laundering involvement for selected node ${selectedNode.id}`
                  )
                }
                className="text-[11px] px-2 py-1 rounded bg-[#1f6feb]/20 hover:bg-[#1f6feb]/30 text-[#58a6ff] border border-[#388bfd]/30 transition-colors"
              >
                Inspect node {selectedNode.id.slice(0, 6)}...
              </button>
            )}
          </div>

          {/* Chat Messages Feed */}
          <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-4 space-y-4">
            {chatMessages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${
                  msg.role === 'user' ? 'items-end' : 'items-start'
                }`}
              >
                <div className="flex items-center gap-1.5 text-[10px] font-mono text-[#8b949e] mb-1 px-1">
                  {msg.role === 'user' ? (
                    <>
                      <span>Lead Investigator</span>
                      <span>·</span>
                      <span>{msg.timestamp}</span>
                    </>
                  ) : (
                    <>
                      <img
                        src="/chainsleuth-logo.jpeg"
                        alt="ChainSleuth AI"
                        className="w-3.5 h-3.5 rounded-full object-cover border border-cyan-400/40 shrink-0"
                      />
                      <span className="font-semibold text-cyan-300">
                        ChainSleuth AI
                        {msg.provider ? ` (${msg.provider})` : ''}
                      </span>
                      <span>·</span>
                      <span>{msg.timestamp}</span>
                    </>
                  )}
                </div>

                <div
                  className={`group relative max-w-[92%] rounded-xl px-3.5 py-2.5 text-xs leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-[#1f6feb] text-white'
                      : 'bg-[#0d1117] border border-[#30363d] text-[#f0f6fc]'
                  }`}
                >
                  {/* Formatted text lines */}
                  <div className="prose prose-invert prose-xs max-w-none space-y-1.5 whitespace-pre-wrap font-sans">
                    {msg.content}
                  </div>

                  {/* Copy message button */}
                  {msg.role === 'assistant' && (
                    <button
                      onClick={() => handleCopyMessage(msg.id, msg.content)}
                      className="absolute top-2 right-2 p-1 text-[#8b949e] hover:text-[#f0f6fc] opacity-0 group-hover:opacity-100 transition-opacity bg-[#161b22] rounded border border-[#30363d]"
                      title="Copy response"
                    >
                      {copiedMessageId === msg.id ? (
                        <Check className="w-3 h-3 text-[#3fb950]" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                    </button>
                  )}
                </div>
              </div>
            ))}

            {isChatLoading && (
              <div className="flex items-start gap-2">
                <div className="bg-[#0d1117] border border-[#30363d] rounded-xl px-4 py-3 flex items-center gap-2 text-xs text-[#8b949e]">
                  <div className="w-3.5 h-3.5 border-2 border-[#58a6ff]/30 border-t-[#58a6ff] rounded-full animate-spin" />
                  <span>Cross-referencing Backboard memory & generating forensic reasoning...</span>
                </div>
              </div>
            )}
          </div>

          {/* Chat Input Bar */}
          <form onSubmit={handleSend} className="p-3 border-t border-[#30363d] bg-[#161b22] flex items-center gap-2">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Ask investigator copilot a forensic inquiry..."
              className="flex-1 bg-[#0d1117] border border-[#30363d] focus:border-[#58a6ff] rounded-lg px-3 py-2 text-xs font-mono text-[#f0f6fc] placeholder-[#6e7681] focus:outline-none"
            />
            <button
              type="submit"
              disabled={isChatLoading || !inputText.trim()}
              className="p-2 text-white bg-[#1f6feb] hover:bg-[#388bfd] disabled:opacity-50 rounded-lg transition-colors"
              title="Send Inquiry"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      ) : (
        /* Case Notes Tab */
        <div className="flex-1 flex flex-col min-h-0 p-3 space-y-3">
          <form onSubmit={handleAddNote} className="space-y-2">
            <textarea
              value={noteInput}
              onChange={(e) => setNoteInput(e.target.value)}
              placeholder="Record pinned investigator observation, warrant tag, or subpoena note..."
              rows={3}
              className="w-full bg-[#0d1117] border border-[#30363d] focus:border-[#58a6ff] rounded-lg p-2.5 text-xs font-mono text-[#f0f6fc] placeholder-[#6e7681] focus:outline-none"
            />
            <button
              type="submit"
              disabled={isSubmittingNote || !noteInput.trim()}
              className="w-full py-1.5 text-xs font-semibold text-white bg-[#238636] hover:bg-[#2ea043] disabled:opacity-50 rounded-lg transition-colors"
            >
              Pin Case Note
            </button>
          </form>

          <div className="flex-1 overflow-y-auto space-y-2">
            {caseNotes.length === 0 ? (
              <div className="py-12 text-center text-xs text-[#8b949e]">
                No case notes pinned yet. Notes recorded here persist across investigator sessions.
              </div>
            ) : (
              caseNotes.map((note) => (
                <div key={note.id} className="p-2.5 rounded-lg bg-[#0d1117] border border-[#30363d] text-xs font-mono">
                  <div className="flex items-center justify-between text-[10px] text-[#8b949e] mb-1">
                    <span>{note.author}</span>
                    <span>{new Date(note.createdAt).toLocaleDateString()}</span>
                  </div>
                  <p className="text-[#f0f6fc] whitespace-pre-wrap">{note.content}</p>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
