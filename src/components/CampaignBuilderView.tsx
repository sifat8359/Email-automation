import React, { useState, useRef } from 'react';
import {
  Settings,
  Upload,
  FileSpreadsheet,
  GitMerge,
  Send,
  Plus,
  Trash2,
  Clock,
  Check,
  ChevronDown,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  X,
  AlertCircle,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Campaign, SequenceStep, Lead } from '../types';

interface CampaignBuilderProps {
  initialCampaignId?: string | null;
  onClose: () => void;
  onCreated: (campaignId: string) => void;
}

export const CampaignBuilderView: React.FC<CampaignBuilderProps> = ({
  initialCampaignId,
  onClose,
  onCreated,
}) => {
  const { campaigns, accounts, createCampaign, updateCampaign } = useApp();

  const existingCampaign = campaigns.find((c) => c.id === initialCampaignId);

  const [activeStepTab, setActiveStepTab] = useState<'setup' | 'leads' | 'sequence'>('setup');

  // Step 1: Setup fields
  const [name, setName] = useState(existingCampaign?.name || 'New Inbound Growth Campaign');
  const [assignedAccountId, setAssignedAccountId] = useState(
    existingCampaign?.assignedAccountId || accounts[0]?.id || ''
  );
  const [startTime, setStartTime] = useState(
    existingCampaign?.scheduleWindow.startTime || '08:00'
  );
  const [endTime, setEndTime] = useState(
    existingCampaign?.scheduleWindow.endTime || '22:00'
  );
  const [timezone, setTimezone] = useState(
    existingCampaign?.scheduleWindow.timezone || 'Asia/Dhaka'
  );
  const [minDelayMinutes, setMinDelayMinutes] = useState(
    existingCampaign?.minDelayMinutes || 2
  );
  const [maxDelayMinutes, setMaxDelayMinutes] = useState(
    existingCampaign?.maxDelayMinutes || 5
  );
  const [dailyLimit, setDailyLimit] = useState(existingCampaign?.dailyLimit || 40);

  // Step 2: Leads & CSV
  const [leadsList, setLeadsList] = useState<
    Array<
      Omit<
        Lead,
        | 'id'
        | 'campaignId'
        | 'currentStepIndex'
        | 'lastContactedAt'
        | 'nextFollowUpAt'
        | 'history'
        | 'openedCount'
        | 'clickedCount'
      >
    >
  >(() => {
    if (existingCampaign?.leads) {
      return existingCampaign.leads.map((l) => ({
        firstName: l.firstName,
        lastName: l.lastName,
        email: l.email,
        companyName: l.companyName,
        website: l.website,
        title: l.title,
        status: l.status,
        assignedAccountId: l.assignedAccountId,
        sequenceId: l.sequenceId,
      }));
    }
    return [];
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [csvFileName, setCsvFileName] = useState<string>('');

  // Step 3: Sequence Steps
  const [sequenceSteps, setSequenceSteps] = useState<SequenceStep[]>(() => {
    if (existingCampaign?.sequenceSteps && existingCampaign.sequenceSteps.length > 0) {
      return existingCampaign.sequenceSteps;
    }
    return [
      {
        id: 'step-1',
        stepNumber: 1,
        type: 'initial_outreach',
        delayAmount: 0,
        delayUnit: 'minutes',
        subject: 'Quick question about {{companyName}}',
        body: `Hi {{firstName}},

I came across {{companyName}} via {{website}} and was really impressed by your team's expansion.

Are you looking to scale outbound channels for customer acquisition this quarter?

Best,
{{senderName}}`,
        triggerCondition: 'always',
      },
      {
        id: 'step-2',
        stepNumber: 2,
        type: 'auto_followup',
        delayAmount: 1,
        delayUnit: 'minutes',
        subject: 'Re: Quick question about {{companyName}}',
        body: `Hi {{firstName}},

Following up briefly on my previous note. We recently helped a similar company scale response rates by 3.2x with deliverability warmups.

Would you be open to a 10-minute intro this week?

Best,
{{senderName}}`,
        triggerCondition: 'no_reply',
      },
    ];
  });

  const selectedAccount = accounts.find((a) => a.id === assignedAccountId) || accounts[0];

  // CSV Parsing
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setCsvFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      parseCSVText(text);
    };
    reader.readAsText(file);
  };

  const parseCSVText = (text: string) => {
    const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (lines.length < 2) return;

    const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());
    const fnIdx = headers.findIndex((h) => h.includes('first') || h === 'name');
    const lnIdx = headers.findIndex((h) => h.includes('last'));
    const emIdx = headers.findIndex((h) => h.includes('email') || h.includes('mail'));
    const coIdx = headers.findIndex((h) => h.includes('company') || h.includes('org'));
    const webIdx = headers.findIndex((h) => h.includes('web') || h.includes('url') || h.includes('domain'));

    const parsed: typeof leadsList = [];

    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(',').map((c) => c.trim().replace(/^"|"$/g, ''));
      if (cols.length > 1 && cols[emIdx !== -1 ? emIdx : 1]) {
        parsed.push({
          firstName: cols[fnIdx !== -1 ? fnIdx : 0] || 'Partner',
          lastName: cols[lnIdx !== -1 ? lnIdx : 1] || '',
          email: cols[emIdx !== -1 ? emIdx : 1] || 'lead@example.com',
          companyName: cols[coIdx !== -1 ? coIdx : 2] || 'Enterprise Inc',
          website: cols[webIdx !== -1 ? webIdx : 3] || 'https://example.com',
          title: 'Executive',
          status: 'ready_for_outreach',
          assignedAccountId,
          sequenceId: 'seq-custom',
        });
      }
    }

    if (parsed.length > 0) {
      setLeadsList(parsed);
    }
  };

  const loadSampleLeads = () => {
    setCsvFileName('sample_b2b_prospects.csv');
    setLeadsList([
      {
        firstName: 'Alexander',
        lastName: 'Wright',
        email: 'alex.wright@hyperbase.io',
        companyName: 'HyperBase Solutions',
        website: 'https://hyperbase.io',
        title: 'Founder & CEO',
        status: 'ready_for_outreach',
        assignedAccountId,
        sequenceId: 'seq-custom',
      },
      {
        firstName: 'Natasha',
        lastName: 'Roman',
        email: 'natasha@cloudstride.tech',
        companyName: 'CloudStride Tech',
        website: 'https://cloudstride.tech',
        title: 'VP of Product',
        status: 'ready_for_outreach',
        assignedAccountId,
        sequenceId: 'seq-custom',
      },
      {
        firstName: 'Liam',
        lastName: 'Gallagher',
        email: 'liam@omniview.ai',
        companyName: 'OmniView Analytics',
        website: 'https://omniview.ai',
        title: 'Head of Growth',
        status: 'ready_for_outreach',
        assignedAccountId,
        sequenceId: 'seq-custom',
      },
      {
        firstName: 'Chloe',
        lastName: 'Bennett',
        email: 'chloe.b@apexlogistics.com',
        companyName: 'Apex Logistics',
        website: 'https://apexlogistics.com',
        title: 'Operations Director',
        status: 'ready_for_outreach',
        assignedAccountId,
        sequenceId: 'seq-custom',
      },
    ]);
  };

  const addSequenceStep = () => {
    const nextStepNum = sequenceSteps.length + 1;
    const newStep: SequenceStep = {
      id: 'step-' + Date.now(),
      stepNumber: nextStepNum,
      type: 'auto_followup',
      delayAmount: nextStepNum === 2 ? 1 : 3,
      delayUnit: nextStepNum === 2 ? 'minutes' : 'days',
      subject: `Re: Quick question about {{companyName}}`,
      body: `Hi {{firstName}},\n\nFollowing up quickly regarding my previous email. Let me know if you would like me to send over our product deck.\n\nBest,\n{{senderName}}`,
      triggerCondition: 'no_reply',
    };
    setSequenceSteps([...sequenceSteps, newStep]);
  };

  const removeSequenceStep = (id: string) => {
    if (sequenceSteps.length <= 1) return; // Keep at least step 1
    const filtered = sequenceSteps.filter((s) => s.id !== id);
    setSequenceSteps(filtered.map((s, idx) => ({ ...s, stepNumber: idx + 1 })));
  };

  const updateSequenceStep = (id: string, updates: Partial<SequenceStep>) => {
    setSequenceSteps((prev) => prev.map((s) => (s.id === id ? { ...s, ...updates } : s)));
  };

  const handleSaveCampaign = () => {
    if (!name.trim()) return;

    if (existingCampaign) {
      updateCampaign(existingCampaign.id, {
        name,
        assignedAccountId,
        scheduleWindow: {
          startTime,
          endTime,
          timezone,
          daysOfWeek: [1, 2, 3, 4, 5],
        },
        minDelayMinutes,
        maxDelayMinutes,
        dailyLimit,
        sequenceSteps,
        leads: leadsList.map((l, idx) => ({
          ...l,
          id: `lead-${Date.now()}-${idx}`,
          campaignId: existingCampaign.id,
          currentStepIndex: 0,
          status: 'ready_for_outreach',
          lastContactedAt: null,
          nextFollowUpAt: null,
          history: [],
          openedCount: 0,
          clickedCount: 0,
        })),
      });
      onCreated(existingCampaign.id);
    } else {
      const createdId = createCampaign({
        name,
        status: 'active',
        assignedAccountId,
        scheduleWindow: {
          startTime,
          endTime,
          timezone,
          daysOfWeek: [1, 2, 3, 4, 5],
        },
        minDelayMinutes,
        maxDelayMinutes,
        dailyLimit,
        sequenceSteps,
        leads: leadsList.map((l, idx) => ({
          ...l,
          id: `lead-${Date.now()}-${idx}`,
          currentStepIndex: 0,
          status: 'ready_for_outreach',
          lastContactedAt: null,
          nextFollowUpAt: null,
          history: [],
          openedCount: 0,
          clickedCount: 0,
        })),
      });
      onCreated(createdId);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-5xl mx-auto pb-12">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div>
          <button
            onClick={onClose}
            className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white transition-colors mb-2 cursor-pointer"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back to Campaigns</span>
          </button>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            {existingCampaign ? `Edit Campaign: ${existingCampaign.name}` : 'Create New Campaign'}
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Setup autonomous outreach, time window throttling, CSV lead imports, and email templates
          </p>
        </div>

        <button
          onClick={handleSaveCampaign}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs shadow-lg shadow-purple-600/30 transition-all cursor-pointer"
        >
          <Check className="h-4 w-4" />
          <span>Save &amp; Activate Campaign</span>
        </button>
      </div>

      {/* 3 Step Tabs Navigation */}
      <div className="flex items-center p-1.5 rounded-2xl bg-[#101323] border border-[#1b2137]">
        {[
          { id: 'setup', label: '1. Setup & Schedule Window', icon: Settings },
          { id: 'leads', label: `2. Leads CSV Import (${leadsList.length})`, icon: Upload },
          { id: 'sequence', label: `3. Email Templates & Follow-ups (${sequenceSteps.length})`, icon: GitMerge },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeStepTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveStepTab(tab.id as any)}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                isActive
                  ? 'bg-purple-600 text-white shadow-md'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: Setup & Window Timer */}
      {activeStepTab === 'setup' && (
        <div className="bg-[#101323] border border-[#1b2137] rounded-2xl p-6 space-y-6 shadow-xl">
          <div className="space-y-4">
            <h2 className="text-base font-bold text-white tracking-tight">Campaign Details</h2>

            <div>
              <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">
                Campaign Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. SaaS Founders Q4 Outreach"
                className="w-full px-4 py-2.5 rounded-xl bg-[#080a13] border border-[#1d233a] text-sm text-white focus:outline-none focus:border-purple-500 transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">
                Sending Gmail Account
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {accounts.map((acc) => {
                  const isSelected = acc.id === assignedAccountId;
                  return (
                    <div
                      key={acc.id}
                      onClick={() => setAssignedAccountId(acc.id)}
                      className={`p-3 rounded-xl border-2 flex items-center justify-between cursor-pointer transition-all duration-150 ${
                        isSelected
                          ? 'bg-[rgba(91,141,239,0.08)] border-[var(--accent)] text-white shadow-[0_0_0_1px_rgba(91,141,239,0.2)]'
                          : 'bg-transparent border-[var(--border)] text-zinc-400 hover:text-white hover:border-zinc-600'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 truncate">
                        <div
                          className="h-3 w-3 rounded-full shrink-0"
                          style={{ backgroundColor: acc.color }}
                        />
                        <div className="truncate">
                          <div className="text-xs font-semibold text-white">{acc.senderName}</div>
                          <div className="text-[11px] font-mono text-zinc-400 truncate">{acc.email}</div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Time Window Scheduler Section (User specified: Morning 8 to Night 10) */}
          <div className="pt-4 border-t border-[#181e35] space-y-4">
            <div>
              <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                <Clock className="h-4 w-4 text-purple-400" />
                <span>Daily Sending Window Timer</span>
              </h2>
              <p className="text-xs text-zinc-400 mt-1">
                Automation only sends emails during this window (e.g. morning 8:00 AM to night 10:00 PM) to ensure natural deliverability.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">
                  WINDOW START TIME
                </label>
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#080a13] border border-[#1d233a] text-sm text-white font-mono focus:outline-none focus:border-purple-500"
                />
                <span className="text-[10px] text-zinc-500 mt-1 block">Default: 08:00 AM</span>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">
                  WINDOW END TIME
                </label>
                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#080a13] border border-[#1d233a] text-sm text-white font-mono focus:outline-none focus:border-purple-500"
                />
                <span className="text-[10px] text-zinc-500 mt-1 block">Default: 22:00 (10:00 PM)</span>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">
                  TIMEZONE
                </label>
                <select
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#080a13] border border-[#1d233a] text-sm text-white focus:outline-none focus:border-purple-500 cursor-pointer"
                >
                  <option value="Asia/Dhaka">Asia/Dhaka (GMT+6)</option>
                  <option value="America/New_York">America/New_York (EST)</option>
                  <option value="America/Los_Angeles">America/Los_Angeles (PST)</option>
                  <option value="Europe/London">Europe/London (GMT)</option>
                  <option value="UTC">UTC</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
              <div>
                <label className="block text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">
                  MIN DELAY (MINUTES)
                </label>
                <input
                  type="number"
                  min={1}
                  max={30}
                  value={minDelayMinutes}
                  onChange={(e) => setMinDelayMinutes(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#080a13] border border-[#1d233a] text-sm text-white font-mono focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">
                  MAX DELAY (MINUTES)
                </label>
                <input
                  type="number"
                  min={1}
                  max={60}
                  value={maxDelayMinutes}
                  onChange={(e) => setMaxDelayMinutes(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#080a13] border border-[#1d233a] text-sm text-white font-mono focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">
                  DAILY CAMPAIGN LIMIT
                </label>
                <input
                  type="number"
                  min={5}
                  max={200}
                  value={dailyLimit}
                  onChange={(e) => setDailyLimit(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#080a13] border border-[#1d233a] text-sm text-white font-mono focus:outline-none focus:border-purple-500"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-4">
            <button
              onClick={() => setActiveStepTab('leads')}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs shadow-md cursor-pointer"
            >
              <span>Next: Import CSV Leads</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* TAB 2: Leads & CSV Upload */}
      {activeStepTab === 'leads' && (
        <div className="bg-[#101323] border border-[#1b2137] rounded-2xl p-6 space-y-6 shadow-xl">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">Campaign Leads (CSV Import)</h2>
              <p className="text-xs text-zinc-400 mt-1">
                Upload a CSV spreadsheet with First Name, Email, Company, and Website
              </p>
            </div>

            <button
              onClick={loadSampleLeads}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-950/40 text-purple-300 border border-purple-800/40 hover:bg-purple-900/40 text-xs font-semibold transition-colors cursor-pointer"
            >
              <Sparkles className="h-3.5 w-3.5 text-purple-400" />
              <span>Load Sample CSV (4 Leads)</span>
            </button>
          </div>

          {/* Upload Dropzone */}
          <div
            onClick={() => fileInputRef.current?.click()}
            className="p-8 border-2 border-dashed border-[#242b48] hover:border-purple-500/60 rounded-2xl text-center bg-[#080a13] transition-all cursor-pointer space-y-3"
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept=".csv"
              className="hidden"
            />
            <div className="h-12 w-12 rounded-xl bg-purple-600/20 text-purple-400 mx-auto flex items-center justify-center">
              <Upload className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">
                {csvFileName ? `Loaded: ${csvFileName}` : 'Click to browse or drop your CSV file here'}
              </p>
              <p className="text-xs text-zinc-500 mt-1">
                Supports columns: First Name, Last Name, Email, Company Name, Website URL
              </p>
            </div>
          </div>

          {/* Leads Preview Table */}
          {leadsList.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">
                  Leads to be queued ({leadsList.length})
                </span>
                <button
                  onClick={() => setLeadsList([])}
                  className="text-xs text-red-400 hover:text-red-300 cursor-pointer"
                >
                  Clear list
                </button>
              </div>

              <div className="border border-[#1b2137] rounded-xl overflow-hidden bg-[#080a13]">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-[#181d32] bg-[#0c0f1e] text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
                      <th className="py-2.5 px-3">FIRST NAME</th>
                      <th className="py-2.5 px-3">EMAIL</th>
                      <th className="py-2.5 px-3">COMPANY</th>
                      <th className="py-2.5 px-3">WEBSITE</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#15192c]">
                    {leadsList.slice(0, 8).map((l, idx) => (
                      <tr key={idx} className="hover:bg-[#101426]">
                        <td className="py-2.5 px-3 font-medium text-white">{l.firstName}</td>
                        <td className="py-2.5 px-3 text-zinc-400 font-mono text-[11px]">{l.email}</td>
                        <td className="py-2.5 px-3 text-zinc-300">{l.companyName}</td>
                        <td className="py-2.5 px-3 text-blue-400 font-mono text-[11px]">{l.website}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {leadsList.length > 8 && (
                  <div className="p-2 text-center text-xs text-zinc-500 bg-[#0a0d18] border-t border-[#181d32]">
                    + {leadsList.length - 8} more leads imported
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="flex items-center justify-between pt-4 border-t border-[#181e35]">
            <button
              onClick={() => setActiveStepTab('setup')}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-zinc-400 hover:text-white text-xs cursor-pointer"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back</span>
            </button>

            <button
              onClick={() => setActiveStepTab('sequence')}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs shadow-md cursor-pointer"
            >
              <span>Next: Sequence Templates</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* TAB 3: Sequence & Email Templates */}
      {activeStepTab === 'sequence' && (
        <div className="bg-[#101323] border border-[#1b2137] rounded-2xl p-6 space-y-6 shadow-xl">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">Campaign Follow-up Sequence</h2>
              <p className="text-xs text-zinc-400 mt-1">
                Configure Step 1 automated cold email and subsequent follow-ups for this campaign
              </p>
            </div>

            <button
              onClick={addSequenceStep}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs shadow-md cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span>Add Follow-up Step</span>
            </button>
          </div>

          {/* Sequence Step Cards */}
          <div className="space-y-4">
            {sequenceSteps.map((step, idx) => {
              const isFirst = idx === 0;
              return (
                <div
                  key={step.id}
                  className="p-5 rounded-2xl bg-[#080a13] border border-[#1d233a] space-y-4 shadow-md"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <span className="px-2.5 py-1 rounded-lg bg-purple-600/20 text-purple-300 font-mono font-bold text-xs border border-purple-500/30">
                        {isFirst ? 'STEP 1 (INITIAL OUTREACH)' : `STEP ${step.stepNumber} (FOLLOW-UP)`}
                      </span>

                      {!isFirst && (
                        <div className="flex items-center gap-2 text-xs text-zinc-400">
                          <span>Send after:</span>
                          <input
                            type="number"
                            min={1}
                            max={60}
                            value={step.delayAmount}
                            onChange={(e) =>
                              updateSequenceStep(step.id, { delayAmount: Number(e.target.value) })
                            }
                            className="w-14 px-2 py-1 rounded-lg bg-[#111425] border border-[#222946] text-white font-mono text-center"
                          />
                          <select
                            value={step.delayUnit}
                            onChange={(e) =>
                              updateSequenceStep(step.id, { delayUnit: e.target.value as any })
                            }
                            className="px-2 py-1 rounded-lg bg-[#111425] border border-[#222946] text-white cursor-pointer"
                          >
                            <option value="minutes">minute(s)</option>
                            <option value="hours">hour(s)</option>
                            <option value="days">days</option>
                          </select>
                        </div>
                      )}
                    </div>

                    {!isFirst && (
                      <button
                        onClick={() => removeSequenceStep(step.id)}
                        className="text-zinc-500 hover:text-red-400 p-1 rounded-lg cursor-pointer transition-colors"
                        title="Remove step"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>

                  {/* Subject */}
                  <div>
                    <label className="block text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">
                      EMAIL SUBJECT
                    </label>
                    <input
                      type="text"
                      value={step.subject}
                      onChange={(e) => updateSequenceStep(step.id, { subject: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl bg-[#101323] border border-[#1e2540] text-sm text-white focus:outline-none focus:border-purple-500 font-sans"
                    />
                  </div>

                  {/* Body Template */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
                        EMAIL BODY TEMPLATE
                      </label>
                      <span className="text-[10px] text-zinc-500 font-mono">
                        Tags: &#123;&#123;firstName&#125;&#125;, &#123;&#123;companyName&#125;&#125;, &#123;&#123;website&#125;&#125;, &#123;&#123;senderName&#125;&#125;
                      </span>
                    </div>
                    <textarea
                      rows={6}
                      value={step.body}
                      onChange={(e) => updateSequenceStep(step.id, { body: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl bg-[#101323] border border-[#1e2540] text-xs text-white focus:outline-none focus:border-purple-500 leading-relaxed font-sans resize-y"
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-[#181e35]">
            <button
              onClick={() => setActiveStepTab('leads')}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-zinc-400 hover:text-white text-xs cursor-pointer"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back</span>
            </button>

            <button
              onClick={handleSaveCampaign}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-lg shadow-purple-600/30 transition-all cursor-pointer"
            >
              <Check className="h-4 w-4" />
              <span>Save &amp; Activate Campaign</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
