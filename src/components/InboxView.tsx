import React, { useState } from 'react';
import {
  RotateCw,
  Send,
  Search,
  ExternalLink,
  Maximize2,
  Minimize2,
  Trash2,
  CheckCircle2,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { formatFullDate, cleanWebsiteUrl, ensureValidUrl } from '../utils/templateEngine';
import { PageHeader, Button, Input, StatusPill } from './ui/DesignSystem';

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
    selectedThreadIds.forEach((leadId) => {
      const target = leads.find((l) => l.id === leadId);
      const campId = target?.campaignId || campaigns[0]?.id;
      if (campId) {
        deleteCampaignLead(campId, leadId);
      }
    });
    setSelectedThreadIds([]);
    showToast(`Removed ${count} marked ${count === 1 ? 'thread' : 'threads'}`);
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
  const activeCampaign = campaigns.find((c) => c.id === activeLead?.campaignId);
  const activeAccount =
    accounts.find((a) => a.id === activeCampaign?.assignedAccountId) || accounts[0];

  const handleSendReply = async () => {
    if (!activeLead || !replyText.trim()) return;

    setIsSending(true);
    await sendInboxReply(activeLead.id, replyText.trim());
    setIsSending(false);
    setReplyText('');
    showToast('Reply dispatched via authenticated mailbox.');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      handleSendReply();
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16 page-fade">
      {/* Toast Feedback */}
      {toastMessage && (
        <div className="flex items-center justify-between px-4 py-3 rounded-[10px] bg-[var(--surface)] border border-[var(--border)] text-sm text-[var(--text-primary)]">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-[var(--success)]" />
            <span>{toastMessage}</span>
          </div>
          <button onClick={() => setToastMessage(null)} className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-xs cursor-pointer ml-3">
            ✕
          </button>
        </div>
      )}

      {/* Header */}
      <PageHeader
        title="Unibox"
        subtitle="Manage inbound responses across all connected email accounts and cold outreach campaigns."
        action={
          <Button variant="secondary" onClick={() => showToast('Inbox refreshed')}>
            <RotateCw className="h-4 w-4" />
            <span>Refresh</span>
          </Button>
        }
      />

      {/* 2-Pane Split-View Unibox in Single Card */}
      <div className="grid grid-cols-1 lg:grid-cols-12 bg-[var(--surface)] border border-[var(--border)] rounded-[14px] overflow-hidden min-h-[660px]">
        {/* Left Threads List (4 cols) */}
        <div className="lg:col-span-4 border-r border-[var(--border)] flex flex-col p-4 space-y-3">
          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
            {[
              { id: 'replied', label: 'Replies', count: leads.filter((l) => l.status === 'replied').length },
              { id: 'interested', label: 'Interested', count: leads.filter((l) => l.sentiment === 'interested').length },
              { id: 'all', label: 'All leads', count: leads.length },
            ].map((tab) => {
              const isActive = filterMode === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setFilterMode(tab.id as any)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[10px] text-xs font-medium whitespace-nowrap transition-colors cursor-pointer ${
                    isActive
                      ? 'bg-[var(--accent)] text-[#0E1116]'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-white/[0.04]'
                  }`}
                >
                  <span>{tab.label}</span>
                  <span
                    className={`text-[11px] tabular-nums px-1.5 py-0.2 rounded-[6px] ${
                      isActive ? 'bg-[#0E1116]/20 text-[#0E1116]' : 'text-[var(--text-secondary)]'
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
            <Search className="h-4 w-4 text-[var(--text-secondary)] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <Input
              type="text"
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 py-2"
            />
          </div>

          {/* Mark / Unmark Threads Toolbar */}
          {filteredConversations.length > 0 && (
            <div className="flex items-center justify-between px-1 text-[12px] text-[var(--text-secondary)]">
              <button
                type="button"
                onClick={handleToggleSelectAllThreads}
                className={`px-2.5 py-1 rounded-[8px] text-xs font-medium border-2 transition-all duration-150 cursor-pointer ${
                  selectedThreadIds.length > 0 && selectedThreadIds.length === filteredConversations.length
                    ? 'border-[var(--accent)] bg-[rgba(91,141,239,0.12)] text-[var(--accent)]'
                    : 'border-[var(--border)] bg-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--text-secondary)]/50'
                }`}
              >
                {selectedThreadIds.length === filteredConversations.length ? 'Deselect all' : `Select all (${filteredConversations.length})`}
              </button>

              {selectedThreadIds.length > 0 && (
                <button
                  onClick={handleRemoveMarkedThreads}
                  className="flex items-center gap-1 text-rose-400 hover:text-rose-300 font-medium cursor-pointer"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>Remove marked ({selectedThreadIds.length})</span>
                </button>
              )}
            </div>
          )}

          {/* Conversations Scroll Area with 1px dividers between rows */}
          <div className="flex-1 overflow-y-auto divide-y divide-[var(--border)] border-t border-[var(--border)] -mx-4 px-4">
            {filteredConversations.length === 0 ? (
              <div className="text-center py-12 text-[var(--text-secondary)] text-xs">
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
                    onClick={() => {
                      setSelectedLeadId(lead.id);
                      if (selectedThreadIds.length > 0) {
                        handleToggleSelectThread(lead.id);
                      }
                    }}
                    className={`p-3 my-1 rounded-[10px] border-2 transition-all duration-150 cursor-pointer ${
                      isSelected || isMarked
                        ? 'border-[var(--accent)] bg-[rgba(91,141,239,0.08)] shadow-[0_0_0_1px_rgba(91,141,239,0.2)]'
                        : 'border-transparent hover:border-[var(--border)] hover:bg-white/[0.02]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="h-6 w-6 rounded-full bg-[var(--border)] text-[var(--text-primary)] font-semibold text-[10px] flex items-center justify-center shrink-0">
                          {lead.firstName.charAt(0)}
                        </div>
                        <span className="font-semibold text-xs text-[var(--text-primary)] truncate max-w-[130px]">
                          {lead.firstName} {lead.lastName}
                        </span>
                      </div>

                      {hasInbound ? (
                        <StatusPill variant="success" label="Replied" />
                      ) : (
                        <span className="text-[12px] text-[var(--text-secondary)] tabular-nums">
                          Step {lead.currentStepIndex + 1}
                        </span>
                      )}
                    </div>

                    <p className="text-[12px] text-[var(--text-secondary)] mt-1 truncate">
                      {lead.companyName}
                    </p>

                    <p className="text-[12px] text-[var(--text-secondary)] opacity-80 mt-0.5 line-clamp-1">
                      {lastMsg ? lastMsg.body : 'Sequence ready for outreach'}
                    </p>

                    <div className="flex items-center justify-between text-[11px] text-[var(--text-secondary)] mt-2 pt-1 border-t border-[var(--border)]">
                      <span className="truncate max-w-[150px]">{lead.email}</span>
                      <span className="tabular-nums">
                        {lastMsg ? formatFullDate(lastMsg.timestamp) : 'Pending'}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Active Conversation & Composer (8 cols) */}
        <div className="lg:col-span-8 flex flex-col justify-between overflow-hidden">
          {activeLead ? (
            <>
              {/* Active Conversation Header */}
              <div className="p-4 border-b border-[var(--border)] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-[10px] bg-[rgba(91,141,239,0.12)] text-[var(--accent)] font-semibold flex items-center justify-center text-sm">
                    {activeLead.firstName.charAt(0)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-sm font-semibold text-[var(--text-primary)]">
                        {activeLead.firstName} {activeLead.lastName}
                      </h2>
                      <span className="text-xs text-[var(--text-secondary)]">({activeLead.email})</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)] mt-0.5">
                      <span>{activeLead.companyName}</span>
                      {activeLead.website && (
                        <>
                          <span>,</span>
                          <a
                            href={ensureValidUrl(activeLead.website)}
                            target="_blank"
                            rel="noreferrer"
                            className="text-[var(--accent)] hover:underline flex items-center gap-1"
                          >
                            <span>{cleanWebsiteUrl(activeLead.website)}</span>
                            <ExternalLink className="h-2.5 w-2.5" />
                          </a>
                        </>
                      )}
                      {activeCampaign && (
                        <>
                          <span>,</span>
                          <span>Campaign: {activeCampaign.name}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Sentiment Selector */}
                <div className="flex items-center gap-2">
                  <span className="text-xs text-[var(--text-secondary)]">Sentiment:</span>
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
                    className="px-2.5 py-1.5 rounded-[10px] bg-[var(--surface)] border border-[var(--border)] text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                  >
                    <option value="interested">Interested</option>
                    <option value="meeting_requested">Meeting booked</option>
                    <option value="neutral">Neutral</option>
                    <option value="not_interested">Not interested</option>
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
                  <div className="text-center py-12 text-[var(--text-secondary)] text-xs">
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
                        <div className="flex items-center gap-2 text-[12px] text-[var(--text-secondary)] px-1">
                          <span>{isInbound ? activeLead.firstName : 'Outreach sender'}</span>
                          <span>,</span>
                          <span className="tabular-nums">{formatFullDate(msg.timestamp)}</span>
                          {!isInbound && (
                            <span className="text-[11px] text-[var(--accent)]">
                              via {msg.accountEmail || activeAccount.email}
                            </span>
                          )}
                        </div>

                        <div
                          className={`p-4 rounded-[14px] max-w-xl text-xs leading-relaxed border ${
                            isInbound
                              ? 'bg-white/[0.03] text-[var(--text-primary)] border-[var(--border)]'
                              : 'bg-[rgba(91,141,239,0.08)] text-[var(--text-primary)] border-[var(--border)]'
                          }`}
                        >
                          <p className="font-semibold text-xs text-[var(--text-secondary)] mb-1 pb-1 border-b border-[var(--border)]">
                            {msg.subject}
                          </p>
                          <div className="whitespace-pre-wrap">{msg.body}</div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Reply Composer */}
              <div className="border-t border-[var(--border)] p-4 space-y-3">
                {/* Quick Templates Toolbar */}
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-xs text-[var(--text-secondary)]">Quick snippets:</span>
                    {QUICK_SNIPPETS.map((snippet, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setReplyText((prev) => (prev ? prev + '\n\n' : '') + snippet)}
                        className="px-2.5 py-1 rounded-[8px] border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-white/[0.04] text-[11px] transition-colors cursor-pointer truncate max-w-[200px]"
                        title={snippet}
                      >
                        {snippet}
                      </button>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsComposerExpanded(!isComposerExpanded)}
                    className="p-1 rounded-[6px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-white/[0.04] transition-colors cursor-pointer"
                    title={isComposerExpanded ? 'Collapse composer' : 'Expand composer'}
                  >
                    {isComposerExpanded ? (
                      <Minimize2 className="h-4 w-4" />
                    ) : (
                      <Maximize2 className="h-4 w-4" />
                    )}
                  </button>
                </div>

                {/* Textarea */}
                <textarea
                  rows={isComposerExpanded ? 10 : 5}
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={`Write your direct reply to ${activeLead.firstName} from ${activeAccount.email}... (Press Cmd+Enter to send)`}
                  className="w-full px-3.5 py-3 rounded-[10px] bg-[var(--surface)] border border-[var(--border)] text-sm text-[var(--text-primary)] leading-relaxed focus:outline-none focus:border-[var(--accent)] transition-colors resize-y"
                />

                {/* Send Footer */}
                <div className="flex items-center justify-between pt-1">
                  <div className="text-[12px] text-[var(--text-secondary)]">
                    <span>Sending from {activeAccount.email}, Cmd+Enter to send</span>
                  </div>

                  {/* Primary Button */}
                  <Button
                    variant="primary"
                    type="button"
                    onClick={() => handleSendReply()}
                    disabled={isSending || !replyText.trim()}
                  >
                    <Send className={`h-4 w-4 ${isSending ? 'animate-spin' : ''}`} />
                    <span>{isSending ? 'Sending...' : 'Send reply'}</span>
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-[var(--text-secondary)] text-sm">
              Select a conversation from the left to read and reply.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
