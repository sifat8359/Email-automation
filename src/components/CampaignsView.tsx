import React, { useState } from 'react';
import {
  Rocket,
  Play,
  Pause,
  Plus,
  Users,
  Send,
  MessageSquare,
  Clock,
  Trash2,
  Copy,
  ExternalLink,
  ChevronRight,
  Sparkles,
  Search,
  Filter,
  BarChart3,
  Calendar,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Campaign } from '../types';
import { CampaignDetailView } from './CampaignDetailView';

interface CampaignsViewProps {
  onNavigateToBuilder: (campaignId?: string) => void;
  onNavigateToInbox: () => void;
  initialCampaignId?: string | null;
}

export const CampaignsView: React.FC<CampaignsViewProps> = ({
  onNavigateToBuilder,
  onNavigateToInbox,
  initialCampaignId,
}) => {
  const {
    campaigns,
    accounts,
    createCampaign,
    toggleCampaignStatus,
    deleteCampaign,
    deleteMarkedCampaigns,
    clearMockData,
    loadSampleMockData,
    duplicateCampaign,
  } = useApp();

  const [activeCampaignDetailId, setActiveCampaignDetailId] = useState<string | null>(
    initialCampaignId || null
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'paused'>('all');
  const [selectedCampaignIds, setSelectedCampaignIds] = useState<string[]>([]);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleToggleSelectCampaign = (id: string) => {
    setSelectedCampaignIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleToggleSelectAllCampaigns = () => {
    if (selectedCampaignIds.length === filteredCampaigns.length && filteredCampaigns.length > 0) {
      setSelectedCampaignIds([]);
    } else {
      setSelectedCampaignIds(filteredCampaigns.map((c) => c.id));
    }
  };

  const handleRemoveMarkedCampaigns = () => {
    if (selectedCampaignIds.length === 0) return;
    const count = selectedCampaignIds.length;
    deleteMarkedCampaigns(selectedCampaignIds);
    setSelectedCampaignIds([]);
    showToast(`Removed ${count} marked ${count === 1 ? 'campaign' : 'campaigns'}`);
  };

  const handleClearMockData = () => {
    clearMockData();
    setSelectedCampaignIds([]);
    showToast('All sample/mock campaigns and leads have been removed.');
  };

  // If a campaign is open in 5-tab view, render CampaignDetailView!
  if (activeCampaignDetailId) {
    return (
      <CampaignDetailView
        campaignId={activeCampaignDetailId}
        onBack={() => setActiveCampaignDetailId(null)}
        onNavigateToInbox={onNavigateToInbox}
      />
    );
  }

  // Filter campaigns
  const filteredCampaigns = campaigns.filter((c) => {
    if (statusFilter !== 'all' && c.status !== statusFilter) return false;
    if (searchQuery.trim()) {
      return c.name.toLowerCase().includes(searchQuery.toLowerCase());
    }
    return true;
  });

  // KPI Calculations
  const totalCampaigns = campaigns.length;
  const activeCount = campaigns.filter((c) => c.status === 'active').length;
  const totalLeads = campaigns.reduce((acc, c) => acc + c.leads.length, 0);
  const totalSent = campaigns.reduce((acc, c) => acc + c.stats.sent, 0);
  const totalReplies = campaigns.reduce((acc, c) => acc + c.stats.replied, 0);
  const avgReplyRate = totalSent > 0 ? ((totalReplies / totalSent) * 100).toFixed(1) : '0';

  const handleCreateNewCampaign = () => {
    const newId = createCampaign({
      name: `Q4 Inbound Scale #${campaigns.length + 1}`,
      status: 'active',
      assignedAccountId: accounts[0]?.id || '',
      scheduleWindow: {
        startTime: '08:00',
        endTime: '22:00',
        timezone: 'Asia/Dhaka',
        daysOfWeek: [1, 2, 3, 4, 5],
      },
      minDelayMinutes: 2,
      maxDelayMinutes: 5,
      dailyLimit: 50,
      sequenceSteps: [
        {
          id: `step-${Date.now()}-1`,
          stepNumber: 1,
          type: 'initial_outreach',
          delayAmount: 0,
          delayUnit: 'minutes',
          subject: 'Quick question about {{companyName}}',
          body: `Hi {{firstName}},\n\nI came across {{companyName}} via {{website}} and loved your team's expansion.\n\nAre you currently exploring automated outbound channels to scale customer acquisition this quarter?\n\nBest,\n{{senderName}}`,
          triggerCondition: 'always',
        },
        {
          id: `step-${Date.now()}-2`,
          stepNumber: 2,
          type: 'auto_followup',
          delayAmount: 2,
          delayUnit: 'days',
          subject: 'Re: Quick question about {{companyName}}',
          body: `Hi {{firstName}},\n\nFollowing up briefly on my previous note. Would you be open to a 10-minute chat this Thursday?\n\nBest,\n{{senderName}}`,
          triggerCondition: 'no_reply',
        },
      ],
      leads: [],
      options: {
        stopOnReply: true,
        stopOnLinkClick: false,
        trackOpens: true,
        trackClicks: true,
        customUnsubscribeText: 'Reply STOP to unsubscribe.',
      },
    });

    setActiveCampaignDetailId(newId);
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-7xl mx-auto pb-16">
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Campaigns</h1>
          <p className="text-xs text-zinc-400 mt-1">
            Instantly automated cold outreach campaigns, multi-step sequences, and sending schedules.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {campaigns.length > 0 ? (
            <button
              onClick={handleClearMockData}
              className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-[#141b2e] hover:bg-rose-950/60 border border-[#232e4d] hover:border-rose-800 text-zinc-400 hover:text-rose-300 text-xs font-semibold transition-colors cursor-pointer"
              title="Remove all mock/sample campaigns and leads"
            >
              <Trash2 className="h-4 w-4" />
              <span>Remove Mock Items</span>
            </button>
          ) : (
            <button
              onClick={() => {
                loadSampleMockData();
                showToast('Sample demo campaigns restored');
              }}
              className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/40 text-indigo-300 text-xs font-semibold transition-colors cursor-pointer"
              title="Restore demo sample campaigns and leads"
            >
              <Sparkles className="h-4 w-4" />
              <span>Load Sample Data</span>
            </button>
          )}

          <button
            onClick={handleCreateNewCampaign}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-lg shadow-indigo-600/30 transition-all cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>New Campaign</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        <div className="bg-[#0f1423] border border-[#1b233a] rounded-2xl p-4 flex flex-col justify-between shadow-lg">
          <div className="flex items-center justify-between text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
            <span>ACTIVE CAMPAIGNS</span>
            <Rocket className="h-4 w-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-extrabold text-white mt-2">
            {activeCount} <span className="text-xs font-normal text-zinc-500">/ {totalCampaigns} total</span>
          </div>
        </div>

        <div className="bg-[#0f1423] border border-[#1b233a] rounded-2xl p-4 flex flex-col justify-between shadow-lg">
          <div className="flex items-center justify-between text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
            <span>TOTAL LEADS</span>
            <Users className="h-4 w-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-extrabold text-white mt-2">{totalLeads}</div>
        </div>

        <div className="bg-[#0f1423] border border-[#1b233a] rounded-2xl p-4 flex flex-col justify-between shadow-lg">
          <div className="flex items-center justify-between text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
            <span>EMAILS CONTACTED</span>
            <Send className="h-4 w-4 text-purple-400" />
          </div>
          <div className="text-2xl font-extrabold text-white mt-2">{totalSent}</div>
        </div>

        <div className="bg-[#0f1423] border border-[#1b233a] rounded-2xl p-4 flex flex-col justify-between shadow-lg">
          <div className="flex items-center justify-between text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
            <span>AVG. REPLY RATE</span>
            <MessageSquare className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-extrabold text-emerald-400 mt-2">{avgReplyRate}%</div>
        </div>
      </div>

      {/* Campaign List Control Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#0f1423] border border-[#1b233a] p-3 rounded-2xl shadow-xl">
        <div className="flex items-center gap-2 flex-1 max-w-md">
          <div className="relative flex-1">
            <Search className="h-3.5 w-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Filter campaigns by name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-[#090d16] border border-[#1c243d] text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="flex items-center bg-[#090d16] border border-[#1c243d] rounded-xl p-0.5">
            {[
              { id: 'all', label: 'All' },
              { id: 'active', label: 'Active' },
              { id: 'paused', label: 'Paused' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id as any)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  statusFilter === tab.id
                    ? 'bg-indigo-600 text-white'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Master checkbox & count */}
          {filteredCampaigns.length > 0 && (
            <div className="flex items-center gap-2 px-2 py-1 bg-[#090d16] border border-[#1c243d] rounded-xl text-xs text-zinc-400">
              <input
                type="checkbox"
                checked={selectedCampaignIds.length > 0 && selectedCampaignIds.length === filteredCampaigns.length}
                onChange={handleToggleSelectAllCampaigns}
                className="h-4 w-4 rounded border-[#243050] bg-[#0c101d] text-indigo-600 focus:ring-0 focus:ring-offset-0 cursor-pointer accent-indigo-600"
                title="Mark all campaigns"
              />
              <span className="text-[11px] font-medium hidden sm:inline">Mark All</span>
            </div>
          )}
        </div>

        <span className="text-xs text-zinc-500 self-center">
          Showing {filteredCampaigns.length} of {campaigns.length} campaigns
        </span>
      </div>

      {/* Marked Items Action Banner */}
      {selectedCampaignIds.length > 0 && (
        <div className="flex items-center justify-between p-3.5 rounded-2xl bg-indigo-950/60 border border-indigo-500/40 text-xs shadow-xl animate-fade-in">
          <div className="flex items-center gap-3">
            <div className="h-6 w-6 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-xs shadow-sm">
              {selectedCampaignIds.length}
            </div>
            <div>
              <p className="font-semibold text-white">
                {selectedCampaignIds.length} {selectedCampaignIds.length === 1 ? 'item marked' : 'items marked'}
              </p>
              <p className="text-[11px] text-zinc-400">
                Selected cold outreach campaigns
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleRemoveMarkedCampaigns}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs shadow-md shadow-rose-600/30 transition-all cursor-pointer"
              title="Remove marked campaigns"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>Remove Marked Items ({selectedCampaignIds.length})</span>
            </button>
            <button
              onClick={() => setSelectedCampaignIds([])}
              className="px-3 py-1.5 rounded-xl bg-[#141b2c] hover:bg-[#1a233b] border border-[#222c48] text-zinc-300 hover:text-white text-xs font-medium transition-colors cursor-pointer"
            >
              Unmark All
            </button>
          </div>
        </div>
      )}

      {/* Campaigns Grid / Cards */}
      <div className="space-y-3.5">
        {filteredCampaigns.length === 0 ? (
          <div className="text-center py-16 bg-[#0f1423] border border-[#1b233a] rounded-2xl space-y-3">
            <Rocket className="h-8 w-8 text-zinc-600 mx-auto" />
            <p className="text-sm font-semibold text-zinc-300">No campaigns found</p>
            <p className="text-xs text-zinc-500">Create your first cold outreach campaign to get started.</p>
            <button
              onClick={handleCreateNewCampaign}
              className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-semibold shadow-md cursor-pointer"
            >
              + Create Campaign
            </button>
          </div>
        ) : (
          filteredCampaigns.map((camp) => {
            const senderAcc = accounts.find((a) => a.id === camp.assignedAccountId) || accounts[0];
            const campSent = camp.leads.filter((l) => l.status !== 'ready_for_outreach').length;
            const campReplies = camp.leads.filter((l) => l.status === 'replied').length;
            const campOpens = camp.leads.filter((l) => l.openedCount > 0).length;
            const openPct = campSent > 0 ? ((campOpens / campSent) * 100).toFixed(0) : '0';
            const replyPct = campSent > 0 ? ((campReplies / campSent) * 100).toFixed(0) : '0';
            const isMarked = selectedCampaignIds.includes(camp.id);

            return (
              <div
                key={camp.id}
                className={`border rounded-2xl p-5 transition-all shadow-xl group ${
                  isMarked
                    ? 'bg-indigo-950/30 border-indigo-500/50'
                    : 'bg-[#0f1423] hover:bg-[#12182a] border-[#1b233a] hover:border-[#283556]'
                }`}
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  {/* Left: Checkbox + Campaign Title & Sender */}
                  <div className="flex items-start gap-3 flex-1">
                    <input
                      type="checkbox"
                      checked={isMarked}
                      onChange={(e) => {
                        e.stopPropagation();
                        handleToggleSelectCampaign(camp.id);
                      }}
                      onClick={(e) => e.stopPropagation()}
                      className="mt-1 h-4 w-4 rounded border-[#243050] bg-[#0c101d] text-indigo-600 focus:ring-0 focus:ring-offset-0 cursor-pointer accent-indigo-600"
                      title="Mark campaign"
                    />

                    <div
                      onClick={() => setActiveCampaignDetailId(camp.id)}
                      className="space-y-1.5 flex-1 cursor-pointer"
                    >
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <h3 className="font-bold text-base text-white group-hover:text-indigo-400 transition-colors">
                          {camp.name}
                        </h3>

                      {/* Status indicator */}
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-semibold flex items-center gap-1 ${
                          camp.status === 'active'
                            ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/60'
                            : 'bg-zinc-800 text-zinc-400 border border-zinc-700'
                        }`}
                      >
                        <div
                          className={`h-1.5 w-1.5 rounded-full ${
                            camp.status === 'active' ? 'bg-emerald-400 animate-pulse' : 'bg-zinc-500'
                          }`}
                        />
                        <span>{camp.status === 'active' ? 'Active' : 'Paused'}</span>
                      </span>

                      <span className="text-[11px] text-zinc-500">
                        {camp.sequenceSteps.length} sequence steps
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-xs text-zinc-400 flex-wrap">
                      <span>Sender: <strong className="text-zinc-300">{senderAcc.email}</strong></span>
                      <span>•</span>
                      <span>
                        Schedule: {camp.scheduleWindow.startTime} - {camp.scheduleWindow.endTime}
                      </span>
                      <span>•</span>
                      <span>Created {new Date(camp.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>

                  {/* Middle: Metrics Stats Bar */}
                  <div className="flex items-center gap-4 sm:gap-6 text-xs text-zinc-300 border-y lg:border-y-0 lg:border-x border-[#1a2238] py-2 lg:py-0 lg:px-6">
                    <div className="text-center">
                      <p className="text-[10px] uppercase font-semibold text-zinc-500">Leads</p>
                      <p className="text-sm font-bold text-white mt-0.5">{camp.leads.length}</p>
                    </div>

                    <div className="text-center">
                      <p className="text-[10px] uppercase font-semibold text-zinc-500">Sent</p>
                      <p className="text-sm font-bold text-indigo-400 mt-0.5">{campSent}</p>
                    </div>

                    <div className="text-center">
                      <p className="text-[10px] uppercase font-semibold text-zinc-500">Open %</p>
                      <p className="text-sm font-bold text-purple-400 mt-0.5">{openPct}%</p>
                    </div>

                    <div className="text-center">
                      <p className="text-[10px] uppercase font-semibold text-zinc-500">Reply %</p>
                      <p className="text-sm font-bold text-emerald-400 mt-0.5">{replyPct}%</p>
                    </div>
                  </div>

                  {/* Right: Actions */}
                  <div className="flex items-center gap-2 self-start lg:self-center flex-wrap">
                    {/* Toggle Status */}
                    <button
                      onClick={() => {
                        toggleCampaignStatus(camp.id);
                        showToast(`Campaign ${camp.status === 'active' ? 'paused' : 'activated'}`);
                      }}
                      className={`p-2 rounded-xl border text-xs font-semibold transition-colors cursor-pointer ${
                        camp.status === 'active'
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20'
                          : 'bg-zinc-800 text-zinc-300 border-zinc-700 hover:bg-zinc-700'
                      }`}
                      title={camp.status === 'active' ? 'Pause Campaign' : 'Resume Campaign'}
                    >
                      {camp.status === 'active' ? (
                        <Pause className="h-4 w-4" />
                      ) : (
                        <Play className="h-4 w-4" />
                      )}
                    </button>

                    {/* Clone */}
                    <button
                      onClick={() => {
                        const cloned = duplicateCampaign(camp.id);
                        if (cloned) showToast('Campaign cloned');
                      }}
                      className="p-2 rounded-xl bg-[#141b2c] hover:bg-[#1a233b] border border-[#232e4d] text-zinc-400 hover:text-white transition-colors cursor-pointer"
                      title="Duplicate Campaign"
                    >
                      <Copy className="h-4 w-4" />
                    </button>

                    {/* Open Campaign Detail (5 tabs) */}
                    <button
                      onClick={() => setActiveCampaignDetailId(camp.id)}
                      className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-md shadow-indigo-600/20 transition-all cursor-pointer"
                    >
                      <span>Open</span>
                      <ChevronRight className="h-3.5 w-3.5" />
                    </button>

                    {/* Delete */}
                    <button
                      onClick={() => {
                        if (confirm(`Delete campaign "${camp.name}"?`)) {
                          deleteCampaign(camp.id);
                          showToast('Campaign deleted');
                        }
                      }}
                      className="p-2 rounded-xl hover:bg-rose-950/60 text-zinc-500 hover:text-rose-400 transition-colors cursor-pointer"
                      title="Delete Campaign"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
