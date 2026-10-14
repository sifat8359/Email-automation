export type LeadStatus =
  | 'ready_for_outreach' // initial outreach pending automated send
  | 'outreach_sent'      // initial outreach sent, waiting for follow-up
  | 'followup_due'       // follow-up timer expired, ready to send
  | 'opened'             // lead opened email
  | 'replied'            // lead responded (stops sequence!)
  | 'bounced'            // email bounced
  | 'completed'          // finished all sequence steps
  | 'paused';

export interface ImapConfig {
  host: string;
  port: number;
  secure?: boolean;
  user: string;
  pass: string;
  isVerified?: boolean;
  lastSyncedAt?: number;
}

export interface SmtpConfig {
  host: string;
  port: number;
  secure?: boolean;
  user: string;
  pass: string;
  isVerified?: boolean;
  lastVerifiedAt?: number;
  imapHost?: string;
  imapPort?: number;
}

export interface GmailAccount {
  id: string;
  email: string;
  senderName: string;
  avatar: string;
  color: string;
  status: 'active' | 'warming' | 'paused' | 'error';
  dailyLimit: number;
  sentToday: number;
  warmupScore: number;
  unreadReplies: number;
  dueFollowUps: number;
  provider: 'gmail' | 'workspace' | 'outlook' | 'zoho' | 'custom_smtp';
  signature?: string;
  smtpConfig?: SmtpConfig;
  imapConfig?: ImapConfig;
  connectedAt: string;
}

export type TriggerCondition =
  | 'no_reply'          // send if lead has not replied
  | 'opened_no_reply'   // send only if lead opened email but did not reply
  | 'clicked_no_reply'  // send only if lead clicked link but did not reply
  | 'always';           // send regardless

export interface SequenceStepVariant {
  id: string;
  name: string; // "Variant A", "Variant B"
  subject: string;
  body: string;
}

export interface SequenceStep {
  id: string;
  stepNumber: number;
  type: 'initial_outreach' | 'auto_followup';
  delayAmount: number; // e.g. 1, 5, 24
  delayUnit: 'seconds' | 'minutes' | 'hours' | 'days';
  subject: string;
  body: string;
  triggerCondition: TriggerCondition;
  variants?: SequenceStepVariant[];
  activeVariant?: 'A' | 'B';
}

export interface TimingSettings {
  minIntervalSeconds: number; // e.g. 120 (2 min)
  maxIntervalSeconds: number; // e.g. 300 (5 min)
  enableRandomInterval: boolean;
  testModeFastInterval: boolean; // fast 5-15s mode for testing
  sendingWindowStart: string; // "08:00"
  sendingWindowEnd: string;   // "22:00"
  stopOnReply: boolean;
  trackOpens: boolean;
  trackClicks: boolean;
}

export interface EmailMessage {
  id: string;
  leadId: string;
  accountId: string;
  accountEmail: string;
  direction: 'outbound' | 'inbound';
  senderEmail: string;
  recipientEmail: string;
  subject: string;
  body: string;
  timestamp: number;
  stepIndex: number;
  status: 'sent' | 'delivered' | 'opened' | 'replied' | 'bounced';
  read: boolean;
}

export interface Lead {
  id: string;
  campaignId?: string;
  firstName: string;
  lastName: string;
  email: string;
  companyName: string;
  website: string;
  title: string;
  status: LeadStatus;
  assignedAccountId: string;
  sequenceId: string;
  currentStepIndex: number; // 0 = step 1 (initial outreach), 1 = step 2 (follow-up 1), etc.
  lastContactedAt: number | null;
  nextFollowUpAt: number | null; // epoch timestamp in ms
  history: EmailMessage[];
  openedCount: number;
  clickedCount: number;
  sentiment?: 'interested' | 'meeting_requested' | 'not_interested' | 'neutral';
  notes?: string;
  customFields?: Record<string, string>;
  botScansDetected?: number;
}

export interface CampaignScheduleWindow {
  startTime: string; // e.g. "08:00" (morning 8)
  endTime: string;   // e.g. "22:00" (night 10)
  timezone: string;  // e.g. "Asia/Dhaka" or user local
  daysOfWeek: number[]; // [1, 2, 3, 4, 5] (Monday to Friday or all)
}

export interface CampaignOptions {
  stopOnReply: boolean;
  stopOnLinkClick: boolean;
  trackOpens: boolean;
  trackClicks: boolean;
  customUnsubscribeText?: string;
  assignedAccountIds?: string[];
  botFilterThresholdSeconds?: number; // Filter scanner pre-fetches (e.g. 10 seconds)
}

export interface Campaign {
  id: string;
  name: string;
  status: 'active' | 'paused' | 'draft' | 'completed';
  assignedAccountId: string;
  assignedAccountIds?: string[];
  scheduleWindow: CampaignScheduleWindow;
  minDelayMinutes: number; // e.g. 2
  maxDelayMinutes: number; // e.g. 5
  dailyLimit: number;
  sequenceSteps: SequenceStep[];
  leads: Lead[];
  createdAt: string;
  options?: CampaignOptions;
  stats: {
    totalLeads: number;
    sent: number;
    opened: number;
    replied: number;
    bounced: number;
    botFiltered?: number;
  };
}

export interface SupabaseConfig {
  url: string;
  anonKey: string;
  isConnected: boolean;
  lastSyncTimestamp: number | null;
}

export interface CampaignSequence {
  id: string;
  name: string;
  description: string;
  isActive: boolean;
  steps: SequenceStep[];
  assignedAccountIds: string[];
}

export interface AppNotification {
  id: string;
  type: 'followup_due' | 'reply_received' | 'outreach_sent' | 'bounce';
  title: string;
  message: string;
  timestamp: number;
  accountId: string;
  accountEmail: string;
  leadId?: string;
  read: boolean;
}

export interface AutomationEngineState {
  isRunning: boolean;
  isDispatching: boolean;
  nextScheduledSendTimestamp: number | null;
  lastRandomIntervalSeconds: number | null;
  activeSendingAccountEmail: string | null;
  isInScheduleWindow: boolean;
}
