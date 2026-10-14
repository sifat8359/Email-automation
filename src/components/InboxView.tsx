import React, { useState } from 'react';
import {
  RotateCw,
  Send,
  MessageSquare,
  Users,
  Mail,
  Search,
  Check,
  CornerDownLeft,
  Calendar,
  Building2,
  ExternalLink,
  ChevronDown,
  Sparkles,
  Maximize2,
  Minimize2,
  Smile,
  Paperclip,
  CheckCircle2,
  Trash2,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Lead } from '../types';
import { formatFullDate, cleanWebsiteUrl, ensureValidUrl } from '../utils/templateEngine';

const QUICK_SNIPPETS = [
  'Thanks for reaching out! Does Thursday at 2:00 PM work for a quick 15-minute chat?',
  'Appreciate the quick response! Here is our demo breakdown and overview deck.',
  'Glad to connect. Who on your team leads outbound growth so we can coordinate?',
];

export const InboxView: React.FC<{
  onNavigateToCompose?: () => void;
}> = () => {
  const {
    leads,
    accounts,
    campaigns,
    sendInboxReply,
    updateLeadStatus,
    deleteCampaignLead,
    deleteMarkedCampaignLeads,
  } = useApp();

  const [filterMode, setFilterMode] = useState<'all' | 'interested' | 'replied' | 'unread'>('replied');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedThreadIds, setSelectedThreadIds] = useState<string[]>([]);
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(() => {
    const replied = leads.find((l) => l.status === 'replied');
    return replied ? replied.id : leads[0]?.id || null;
  });
  const [replyText, setReplyText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isComposerExpanded, setIsComposerExpanded] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleToggleSelectThread = (id: string) => {
    setSelectedThreadIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleToggleSelectAllThreads = () => {
    if (selectedThreadIds.length === filteredConversations.length && filteredConversations.length > 0) {
      setSelectedThreadIds([]);
    } else {
      setSelectedThreadIds(filteredConversations.map((l) => l.id));
    }
  };

  const handleRemoveMarkedThreads = () => {
    if (selectedThreadIds.length === 0) return;
    const count = selectedThreadIds.length;
    // For each marked lead, delete from its campaign
    selectedThreadIds.forEach((leadId) => {
      const target = leads.find((l) => l.id === leadId);
      const campId = target?.campaignId || campaigns[0]?.id;
      if (campId) {
        deleteCampaignLead(campId, leadId);
      }
    });
    setSelectedThreadIds([]);
    showToast(`Removed ${count} marked conversation ${count === 1 ? 'thread' : 'threads'}`);
  };

  // Filter conversations
  const filteredConversations = leads.filter((l) => {
    if (filterMode === 'replied' && l.status !== 'replied') return false;
    if (filterMode === 'interested' && l.sentiment !== 'interested') return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        l.firstName.toLowerCase().includes(q) ||
        l.lastName.toLowerCase().includes(q) ||
        l.email.toLowerCase().includes(q) ||
        l.companyName.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const activeLead = leads.find((l) => l.id === selectedLeadId) || filteredConversations[0];
  const activeAccount =
    accounts.find((a) => a.id === activeLead?.assignedAccountId) || accounts[0];
  const activeCampaign = campaigns.find((c) => c.id === activeLead?.campaignId);

  const handleSendReply = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!replyText.trim() || !activeLead) return;

    setIsSending(true);
    setTimeout(() => {
      sendInboxReply(activeLead.id, replyText.trim());
      setReplyText('');
      setIsSending(false);
      showToast(`Reply sent to ${activeLead.firstName} via ${activeAccount.email}`);
    }, 400);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      handleSendReply();
    }
  };

  return (
    <div className="space-y-4 animate-fade-in max-w-7xl mx-auto pb-16">
      {/* Toast Feedback */}
      {toastMessage && (
        <div className="flex items-center justify-between px-4 py-2.5 rounded-xl bg-emerald-950/80 border border-emerald-800 text-xs text-emerald-300 font-medium shadow-xl">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4" />
            <span>{toastMessage}</span>
          </div>
          <button onClick={() => setToastMessage(null)} className="text-zinc-400 hover:text-white">✕</button>
        </div>
      )}

      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-white tracking-tight">Unibox</h1>
            <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              Unified Inbox
            </span>
          </div>
          <p className="text-xs text-zinc-400 mt-0.5">
            Manage inbound responses across all connected Gmail accounts and cold email campaigns.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => showToast('Inbox refreshed')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#12182b] hover:bg-[#182038] border border-[#1f2a47] text-xs font-semibold text-zinc-200 transition-colors cursor-pointer"
          >
            <RotateCw className="h-3.5 w-3.5 text-zinc-400" />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* 3-Pane / Split-View Instantly Unibox */}
      <div className="grid grid-cols-1 lg:grid-cols-12 bg-[#0d1220] border border-[#1d2742] rounded-2xl shadow-2xl overflow-hidden min-h-[660px]">
        {/* Left Threads List (4 cols) */}
        <div className="lg:col-span-4 border-r border-[#1a233b] bg-[#0a0d18] flex flex-col p-3.5 space-y-3">
          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
            {[
              { id: 'replied', label: 'Replies', count: leads.filter((l) => l.status === 'replied').length },
              { id: 'interested', label: 'Interested', count: leads.filter((l) => l.sentiment === 'interested').length },
              { id: 'all', label: 'All Leads', count: leads.length },
            ].map((tab) => {
              const isActive = filterMode === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setFilterMode(tab.id as any)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                      : 'bg-[#12182a] text-zinc-400 hover:text-white border border-[#1b233a]'
                  }`}
                >
                  <span>{tab.label}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                      isActive ? 'bg-white/20 text-white' : 'bg-[#19223a] text-zinc-400'
                    }`}
                  >
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Search Box */}
          <div className="relative">
            <Search className="h-3.5 w-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-2 rounded-xl bg-[#080b14] border border-[#1b233a] text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Mark / Unmark Threads Toolbar */}
          {filteredConversations.length > 0 && (
            <div className="flex items-center justify-between px-1 text-[11px] text-zinc-400">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={selectedThreadIds.length > 0 && selectedThreadIds.length === filteredConversations.length}
                  onChange={handleToggleSelectAllThreads}
                  className="h-3.5 w-3.5 rounded border-[#243050] bg-[#0c101d] text-indigo-600 focus:ring-0 focus:ring-offset-0 cursor-pointer accent-indigo-600"
                  title="Mark all threads"
                />
                <span>Mark All ({filteredConversations.length})</span>
              </div>
              {selectedThreadIds.length > 0 && (
                <button
                  onClick={handleRemoveMarkedThreads}
                  className="flex items-center gap-1 text-rose-400 hover:text-rose-300 font-semibold cursor-pointer"
                  title="Remove marked threads"
                >
                  <Trash2 className="h-3 w-3" />
                  <span>Remove Marked ({selectedThreadIds.length})</span>
                </button>
              )}
            </div>
          )}

          {/* Conversations Scroll Area */}
          <div className="flex-1 overflow-y-auto space-y-2 pr-0.5">
            {filteredConversations.length === 0 ? (
              <div className="text-center py-12 text-zinc-500 text-xs">
                No conversations found under this filter.
              </div>
            ) : (
              filteredConversations.map((lead) => {
                const isSelected = activeLead?.id === lead.id;
                const isMarked = selectedThreadIds.includes(lead.id);
                const lastMsg = lead.history[lead.history.length - 1];
                const hasInbound = lead.history.some((m) => m.direction === 'inbound');

                return (
                  <div
                    key={lead.id}
                    onClick={() => setSelectedLeadId(lead.id)}
                    className={`p-3 rounded-xl transition-all cursor-pointer border ${
                      isMarked
                        ? 'bg-indigo-950/40 border-indigo-500/50 shadow-md'
                        : isSelected
                        ? 'bg-[#141b2e] border-indigo-500/50 shadow-md'
                        : 'bg-[#0f1424] hover:bg-[#121829] border-[#182138]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={isMarked}
                          onChange={(e) => {
                            e.stopPropagation();
                            handleToggleSelectThread(lead.id);
                          }}
                          onClick={(e) => e.stopPropagation()}
                          className="h-3.5 w-3.5 rounded border-[#243050] bg-[#0c101d] text-indigo-600 focus:ring-0 focus:ring-offset-0 cursor-pointer accent-indigo-600 shrink-0"
                          title="Mark thread"
                        />
                        <div className="h-6 w-6 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-bold text-[10px] flex items-center justify-center shrink-0">
                          {lead.firstName.charAt(0)}
                        </div>
                        <span className="font-semibold text-xs text-white truncate max-w-[130px]">
                          {lead.firstName} {lead.lastName}
                        </span>
                      </div>

                      {hasInbound ? (
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                          Replied
                        </span>
                      ) : (
                        <span className="text-[10px] text-zinc-500">
                          Step {lead.currentStepIndex + 1}
                        </span>
                      )}
                    </div>

                    <p className="text-[11px] text-zinc-400 mt-1 truncate font-medium">
                      {lead.companyName}
                    </p>

                    <p className="text-[11px] text-zinc-500 mt-0.5 line-clamp-1">
                      {lastMsg ? lastMsg.body : 'Sequence ready for outreach'}
                    </p>

                    <div className="flex items-center justify-between text-[10px] text-zinc-500 mt-2 pt-1.5 border-t border-[#172036]">
                      <span>{lead.email}</span>
                      <span>
                        {lastMsg ? formatFullDate(lastMsg.timestamp) : 'Pending'}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Active Conversation & Expanded Composer (8 cols) */}
        <div className="lg:col-span-8 flex flex-col justify-between bg-[#0b0f1b] overflow-hidden">
          {activeLead ? (
            <>
              {/* Active Conversation Header */}
              <div className="p-4 border-b border-[#1b233a] bg-[#0c101d] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-extrabold flex items-center justify-center text-sm shadow-md">
                    {activeLead.firstName.charAt(0)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="font-bold text-sm text-white">
                        {activeLead.firstName} {activeLead.lastName}
                      </h2>
                      <span className="text-xs text-zinc-400 font-mono">({activeLead.email})</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-zinc-400 mt-0.5">
                      <span className="font-medium text-zinc-200">{activeLead.companyName}</span>
                      {activeLead.website && (
                        <>
                          <span>•</span>
                          <a
                            href={ensureValidUrl(activeLead.website)}
                            target="_blank"
                            rel="noreferrer"
                            className="text-indigo-400 hover:underline flex items-center gap-1"
                          >
                            <span>{cleanWebsiteUrl(activeLead.website)}</span>
                            <ExternalLink className="h-2.5 w-2.5" />
                          </a>
                        </>
                      )}
                      {activeCampaign && (
                        <>
                          <span>•</span>
                          <span className="text-zinc-500 font-mono text-[11px]">
                            Campaign: {activeCampaign.name}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Sentiment / Lead Tag Selector */}
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-zinc-500 uppercase font-semibold">Sentiment:</span>
                  <select
                    value={activeLead.sentiment || (activeLead.status === 'replied' ? 'interested' : 'neutral')}
                    onChange={(e) => {
                      updateLeadStatus(
                        activeLead.campaignId || campaigns[0]?.id || '',
                        activeLead.id,
                        activeLead.status
                      );
                      showToast(`Sentiment set to ${e.target.value}`);
                    }}
                    className="px-2.5 py-1 rounded-lg bg-[#141b2c] border border-[#222d48] text-xs font-semibold text-zinc-200 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="interested">Interested ⭐</option>
                    <option value="meeting_requested">Meeting Booked 📅</option>
                    <option value="neutral">Neutral 💬</option>
                    <option value="not_interested">Not Interested ✕</option>
                  </select>
                </div>
              </div>

              {/* Message Thread History */}
              <div
                className={`p-4 space-y-4 overflow-y-auto transition-all ${
                  isComposerExpanded ? 'max-h-48' : 'flex-1 max-h-[380px]'
                }`}
              >
                {activeLead.history.length === 0 ? (
                  <div className="text-center py-12 text-zinc-500 text-xs">
                    No emails exchanged yet.
                  </div>
                ) : (
                  activeLead.history.map((msg) => {
                    const isInbound = msg.direction === 'inbound';
                    return (
                      <div
                        key={msg.id}
                        className={`flex flex-col ${
                          isInbound ? 'items-start' : 'items-end'
                        } space-y-1`}
                      >
                        <div className="flex items-center gap-2 text-[11px] text-zinc-500 px-1">
                          <span>{isInbound ? activeLead.firstName : 'You (Automated Outreach)'}</span>
                          <span>•</span>
                          <span>{formatFullDate(msg.timestamp)}</span>
                          {!isInbound && (
                            <span className="text-[10px] text-indigo-400 font-mono">
                              via {msg.accountEmail || activeAccount.email}
                            </span>
                          )}
                        </div>

                        <div
                          className={`p-4 rounded-2xl max-w-xl text-xs leading-relaxed shadow-lg ${
                            isInbound
                              ? 'bg-[#141c30] text-zinc-100 border border-[#212d4a]'
                              : 'bg-indigo-600/15 text-indigo-100 border border-indigo-500/30'
                          }`}
                        >
                          <p className="font-semibold text-[11px] text-zinc-400 mb-1 pb-1 border-b border-white/5">
                            {msg.subject}
                          </p>
                          <div className="whitespace-pre-wrap">{msg.body}</div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* EXPANDED REPLY COMPOSER (Redesigned per user request for generous writing area) */}
              <div className="border-t border-[#1b233a] bg-[#0c101d] p-4 space-y-3">
                {/* Quick Templates Toolbar */}
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] uppercase font-bold text-zinc-500">Quick Snippets:</span>
                    {QUICK_SNIPPETS.map((snippet, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setReplyText((prev) => (prev ? prev + '\n\n' : '') + snippet)}
                        className="px-2 py-0.5 rounded-lg bg-[#141a2c] hover:bg-indigo-600/20 text-zinc-300 hover:text-indigo-300 text-[10px] border border-[#1e2740] transition-colors cursor-pointer truncate max-w-[200px]"
                        title={snippet}
                      >
                        {snippet}
                      </button>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsComposerExpanded(!isComposerExpanded)}
                    className="p-1 rounded-md text-zinc-400 hover:text-white hover:bg-[#161d31] transition-colors"
                    title={isComposerExpanded ? 'Collapse composer' : 'Expand composer'}
                  >
                    {isComposerExpanded ? (
                      <Minimize2 className="h-3.5 w-3.5" />
                    ) : (
                      <Maximize2 className="h-3.5 w-3.5" />
                    )}
                  </button>
                </div>

                {/* Generous Rich Textarea */}
                <div className="relative">
                  <textarea
                    rows={isComposerExpanded ? 10 : 5}
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={`Write your direct reply to ${activeLead.firstName} from ${activeAccount.email}... (Press Cmd+Enter to send)`}
                    className="w-full px-4 py-3 rounded-xl bg-[#080b14] border border-[#1c243c] text-xs text-white leading-relaxed focus:outline-none focus:border-indigo-500 transition-colors resize-y"
                  />
                </div>

                {/* Send Footer */}
                <div className="flex items-center justify-between pt-1">
                  <div className="flex items-center gap-2 text-[11px] text-zinc-500">
                    <span>Sending from: <strong className="text-zinc-300">{activeAccount.email}</strong></span>
                    <span>•</span>
                    <span className="font-mono">Cmd+Enter to send</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleSendReply()}
                    disabled={isSending || !replyText.trim()}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-lg shadow-indigo-600/30 transition-all cursor-pointer disabled:opacity-50"
                  >
                    <Send className={`h-3.5 w-3.5 ${isSending ? 'animate-spin' : ''}`} />
                    <span>{isSending ? 'Sending...' : 'Send Reply'}</span>
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-zinc-500 text-xs">
              Select a conversation from the left to read and reply.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
