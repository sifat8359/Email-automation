import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import {
  GmailAccount,
  Campaign,
  Lead,
  TimingSettings,
  AppNotification,
  AutomationEngineState,
  EmailMessage,
  LeadStatus,
  SequenceStep,
  SupabaseConfig,
} from '../types';
import {
  INITIAL_ACCOUNTS,
  INITIAL_CAMPAIGNS,
  INITIAL_TIMING_SETTINGS,
} from '../data/initialData';
import { renderTemplate } from '../utils/templateEngine';
import {
  getStoredSupabaseConfig,
  saveSupabaseConfig,
  testSupabaseConnection,
  saveLocalCampaignsCache,
  getLocalCampaignsCache,
  syncCampaignsToSupabase,
} from '../services/supabaseClient';

interface AppContextType {
  campaigns: Campaign[];
  activeCampaignId: string | null;
  accounts: GmailAccount[];
  leads: Lead[];
  timingSettings: TimingSettings;
  automation: AutomationEngineState;
  notifications: AppNotification[];
  supabaseConfig: SupabaseConfig;
  selectedAccountIdFilter: string;
  totalFollowUpsDue: number;
  unreadNotificationCount: number;
  accountNextAllowedSendTime: Record<string, number>;
  resetAccountCooldown: (accountId: string) => void;

  // Navigation & Filter
  setActiveCampaignId: (id: string | null) => void;
  setSelectedAccountIdFilter: (id: string) => void;

  // Campaign Actions
  createCampaign: (campaign: Omit<Campaign, 'id' | 'createdAt' | 'stats'>) => string;
  updateCampaign: (id: string, updates: Partial<Campaign>) => void;
  deleteCampaign: (id: string) => void;
  duplicateCampaign: (id: string) => string;
  toggleCampaignStatus: (id: string) => void;
  importCampaignLeads: (campaignId: string, newLeads: Array<Omit<Lead, 'id' | 'campaignId' | 'currentStepIndex' | 'lastContactedAt' | 'nextFollowUpAt' | 'history' | 'openedCount' | 'clickedCount'>>) => void;
  deleteCampaignLead: (campaignId: string, leadId: string) => void;
  deleteMarkedCampaignLeads: (campaignId: string, leadIds: string[]) => void;
  deleteMarkedCampaigns: (campaignIds: string[]) => void;
  clearMockData: () => void;
  loadSampleMockData: () => void;
  updateLeadStatus: (campaignId: string, leadId: string, status: LeadStatus) => void;
  updateCampaignSequence: (campaignId: string, steps: SequenceStep[]) => void;
  dispatchCampaignLeadOutreach: (campaignId: string, leadId: string, explicitAccountId?: string) => void;

  // Supabase Actions
  updateSupabaseCredentials: (url: string, anonKey: string) => Promise<{ success: boolean; message: string }>;
  syncWithSupabase: () => Promise<{ success: boolean; message: string }>;

  // Account Actions
  addAccount: (account: Omit<GmailAccount, 'id' | 'sentToday' | 'unreadReplies' | 'dueFollowUps' | 'connectedAt'>) => void;
  updateAccount: (id: string, updates: Partial<GmailAccount>) => void;
  deleteAccount: (id: string) => void;

  // Inbox & Lead interactions
  sendInboxReply: (leadId: string, body: string, subject?: string) => void;
  simulateLeadReply: (leadId: string, customReplyText?: string) => void;
  simulateLeadOpen: (leadId: string) => void;

  // Notifications & Engine
  toggleAutomationEngine: () => void;
  markNotificationAsRead: (id: string) => void;
  markAllNotificationsAsRead: () => void;
  clearNotifications: () => void;

  // Backward-compatibility helpers
  dueCountsByAccount: Record<string, number>;
  replyCountsByAccount: Record<string, number>;
  sequence: any;
  dispatchAllDueNow: () => void;
  addLead: (lead: any) => void;
  bulkAddLeads: (leads: any[]) => void;
  sendManualOutreach: (leadId: string, accountId?: string, subject?: string, body?: string) => void;
  dispatchFollowUpForLead: (leadId: string, manualTrigger?: boolean) => void;
  forceFollowUpDueNow: (leadId: string) => void;
  updateTimingSettings: (updates: Partial<TimingSettings>) => void;
  updateSequence: (updates: any) => void;
}

const AppContext = createContext<AppContextType | null>(null);

const STORAGE_KEYS = {
  CAMPAIGNS: 'nexusreach_campaigns_v2',
  ACCOUNTS: 'nexusreach_accounts_v2',
  TIMING: 'nexusreach_timing_v2',
  NOTIFICATIONS: 'nexusreach_notifications_v2',
  AUTOMATION_RUNNING: 'nexusreach_auto_running_v2',
};

