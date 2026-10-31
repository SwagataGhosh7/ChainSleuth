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
    <div className="bg-[#161b22] border border-[#30363d] rounded-xl flex flex-col h-[820px] shadow-sm overflow-hidden">
      {/* Sidebar Header & Tab Switches */}
      <div className="p-3.5 border-b border-[#30363d] bg-[#161b22]/90 flex items-center justify-between">
        <div className="flex items-center gap-1.5 p-0.5 bg-[#0d1117] rounded-lg border border-[#30363d]">
          <button
            onClick={() => setActiveTab('copilot')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors flex items-center gap-1.5 ${
              activeTab === 'copilot'
                ? 'bg-[#21262d] text-[#58a6ff] shadow-sm'
                : 'text-[#8b949e] hover:text-[#f0f6fc]'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>AI Copilot</span>
          </button>
          <button
            onClick={() => setActiveTab('case_notes')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors flex items-center gap-1.5 ${
              activeTab === 'case_notes'
                ? 'bg-[#21262d] text-[#58a6ff] shadow-sm'
                : 'text-[#8b949e] hover:text-[#f0f6fc]'
            }`}
          >
            <Bookmark className="w-3.5 h-3.5" />
            <span>Case Notes & Tags ({walletTags.length + caseNotes.length})</span>
          </button>
        </div>

        {/* Backboard Memory Status Badge */}
        <div
          className="flex items-center gap-1.5 text-[11px] font-mono text-[#3fb950] bg-[#238636]/10 border border-[#238636]/30 px-2 py-1 rounded"
          title="Backboard Persistent Long-Term Case Memory is active"
        >
          <Brain className="w-3.5 h-3.5 text-[#3fb950]" />
          <span className="hidden sm:inline">Backboard Memory:</span> Active
        </div>
      </div>

      {/* Selected Node Inspector Drawer (If Node is Selected) */}
      {selectedNode && (
        <div className="p-3 bg-[#0d1117] border-b border-[#30363d] space-y-2.5 animate-fadeIn">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-bold text-[#f0f6fc]">
              <Shield className="w-3.5 h-3.5 text-[#58a6ff]" />
              <span>Inspecting Node:</span>
              <span className="font-mono text-[#58a6ff]">
                {selectedNode.id.slice(0, 6)}...{selectedNode.id.slice(-4)}
              </span>
            </div>
            <button
              onClick={onClearSelectedNode}
              className="text-xs text-[#8b949e] hover:text-[#f0f6fc] font-mono"
            >
              Close ×
            </button>
          </div>

          <div className="grid grid-cols-3 gap-2 text-[11px] font-mono">
            <div className="bg-[#161b22] p-1.5 rounded border border-[#30363d]">
              <span className="text-[#8b949e] block text-[9px]">CATEGORY</span>
              <span className="font-bold text-[#f0f6fc]">{selectedNode.category}</span>
            </div>
            <div className="bg-[#161b22] p-1.5 rounded border border-[#30363d]">
              <span className="text-[#8b949e] block text-[9px]">RISK SCORE</span>
              <span className={`font-bold ${selectedNode.riskScore >= 80 ? 'text-[#ff7b72]' : 'text-[#d29922]'}`}>
                {selectedNode.riskScore}/100
              </span>
            </div>
            <div className="bg-[#161b22] p-1.5 rounded border border-[#30363d]">
              <span className="text-[#8b949e] block text-[9px]">BALANCE</span>
              <span className="font-bold text-[#f0f6fc] tabular-nums">
                {selectedNode.balanceMatic > 1000
                  ? `${(selectedNode.balanceMatic / 1000).toFixed(0)}k`
                  : selectedNode.balanceMatic.toFixed(0)}{' '}
                M
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
                      <Sparkles className="w-3 h-3 text-[#58a6ff]" />
                      <span className="font-semibold text-[#58a6ff]">
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
                  {/* Formatted Markdown text lines */}
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
          <form
            onSubmit={handleSend}
            className="p-3 border-t border-[#30363d] bg-[#161b22] flex items-center gap-2"
          >
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Ask the AI Detective anything about this transaction graph..."
              className="flex-1 bg-[#0d1117] border border-[#30363d] focus:border-[#58a6ff] rounded-lg px-3 py-2 text-xs text-[#f0f6fc] placeholder-[#6e7681] focus:outline-none"
            />
            <button
              type="submit"
              disabled={isChatLoading || !inputText.trim()}
              className="px-3.5 py-2 text-xs font-semibold text-white bg-[#1f6feb] hover:bg-[#388bfd] disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors flex items-center gap-1.5 shrink-0"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Ask</span>
            </button>
          </form>
        </div>
      ) : (
        /* Case Notes & Saved Tags Tab */
        <div className="flex-1 overflow-y-auto p-4 space-y-5">
          {/* Add Investigator Note Form */}
          <div className="bg-[#0d1117] border border-[#30363d] rounded-xl p-3.5 space-y-2.5">
            <div className="flex items-center gap-1.5 text-xs font-bold text-[#f0f6fc]">
              <Pin className="w-3.5 h-3.5 text-[#58a6ff]" />
              <span>Add Case Note (Stored in Backboard & PostgreSQL)</span>
            </div>
            <form onSubmit={handleAddNote} className="space-y-2">
              <textarea
                value={noteInput}
                onChange={(e) => setNoteInput(e.target.value)}
                placeholder="Log investigator observations, subpoena references, or off-chain entity intelligence..."
                rows={3}
                className="w-full bg-[#161b22] border border-[#30363d] rounded-lg p-2.5 text-xs text-[#f0f6fc] placeholder-[#6e7681] focus:outline-none focus:border-[#58a6ff]"
              />
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={isSubmittingNote || !noteInput.trim()}
                  className="px-3 py-1.5 text-xs font-semibold text-white bg-[#238636] hover:bg-[#2ea043] disabled:opacity-50 rounded-lg transition-colors flex items-center gap-1"
                >
                  <Bookmark className="w-3.5 h-3.5" />
                  <span>Pin Case Note</span>
                </button>
              </div>
            </form>
          </div>

          {/* Investigator Wallet Tags Section */}
          <div className="space-y-2">
            <div className="text-xs font-bold text-[#f0f6fc] flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-[#58a6ff]" />
                <span>Tagged Entities & Aliases ({walletTags.length})</span>
              </span>
              <span className="text-[10px] font-mono text-[#8b949e]">Synced to Backboard</span>
            </div>

            {walletTags.length === 0 ? (
              <div className="text-xs text-[#8b949e] py-3 text-center border border-dashed border-[#30363d] rounded-lg">
                No custom wallet tags recorded yet. Select any node in the graph to add an alias.
              </div>
            ) : (
              <div className="space-y-1.5">
                {walletTags.map((t) => (
                  <div
                    key={t.id}
                    className="p-2 bg-[#0d1117] border border-[#30363d] rounded-lg flex items-start justify-between text-xs"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-[#f0f6fc]">{t.tag}</span>
                        <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-[#21262d] text-[#8b949e] border border-[#30363d]">
                          {t.category}
                        </span>
                      </div>
                      <div className="text-[11px] font-mono text-[#58a6ff] mt-0.5">
                        {t.walletAddress}
                      </div>
                      {t.notes && <div className="text-xs text-[#8b949e] mt-1">{t.notes}</div>}
                    </div>
                    <span className="text-[10px] font-mono text-[#6e7681] shrink-0">
                      by {t.investigator}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Pinned Case Notes List */}
          <div className="space-y-2">
            <div className="text-xs font-bold text-[#f0f6fc] flex items-center gap-1.5">
              <Bookmark className="w-3.5 h-3.5 text-[#58a6ff]" />
              <span>Investigator Case Log ({caseNotes.length})</span>
            </div>

            {caseNotes.length === 0 ? (
              <div className="text-xs text-[#8b949e] py-3 text-center border border-dashed border-[#30363d] rounded-lg">
                No case notes logged.
              </div>
            ) : (
              <div className="space-y-2">
                {caseNotes.map((note) => (
                  <div
                    key={note.id}
                    className={`p-3 rounded-lg border text-xs ${
                      note.pinned
                        ? 'bg-[#0d1117] border-[#388bfd]/40'
                        : 'bg-[#0d1117] border-[#30363d]'
                    }`}
                  >
                    <div className="flex items-center justify-between text-[11px] text-[#8b949e] mb-1 font-mono">
                      <span className="font-semibold text-[#c9d1d9]">{note.author}</span>
                      <span>{new Date(note.createdAt).toLocaleDateString()}</span>
                    </div>
                    <p className="text-[#f0f6fc] leading-relaxed whitespace-pre-wrap">
                      {note.content}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
