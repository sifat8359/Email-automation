import React, { useState, useRef, useEffect } from 'react';
import {
  BarChart3,
  Users,
  GitBranch,
  Clock,
  Sliders,
  Settings,
  Repeat,
  ShieldCheck,
  Timer,
  Play,
  Pause,
  Plus,
  Trash2,
  Copy,
  Upload,
  UserPlus,
  Zap,
  Mail,
  Send,
  X,
  ArrowLeft,
  ChevronDown,
  ChevronRight,
  Check,
  AlertCircle,
  ExternalLink,
  Sparkles,
  MessageSquare,
  Search,
  CheckCircle2,
  Filter,
  Eye,
  RefreshCw,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Campaign, SequenceStep, Lead, SequenceStepVariant } from '../types';
import { renderTemplate, cleanWebsiteUrl, ensureValidUrl, formatFullDate } from '../utils/templateEngine';
import { ImportLeadsModal } from './ImportLeadsModal';
import { AddLeadModal } from './AddLeadModal';
import { ThreadModal } from './ThreadModal';

interface CampaignDetailViewProps {
  campaignId: string;
  onBack: () => void;
  onNavigateToInbox: () => void;
  initialTab?: 'analytics' | 'leads' | 'sequences' | 'schedule' | 'options';
}

const VARIABLE_TAGS = [
  { label: 'First Name', tag: '{{firstName}}' },
  { label: 'Last Name', tag: '{{lastName}}' },
  { label: 'Company', tag: '{{companyName}}' },
  { label: 'Website', tag: '{{website}}' },
  { label: 'Title', tag: '{{title}}' },
  { label: 'Sender Name', tag: '{{senderName}}' },
];

const DAYS_OF_WEEK = [
  { day: 1, label: 'Mon' },
  { day: 2, label: 'Tue' },
  { day: 3, label: 'Wed' },
  { day: 4, label: 'Thu' },
  { day: 5, label: 'Fri' },
  { day: 6, label: 'Sat' },
  { day: 0, label: 'Sun' },
];

