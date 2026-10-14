import React, { useState } from 'react';
import {
  Play,
  Pause,
  Plus,
  Trash2,
  Copy,
  ChevronRight,
  Sparkles,
  Search,
  CheckCircle2,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { CampaignDetailView } from './CampaignDetailView';
import {
  PageHeader,
  StatCard,
  ListCard,
  ListRow,
  Button,
  Input,
  StatusPill,
} from './ui/DesignSystem';

interface CampaignsViewProps {
  onNavigateToBuilder: (campaignId?: string) => void;
  onNavigateToInbox: () => void;
  initialCampaignId?: string | null;
}

export const CampaignsView: React.FC<CampaignsViewProps> = ({
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

  // If a campaign is open in 5-tab view, render CampaignDetailView
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
    <div className="space-y-6 max-w-7xl mx-auto pb-16 page-fade">
      {/* Toast Feedback */}
      {toastMessage && (
        <div className="flex items-center justify-between px-4 py-3 rounded-[10px] bg-[var(--surface)] border border-[var(--border)] text-sm text-[var(--text-primary)]">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-[var(--success)]" />
            <span>{toastMessage}</span>
          </div>
          <button
            onClick={() => setToastMessage(null)}
            className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-xs cursor-pointer ml-3"
          >
            ✕
          </button>
        </div>
      )}

      {/* Top Header */}
      <PageHeader
        title="Campaigns"
        subtitle="Automated cold outreach campaigns, multi-step sequences, and sending schedules."
        action={
          <div className="flex items-center gap-2.5">
            {campaigns.length > 0 ? (
              <Button
                variant="secondary"
                onClick={clearMockData}
                title="Remove all mock/sample campaigns and leads"
              >
                <Trash2 className="h-4 w-4" />
                <span>Remove mock items</span>
              </Button>
            ) : (
              <Button
                variant="secondary"
                onClick={() => {
                  loadSampleMockData();
                  showToast('Sample demo campaigns restored');
                }}
                title="Restore demo sample campaigns and leads"
              >
                <Sparkles className="h-4 w-4" />
                <span>Load sample data</span>
              </Button>
            )}

            {/* Exactly one primary button for view */}
            <Button variant="primary" onClick={handleCreateNewCampaign}>
              <Plus className="h-4 w-4" />
              <span>New campaign</span>
            </Button>
          </div>
        }
      />

      {/* 4 Stat Cards in a Grid: No decorative icons, sentence case, tabular-nums */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        <StatCard
          label="Active campaigns"
          value={activeCount}
          subtext={`${totalCampaigns} total`}
        />
        <StatCard
          label="Total leads"
          value={totalLeads}
          subtext="Enrolled prospects"
        />
        <StatCard
          label="Emails contacted"
          value={totalSent}
          subtext="Dispatched messages"
        />
        <StatCard
          label="Average reply rate"
          value={`${avgReplyRate}%`}
          subtext="Inbound response rate"
        />
      </div>

      {/* Filter and Search Bar: enclosed in single card */}
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[14px] p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-1 max-w-md">
          <div className="relative flex-1">
            <Search className="h-4 w-4 text-[var(--text-secondary)] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <Input
              type="text"
              placeholder="Filter campaigns by name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 py-2"
            />
          </div>

          <div className="flex items-center gap-1">
            {[
              { id: 'all', label: 'All' },
              { id: 'active', label: 'Active' },
              { id: 'paused', label: 'Paused' },
            ].map((tab) => {
              const isSelected = statusFilter === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setStatusFilter(tab.id as any)}
                  className={`px-3 py-1.5 rounded-[10px] text-xs font-medium transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-[var(--accent)] text-[#0E1116]'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-white/[0.04]'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {filteredCampaigns.length > 0 && (
            <button
              type="button"
              onClick={handleToggleSelectAllCampaigns}
              className={`px-3 py-1.5 rounded-[8px] text-xs font-medium border-2 transition-all duration-150 cursor-pointer ${
                selectedCampaignIds.length > 0 && selectedCampaignIds.length === filteredCampaigns.length
                  ? 'border-[var(--accent)] bg-[rgba(91,141,239,0.12)] text-[var(--accent)]'
                  : 'border-[var(--border)] bg-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--text-secondary)]/50'
              }`}
            >
              {selectedCampaignIds.length === filteredCampaigns.length ? 'Deselect all' : 'Select all'}
            </button>
          )}
        </div>

        <span className="text-[13px] text-[var(--text-secondary)] tabular-nums self-center">
          Showing {filteredCampaigns.length} of {campaigns.length} campaigns
        </span>
      </div>

      {/* Bulk Marked Action Bar */}
      {selectedCampaignIds.length > 0 && (
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[14px] p-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold tabular-nums px-2.5 py-1 rounded-[8px] bg-[rgba(91,141,239,0.12)] text-[var(--accent)]">
              {selectedCampaignIds.length} marked
            </span>
            <span className="text-sm text-[var(--text-primary)]">
              {selectedCampaignIds.length} {selectedCampaignIds.length === 1 ? 'campaign selected' : 'campaigns selected'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={handleRemoveMarkedCampaigns}>
              <Trash2 className="h-4 w-4" />
              <span>Remove marked</span>
            </Button>
            <Button variant="secondary" onClick={() => setSelectedCampaignIds([])}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Campaigns List: ONE CARD wrapping the whole list, 1px dividers between rows */}
      {filteredCampaigns.length === 0 ? (
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[14px] p-12 text-center space-y-3">
          <p className="text-sm font-semibold text-[var(--text-primary)]">No campaigns found</p>
          <p className="text-[13px] text-[var(--text-secondary)]">Create your first cold outreach campaign to get started.</p>
          <Button variant="primary" onClick={handleCreateNewCampaign} className="mt-2">
            <Plus className="h-4 w-4" />
            <span>Create campaign</span>
          </Button>
        </div>
      ) : (
        <ListCard>
          {filteredCampaigns.map((camp) => {
            const senderAcc = accounts.find((a) => a.id === camp.assignedAccountId) || accounts[0];
            const campSent = camp.leads.filter((l) => l.status !== 'ready_for_outreach').length;
            const campReplies = camp.leads.filter((l) => l.status === 'replied').length;
            const campOpens = camp.leads.filter((l) => l.openedCount > 0).length;
            const openPct = campSent > 0 ? ((campOpens / campSent) * 100).toFixed(0) : '0';
            const replyPct = campSent > 0 ? ((campReplies / campSent) * 100).toFixed(0) : '0';
            const isMarked = selectedCampaignIds.includes(camp.id);

            return (
              <ListRow key={camp.id} className="p-0">
                <div
                  onClick={() => handleToggleSelectCampaign(camp.id)}
                  className={`p-4 rounded-[12px] border-2 transition-all duration-150 cursor-pointer flex flex-col lg:flex-row lg:items-center justify-between gap-4 ${
                    isMarked
                      ? 'border-[var(--accent)] bg-[rgba(91,141,239,0.08)] shadow-[0_0_0_1px_rgba(91,141,239,0.2)]'
                      : 'border-transparent hover:border-[var(--border)] hover:bg-white/[0.02]'
                  }`}
                >
                  {/* Left: Title + Meta */}
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveCampaignDetailId(camp.id);
                          }}
                          className="text-sm font-semibold text-[var(--text-primary)] hover:text-[var(--accent)] transition-colors text-left"
                        >
                          {camp.name}
                        </button>

                        <StatusPill
                          variant={camp.status === 'active' ? 'success' : 'muted'}
                          label={camp.status === 'active' ? 'Active' : 'Paused'}
                        />

                        <span className="text-[13px] text-[var(--text-secondary)] tabular-nums">
                          {camp.sequenceSteps.length} sequence steps
                        </span>
                      </div>

                      {/* Metadata joined with plain commas, no bullet points */}
                      <p className="text-[13px] text-[var(--text-secondary)] leading-relaxed">
                        Sender: {senderAcc?.email || 'Unassigned'}, Schedule: {camp.scheduleWindow.startTime} to {camp.scheduleWindow.endTime}, Created {new Date(camp.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  {/* Middle: Numerical stats with tabular-nums */}
                  <div className="flex items-center gap-6 text-[13px] text-[var(--text-secondary)] py-1 lg:py-0 lg:px-6 shrink-0">
                    <div>
                      <p className="text-[12px] text-[var(--text-secondary)]">Leads</p>
                      <p className="text-sm font-semibold text-[var(--text-primary)] mt-0.5 tabular-nums">
                        {camp.leads.length}
                      </p>
                    </div>

                    <div>
                      <p className="text-[12px] text-[var(--text-secondary)]">Sent</p>
                      <p className="text-sm font-semibold text-[var(--text-primary)] mt-0.5 tabular-nums">
                        {campSent}
                      </p>
                    </div>

                    <div>
                      <p className="text-[12px] text-[var(--text-secondary)]">Open rate</p>
                      <p className="text-sm font-semibold text-[var(--text-primary)] mt-0.5 tabular-nums">
                        {openPct}%
                      </p>
                    </div>

                    <div>
                      <p className="text-[12px] text-[var(--text-secondary)]">Reply rate</p>
                      <p className="text-sm font-semibold text-[var(--text-primary)] mt-0.5 tabular-nums">
                        {replyPct}%
                      </p>
                    </div>
                  </div>

                  {/* Right: Inline Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => {
                        toggleCampaignStatus(camp.id);
                        showToast(`Campaign ${camp.status === 'active' ? 'paused' : 'resumed'}`);
                      }}
                      className="p-2 rounded-[10px] border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-white/[0.04] transition-colors cursor-pointer"
                      title={camp.status === 'active' ? 'Pause campaign' : 'Resume campaign'}
                    >
                      {camp.status === 'active' ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                    </button>

                    <button
                      onClick={() => {
                        const cloned = duplicateCampaign(camp.id);
                        if (cloned) showToast('Campaign cloned');
                      }}
                      className="p-2 rounded-[10px] border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-white/[0.04] transition-colors cursor-pointer"
                      title="Duplicate campaign"
                    >
                      <Copy className="h-4 w-4" />
                    </button>

                    <Button
                      variant="secondary"
                      onClick={() => setActiveCampaignDetailId(camp.id)}
                      className="text-xs py-2 px-3"
                    >
                      <span>Open</span>
                      <ChevronRight className="h-3.5 w-3.5" />
                    </Button>

                    <button
                      onClick={() => {
                        if (confirm(`Delete campaign "${camp.name}"?`)) {
                          deleteCampaign(camp.id);
                          showToast('Campaign deleted');
                        }
                      }}
                      className="p-2 rounded-[10px] text-[var(--text-secondary)] hover:text-rose-400 hover:bg-white/[0.04] transition-colors cursor-pointer"
                      title="Delete campaign"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </ListRow>
            );
          })}
        </ListCard>
      )}
    </div>
  );
};