// Helper: check if current time is within schedule window (e.g. 08:00 to 22:00)
function isCurrentTimeInWindow(startTimeStr: string, endTimeStr: string): boolean {
  try {
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    const [startH, startM] = startTimeStr.split(':').map(Number);
    const [endH, endM] = endTimeStr.split(':').map(Number);

    const startMinutes = startH * 60 + (startM || 0);
    const endMinutes = endH * 60 + (endM || 0);

    if (startMinutes <= endMinutes) {
      return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
    } else {
      // Overnight window (e.g. 20:00 to 04:00)
      return currentMinutes >= startMinutes || currentMinutes <= endMinutes;
    }
  } catch {
    return true; // default allow
  }
}

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Campaigns state
  const [campaigns, setCampaigns] = useState<Campaign[]>(() => {
    try {
      const cached = getLocalCampaignsCache();
      if (cached && cached.length > 0) return cached;

      const saved = localStorage.getItem(STORAGE_KEYS.CAMPAIGNS);
      return saved ? JSON.parse(saved) : INITIAL_CAMPAIGNS;
    } catch {
      return INITIAL_CAMPAIGNS;
    }
  });

  const [activeCampaignId, setActiveCampaignId] = useState<string | null>(null);

  // Accounts state
  const [accounts, setAccounts] = useState<GmailAccount[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.ACCOUNTS);
      if (saved) {
        const parsed: GmailAccount[] = JSON.parse(saved);
        return parsed.map((acc) => ({
          ...acc,
          avatar: acc.avatar && acc.avatar.includes('images.unsplash.com') ? '' : (acc.avatar || ''),
        }));
      }
      return INITIAL_ACCOUNTS;
    } catch {
      return INITIAL_ACCOUNTS;
    }
  });

  // Supabase config state
  const [supabaseConfig, setSupabaseConfig] = useState<SupabaseConfig>(() => getStoredSupabaseConfig());

  // Global timing settings
  const [timingSettings] = useState<TimingSettings>(INITIAL_TIMING_SETTINGS);

  // Notifications
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  // Account filter
  const [selectedAccountIdFilter, setSelectedAccountIdFilter] = useState<string>('all');

  // Automation Engine state
  const [automationRunning, setAutomationRunning] = useState<boolean>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.AUTOMATION_RUNNING);
    return saved !== null ? saved === 'true' : true;
  });

  const [automationState, setAutomationState] = useState<AutomationEngineState>({
    isRunning: true,
    isDispatching: false,
    nextScheduledSendTimestamp: null,
    lastRandomIntervalSeconds: null,
    activeSendingAccountEmail: null,
    isInScheduleWindow: true,
  });

  // Per-account cooldown timestamps: accountId -> epoch ms when account can send again
  const [accountNextAllowedSendTime, setAccountNextAllowedSendTime] = useState<Record<string, number>>({});
  // Per-campaign sender mailbox rotation index: campaignId -> current account index
  const [campaignRotationIndices, setCampaignRotationIndices] = useState<Record<string, number>>({});

  const resetAccountCooldown = useCallback((accountId: string) => {
    setAccountNextAllowedSendTime((prev) => {
      const copy = { ...prev };
      delete copy[accountId];
      return copy;
    });
  }, []);

  // Save changes to storage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.CAMPAIGNS, JSON.stringify(campaigns));
      saveLocalCampaignsCache(campaigns);
    } catch (e) {
      console.error('Error saving campaigns:', e);
    }
  }, [campaigns]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.ACCOUNTS, JSON.stringify(accounts));
    } catch (e) {
      console.error('Error saving accounts:', e);
    }
  }, [accounts]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.AUTOMATION_RUNNING, String(automationRunning));
  }, [automationRunning]);

  // Aggregate all leads across campaigns for unified Inbox and tracking
  const allLeads = useMemo(() => {
    const aggregated: Lead[] = [];
    campaigns.forEach((camp) => {
      camp.leads.forEach((l) => {
        aggregated.push({ ...l, campaignId: camp.id });
      });
    });
    return aggregated;
  }, [campaigns]);

  // Calculate total due follow-ups across all active campaigns
  const totalFollowUpsDue = useMemo(() => {
    return allLeads.filter(
      (l) => l.status === 'followup_due' || (l.nextFollowUpAt && l.nextFollowUpAt <= Date.now() && l.status !== 'replied' && l.status !== 'bounced')
    ).length;
  }, [allLeads]);

  const addNotification = useCallback((type: AppNotification['type'], title: string, message: string, accountId: string, accountEmail: string, leadId?: string) => {
    const notif: AppNotification = {
      id: 'notif-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
      type,
      title,
      message,
      timestamp: Date.now(),
      accountId,
      accountEmail,
      leadId,
      read: false,
    };
    setNotifications((prev) => [notif, ...prev.slice(0, 49)]);
  }, []);

  // Update Supabase configuration & verify connection
  const updateSupabaseCredentials = useCallback(async (url: string, anonKey: string) => {
    const res = await testSupabaseConnection(url, anonKey);
    const newConfig: SupabaseConfig = {
      url: url.trim(),
      anonKey: anonKey.trim(),
      isConnected: res.success,
      lastSyncTimestamp: res.success ? Date.now() : null,
    };
    saveSupabaseConfig(newConfig);
    setSupabaseConfig(newConfig);
    return res;
  }, []);

  // Campaign Actions
  const createCampaign = useCallback((data: Omit<Campaign, 'id' | 'createdAt' | 'stats'>): string => {
    const newId = 'camp-' + Date.now();
    const newCampaign: Campaign = {
      ...data,
      id: newId,
      createdAt: new Date().toISOString(),
      stats: {
        totalLeads: data.leads.length,
        sent: data.leads.filter((l) => l.status !== 'ready_for_outreach').length,
        opened: data.leads.filter((l) => l.openedCount > 0).length,
        replied: data.leads.filter((l) => l.status === 'replied').length,
        bounced: data.leads.filter((l) => l.status === 'bounced').length,
      },
    };

    setCampaigns((prev) => [newCampaign, ...prev]);
    return newId;
  }, []);

  const updateCampaign = useCallback((id: string, updates: Partial<Campaign>) => {
    setCampaigns((prev) =>
      prev.map((c) => {
        if (c.id !== id) return c;
        const updated = { ...c, ...updates };
        if (updates.leads) {
          updated.stats = {
            totalLeads: updates.leads.length,
            sent: updates.leads.filter((l) => l.status !== 'ready_for_outreach').length,
            opened: updates.leads.filter((l) => l.openedCount > 0).length,
            replied: updates.leads.filter((l) => l.status === 'replied').length,
            bounced: updates.leads.filter((l) => l.status === 'bounced').length,
          };
        }
        return updated;
      })
    );
  }, []);

  const deleteCampaign = useCallback((id: string) => {
    setCampaigns((prev) => prev.filter((c) => c.id !== id));
    if (activeCampaignId === id) setActiveCampaignId(null);
  }, [activeCampaignId]);

  const toggleCampaignStatus = useCallback((id: string) => {
    setCampaigns((prev) =>
      prev.map((c) => (c.id === id ? { ...c, status: c.status === 'active' ? 'paused' : 'active' } : c))
    );
  }, []);

  const importCampaignLeads = useCallback(
    (
      campaignId: string,
      newLeads: Array<
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
    ) => {
      setCampaigns((prev) =>
        prev.map((camp) => {
          if (camp.id !== campaignId) return camp;

          const createdLeads: Lead[] = newLeads.map((item, index) => ({
            ...item,
            id: `lead-${Date.now()}-${index}`,
            campaignId,
            currentStepIndex: 0,
            status: 'ready_for_outreach',
            assignedAccountId: camp.assignedAccountId,
            sequenceId: `seq-${campaignId}`,
            lastContactedAt: null,
            nextFollowUpAt: null,
            openedCount: 0,
            clickedCount: 0,
            history: [],
          }));

          const updatedLeads = [...camp.leads, ...createdLeads];
          return {
            ...camp,
            leads: updatedLeads,
            stats: {
              ...camp.stats,
              totalLeads: updatedLeads.length,
            },
          };
        })
      );
    },
    []
  );

  const updateCampaignSequence = useCallback((campaignId: string, steps: SequenceStep[]) => {
    setCampaigns((prev) =>
      prev.map((c) => (c.id === campaignId ? { ...c, sequenceSteps: steps } : c))
    );
  }, []);

  const deleteCampaignLead = useCallback((campaignId: string, leadId: string) => {
    setCampaigns((prev) =>
      prev.map((c) => {
        if (c.id !== campaignId) return c;
        const newLeads = c.leads.filter((l) => l.id !== leadId);
        return {
          ...c,
          leads: newLeads,
          stats: {
            ...c.stats,
            totalLeads: newLeads.length,
          },
        };
      })
    );
  }, []);

  const deleteMarkedCampaignLeads = useCallback((campaignId: string, leadIds: string[]) => {
    const idSet = new Set(leadIds);
    setCampaigns((prev) =>
      prev.map((c) => {
        if (c.id !== campaignId) return c;
        const newLeads = c.leads.filter((l) => !idSet.has(l.id));
        return {
          ...c,
          leads: newLeads,
          stats: {
            ...c.stats,
            totalLeads: newLeads.length,
            sent: newLeads.filter((l) => l.status !== 'ready_for_outreach').length,
            opened: newLeads.filter((l) => l.openedCount > 0).length,
            replied: newLeads.filter((l) => l.status === 'replied').length,
            bounced: newLeads.filter((l) => l.status === 'bounced').length,
          },
        };
      })
    );
  }, []);

  const deleteMarkedCampaigns = useCallback((campaignIds: string[]) => {
    const idSet = new Set(campaignIds);
    setCampaigns((prev) => prev.filter((c) => !idSet.has(c.id)));
  }, []);

  const clearMockData = useCallback(() => {
    setCampaigns([]);
    localStorage.removeItem(STORAGE_KEYS.CAMPAIGNS);
    saveLocalCampaignsCache([]);
  }, []);

  const loadSampleMockData = useCallback(() => {
    setCampaigns(INITIAL_CAMPAIGNS);
    saveLocalCampaignsCache(INITIAL_CAMPAIGNS);
  }, []);

  const updateLeadStatus = useCallback((campaignId: string, leadId: string, status: LeadStatus) => {
    setCampaigns((prev) =>
      prev.map((c) => {
        if (c.id !== campaignId) return c;
        return {
          ...c,
          leads: c.leads.map((l) => (l.id === leadId ? { ...l, status } : l)),
        };
      })
    );
  }, []);

  const duplicateCampaign = useCallback((campaignId: string): string => {
    const existing = campaigns.find((c) => c.id === campaignId);
    if (!existing) return '';

    const newId = 'camp-' + Date.now();
    const cloned: Campaign = {
      ...existing,
      id: newId,
      name: `${existing.name} (Copy)`,
      status: 'paused',
      createdAt: new Date().toISOString(),
      leads: existing.leads.map((l, idx) => ({
        ...l,
        id: `lead-cloned-${Date.now()}-${idx}`,
        campaignId: newId,
        status: 'ready_for_outreach',
        currentStepIndex: 0,
        lastContactedAt: null,
        nextFollowUpAt: null,
        openedCount: 0,
        clickedCount: 0,
        history: [],
      })),
      stats: {
        totalLeads: existing.leads.length,
        sent: 0,
        opened: 0,
        replied: 0,
        bounced: 0,
      },
    };

    setCampaigns((prev) => [cloned, ...prev]);
    return newId;
  }, [campaigns]);

  // Dispatch an automated initial outreach for a lead with sender account rotation
  const dispatchCampaignLeadOutreach = useCallback(
    (campaignId: string, leadId: string, explicitAccountId?: string) => {
      setCampaigns((prev) =>
        prev.map((camp) => {
          if (camp.id !== campaignId) return camp;

          const targetLead = camp.leads.find((l) => l.id === leadId);
          if (!targetLead) return camp;

          const assignedIds =
            camp.assignedAccountIds && camp.assignedAccountIds.length > 0
              ? camp.assignedAccountIds
              : [camp.assignedAccountId];

          const currentIdx = campaignRotationIndices[camp.id] || 0;
          const targetAccId = explicitAccountId || assignedIds[currentIdx % assignedIds.length];
          const senderAccount =
            accounts.find((a) => a.id === targetAccId) ||
            accounts.find((a) => a.id === camp.assignedAccountId) ||
            accounts[0];

          // Set random cooldown timer on this sender account (e.g. 2-5 minutes)
          const minMin = camp.minDelayMinutes ?? 2;
          const maxMin = camp.maxDelayMinutes ?? 5;
          const randomMin = minMin + Math.random() * Math.max(0, maxMin - minMin);
          const cooldownMs = Math.round(randomMin * 60 * 1000);

          setAccountNextAllowedSendTime((prevCoold) => ({
            ...prevCoold,
            [senderAccount.id]: Date.now() + cooldownMs,
          }));

          // Advance rotation pointer to next account
          setCampaignRotationIndices((prevRot) => ({
            ...prevRot,
            [camp.id]: (currentIdx + 1) % assignedIds.length,
          }));

          const step1 = camp.sequenceSteps[0] || {
            stepNumber: 1,
            subject: `Quick question about {{companyName}}`,
            body: `Hi {{firstName}},\n\nReaching out regarding {{companyName}}.\n\nBest,\n{{senderName}}`,
          };

          const renderedSubject = renderTemplate(step1.subject, targetLead, senderAccount);
          const renderedBody = renderTemplate(step1.body, targetLead, senderAccount);

          const outreachMsg: EmailMessage = {
            id: 'msg-' + Date.now(),
            leadId: targetLead.id,
            accountId: senderAccount.id,
            accountEmail: senderAccount.email,
            direction: 'outbound',
            senderEmail: senderAccount.email,
            recipientEmail: targetLead.email,
            subject: renderedSubject,
            body: renderedBody,
            timestamp: Date.now(),
            stepIndex: 0,
            status: 'sent',
            read: true,
          };

          // Determine next follow up delay
          const step2 = camp.sequenceSteps[1];
          let nextFollowUpAt: number | null = null;
          if (step2) {
            let delayMs = 60 * 1000; // 1 min default
            if (step2.delayUnit === 'minutes') delayMs = step2.delayAmount * 60 * 1000;
            if (step2.delayUnit === 'hours') delayMs = step2.delayAmount * 3600 * 1000;
            if (step2.delayUnit === 'days') delayMs = step2.delayAmount * 24 * 3600 * 1000;
            nextFollowUpAt = Date.now() + delayMs;
          }

          const updatedLead: Lead = {
            ...targetLead,
            status: 'outreach_sent',
            assignedAccountId: senderAccount.id,
            currentStepIndex: 1,
            lastContactedAt: Date.now(),
            nextFollowUpAt,
            history: [...targetLead.history, outreachMsg],
          };

          // Increment account sent
          setAccounts((prevAccs) =>
            prevAccs.map((a) => (a.id === senderAccount.id ? { ...a, sentToday: a.sentToday + 1 } : a))
          );

          addNotification(
            'outreach_sent',
            'Initial Outreach Sent',
            `Automated cold email sent to ${targetLead.firstName} (${targetLead.email}) via ${senderAccount.email}`,
            senderAccount.id,
            senderAccount.email,
            targetLead.id
          );

          const newLeads = camp.leads.map((l) => (l.id === leadId ? updatedLead : l));
          return {
            ...camp,
            leads: newLeads,
            stats: {
              ...camp.stats,
              sent: camp.stats.sent + 1,
            },
          };
        })
      );
    },
    [accounts, addNotification, campaignRotationIndices]
  );

  // Dispatch an automated follow-up step
  const dispatchFollowUp = useCallback(
    (campaignId: string, leadId: string, explicitAccountId?: string) => {
      setCampaigns((prev) =>
        prev.map((camp) => {
          if (camp.id !== campaignId) return camp;

          const targetLead = camp.leads.find((l) => l.id === leadId);
          if (!targetLead || targetLead.status === 'replied' || targetLead.status === 'bounced') return camp;

          const assignedIds =
            camp.assignedAccountIds && camp.assignedAccountIds.length > 0
              ? camp.assignedAccountIds
              : [camp.assignedAccountId];

          const currentIdx = campaignRotationIndices[camp.id] || 0;
          const targetAccId = explicitAccountId || assignedIds[currentIdx % assignedIds.length];
          const senderAccount =
            accounts.find((a) => a.id === targetAccId) ||
            accounts.find((a) => a.id === camp.assignedAccountId) ||
            accounts[0];

          // Set random cooldown timer on this sender account (e.g. 2-5 minutes)
          const minMin = camp.minDelayMinutes ?? 2;
          const maxMin = camp.maxDelayMinutes ?? 5;
          const randomMin = minMin + Math.random() * Math.max(0, maxMin - minMin);
          const cooldownMs = Math.round(randomMin * 60 * 1000);

          setAccountNextAllowedSendTime((prevCoold) => ({
            ...prevCoold,
            [senderAccount.id]: Date.now() + cooldownMs,
          }));

          // Advance rotation pointer to next account
          setCampaignRotationIndices((prevRot) => ({
            ...prevRot,
            [camp.id]: (currentIdx + 1) % assignedIds.length,
          }));

          const currentStep = camp.sequenceSteps[targetLead.currentStepIndex] || camp.sequenceSteps[1];
          if (!currentStep) return camp;

          // Trigger condition check
          if (currentStep.triggerCondition === 'opened_no_reply' && targetLead.openedCount === 0) {
            return camp; // wait until opened
          }

          const renderedSubject = renderTemplate(currentStep.subject, targetLead, senderAccount);
          const renderedBody = renderTemplate(currentStep.body, targetLead, senderAccount);

          const followUpMsg: EmailMessage = {
            id: 'msg-' + Date.now(),
            leadId: targetLead.id,
            accountId: senderAccount.id,
            accountEmail: senderAccount.email,
            direction: 'outbound',
            senderEmail: senderAccount.email,
            recipientEmail: targetLead.email,
            subject: renderedSubject,
            body: renderedBody,
            timestamp: Date.now(),
            stepIndex: targetLead.currentStepIndex,
            status: 'sent',
            read: true,
          };

          const nextStepIndex = targetLead.currentStepIndex + 1;
          const nextStep = camp.sequenceSteps[nextStepIndex];
          let nextFollowUpAt: number | null = null;

          if (nextStep) {
            let delayMs = 60 * 1000;
            if (nextStep.delayUnit === 'minutes') delayMs = nextStep.delayAmount * 60 * 1000;
            if (nextStep.delayUnit === 'hours') delayMs = nextStep.delayAmount * 3600 * 1000;
            if (nextStep.delayUnit === 'days') delayMs = nextStep.delayAmount * 24 * 3600 * 1000;
            nextFollowUpAt = Date.now() + delayMs;
          }

          const updatedLead: Lead = {
            ...targetLead,
            status: nextStep ? 'outreach_sent' : 'completed',
            assignedAccountId: senderAccount.id,
            currentStepIndex: nextStepIndex,
            lastContactedAt: Date.now(),
            nextFollowUpAt,
            history: [...targetLead.history, followUpMsg],
          };

          setAccounts((prevAccs) =>
            prevAccs.map((a) => (a.id === senderAccount.id ? { ...a, sentToday: a.sentToday + 1 } : a))
          );

          addNotification(
            'followup_due',
            `Follow-up #${currentStep.stepNumber} Sent`,
            `Automated sequence email dispatched to ${targetLead.firstName} (${targetLead.email}) via ${senderAccount.email}`,
            senderAccount.id,
            senderAccount.email,
            targetLead.id
          );

          return {
            ...camp,
            leads: camp.leads.map((l) => (l.id === leadId ? updatedLead : l)),
          };
        })
      );
    },
    [accounts, addNotification, campaignRotationIndices]
  );

  // Lead simulations & direct replies
  const simulateLeadReply = useCallback((leadId: string, customReplyText?: string) => {
    setCampaigns((prev) =>
      prev.map((camp) => {
        const lead = camp.leads.find((l) => l.id === leadId);
        if (!lead) return camp;

        const senderAccount = accounts.find((a) => a.id === camp.assignedAccountId) || accounts[0];
        const replyMsg: EmailMessage = {
          id: 'msg-rep-' + Date.now(),
          leadId,
          accountId: senderAccount.id,
          accountEmail: senderAccount.email,
          direction: 'inbound',
          senderEmail: lead.email,
          recipientEmail: senderAccount.email,
          subject: `Re: Quick question about ${lead.companyName}`,
          body:
            customReplyText ||
            `Hi ${senderAccount.senderName},\n\nThanks for reaching out! This looks relevant for our roadmap. Could we schedule a 15-minute call this week?`,
          timestamp: Date.now(),
          stepIndex: lead.currentStepIndex,
          status: 'replied',
          read: false,
        };

        const updatedLead: Lead = {
          ...lead,
          status: 'replied',
          nextFollowUpAt: null, // stop sequence on reply!
          history: [...lead.history, replyMsg],
        };

        addNotification(
          'reply_received',
          `New Reply from ${lead.firstName} ${lead.lastName}`,
          `"${lead.companyName}" replied to your outreach!`,
          senderAccount.id,
          senderAccount.email,
          lead.id
        );

        return {
          ...camp,
          leads: camp.leads.map((l) => (l.id === leadId ? updatedLead : l)),
          stats: {
            ...camp.stats,
            replied: camp.stats.replied + 1,
          },
        };
      })
    );
  }, [accounts, addNotification]);

  const simulateLeadOpen = useCallback((leadId: string) => {
    setCampaigns((prev) =>
      prev.map((camp) => {
        const lead = camp.leads.find((l) => l.id === leadId);
        if (!lead) return camp;

        const updatedLead: Lead = {
          ...lead,
          status: lead.status === 'outreach_sent' ? 'opened' : lead.status,
          openedCount: lead.openedCount + 1,
        };

        return {
          ...camp,
          leads: camp.leads.map((l) => (l.id === leadId ? updatedLead : l)),
          stats: {
            ...camp.stats,
            opened: Math.max(camp.stats.opened, camp.leads.filter((l) => l.openedCount > 0).length + 1),
          },
        };
      })
    );
  }, []);

  const sendInboxReply = useCallback((leadId: string, body: string, subject?: string) => {
    setCampaigns((prev) =>
      prev.map((camp) => {
        const lead = camp.leads.find((l) => l.id === leadId);
        if (!lead) return camp;

        const senderAccount = accounts.find((a) => a.id === camp.assignedAccountId) || accounts[0];
        const newMsg: EmailMessage = {
          id: 'msg-' + Date.now(),
          leadId,
          accountId: senderAccount.id,
          accountEmail: senderAccount.email,
          direction: 'outbound',
          senderEmail: senderAccount.email,
          recipientEmail: lead.email,
          subject: subject || `Re: ${lead.history[lead.history.length - 1]?.subject || 'Conversation'}`,
          body,
          timestamp: Date.now(),
          stepIndex: lead.currentStepIndex,
          status: 'sent',
          read: true,
        };

        const updatedLead: Lead = {
          ...lead,
          history: [...lead.history, newMsg],
        };

        return {
          ...camp,
          leads: camp.leads.map((l) => (l.id === leadId ? updatedLead : l)),
        };
      })
    );
  }, [accounts]);

  // Account actions
  const addAccount = useCallback((accountData: Omit<GmailAccount, 'id' | 'sentToday' | 'unreadReplies' | 'dueFollowUps' | 'connectedAt'>) => {
    const newAccount: GmailAccount = {
      ...accountData,
      id: 'acc-' + Date.now(),
      sentToday: 0,
      unreadReplies: 0,
      dueFollowUps: 0,
      connectedAt: new Date().toISOString(),
    };
    setAccounts((prev) => [...prev, newAccount]);
  }, []);

  const updateAccount = useCallback((id: string, updates: Partial<GmailAccount>) => {
    setAccounts((prev) => prev.map((a) => (a.id === id ? { ...a, ...updates } : a)));
  }, []);

  const deleteAccount = useCallback((id: string) => {
    setAccounts((prev) => prev.filter((a) => a.id !== id));
  }, []);

  // Notifications
  const markNotificationAsRead = useCallback((id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  }, []);

  const clearNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  const toggleAutomationEngine = useCallback(() => {
    setAutomationRunning((prev) => !prev);
  }, []);

  // Autonomous Engine Ticker (Runs every 2 seconds)
  useEffect(() => {
    if (!automationRunning) return;

    const interval = setInterval(() => {
      campaigns.forEach((camp) => {
        if (camp.status !== 'active') return;

        // Check if currently inside sending window (e.g. 08:00 to 22:00)
        const inWindow = isCurrentTimeInWindow(
          camp.scheduleWindow.startTime || '08:00',
          camp.scheduleWindow.endTime || '22:00'
        );

        setAutomationState((prev) => ({
          ...prev,
          isRunning: true,
          isInScheduleWindow: inWindow,
        }));

        if (!inWindow) return; // Skip dispatch outside sending window

        // Check for pending outreach lead or due follow-up
        const pendingLead = camp.leads.find((l) => l.status === 'ready_for_outreach');
        const now = Date.now();
        const dueLead = !pendingLead
          ? camp.leads.find(
              (l) => l.status !== 'replied' && l.status !== 'bounced' && l.nextFollowUpAt && l.nextFollowUpAt <= now
            )
          : null;

        if (!pendingLead && !dueLead) return;

        // Multi-Account Swapping and Cooldown Logic:
        const assignedIds =
          camp.assignedAccountIds && camp.assignedAccountIds.length > 0
            ? camp.assignedAccountIds
            : [camp.assignedAccountId];

        const currentIdx = campaignRotationIndices[camp.id] || 0;
        const targetAccountId = assignedIds[currentIdx % assignedIds.length];
        const targetAccount = accounts.find((a) => a.id === targetAccountId) || accounts[0];

        // Check if this account's random cooldown timer has arrived
        const nextAllowed = accountNextAllowedSendTime[targetAccount.id] || 0;
        if (now < nextAllowed) {
          // Mailbox still in random cooldown timer! Waiting for timer to arrive.
          return;
        }

        // Target mailbox is ready to send!
        if (pendingLead) {
          dispatchCampaignLeadOutreach(camp.id, pendingLead.id, targetAccount.id);
        } else if (dueLead) {
          dispatchFollowUp(camp.id, dueLead.id, targetAccount.id);
        }
      });
    }, 3000);

    return () => clearInterval(interval);
  }, [
    automationRunning,
    campaigns,
    accounts,
    accountNextAllowedSendTime,
    campaignRotationIndices,
    dispatchCampaignLeadOutreach,
    dispatchFollowUp,
  ]);

  const dueCountsByAccount = useMemo(() => {
    const counts: Record<string, number> = {};
    accounts.forEach((a) => {
      counts[a.id] = 0;
    });
    allLeads.forEach((l) => {
      if (l.status === 'followup_due' || (l.nextFollowUpAt && l.nextFollowUpAt <= Date.now())) {
        counts[l.assignedAccountId] = (counts[l.assignedAccountId] || 0) + 1;
      }
    });
    return counts;
  }, [accounts, allLeads]);

  const replyCountsByAccount = useMemo(() => {
    const counts: Record<string, number> = {};
    accounts.forEach((a) => {
      counts[a.id] = 0;
    });
    allLeads.forEach((l) => {
      if (l.status === 'replied') {
        counts[l.assignedAccountId] = (counts[l.assignedAccountId] || 0) + 1;
      }
    });
    return counts;
  }, [accounts, allLeads]);

  const defaultSequence = useMemo(() => {
    return campaigns[0]?.sequenceSteps
      ? {
          id: 'seq-default',
          name: 'Default Campaign Sequence',
          description: '',
          isActive: true,
          assignedAccountIds: accounts.map((a) => a.id),
          steps: campaigns[0].sequenceSteps,
        }
      : {
          id: 'seq-default',
          name: 'Default',
          description: '',
          isActive: true,
          assignedAccountIds: [],
          steps: [],
        };
  }, [campaigns, accounts]);

  const dispatchAllDueNow = useCallback(() => {
    campaigns.forEach((c) => {
      c.leads.forEach((l) => {
        if (l.status === 'ready_for_outreach') {
          dispatchCampaignLeadOutreach(c.id, l.id);
        } else if (l.status !== 'replied' && l.status !== 'bounced') {
          dispatchFollowUp(c.id, l.id);
        }
      });
    });
  }, [campaigns, dispatchCampaignLeadOutreach, dispatchFollowUp]);

  const addLead = useCallback(
    (leadData: any) => {
      const targetCamp = campaigns[0];
      if (targetCamp) {
        importCampaignLeads(targetCamp.id, [leadData]);
      }
    },
    [campaigns, importCampaignLeads]
  );

  const bulkAddLeads = useCallback(
    (leadsData: any[]) => {
      const targetCamp = campaigns[0];
      if (targetCamp) {
        importCampaignLeads(targetCamp.id, leadsData);
      }
    },
    [campaigns, importCampaignLeads]
  );

  const sendManualOutreach = useCallback(
    (leadId: string) => {
      const camp = campaigns.find((c) => c.leads.some((l) => l.id === leadId)) || campaigns[0];
      if (camp) {
        dispatchCampaignLeadOutreach(camp.id, leadId);
      }
    },
    [campaigns, dispatchCampaignLeadOutreach]
  );

  const dispatchFollowUpForLead = useCallback(
    (leadId: string) => {
      const camp = campaigns.find((c) => c.leads.some((l) => l.id === leadId)) || campaigns[0];
      if (camp) {
        dispatchFollowUp(camp.id, leadId);
      }
    },
    [campaigns, dispatchFollowUp]
  );

  const forceFollowUpDueNow = useCallback((leadId: string) => {
    setCampaigns((prev) =>
      prev.map((c) => ({
        ...c,
        leads: c.leads.map((l) =>
          l.id === leadId ? { ...l, nextFollowUpAt: Date.now() - 1000, status: 'followup_due' } : l
        ),
      }))
    );
  }, []);

  const updateTimingSettings = useCallback((updates: Partial<TimingSettings>) => {
    // legacy stub
  }, []);

  const updateSequence = useCallback(
    (updates: any) => {
      if (campaigns[0] && updates.steps) {
        updateCampaignSequence(campaigns[0].id, updates.steps);
      }
    },
    [campaigns, updateCampaignSequence]
  );

  const syncWithSupabase = useCallback(async (): Promise<{ success: boolean; message: string }> => {
    const res = await syncCampaignsToSupabase(campaigns);
    if (res.success) {
      setSupabaseConfig((prev) => ({
        ...prev,
        isConnected: true,
        lastSyncTimestamp: Date.now(),
      }));
    }
    return res;
  }, [campaigns]);

  const markAllNotificationsAsRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  return (
    <AppContext.Provider
      value={{
        campaigns,
        activeCampaignId,
        accounts,
        leads: allLeads,
        timingSettings,
        automation: automationState,
        notifications,
        supabaseConfig,
        selectedAccountIdFilter,
        totalFollowUpsDue,
        unreadNotificationCount: notifications.filter((n) => !n.read).length,
        accountNextAllowedSendTime,
        resetAccountCooldown,
        setActiveCampaignId,
        setSelectedAccountIdFilter,
        createCampaign,
        updateCampaign,
        deleteCampaign,
        duplicateCampaign,
        toggleCampaignStatus,
        importCampaignLeads,
        deleteCampaignLead,
        deleteMarkedCampaignLeads,
        deleteMarkedCampaigns,
        clearMockData,
        loadSampleMockData,
        updateLeadStatus,
        updateCampaignSequence,
        dispatchCampaignLeadOutreach,
        updateSupabaseCredentials,
        syncWithSupabase,
        addAccount,
        updateAccount,
        deleteAccount,
        sendInboxReply,
        simulateLeadReply,
        simulateLeadOpen,
        toggleAutomationEngine,
        markNotificationAsRead,
        markAllNotificationsAsRead,
        clearNotifications,
        dueCountsByAccount,
        replyCountsByAccount,
        sequence: defaultSequence,
        dispatchAllDueNow,
        addLead,
        bulkAddLeads,
        sendManualOutreach,
        dispatchFollowUpForLead,
        forceFollowUpDueNow,
        updateTimingSettings,
        updateSequence,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