export const CampaignDetailView: React.FC<CampaignDetailViewProps> = ({
  campaignId,
  onBack,
  onNavigateToInbox,
  initialTab = 'leads',
}) => {
  const {
    campaigns,
    accounts,
    updateCampaign,
    deleteCampaign,
    duplicateCampaign,
    toggleCampaignStatus,
    importCampaignLeads,
    deleteCampaignLead,
    deleteMarkedCampaignLeads,
    dispatchCampaignLeadOutreach,
    simulateLeadReply,
    simulateLeadOpen,
    accountNextAllowedSendTime,
    resetAccountCooldown,
  } = useApp();

  const campaign = campaigns.find((c) => c.id === campaignId) || campaigns[0];

  // 1-second interval ticker for live cooldown countdowns
  const [currentTime, setCurrentTime] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setCurrentTime(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  // 5 Instantly Tabs - defaults to Leads when opening a campaign
  const [activeTab, setActiveTab] = useState<'analytics' | 'leads' | 'sequences' | 'schedule' | 'options'>(initialTab);

  // Email account selector dropdown state
  const [isAccountDropdownOpen, setIsAccountDropdownOpen] = useState(false);
  const accountDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (accountDropdownRef.current && !accountDropdownRef.current.contains(e.target as Node)) {
        setIsAccountDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Edit campaign name state
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameValue, setNameValue] = useState(campaign?.name || 'Campaign');

  // Action feedback message
  const [bannerFeedback, setBannerFeedback] = useState<{ type: 'success' | 'info' | 'error'; text: string } | null>(null);

  // Modals state
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isAddLeadModalOpen, setIsAddLeadModalOpen] = useState(false);
  const [selectedThreadLead, setSelectedThreadLead] = useState<Lead | null>(null);
  const [previewStep, setPreviewStep] = useState<SequenceStep | null>(null);

  // Leads filter & search
  const [leadsSearch, setLeadsSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedLeadIds, setSelectedLeadIds] = useState<string[]>([]);
  if (!campaign) {
    return (
      <div className="text-center py-16 space-y-4">
        <p className="text-sm text-zinc-400">Campaign not found.</p>
        <button
          onClick={onBack}
          className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-semibold"
        >
          Back to Campaigns
        </button>
      </div>
    );
  }

  const assignedAccount = accounts.find((a) => a.id === campaign.assignedAccountId) || accounts[0];
  const assignedAccountIds =
    campaign.assignedAccountIds && campaign.assignedAccountIds.length > 0
      ? campaign.assignedAccountIds
      : [campaign.assignedAccountId || accounts[0]?.id];
  const assignedAccounts = accounts.filter((a) => assignedAccountIds.includes(a.id));

  const showFeedback = (text: string, type: 'success' | 'info' | 'error' = 'success') => {
    setBannerFeedback({ type, text });
    setTimeout(() => setBannerFeedback(null), 4000);
  };

  const handleSaveName = () => {
    if (nameValue.trim() && nameValue !== campaign.name) {
      updateCampaign(campaign.id, { name: nameValue.trim() });
      showFeedback('Campaign name updated');
    }
    setIsEditingName(false);
  };

  const handleToggleSelectAllLeads = () => {
    if (selectedLeadIds.length === filteredLeads.length && filteredLeads.length > 0) {
      setSelectedLeadIds([]);
    } else {
      setSelectedLeadIds(filteredLeads.map((l) => l.id));
    }
  };

  const handleToggleSelectLead = (leadId: string) => {
    setSelectedLeadIds((prev) =>
      prev.includes(leadId) ? prev.filter((id) => id !== leadId) : [...prev, leadId]
    );
  };

  const handleRemoveMarkedLeads = () => {
    if (selectedLeadIds.length === 0) return;
    const count = selectedLeadIds.length;
    deleteMarkedCampaignLeads(campaign.id, selectedLeadIds);
    setSelectedLeadIds([]);
    showFeedback(`Removed ${count} marked ${count === 1 ? 'item' : 'items'} from this campaign`, 'info');
  };

  // Filtered Leads
  const filteredLeads = campaign.leads.filter((l) => {
    if (statusFilter !== 'all' && l.status !== statusFilter) return false;
    if (leadsSearch.trim()) {
      const q = leadsSearch.toLowerCase();
      return (
        l.firstName.toLowerCase().includes(q) ||
        l.lastName.toLowerCase().includes(q) ||
        l.email.toLowerCase().includes(q) ||
        l.companyName.toLowerCase().includes(q)
      );
    }
    return true;
  });

  // Calculate stats
  const totalLeads = campaign.leads.length;
  const sentCount = campaign.leads.filter((l) => l.status !== 'ready_for_outreach').length;
  const openedCount = campaign.leads.filter((l) => l.openedCount > 0).length;
  const repliedCount = campaign.leads.filter((l) => l.status === 'replied').length;
  const openRate = sentCount > 0 ? ((openedCount / sentCount) * 100).toFixed(1) : '0';
  const replyRate = sentCount > 0 ? ((repliedCount / sentCount) * 100).toFixed(1) : '0';

  // Check schedule window status
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const [startH, startM] = (campaign.scheduleWindow.startTime || '08:00').split(':').map(Number);
  const [endH, endM] = (campaign.scheduleWindow.endTime || '22:00').split(':').map(Number);
  const startMins = startH * 60 + (startM || 0);
  const endMins = endH * 60 + (endM || 0);
  const isInsideWindow = currentMinutes >= startMins && currentMinutes <= endMins;

  // Add Sequence Step
  const handleAddStep = () => {
    const nextStepNum = campaign.sequenceSteps.length + 1;
    const newStep: SequenceStep = {
      id: `step-${Date.now()}`,
      stepNumber: nextStepNum,
      type: 'auto_followup',
      delayAmount: 2,
      delayUnit: 'days',
      subject: `Re: {{companyName}} outreach`,
      body: `Hi {{firstName}},\n\nWanted to quickly follow up on my previous note. Did you have a chance to review?\n\nBest,\n{{senderName}}`,
      triggerCondition: 'no_reply',
      activeVariant: 'A',
    };
    updateCampaign(campaign.id, {
      sequenceSteps: [...campaign.sequenceSteps, newStep],
    });
    showFeedback(`Step #${nextStepNum} added to sequence`);
  };

  const handleRemoveStep = (stepId: string) => {
    if (campaign.sequenceSteps.length <= 1) {
      showFeedback('A sequence must have at least one outreach step', 'error');
      return;
    }
    const updated = campaign.sequenceSteps
      .filter((s) => s.id !== stepId)
      .map((s, idx) => ({ ...s, stepNumber: idx + 1 }));
    updateCampaign(campaign.id, { sequenceSteps: updated });
    showFeedback('Step removed from sequence');
  };

  const handleUpdateStep = (stepId: string, updates: Partial<SequenceStep>) => {
    const updated = campaign.sequenceSteps.map((s) => (s.id === stepId ? { ...s, ...updates } : s));
    updateCampaign(campaign.id, { sequenceSteps: updated });
  };

  const handleInsertVariable = (stepId: string, field: 'subject' | 'body', variableTag: string) => {
    const step = campaign.sequenceSteps.find((s) => s.id === stepId);
    if (!step) return;
    const currentVal = step[field];
    handleUpdateStep(stepId, { [field]: currentVal + (currentVal ? ' ' : '') + variableTag });
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-7xl mx-auto pb-16">
      {/* Top Banner / Feedback Alert */}
      {bannerFeedback && (
        <div
          className={`flex items-center justify-between px-4 py-2.5 rounded-xl border text-xs font-medium transition-all ${
            bannerFeedback.type === 'error'
              ? 'bg-rose-950/60 border-rose-800/80 text-rose-300'
              : bannerFeedback.type === 'info'
              ? 'bg-sky-950/60 border-sky-800/80 text-sky-300'
              : 'bg-emerald-950/60 border-emerald-800/80 text-emerald-300'
          }`}
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4" />
            <span>{bannerFeedback.text}</span>
          </div>
          <button onClick={() => setBannerFeedback(null)} className="text-zinc-400 hover:text-white">
            ✕
          </button>
        </div>
      )}

      {/* Campaign Top Bar with Instantly Aesthetics */}
      <div className="bg-[#0f1422] border border-[#1b2339] rounded-2xl p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 rounded-xl bg-[#141b2d] hover:bg-[#1a233b] border border-[#222d4a] text-zinc-300 hover:text-white transition-colors cursor-pointer"
            title="Back to Campaigns"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>

          <div className="space-y-1">
            <div className="flex items-center gap-2">
              {isEditingName ? (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={nameValue}
                    onChange={(e) => setNameValue(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSaveName()}
                    className="px-2.5 py-1 rounded-lg bg-[#0a0d16] border border-indigo-500 text-white font-bold text-base focus:outline-none"
                    autoFocus
                  />
                  <button
                    onClick={handleSaveName}
                    className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold"
                  >
                    Save
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <h1
                    onClick={() => setIsEditingName(true)}
                    className="text-lg sm:text-xl font-bold text-white tracking-tight cursor-pointer hover:text-indigo-300 transition-colors"
                    title="Click to rename"
                  >
                    {campaign.name}
                  </h1>
                  <span className="text-[10px] text-zinc-500 uppercase px-2 py-0.5 rounded bg-[#182033] border border-[#232d47]">
                    Click to rename
                  </span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-3 text-xs text-zinc-400 flex-wrap">
              <span>
                Senders:{' '}
                <strong className="text-zinc-200">
                  {assignedAccounts.length > 1
                    ? `${assignedAccounts.length} Mailboxes (Auto-Swapping)`
                    : assignedAccounts[0]?.email || assignedAccount.email}
                </strong>
              </span>
              <span>•</span>
              <span className="flex items-center gap-1.5">
                <span
                  className={`h-2 w-2 rounded-full ${
                    isInsideWindow ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
                  }`}
                />
                <span>
                  Window: {campaign.scheduleWindow.startTime} - {campaign.scheduleWindow.endTime} (
                  {isInsideWindow ? 'Active' : 'Outside Window'})
                </span>
              </span>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5 self-start md:self-auto flex-wrap">
          {/* Active / Paused Toggle */}
          <button
            onClick={() => {
              toggleCampaignStatus(campaign.id);
              showFeedback(`Campaign status changed to ${campaign.status === 'active' ? 'Paused' : 'Active'}`);
            }}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              campaign.status === 'active'
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20'
                : 'bg-zinc-800/80 text-zinc-300 border border-zinc-700 hover:bg-zinc-700'
            }`}
          >
            {campaign.status === 'active' ? (
              <>
                <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>Active</span>
              </>
            ) : (
              <>
                <Pause className="h-3.5 w-3.5 text-zinc-400" />
                <span>Paused</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Signature Instantly 5 Tabs Navigation Bar */}
      <div className="border-b border-[#1b233a] flex items-center gap-1 sm:gap-2 overflow-x-auto pb-1 no-scrollbar">
        {[
          { id: 'leads', label: `Leads (${campaign.leads.length})`, icon: Users },
          { id: 'sequences', label: `Sequences (${campaign.sequenceSteps.length})`, icon: GitBranch },
          { id: 'schedule', label: 'Schedule', icon: Clock },
          { id: 'analytics', label: 'Analytics', icon: BarChart3 },
          { id: 'options', label: 'Setting', icon: Settings },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/25'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-[#121829]'
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB CONTENT AREAS */}

      {/* 1. ANALYTICS TAB */}
      {activeTab === 'analytics' && (
        <div className="space-y-6 animate-fade-in">
          {/* Top 5 KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5">
            <div className="bg-[#111728] border border-[#1d2742] rounded-2xl p-4">
              <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">TOTAL LEADS</span>
              <p className="text-2xl font-extrabold text-white mt-1.5">{totalLeads}</p>
              <p className="text-[11px] text-zinc-500 mt-1">in this campaign</p>
            </div>

            <div className="bg-[#111728] border border-[#1d2742] rounded-2xl p-4">
              <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">CONTACTED / SENT</span>
              <p className="text-2xl font-extrabold text-indigo-400 mt-1.5">{sentCount}</p>
              <p className="text-[11px] text-zinc-500 mt-1">{totalLeads - sentCount} pending outreach</p>
            </div>

            <div className="bg-[#111728] border border-[#1d2742] rounded-2xl p-4">
              <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">OPEN RATE</span>
              <p className="text-2xl font-extrabold text-purple-400 mt-1.5">{openRate}%</p>
              <p className="text-[11px] text-zinc-500 mt-1">{openedCount} unique opens</p>
            </div>

            <div className="bg-[#111728] border border-[#1d2742] rounded-2xl p-4">
              <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">REPLY RATE</span>
              <p className="text-2xl font-extrabold text-emerald-400 mt-1.5">{replyRate}%</p>
              <p className="text-[11px] text-zinc-500 mt-1">{repliedCount} inbound replies</p>
            </div>

            <div className="bg-[#111728] border border-[#1d2742] rounded-2xl p-4">
              <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">OPPORTUNITIES</span>
              <p className="text-2xl font-extrabold text-amber-400 mt-1.5">
                {campaign.leads.filter((l) => l.sentiment === 'interested' || l.status === 'replied').length}
              </p>
              <p className="text-[11px] text-zinc-500 mt-1">high intent replies</p>
            </div>

            <div className="bg-[#111728] border border-[#1d2742] rounded-2xl p-4 col-span-2 md:col-span-1">
              <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-1">
                <ShieldCheck className="h-3 w-3 text-cyan-400" />
                <span>BOT SCANS FILTERED</span>
              </span>
              <p className="text-2xl font-extrabold text-cyan-400 mt-1.5">
                {campaign.stats.botFiltered || 0}
              </p>
              <p className="text-[11px] text-zinc-500 mt-1">&lt;10s fake opens ignored</p>
            </div>
          </div>

          {/* Sequence Funnel Drop-off Chart */}
          <div className="bg-[#111728] border border-[#1d2742] rounded-2xl p-5 space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white">Sequence Performance & Drop-Off Funnel</h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Performance across each step in your outreach sequence
                </p>
              </div>
            </div>

            <div className="space-y-3 pt-2">
              {campaign.sequenceSteps.map((step, idx) => {
                const stepSentCount = campaign.leads.filter(
                  (l) => l.currentStepIndex >= idx && l.status !== 'ready_for_outreach'
                ).length;
                const stepRepliedCount = campaign.leads.filter(
                  (l) => l.status === 'replied' && l.currentStepIndex === idx + 1
                ).length;
                const percentage = totalLeads > 0 ? (stepSentCount / totalLeads) * 100 : 0;

                return (
                  <div key={step.id} className="p-3.5 rounded-xl bg-[#0a0e19] border border-[#182138] space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="h-5 w-5 rounded-md bg-indigo-500/20 text-indigo-300 font-bold flex items-center justify-center text-[10px]">
                          #{step.stepNumber}
                        </span>
                        <span className="font-semibold text-zinc-200 truncate max-w-[280px] sm:max-w-md">
                          {step.stepNumber === 1 ? 'Initial Cold Email' : `Follow-up #${step.stepNumber - 1}`}
                          <span className="text-zinc-500 font-normal ml-2">({step.subject})</span>
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-zinc-300">
                        <span><strong>{stepSentCount}</strong> sent</span>
                        <span><strong>{stepRepliedCount}</strong> replies</span>
                      </div>
                    </div>

                    {/* Progress bar */}
                    <div className="w-full bg-[#141b2c] h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-indigo-500 to-purple-500 h-full rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(100, percentage)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Activity Log Feed */}
          <div className="bg-[#111728] border border-[#1d2742] rounded-2xl p-5 space-y-4 shadow-xl">
            <h3 className="text-sm font-bold text-white">Recent Campaign Dispatch Feed</h3>
            <div className="space-y-2">
              {campaign.leads.flatMap((l) => l.history).length === 0 ? (
                <p className="text-xs text-zinc-500 py-4 text-center">
                  No outreach emails dispatched yet. Activate the campaign to begin automated sequence delivery according to your schedule.
                </p>
              ) : (
                campaign.leads
                  .flatMap((l) =>
                    l.history.map((msg) => ({
                      ...msg,
                      leadName: `${l.firstName} ${l.lastName}`,
                      company: l.companyName,
                    }))
                  )
                  .sort((a, b) => b.timestamp - a.timestamp)
                  .slice(0, 8)
                  .map((item) => (
                    <div
                      key={item.id}
                      className="p-3 rounded-xl bg-[#0b0f1b] border border-[#172036] flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`h-8 w-8 rounded-lg flex items-center justify-center ${
                            item.direction === 'inbound'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                          }`}
                        >
                          {item.direction === 'inbound' ? (
                            <MessageSquare className="h-4 w-4" />
                          ) : (
                            <Send className="h-4 w-4" />
                          )}
                        </div>
                        <div>
                          <p className="font-semibold text-zinc-200">
                            {item.direction === 'inbound' ? 'Reply received from' : 'Dispatched to'}{' '}
                            <span className="text-indigo-400">{item.leadName}</span> ({item.company})
                          </p>
                          <p className="text-zinc-500 text-[11px] truncate max-w-sm sm:max-w-md">
                            {item.subject}
                          </p>
                        </div>
                      </div>
                      <span className="text-[11px] text-zinc-500">{formatFullDate(item.timestamp)}</span>
                    </div>
                  ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* 2. LEADS TAB */}
      {activeTab === 'leads' && (
        <div className="space-y-4 animate-fade-in">
          {/* Action Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-[#0f1422] border border-[#1b233a] p-3.5 rounded-2xl shadow-xl">
            {/* Search and Filters */}
            <div className="flex items-center gap-2.5 flex-1 max-w-lg">
              <div className="relative flex-1">
                <Search className="h-3.5 w-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search leads by name, email, or company..."
                  value={leadsSearch}
                  onChange={(e) => setLeadsSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-[#090d17] border border-[#1c243d] text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Status Filter Dropdown */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-1.5 rounded-xl bg-[#090d17] border border-[#1c243d] text-xs text-zinc-300 font-medium focus:outline-none focus:border-indigo-500"
              >
                <option value="all">All Statuses ({campaign.leads.length})</option>
                <option value="ready_for_outreach">Pending Outreach</option>
                <option value="outreach_sent">Outreach Sent</option>
                <option value="opened">Opened</option>
                <option value="replied">Replied</option>
                <option value="completed">Completed</option>
              </select>
            </div>

            {/* Action Buttons: Import CSV / Add Lead */}
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => setIsImportModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-md shadow-indigo-600/30 transition-all cursor-pointer"
              >
                <Upload className="h-3.5 w-3.5" />
                <span>Import CSV</span>
              </button>

              <button
                onClick={() => setIsAddLeadModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#141b2e] hover:bg-[#1a233b] border border-[#212b48] text-zinc-200 font-semibold text-xs transition-colors cursor-pointer"
              >
                <UserPlus className="h-3.5 w-3.5 text-zinc-400" />
                <span>Add Lead</span>
              </button>
            </div>
          </div>

          {/* Marked Items Action Banner */}
          {selectedLeadIds.length > 0 && (
            <div className="flex items-center justify-between p-3.5 rounded-2xl bg-indigo-950/60 border border-indigo-500/40 text-xs shadow-xl animate-fade-in">
              <div className="flex items-center gap-3">
                <div className="h-6 w-6 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-xs shadow-sm">
                  {selectedLeadIds.length}
                </div>
                <div>
                  <p className="font-semibold text-white">
                    {selectedLeadIds.length} {selectedLeadIds.length === 1 ? 'item marked' : 'items marked'}
                  </p>
                  <p className="text-[11px] text-zinc-400">
                    Selected leads in this campaign
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleRemoveMarkedLeads}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs shadow-md shadow-rose-600/30 transition-all cursor-pointer"
                  title="Remove marked items from campaign"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>Remove Marked Items ({selectedLeadIds.length})</span>
                </button>
                <button
                  onClick={() => setSelectedLeadIds([])}
                  className="px-3 py-1.5 rounded-xl bg-[#141b2c] hover:bg-[#1a233b] border border-[#222c48] text-zinc-300 hover:text-white text-xs font-medium transition-colors cursor-pointer"
                >
                  Unmark All
                </button>
              </div>
            </div>
          )}

          {/* Leads Data Table */}
          <div className="bg-[#0f1422] border border-[#1b233a] rounded-2xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#182138] bg-[#0c101d] text-zinc-400 uppercase tracking-wider text-[10px] font-semibold">
                    <th className="py-3 px-3 w-12 text-center">
                      <button
                        type="button"
                        onClick={handleToggleSelectAllLeads}
                        className={`px-2 py-0.5 rounded-[6px] text-[10px] font-medium border-2 transition-all duration-150 cursor-pointer ${
                          selectedLeadIds.length > 0 && selectedLeadIds.length === filteredLeads.length
                            ? 'border-[var(--accent)] bg-[rgba(91,141,239,0.15)] text-[var(--accent)]'
                            : 'border-[var(--border)] text-zinc-400 hover:text-white'
                        }`}
                        title="Toggle all leads"
                      >
                        {selectedLeadIds.length === filteredLeads.length ? 'All' : 'Select'}
                      </button>
                    </th>
                    <th className="py-3 px-4">Contact</th>
                    <th className="py-3 px-4">Company & Website</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Step</th>
                    <th className="py-3 px-4">Last Sent</th>
                    <th className="py-3 px-4">Next Due</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {filteredLeads.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-zinc-500">
                        No leads found. Click <strong>Import CSV</strong> or <strong>Add Lead</strong> to populate this campaign.
                      </td>
                    </tr>
                  ) : (
                    filteredLeads.map((lead) => {
                      const isMarked = selectedLeadIds.includes(lead.id);
                      return (
                        <tr
                          key={lead.id}
                          onClick={() => handleToggleSelectLead(lead.id)}
                          className={`transition-all duration-150 cursor-pointer border-l-4 ${
                            isMarked
                              ? 'border-l-[var(--accent)] bg-[rgba(91,141,239,0.08)]'
                              : 'border-l-transparent hover:bg-white/[0.02]'
                          }`}
                        >
                          {/* Smooth border selection indicator */}
                          <td className="py-3.5 px-3 text-center">
                            <span
                              className={`inline-block h-3.5 w-3.5 rounded-full border-2 transition-all duration-150 ${
                                isMarked
                                  ? 'border-[var(--accent)] bg-[var(--accent)] shadow-[0_0_0_2px_rgba(91,141,239,0.25)]'
                                  : 'border-[var(--border)] bg-transparent'
                              }`}
                            />
                          </td>

                          {/* Contact */}
                          <td className="py-3.5 px-4">
                            <div className="font-semibold text-zinc-100">
                              {lead.firstName} {lead.lastName}
                            </div>
                            <div className="text-zinc-400 text-[11px] font-mono">{lead.email}</div>
                          </td>

                          {/* Company */}
                          <td className="py-3.5 px-4">
                            <div className="text-zinc-200 font-medium">{lead.companyName}</div>
                            {lead.website ? (
                              <a
                                href={ensureValidUrl(lead.website)}
                                target="_blank"
                                rel="noreferrer"
                                className="text-indigo-400 text-[11px] hover:underline flex items-center gap-1"
                              >
                                <span>{cleanWebsiteUrl(lead.website)}</span>
                                <ExternalLink className="h-2.5 w-2.5" />
                              </a>
                            ) : (
                              <span className="text-zinc-500 text-[11px]">-</span>
                            )}
                          </td>

                          {/* Status Badge */}
                          <td className="py-3.5 px-4">
                            {lead.status === 'replied' ? (
                              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-950/60 text-emerald-400 border border-emerald-800/60">
                                Replied
                              </span>
                            ) : lead.status === 'opened' ? (
                              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-purple-950/50 text-purple-300 border border-purple-800/50">
                                Opened ({lead.openedCount})
                              </span>
                            ) : lead.status === 'outreach_sent' ? (
                              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-cyan-950/50 text-cyan-400 border border-cyan-800/50">
                                Contacted
                              </span>
                            ) : lead.status === 'completed' ? (
                              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-zinc-800 text-zinc-400 border border-zinc-700">
                                Completed
                              </span>
                            ) : (
                              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-amber-950/40 text-amber-400 border border-amber-800/40">
                                Pending Outreach
                              </span>
                            )}
                          </td>

                          {/* Step */}
                          <td className="py-3.5 px-4 text-zinc-300 font-mono">
                            Step {lead.currentStepIndex + 1}
                          </td>

                          {/* Last Sent */}
                          <td className="py-3.5 px-4 text-zinc-400">
                            {lead.lastContactedAt ? formatFullDate(lead.lastContactedAt) : 'Not sent yet'}
                          </td>

                          {/* Next Due */}
                          <td className="py-3.5 px-4 text-zinc-400">
                            {lead.status === 'replied' ? (
                              <span className="text-emerald-400">Stopped (replied)</span>
                            ) : lead.nextFollowUpAt ? (
                              <span className={lead.nextFollowUpAt <= Date.now() ? 'text-amber-400 font-semibold' : ''}>
                                {formatFullDate(lead.nextFollowUpAt)}
                              </span>
                            ) : (
                              '—'
                            )}
                          </td>

                          {/* Actions */}
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5 opacity-90 group-hover:opacity-100">
                              {/* Open Thread */}
                              <button
                                onClick={() => setSelectedThreadLead(lead)}
                                className="p-1.5 rounded-lg bg-[#19223a] hover:bg-[#202b4a] text-zinc-300 hover:text-white transition-colors cursor-pointer"
                                title="View Conversation Thread"
                              >
                                <Eye className="h-3.5 w-3.5" />
                              </button>

                              {/* Manual Send */}
                              {lead.status === 'ready_for_outreach' && (
                                <button
                                  onClick={() => {
                                    dispatchCampaignLeadOutreach(campaign.id, lead.id);
                                    showFeedback(`Outreach sent to ${lead.firstName}`);
                                  }}
                                  className="p-1.5 rounded-lg bg-indigo-600/30 hover:bg-indigo-600 text-indigo-300 hover:text-white transition-colors cursor-pointer"
                                  title="Send Outreach Now"
                                >
                                  <Send className="h-3.5 w-3.5" />
                                </button>
                              )}

                              {/* Delete */}
                              <button
                                onClick={() => {
                                  deleteCampaignLead(campaign.id, lead.id);
                                  showFeedback(`Removed ${lead.firstName} from campaign`);
                                }}
                                className="p-1.5 rounded-lg hover:bg-rose-950/60 text-zinc-500 hover:text-rose-400 transition-colors cursor-pointer"
                                title="Delete lead"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 3. SEQUENCES TAB (Signature Instantly Sequence Builder) */}
      {activeTab === 'sequences' && (
        <div className="space-y-6 animate-fade-in max-w-4xl mx-auto">
          {/* Header info */}
          <div className="flex items-center justify-between pb-2">
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">Outreach Sequence Builder</h2>
              <p className="text-xs text-zinc-400 mt-0.5">
                Multi-step sequence with automatic personalization variables and conditional follow-ups.
              </p>
            </div>

            <button
              onClick={handleAddStep}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-md shadow-indigo-600/30 transition-all cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span>Add Step</span>
            </button>
          </div>

          {/* Sequence Steps */}
          <div className="space-y-5">
            {campaign.sequenceSteps.map((step, index) => {
              const isInitial = step.stepNumber === 1;

              return (
                <div key={step.id} className="relative space-y-4">
                  {/* Delay Connector if not step 1 */}
                  {!isInitial && (
                    <div className="flex items-center justify-center -my-2 relative z-10">
                      <div className="bg-[#12182b] border border-[#222d4a] rounded-full px-4 py-1.5 flex items-center gap-2 shadow-lg">
                        <Clock className="h-3.5 w-3.5 text-indigo-400" />
                        <span className="text-xs text-zinc-300">Wait</span>
                        <input
                          type="number"
                          min={1}
                          max={30}
                          value={step.delayAmount}
                          onChange={(e) =>
                            handleUpdateStep(step.id, { delayAmount: Math.max(1, Number(e.target.value)) })
                          }
                          className="w-12 px-1.5 py-0.5 rounded bg-[#090d16] border border-[#232e4d] text-center text-xs font-bold text-white focus:outline-none"
                        />
                        <select
                          value={step.delayUnit}
                          onChange={(e) =>
                            handleUpdateStep(step.id, { delayUnit: e.target.value as any })
                          }
                          className="px-1.5 py-0.5 rounded bg-[#090d16] border border-[#232e4d] text-xs text-zinc-300 focus:outline-none"
                        >
                          <option value="minutes">Minutes</option>
                          <option value="hours">Hours</option>
                          <option value="days">Days</option>
                        </select>
                        <span className="text-xs text-zinc-400">then send if no reply</span>
                      </div>
                    </div>
                  )}

                  {/* Step Editor Card */}
                  <div className="bg-[#0f1423] border border-[#1d263f] rounded-2xl p-5 space-y-4 shadow-xl">
                    {/* Step Card Header */}
                    <div className="flex items-center justify-between pb-3 border-b border-[#182037]">
                      <div className="flex items-center gap-2.5">
                        <span className="px-2.5 py-1 rounded-lg bg-indigo-600/20 text-indigo-300 font-bold text-xs border border-indigo-500/30">
                          Step {step.stepNumber}
                        </span>
                        <span className="font-semibold text-sm text-white">
                          {isInitial ? 'Initial Cold Email' : `Follow-up #${step.stepNumber - 1}`}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        {/* Preview button */}
                        <button
                          onClick={() => setPreviewStep(step)}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#151c2e] hover:bg-[#1c253d] text-zinc-300 hover:text-white text-xs transition-colors cursor-pointer"
                        >
                          <Eye className="h-3 w-3 text-indigo-400" />
                          <span>Preview</span>
                        </button>

                        {/* Remove step button (if > 1 step) */}
                        {campaign.sequenceSteps.length > 1 && (
                          <button
                            onClick={() => handleRemoveStep(step.id)}
                            className="p-1.5 rounded-lg hover:bg-rose-950/60 text-zinc-500 hover:text-rose-400 transition-colors cursor-pointer"
                            title="Remove step"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Subject Line Input */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
                          {isInitial ? 'EMAIL SUBJECT' : 'SUBJECT (LEAVE EMPTY TO SEND IN SAME THREAD)'}
                        </label>
                      </div>
                      <input
                        type="text"
                        placeholder={isInitial ? 'Quick question about {{companyName}}' : 'Re: {{subject}}'}
                        value={step.subject}
                        onChange={(e) => handleUpdateStep(step.id, { subject: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-[#090d16] border border-[#1b233a] text-xs text-white font-medium focus:outline-none focus:border-indigo-500 transition-colors"
                      />
                    </div>

                    {/* Quick Variables Toolbar */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
                          EMAIL BODY
                        </label>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[10px] text-zinc-500 font-mono">Insert variable:</span>
                          {VARIABLE_TAGS.map((v) => (
                            <button
                              key={v.tag}
                              type="button"
                              onClick={() => handleInsertVariable(step.id, 'body', v.tag)}
                              className="px-2 py-0.5 rounded-md bg-[#161e32] hover:bg-indigo-600/30 text-indigo-300 text-[10px] font-mono border border-[#232e4d] hover:border-indigo-500/50 transition-colors cursor-pointer"
                            >
                              {v.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Textarea for Body */}
                      <textarea
                        rows={7}
                        value={step.body}
                        onChange={(e) => handleUpdateStep(step.id, { body: e.target.value })}
                        className="w-full px-3.5 py-3 rounded-xl bg-[#090d16] border border-[#1b233a] text-xs text-zinc-200 font-sans leading-relaxed focus:outline-none focus:border-indigo-500 transition-colors"
                        placeholder="Write your cold outreach email copy here..."
                      />
                    </div>

                    {/* Trigger Condition (for follow ups) */}
                    {!isInitial && (
                      <div className="flex items-center justify-between pt-2 border-t border-[#161d31] text-xs text-zinc-400">
                        <span>Trigger Condition:</span>
                        <select
                          value={step.triggerCondition}
                          onChange={(e) =>
                            handleUpdateStep(step.id, { triggerCondition: e.target.value as any })
                          }
                          className="px-2.5 py-1 rounded-lg bg-[#090d16] border border-[#1b233a] text-xs text-zinc-200 focus:outline-none"
                        >
                          <option value="no_reply">Send only if lead hasn't replied (Default)</option>
                          <option value="opened_no_reply">Send only if lead opened email & hasn't replied</option>
                          <option value="always">Send regardless of replies</option>
                        </select>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Add Step Bottom Button */}
          <button
            onClick={handleAddStep}
            className="w-full py-3.5 rounded-2xl border-2 border-dashed border-[#1f2a46] hover:border-indigo-500/50 hover:bg-[#101626] text-zinc-400 hover:text-indigo-300 text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>Add Next Follow-up Step</span>
          </button>
        </div>
      )}

      {/* 4. SCHEDULE TAB (Instantly Scheduling Window) */}
      {activeTab === 'schedule' && (
        <div className="space-y-6 animate-fade-in max-w-4xl mx-auto">
          <div className="bg-[#0f1423] border border-[#1d263f] rounded-2xl p-6 space-y-6 shadow-xl">
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">Campaign Sending Schedule</h2>
              <p className="text-xs text-zinc-400 mt-0.5">
                Configure sending windows, daily throttling limits, and active working days to ensure high deliverability.
              </p>
            </div>

            {/* Real-time Status Card */}
            <div
              className={`p-4 rounded-xl border flex items-center justify-between gap-4 ${
                isInsideWindow
                  ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-300'
                  : 'bg-amber-950/40 border-amber-800/60 text-amber-300'
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`h-3 w-3 rounded-full ${
                    isInsideWindow ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
                  }`}
                />
                <div>
                  <p className="font-bold text-xs">
                    {isInsideWindow ? 'Sending Window is ACTIVE' : 'Outside Scheduled Window (Paused)'}
                  </p>
                  <p className="text-[11px] opacity-80 mt-0.5">
                    {isInsideWindow
                      ? 'Emails are currently eligible to be throttled and dispatched automatically.'
                      : `Sending will resume during your window (${campaign.scheduleWindow.startTime} to ${campaign.scheduleWindow.endTime}).`}
                  </p>
                </div>
              </div>
            </div>

            {/* Active Days of the Week */}
            <div className="space-y-2">
              <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
                ACTIVE SENDING DAYS
              </label>
              <div className="grid grid-cols-7 gap-2">
                {DAYS_OF_WEEK.map((d) => {
                  const isActive = (campaign.scheduleWindow.daysOfWeek || [1, 2, 3, 4, 5]).includes(d.day);
                  return (
                    <button
                      key={d.day}
                      type="button"
                      onClick={() => {
                        const currentDays = campaign.scheduleWindow.daysOfWeek || [1, 2, 3, 4, 5];
                        const nextDays = isActive
                          ? currentDays.filter((x) => x !== d.day)
                          : [...currentDays, d.day];
                        updateCampaign(campaign.id, {
                          scheduleWindow: { ...campaign.scheduleWindow, daysOfWeek: nextDays },
                        });
                      }}
                      className={`py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        isActive
                          ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                          : 'bg-[#090d16] text-zinc-500 border border-[#1b233a] hover:text-zinc-300'
                      }`}
                    >
                      {d.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Time Window Selectors */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider block mb-1.5">
                  WINDOW START TIME
                </label>
                <input
                  type="time"
                  value={campaign.scheduleWindow.startTime || '08:00'}
                  onChange={(e) =>
                    updateCampaign(campaign.id, {
                      scheduleWindow: { ...campaign.scheduleWindow, startTime: e.target.value },
                    })
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#090d16] border border-[#1b233a] text-xs text-white font-mono focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider block mb-1.5">
                  WINDOW END TIME
                </label>
                <input
                  type="time"
                  value={campaign.scheduleWindow.endTime || '22:00'}
                  onChange={(e) =>
                    updateCampaign(campaign.id, {
                      scheduleWindow: { ...campaign.scheduleWindow, endTime: e.target.value },
                    })
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#090d16] border border-[#1b233a] text-xs text-white font-mono focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            {/* Timezone & Limits */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-[#182037]">
              <div>
                <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider block mb-1.5">
                  CAMPAIGN TIMEZONE
                </label>
                <select
                  value={campaign.scheduleWindow.timezone || 'Asia/Dhaka'}
                  onChange={(e) =>
                    updateCampaign(campaign.id, {
                      scheduleWindow: { ...campaign.scheduleWindow, timezone: e.target.value },
                    })
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#090d16] border border-[#1b233a] text-xs text-zinc-200 focus:outline-none focus:border-indigo-500"
                >
                  <option value="Asia/Dhaka">Asia/Dhaka (GMT+6)</option>
                  <option value="America/New_York">Eastern Time (US & Canada)</option>
                  <option value="America/Chicago">Central Time (US & Canada)</option>
                  <option value="America/Los_Angeles">Pacific Time (US & Canada)</option>
                  <option value="Europe/London">London (GMT)</option>
                  <option value="Europe/Paris">Paris, Berlin (CET)</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider block mb-1.5">
                  MAX EMAILS PER DAY (DAILY LIMIT)
                </label>
                <input
                  type="number"
                  min={1}
                  max={500}
                  value={campaign.dailyLimit}
                  onChange={(e) =>
                    updateCampaign(campaign.id, { dailyLimit: Math.max(1, Number(e.target.value)) })
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#090d16] border border-[#1b233a] text-xs text-white font-mono focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 5. SETTING TAB (Campaign Settings, Mailbox Rotation & Delays) */}
      {activeTab === 'options' && (
        <div className="space-y-6 animate-fade-in max-w-4xl mx-auto">
          <div className="bg-[#0f1423] border border-[#1d263f] rounded-2xl p-6 space-y-6 shadow-xl">
            <div>
              <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                <Settings className="h-4 w-4 text-indigo-400" />
                <span>Campaign Settings</span>
              </h2>
              <p className="text-xs text-zinc-400 mt-0.5">
                Configure auto-swapping sender mailboxes, rotation delay cooldown timers, and deliverability rules.
              </p>
            </div>

            {/* Multi-Sender Mailbox Auto-Swap Selector with Dropdown */}
            <div className="space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider block">
                    ASSIGNED SENDER MAILBOXES (AUTO-SWAPPING)
                  </label>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    Click to add email accounts from the dropdown. Outreach and follow-ups rotate automatically.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-indigo-400 font-semibold px-2.5 py-1 rounded-full bg-indigo-600/10 border border-indigo-500/30">
                    {assignedAccounts.length} {assignedAccounts.length === 1 ? 'Mailbox Active' : 'Mailboxes Active'}
                  </span>
                </div>
              </div>

              {/* Dropdown to add email accounts */}
              <div className="relative" ref={accountDropdownRef}>
                <button
                  type="button"
                  onClick={() => setIsAccountDropdownOpen((prev) => !prev)}
                  className="w-full flex items-center justify-between p-3 rounded-xl bg-[#090d16] border border-[#232f4e] hover:border-indigo-500 text-xs text-zinc-300 font-medium transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <Plus className="h-4 w-4 text-indigo-400" />
                    <span className="text-white font-medium">Add email account to rotation...</span>
                  </div>
                  <ChevronDown className={`h-4 w-4 text-zinc-400 transition-transform ${isAccountDropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {/* Dropdown Menu */}
                {isAccountDropdownOpen && (
                  <div className="absolute top-full left-0 right-0 mt-1.5 z-30 p-2 rounded-xl bg-[#0e1424] border border-[#232f4e] shadow-2xl space-y-1 max-h-64 overflow-y-auto no-scrollbar animate-fade-in">
                    <div className="px-2 py-1 text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">
                      Click an email to add or remove:
                    </div>
                    {accounts.map((acc) => {
                      const isAssigned = (campaign.assignedAccountIds || [campaign.assignedAccountId]).includes(acc.id);
                      return (
                        <div
                          key={acc.id}
                          onClick={() => {
                            const current = campaign.assignedAccountIds || [campaign.assignedAccountId];
                            let updated: string[];
                            if (isAssigned) {
                              if (current.length === 1) {
                                showFeedback('At least one sender mailbox must remain active.', 'info');
                                return;
                              }
                              updated = current.filter((id) => id !== acc.id);
                              showFeedback(`Removed ${acc.email} from campaign`);
                            } else {
                              updated = [...current, acc.id];
                              showFeedback(`Added ${acc.email} to campaign rotation`);
                            }
                            updateCampaign(campaign.id, {
                              assignedAccountIds: updated,
                              assignedAccountId: updated[0] || campaign.assignedAccountId,
                            });
                          }}
                          className={`flex items-center justify-between p-2.5 rounded-lg text-xs transition-all duration-150 cursor-pointer border-2 ${
                            isAssigned
                              ? 'bg-[rgba(91,141,239,0.08)] text-white border-[var(--accent)] shadow-[0_0_0_1px_rgba(91,141,239,0.2)]'
                              : 'text-zinc-300 hover:text-white border-[var(--border)] hover:border-[var(--text-secondary)]/50'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            {acc.avatar && acc.avatar.trim() !== '' ? (
                              <div className="relative shrink-0">
                                <img
                                  src={acc.avatar}
                                  alt={acc.senderName}
                                  className="h-7 w-7 rounded-lg object-cover border border-[#232f50]"
                                />
                                <div
                                  className="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full border border-[#0e1424]"
                                  style={{ backgroundColor: acc.color }}
                                />
                              </div>
                            ) : (
                              <div
                                className="h-7 w-7 rounded-lg flex items-center justify-center font-bold text-[10px] text-white shadow-sm shrink-0 border border-white/10"
                                style={{ backgroundColor: acc.color }}
                              >
                                {acc.senderName ? acc.senderName.slice(0, 2).toUpperCase() : acc.email.slice(0, 2).toUpperCase()}
                              </div>
                            )}
                            <div>
                              <div className="font-semibold text-xs text-white">{acc.senderName}</div>
                              <div className="text-[11px] text-zinc-400">{acc.email}</div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-zinc-400 font-mono">
                              Warmup: {acc.warmupScore}%
                            </span>
                            {isAssigned ? (
                              <span className="text-[11px] text-[var(--accent)] font-semibold px-2 py-0.5 rounded-md bg-[rgba(91,141,239,0.12)] border border-[var(--accent)]">
                                <span>Selected</span>
                              </span>
                            ) : (
                              <span className="flex items-center gap-1 text-[11px] text-zinc-400 font-semibold px-2 py-0.5 rounded-md border border-[var(--border)] hover:text-white">
                                <Plus className="h-3 w-3" />
                                <span>Add</span>
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Added Accounts List */}
              <div className="space-y-2 pt-1">
                {assignedAccounts.map((acc, idx) => {
                  const cooldownUntil = accountNextAllowedSendTime[acc.id] || 0;
                  const isCoolingDown = cooldownUntil > currentTime;
                  const remainingSeconds = Math.max(0, Math.ceil((cooldownUntil - currentTime) / 1000));
                  const remainingMinutes = Math.floor(remainingSeconds / 60);
                  const remainingSec = remainingSeconds % 60;

                  return (
                    <div
                      key={acc.id}
                      className="p-3 rounded-xl bg-[#090d16] border border-[#1b233a] flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-6 w-6 rounded-lg bg-[#141b30] border border-[#232f50] flex items-center justify-center font-mono font-bold text-indigo-400 text-xs">
                          {idx + 1}
                        </div>
                        {acc.avatar && acc.avatar.trim() !== '' ? (
                          <div className="relative shrink-0">
                            <img
                              src={acc.avatar}
                              alt={acc.senderName}
                              className="h-8 w-8 rounded-lg object-cover border border-[#232f50]"
                            />
                            <div
                              className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border border-[#090d16]"
                              style={{ backgroundColor: acc.color }}
                            />
                          </div>
                        ) : (
                          <div
                            className="h-8 w-8 rounded-lg flex items-center justify-center font-bold text-xs text-white shadow-sm shrink-0 border border-white/10"
                            style={{ backgroundColor: acc.color }}
                          >
                            {acc.senderName ? acc.senderName.slice(0, 2).toUpperCase() : acc.email.slice(0, 2).toUpperCase()}
                          </div>
                        )}
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-white">{acc.senderName}</span>
                            <span className="text-zinc-400 font-mono text-[11px]">({acc.email})</span>
                          </div>
                          <div className="flex items-center gap-2 text-[10px] text-zinc-400 mt-0.5">
                            <span className="text-emerald-400 font-medium">Warmup: {acc.warmupScore}%</span>
                            <span>•</span>
                            <span>{acc.sentToday} / {acc.dailyLimit} sent today</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2.5">
                        {isCoolingDown ? (
                          <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-[11px] text-amber-300 font-medium">
                            <Clock className="h-3 w-3 animate-spin" />
                            <span>Cooldown: {remainingMinutes}m {remainingSec}s left</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-[11px] text-emerald-400 font-medium">
                            <CheckCircle2 className="h-3 w-3" />
                            <span>Ready to Send</span>
                          </div>
                        )}

                        <button
                          type="button"
                          onClick={() => {
                            const current = campaign.assignedAccountIds || [campaign.assignedAccountId];
                            if (current.length === 1) {
                              showFeedback('At least one sender mailbox must remain active.', 'info');
                              return;
                            }
                            const updated = current.filter((id) => id !== acc.id);
                            updateCampaign(campaign.id, {
                              assignedAccountIds: updated,
                              assignedAccountId: updated[0] || campaign.assignedAccountId,
                            });
                            showFeedback(`Removed ${acc.email} from rotation`);
                          }}
                          className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                          title="Remove from campaign"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Live Rotation Queue Preview */}
              {assignedAccounts.length > 0 && (
                <div className="p-3 rounded-xl bg-[#090d18] border border-[#172038] text-xs space-y-1.5">
                  <div className="flex items-center gap-1.5 text-zinc-300 font-semibold text-[11px] uppercase tracking-wider">
                    <Repeat className="h-3.5 w-3.5 text-indigo-400" />
                    <span>Active Mailbox Auto-Rotation Queue</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs flex-wrap">
                    {assignedAccounts.map((acc, i) => (
                      <React.Fragment key={acc.id}>
                        <span className="px-2.5 py-1 rounded-lg bg-[#141b30] border border-[#232f50] text-zinc-200 font-mono text-[11px] flex items-center gap-1.5">
                          <span className="text-indigo-400 font-bold">{i + 1}.</span>
                          <span>{acc.email}</span>
                        </span>
                        {i < assignedAccounts.length - 1 && (
                          <span className="text-zinc-600 font-bold">➔</span>
                        )}
                      </React.Fragment>
                    ))}
                    <span className="text-zinc-500 text-[11px] italic">➔ (Cycles back with random timer)</span>
                  </div>
                </div>
              )}
            </div>

            {/* Configurable Random Delay Settings */}
            <div className="space-y-3 pt-3 border-t border-[#182037]">
              <div>
                <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider block">
                  PER-ACCOUNT ROTATION DELAY TIMER
                </label>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Different accounts send immediately with zero delay. When returning to an account that previously sent, a random timer within this range will be applied.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="bg-[#090d16] border border-[#1b233a] p-3.5 rounded-xl space-y-1.5">
                  <label className="text-[11px] font-semibold text-zinc-300">Minimum Delay (Minutes)</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={1}
                      max={60}
                      value={campaign.minDelayMinutes ?? 2}
                      onChange={(e) => {
                        const val = Math.max(1, Number(e.target.value));
                        updateCampaign(campaign.id, { minDelayMinutes: val });
                      }}
                      className="w-full px-3 py-1.5 rounded-lg bg-[#111728] border border-[#243050] text-sm text-white font-mono focus:outline-none focus:border-indigo-500"
                    />
                    <span className="text-xs text-zinc-400 font-medium">min</span>
                  </div>
                </div>

                <div className="bg-[#090d16] border border-[#1b233a] p-3.5 rounded-xl space-y-1.5">
                  <label className="text-[11px] font-semibold text-zinc-300">Maximum Delay (Minutes)</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={1}
                      max={120}
                      value={campaign.maxDelayMinutes ?? 5}
                      onChange={(e) => {
                        const val = Math.max(1, Number(e.target.value));
                        updateCampaign(campaign.id, { maxDelayMinutes: val });
                      }}
                      className="w-full px-3 py-1.5 rounded-lg bg-[#111728] border border-[#243050] text-sm text-white font-mono focus:outline-none focus:border-indigo-500"
                    />
                    <span className="text-xs text-zinc-400 font-medium">min</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Deliverability & Safety Rules (Applied Automatically) */}
            <div className="space-y-2.5 pt-3 border-t border-[#182037]">
              <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider block">
                AUTOMATIC DELIVERABILITY & SAFETY RULES
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2.5">
                <div className="p-3 rounded-xl bg-[#090d18] border border-[#172038] flex items-start gap-2.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-semibold text-white">Stop Sequence on Reply</p>
                    <p className="text-[11px] text-zinc-400 mt-0.5">
                      Applied automatically. Follow-ups immediately cease when a lead responds.
                    </p>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-[#090d18] border border-[#172038] flex items-start gap-2.5">
                  <CheckCircle2 className="h-4 w-4 text-indigo-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-semibold text-white">Track Open Rates</p>
                    <p className="text-[11px] text-zinc-400 mt-0.5">
                      Applied automatically via invisible 1x1 tracking pixel to monitor recipient opens.
                    </p>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-[#090d18] border border-[#172038] flex items-start gap-2.5">
                  <CheckCircle2 className="h-4 w-4 text-cyan-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-semibold text-white">10s Anti-Bot Scanner Filter</p>
                    <p className="text-[11px] text-zinc-400 mt-0.5">
                      Applied automatically. Pixel hits within 10s of delivery are identified as scanner pre-fetches and discarded.
                    </p>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-[#090d18] border border-[#172038] flex items-start gap-2.5">
                  <CheckCircle2 className="h-4 w-4 text-purple-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-semibold text-white">Track Link Clicks</p>
                    <p className="text-[11px] text-zinc-400 mt-0.5">
                      Applied automatically to monitor link engagement throughout your sequence.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Campaign Actions / Danger Zone */}
            <div className="space-y-3 pt-4 border-t border-[#182037]">
              <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Campaign Actions</h3>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    const clonedId = duplicateCampaign(campaign.id);
                    if (clonedId) {
                      showFeedback('Campaign cloned successfully');
                    }
                  }}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#141b2e] hover:bg-[#1a233b] border border-[#232e4d] text-zinc-200 text-xs font-semibold cursor-pointer"
                >
                  <Copy className="h-3.5 w-3.5" />
                  <span>Duplicate Campaign</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (confirm(`Are you sure you want to delete campaign "${campaign.name}"?`)) {
                      deleteCampaign(campaign.id);
                      onBack();
                    }
                  }}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-950/40 hover:bg-rose-950/70 border border-rose-800/60 text-rose-300 text-xs font-semibold cursor-pointer"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>Delete Campaign</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CSV Lead Import Modal */}
      {isImportModalOpen && (
        <ImportLeadsModal
          campaignId={campaign.id}
          onClose={() => setIsImportModalOpen(false)}
          onImported={(count) => {
            setIsImportModalOpen(false);
            showFeedback(`Successfully imported ${count} leads into ${campaign.name}`);
          }}
        />
      )}

      {/* Single Add Lead Modal */}
      {isAddLeadModalOpen && (
        <AddLeadModal
          campaignId={campaign.id}
          onClose={() => setIsAddLeadModalOpen(false)}
          onAdded={() => {
            setIsAddLeadModalOpen(false);
            showFeedback('New lead added to campaign');
          }}
        />
      )}

      {/* View Lead Thread Modal */}
      {selectedThreadLead && (
        <ThreadModal
          lead={selectedThreadLead}
          onClose={() => setSelectedThreadLead(null)}
        />
      )}

      {/* Email Preview Modal */}
      {previewStep && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0f1423] border border-[#212b48] rounded-2xl w-full max-w-lg p-5 space-y-4 shadow-2xl animate-scale-in">
            <div className="flex items-center justify-between pb-3 border-b border-[#1b233a]">
              <div>
                <h3 className="text-sm font-bold text-white">Email Preview with Sample Lead</h3>
                <p className="text-[11px] text-zinc-400">
                  Showing Step #{previewStep.stepNumber} with personalized tokens replaced
                </p>
              </div>
              <button
                onClick={() => setPreviewStep(null)}
                className="text-zinc-400 hover:text-white p-1"
              >
                ✕
              </button>
            </div>

            {/* Sample lead info banner */}
            <div className="p-2.5 rounded-xl bg-[#090d16] border border-[#1a233b] text-[11px] text-zinc-400 flex items-center justify-between">
              <span>Sample Lead: <strong>Marcus Chen</strong> (Stripe Ecosystem)</span>
              <span>Account: <strong>{assignedAccount.senderName}</strong></span>
            </div>

            {/* Rendered Subject */}
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-zinc-500 uppercase">SUBJECT:</span>
              <p className="text-xs font-semibold text-white p-2.5 rounded-lg bg-[#090d16] border border-[#1a233b]">
                {renderTemplate(previewStep.subject, campaign.leads[0], assignedAccount)}
              </p>
            </div>

            {/* Rendered Body */}
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-zinc-500 uppercase">BODY:</span>
              <div className="p-3.5 rounded-lg bg-[#090d16] border border-[#1a233b] text-xs text-zinc-200 whitespace-pre-wrap leading-relaxed max-h-60 overflow-y-auto">
                {renderTemplate(previewStep.body, campaign.leads[0], assignedAccount)}
              </div>
            </div>

            <button
              onClick={() => setPreviewStep(null)}
              className="w-full py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-colors"
            >
              Close Preview
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
