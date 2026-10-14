import express, { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import nodemailer, { SendMailOptions } from 'nodemailer';
import { ImapFlow } from 'imapflow';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const HOST = '0.0.0.0';

app.use(express.json({ limit: '10mb' }));

interface SmtpPayload {
  host: string;
  port: number | string;
  secure?: boolean;
  user: string;
  pass: string;
}

function createTransporter(config: SmtpPayload) {
  const portNum = Number(config.port) || 587;
  const isSecure = config.secure !== undefined ? Boolean(config.secure) : portNum === 465;

  return nodemailer.createTransport({
    host: config.host.trim(),
    port: portNum,
    secure: isSecure,
    auth: {
      user: config.user.trim(),
      pass: config.pass.trim(),
    },
    tls: {
      rejectUnauthorized: false, // Prevents self-signed or proxy TLS issues on custom domains
    },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000,
  });
}

// 1. Verify SMTP Connection Handshake
app.post('/api/email/verify-smtp', async (req: Request, res: Response) => {
  const { host, port, secure, user, pass } = req.body;

  if (!host || !user || !pass) {
    return res.status(400).json({
      success: false,
      error: 'Host, user email, and password/app-password are required.',
    });
  }

  try {
    const transporter = createTransporter({ host, port, secure, user, pass });
    await transporter.verify();

    return res.json({
      success: true,
      message: `Successfully connected to ${host}:${port || 587} for account ${user}!`,
    });
  } catch (error: any) {
    console.error('[SMTP Verify Error]:', error);
    let errorMessage = error?.message || 'Failed to authenticate with SMTP server.';
    
    if (errorMessage.includes('Invalid login') || errorMessage.includes('535') || errorMessage.includes('Authentication unsuccessful')) {
      errorMessage = 'Invalid username or password. For Gmail or Microsoft 365, you must use a generated 16-character App Password (not your normal account password).';
    } else if (errorMessage.includes('ECONNREFUSED') || errorMessage.includes('ETIMEDOUT')) {
      errorMessage = `Connection timed out or refused by host ${host} on port ${port}. Please check the server address and firewall.`;
    }

    return res.status(400).json({
      success: false,
      error: errorMessage,
    });
  }
});

// 2. Send Real Email via SMTP
app.post('/api/email/send', async (req: Request, res: Response) => {
  const {
    smtpConfig,
    fromName,
    fromEmail,
    to,
    subject,
    body,
    html,
    replyTo,
    messageIdHeader,
  } = req.body;

  if (!smtpConfig || !smtpConfig.host || !smtpConfig.user || !smtpConfig.pass) {
    return res.status(400).json({
      success: false,
      error: 'Sender SMTP configuration is missing or incomplete.',
    });
  }

  if (!to || !subject || (!body && !html)) {
    return res.status(400).json({
      success: false,
      error: 'Recipient email, subject, and message content are required.',
    });
  }

  try {
    const transporter = createTransporter(smtpConfig);
    const sender = fromName ? `"${fromName.replace(/"/g, '')}" <${fromEmail || smtpConfig.user}>` : (fromEmail || smtpConfig.user);

    // Format plain text into clean HTML paragraphs if html body wasn't provided
    const formattedHtml =
      html ||
      body
        .split('\n\n')
        .map((p: string) => `<p style="margin: 0 0 14px 0; line-height: 1.6; color: #1e293b; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">${p.replace(/\n/g, '<br/>')}</p>`)
        .join('');

    const mailOptions: SendMailOptions = {
      from: sender,
      to,
      subject,
      text: body || '',
      html: formattedHtml,
      replyTo: replyTo || fromEmail || smtpConfig.user,
      headers: {
        'X-Mailer': 'NexusReach Cold Outreach Automation Engine v1.0',
        ...(messageIdHeader ? { 'In-Reply-To': messageIdHeader, References: messageIdHeader } : {}),
      },
    };

    const info = await transporter.sendMail(mailOptions);

    return res.json({
      success: true,
      messageId: info.messageId,
      accepted: info.accepted,
      response: info.response,
      timestamp: Date.now(),
    });
  } catch (error: any) {
    console.error('[SMTP Send Error]:', error);
    return res.status(500).json({
      success: false,
      error: error?.message || 'Failed to dispatch email via SMTP.',
    });
  }
});

// 3. Send Test Email (Deliverability & Verification Check)
app.post('/api/email/test-send', async (req: Request, res: Response) => {
  const { smtpConfig, fromName, fromEmail, recipientEmail } = req.body;

  if (!smtpConfig || !recipientEmail) {
    return res.status(400).json({
      success: false,
      error: 'SMTP configuration and recipient email are required.',
    });
  }

  try {
    const transporter = createTransporter(smtpConfig);
    const sender = fromName ? `"${fromName.replace(/"/g, '')}" <${fromEmail || smtpConfig.user}>` : (fromEmail || smtpConfig.user);

    const testHtml = `
      <div style="max-width: 580px; margin: 0 auto; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; background: #ffffff;">
        <div style="background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); padding: 24px; text-align: center; color: #ffffff;">
          <h1 style="margin: 0; font-size: 20px; font-weight: 700; letter-spacing: -0.5px;">NexusReach Verification</h1>
          <p style="margin: 6px 0 0; font-size: 13px; opacity: 0.9;">SMTP Connection Handshake Confirmed</p>
        </div>
        <div style="padding: 24px; color: #334155; font-size: 14px; line-height: 1.6;">
          <p style="margin-top: 0; font-weight: 600; font-size: 15px; color: #0f172a;">Congratulations!</p>
          <p>Your outbound SMTP mailbox (<strong style="color: #4f46e5;">${smtpConfig.user}</strong>) has been successfully verified through host <strong style="color: #0f172a;">${smtpConfig.host}:${smtpConfig.port || 587}</strong>.</p>
          <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px 16px; margin: 16px 0; font-family: monospace; font-size: 12px; color: #475569;">
            <div>• Sender: ${sender}</div>
            <div>• Recipient: ${recipientEmail}</div>
            <div>• Timestamp: ${new Date().toUTCString()}</div>
            <div>• Status: Live Transport Operational</div>
          </div>
          <p style="margin-bottom: 0; font-size: 13px; color: #64748b;">You can now safely assign this mailbox to your automated cold email sequences.</p>
        </div>
      </div>
    `;

    const info = await transporter.sendMail({
      from: sender,
      to: recipientEmail,
      subject: `[NexusReach Test] SMTP Connection Verified for ${smtpConfig.user}`,
      html: testHtml,
      text: `Congratulations! Your outbound SMTP mailbox (${smtpConfig.user}) has been successfully verified and is operational for cold outreach sequences.`,
    });

    return res.json({
      success: true,
      messageId: info.messageId,
      message: `Test email successfully delivered to ${recipientEmail}!`,
    });
  } catch (error: any) {
    console.error('[SMTP Test Send Error]:', error);
    return res.status(500).json({
      success: false,
      error: error?.message || 'Failed to dispatch test email.',
    });
  }
});

// 1x1 transparent GIF buffer (43 bytes)
const TRANSPARENT_1X1_GIF = Buffer.from(
  'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
  'base64'
);

interface TrackAuditRecord {
  leadId: string;
  campId?: string;
  sentAt: number;
  openCount: number;
  botScansFiltered: number;
  lastEventAt: number;
  lastEventReason: string;
}

const trackingAuditStore = new Map<string, TrackAuditRecord>();

// 4. Open Tracking Web Beacon with 10-Second Bot/Scanner Mitigation
app.get('/api/track/open', (req: Request, res: Response) => {
  const { leadId, campId, sentAt } = req.query;

  const now = Date.now();
  const sentTimestamp = sentAt ? Number(sentAt) : 0;
  const elapsedMs = sentTimestamp > 0 ? Math.max(0, now - sentTimestamp) : 999999;
  const elapsedSeconds = Number((elapsedMs / 1000).toFixed(2));

  // Security bots pre-fetch within 0-10 seconds of delivery
  const isSecurityBotPreFetch = sentTimestamp > 0 && elapsedMs < 10000;

  const key = String(leadId || 'anonymous');
  const existing: TrackAuditRecord = trackingAuditStore.get(key) || {
    leadId: key,
    campId: String(campId || ''),
    sentAt: sentTimestamp,
    openCount: 0,
    botScansFiltered: 0,
    lastEventAt: now,
    lastEventReason: '',
  };

  if (isSecurityBotPreFetch) {
    existing.botScansFiltered += 1;
    existing.lastEventAt = now;
    existing.lastEventReason = `Security scanner pre-fetch (${elapsedSeconds}s < 10s threshold) - NOT counted as human open.`;
    trackingAuditStore.set(key, existing);

    console.log(
      `[BOT FILTERED] Pixel hit for lead "${leadId}" arrived in ${elapsedSeconds}s (<10s). Flagged as security pre-fetch / fake open. Disregarded.`
    );

    res.set({
      'Content-Type': 'image/gif',
      'Content-Length': String(TRANSPARENT_1X1_GIF.length),
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
      'Pragma': 'no-cache',
      'Expires': '0',
      'X-NexusReach-Bot-Detected': 'true',
      'X-NexusReach-Elapsed-Seconds': String(elapsedSeconds),
      'X-NexusReach-Decision': 'Filtered (Bot Scanner Pre-fetch <10s)',
    });

    return res.send(TRANSPARENT_1X1_GIF);
  }

  // Valid Human Open (occurred >= 10 seconds after delivery)
  existing.openCount += 1;
  existing.lastEventAt = now;
  existing.lastEventReason = `Valid human open detected (${elapsedSeconds}s >= 10s threshold).`;
  trackingAuditStore.set(key, existing);

  console.log(
    `[VALID HUMAN OPEN] Lead "${leadId}" opened message after ${elapsedSeconds}s. Counted toward campaign open metrics.`
  );

  res.set({
    'Content-Type': 'image/gif',
    'Content-Length': String(TRANSPARENT_1X1_GIF.length),
    'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
    'Pragma': 'no-cache',
    'Expires': '0',
    'X-NexusReach-Bot-Detected': 'false',
    'X-NexusReach-Elapsed-Seconds': String(elapsedSeconds),
    'X-NexusReach-Decision': 'Counted (Verified Human Open >=10s)',
  });

  return res.send(TRANSPARENT_1X1_GIF);
});

// 5. Query Tracking Status for a lead
app.get('/api/track/status/:leadId', (req: Request, res: Response) => {
  const { leadId } = req.params;
  const record = trackingAuditStore.get(leadId);
  if (!record) {
    return res.json({ tracked: false, message: 'No open events recorded yet.' });
  }
  return res.json({ tracked: true, ...record });
});

// Health check endpoint
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', time: Date.now() });
});

// ==========================================
// 6. IMAP Inbound Sync & Mailbox Verification
// ==========================================

interface ImapPayload {
  host: string;
  port: number | string;
  secure?: boolean;
  user: string;
  pass: string;
}

function createImapClient(config: ImapPayload) {
  const portNum = Number(config.port) || 993;
  const isSecure = config.secure !== undefined ? Boolean(config.secure) : portNum === 993;

  return new ImapFlow({
    host: config.host.trim(),
    port: portNum,
    secure: isSecure,
    auth: {
      user: config.user.trim(),
      pass: config.pass.trim(),
    },
    logger: false,
    tls: {
      rejectUnauthorized: false,
    },
    connectionTimeout: 12000,
    greetingTimeout: 12000,
    socketTimeout: 15000,
  });
}

// Verify IMAP Connection Handshake
app.post('/api/email/verify-imap', async (req: Request, res: Response) => {
  const { host, port, secure, user, pass } = req.body;

  if (!host || !user || !pass) {
    return res.status(400).json({
      success: false,
      error: 'IMAP host, username, and password/app-password are required.',
    });
  }

  const client = createImapClient({ host, port, secure, user, pass });

  try {
    await client.connect();
    const lock = await client.getMailboxLock('INBOX');
    try {
      const mailbox = client.mailbox;
      const mailboxName = mailbox ? mailbox.path : 'INBOX';
      const totalMessages = mailbox ? mailbox.exists || 0 : 0;
      return res.json({
        success: true,
        message: `Successfully connected to IMAP ${host}:${port || 993} (${mailboxName})!`,
        totalMessages,
      });
    } finally {
      lock.release();
    }
  } catch (err: any) {
    console.error('[IMAP Verify Error]:', err);
    let errorMessage = err?.message || 'Failed to authenticate with IMAP server.';
    if (errorMessage.includes('Invalid credentials') || errorMessage.includes('AUTHENTICATIONFAILED')) {
      errorMessage = 'Invalid username or password. For Gmail or Microsoft 365, ensure an App Password is used.';
    }
    return res.status(400).json({
      success: false,
      error: errorMessage,
    });
  } finally {
    try {
      await client.logout();
    } catch {
      // ignore
    }
  }
});

// Live IMAP Inbound Sync & Prospect Reply Detection
app.post('/api/email/sync-imap', async (req: Request, res: Response) => {
  const { imapConfig, knownLeadEmails = [] } = req.body;

  if (!imapConfig || !imapConfig.host || !imapConfig.user || !imapConfig.pass) {
    return res.status(400).json({
      success: false,
      error: 'IMAP configuration is incomplete.',
    });
  }

  const client = createImapClient(imapConfig);
  const matchedReplies: Array<{
    leadEmail: string;
    fromEmail: string;
    fromName: string;
    subject: string;
    bodySnippet: string;
    date: number;
    messageId: string;
  }> = [];

  const rawRecentMessages: any[] = [];
  const normalizedLeadSet = new Set(knownLeadEmails.map((e: string) => e.toLowerCase().trim()));

  try {
    await client.connect();
    const lock = await client.getMailboxLock('INBOX');

    try {
      const status = await client.status('INBOX', { messages: true, unseen: true });
      const total = status ? status.messages || 0 : 0;
      const unseen = status ? status.unseen || 0 : 0;

      if (total > 0) {
        // Fetch up to 35 most recent messages from INBOX
        const fetchStart = Math.max(1, total - 35);
        const range = `${fetchStart}:*`;

        for await (const msg of client.fetch(range, {
          envelope: true,
          flags: true,
        })) {
          const env = msg.envelope;
          if (!env) continue;

          const fromObj = env.from?.[0];
          const fromAddress = (fromObj?.address || '').toLowerCase().trim();
          const fromName = fromObj?.name || fromAddress;
          const subject = env.subject || '(No subject)';
          const msgDate = env.date ? new Date(env.date).getTime() : Date.now();
          const messageId = env.messageId || `imap-${msg.seq}-${msg.uid}`;

          rawRecentMessages.push({
            uid: msg.uid,
            seq: msg.seq,
            from: fromAddress,
            fromName,
            subject,
            date: msgDate,
            messageId,
            inReplyTo: env.inReplyTo || '',
          });

          // Check if sender matches any known campaign lead
          if (fromAddress && normalizedLeadSet.has(fromAddress)) {
            matchedReplies.push({
              leadEmail: fromAddress,
              fromEmail: fromAddress,
              fromName,
              subject,
              bodySnippet: `Inbound reply received via IMAP: "${subject}" on ${new Date(msgDate).toLocaleString()}`,
              date: msgDate,
              messageId,
            });

            // Update in-memory scheduler if available
            handleInboundReplyMatch(fromAddress, subject, msgDate);
          }
        }
      }

      return res.json({
        success: true,
        mailbox: 'INBOX',
        totalMessages: total,
        unseen,
        recentCount: rawRecentMessages.length,
        matchedReplies,
        messages: rawRecentMessages.reverse().slice(0, 20),
        syncedAt: Date.now(),
      });
    } finally {
      lock.release();
    }
  } catch (err: any) {
    console.error('[IMAP Sync Error]:', err);
    return res.status(500).json({
      success: false,
      error: err?.message || 'Failed to sync inbound messages from IMAP.',
    });
  } finally {
    try {
      await client.logout();
    } catch {
      // ignore
    }
  }
});

// ==============================================================
// 7. Headless 24/7 Autonomous Cold Outreach Background Scheduler
// ==============================================================

interface SchedulerLog {
  id: string;
  timestamp: number;
  type: 'dispatch_outreach' | 'dispatch_followup' | 'reply_detected' | 'window_inactive' | 'cooldown_waiting' | 'sync' | 'error';
  campaignName?: string;
  leadEmail?: string;
  accountEmail?: string;
  message: string;
  status: 'success' | 'info' | 'warning' | 'error';
}

interface ServerSchedulerState {
  isRunning: boolean;
  lastTickAt: number;
  campaigns: any[];
  accounts: any[];
  accountNextAllowedTime: Record<string, number>;
  campaignRotationIndices: Record<string, number>;
  logs: SchedulerLog[];
}

const schedulerState: ServerSchedulerState = {
  isRunning: true,
  lastTickAt: 0,
  campaigns: [],
  accounts: [],
  accountNextAllowedTime: {},
  campaignRotationIndices: {},
  logs: [
    {
      id: 'init-1',
      timestamp: Date.now(),
      type: 'sync',
      message: 'NexusReach autonomous 24/7 background scheduler initialized and operational.',
      status: 'info',
    },
  ],
};

function addSchedulerLog(log: Omit<SchedulerLog, 'id' | 'timestamp'>) {
  const newLog: SchedulerLog = {
    ...log,
    id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    timestamp: Date.now(),
  };
  schedulerState.logs.unshift(newLog);
  if (schedulerState.logs.length > 100) {
    schedulerState.logs.pop();
  }
}

function handleInboundReplyMatch(leadEmail: string, subject: string, date: number) {
  for (const camp of schedulerState.campaigns) {
    const lead = camp.leads?.find((l: any) => l.email?.toLowerCase().trim() === leadEmail.toLowerCase().trim());
    if (lead) {
      if (lead.status !== 'replied') {
        lead.status = 'replied';
        lead.nextFollowUpAt = null; // Immediately halt sequence!
        lead.sentiment = 'interested';
        camp.stats = camp.stats || {};
        camp.stats.replied = (camp.stats.replied || 0) + 1;

        addSchedulerLog({
          type: 'reply_detected',
          campaignName: camp.name,
          leadEmail,
          message: `Inbound prospect reply detected via IMAP: "${subject}". Follow-up sequence immediately halted to preserve sender reputation.`,
          status: 'success',
        });
      }
    }
  }
}

// Lightweight server-side template renderer for headless outreach
function renderServerTemplate(text: string, lead: any, account: any): string {
  if (!text) return '';
  return text
    .replace(/\{\{firstName\}\}/gi, lead.firstName || 'there')
    .replace(/\{\{lastName\}\}/gi, lead.lastName || '')
    .replace(/\{\{companyName\}\}/gi, lead.companyName || 'your company')
    .replace(/\{\{website\}\}/gi, lead.website || '')
    .replace(/\{\{title\}\}/gi, lead.title || 'Leader')
    .replace(/\{\{senderName\}\}/gi, account.senderName || account.email || 'Team')
    .replace(/\{\{senderEmail\}\}/gi, account.email || '');
}

function isServerTimeInWindow(startTimeStr: string, endTimeStr: string): boolean {
  try {
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    const [startH, startM] = (startTimeStr || '08:00').split(':').map(Number);
    const [endH, endM] = (endTimeStr || '22:00').split(':').map(Number);

    const startMinutes = startH * 60 + (startM || 0);
    const endMinutes = endH * 60 + (endM || 0);

    if (startMinutes <= endMinutes) {
      return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
    } else {
      return currentMinutes >= startMinutes || currentMinutes <= endMinutes;
    }
  } catch {
    return true;
  }
}

// Main autonomous dispatcher cycle
async function executeSchedulerCycle() {
  if (!schedulerState.isRunning) return;
  schedulerState.lastTickAt = Date.now();

  const now = Date.now();
  const currentDayOfWeek = new Date().getDay(); // 0 is Sunday, 1 is Monday, ...

  for (const campaign of schedulerState.campaigns) {
    if (campaign.status !== 'active') continue;

    // Check days of week if specified
    if (campaign.scheduleWindow?.days && Array.isArray(campaign.scheduleWindow.days)) {
      if (!campaign.scheduleWindow.days.includes(currentDayOfWeek)) {
        continue; // Outside allowed sending days
      }
    }

    // Check sending window (e.g. 08:00 - 22:00)
    const inWindow = isServerTimeInWindow(
      campaign.scheduleWindow?.startTime || '08:00',
      campaign.scheduleWindow?.endTime || '22:00'
    );
    if (!inWindow) continue;

    const leads = campaign.leads || [];
    if (leads.length === 0) continue;

    // Find candidate lead: initial pending outreach or due follow-up
    const pendingLead = leads.find((l: any) => l.status === 'ready_for_outreach');
    const dueLead = !pendingLead
      ? leads.find(
          (l: any) =>
            l.status !== 'replied' &&
            l.status !== 'bounced' &&
            l.status !== 'completed' &&
            l.nextFollowUpAt &&
            l.nextFollowUpAt <= now
        )
      : null;

    const targetLead = pendingLead || dueLead;
    if (!targetLead) continue;

    // Mailbox rotation and cooldown check
    const assignedIds =
      campaign.assignedAccountIds && campaign.assignedAccountIds.length > 0
        ? campaign.assignedAccountIds
        : [campaign.assignedAccountId || schedulerState.accounts[0]?.id];

    const currentIdx = schedulerState.campaignRotationIndices[campaign.id] || 0;
    const targetAccountId = assignedIds[currentIdx % assignedIds.length];
    const senderAccount =
      schedulerState.accounts.find((a: any) => a.id === targetAccountId) ||
      schedulerState.accounts.find((a: any) => a.id === campaign.assignedAccountId) ||
      schedulerState.accounts[0];

    if (!senderAccount) continue;

    // Check if mailbox is currently in cooldown delay
    const nextAllowedTime = schedulerState.accountNextAllowedTime[senderAccount.id] || 0;
    if (now < nextAllowedTime) {
      // Cooldown in progress
      continue;
    }

    // Set randomized cooldown (e.g. 2 to 5 minutes)
    const minMin = campaign.minDelayMinutes ?? 2;
    const maxMin = campaign.maxDelayMinutes ?? 5;
    const randomMin = minMin + Math.random() * Math.max(0, maxMin - minMin);
    const cooldownMs = Math.round(randomMin * 60 * 1000);

    schedulerState.accountNextAllowedTime[senderAccount.id] = now + cooldownMs;
    schedulerState.campaignRotationIndices[campaign.id] = (currentIdx + 1) % assignedIds.length;

    // Determine sequence step
    const isInitial = Boolean(pendingLead);
    const stepIndex = isInitial ? 0 : targetLead.currentStepIndex || 0;
    const sequenceSteps = campaign.sequenceSteps || [];
    const currentStep = sequenceSteps[stepIndex] || {
      stepNumber: stepIndex + 1,
      subject: `Quick question about {{companyName}}`,
      body: `Hi {{firstName}},\n\nReaching out regarding {{companyName}}.\n\nBest,\n{{senderName}}`,
    };

    // Evaluate trigger condition for follow-ups
    if (!isInitial && currentStep.triggerCondition === 'opened_no_reply' && (targetLead.openedCount || 0) === 0) {
      continue; // Skip until prospect opens
    }

    const renderedSubject = renderServerTemplate(currentStep.subject, targetLead, senderAccount);
    const renderedBody = renderServerTemplate(currentStep.body, targetLead, senderAccount);

    // Append 1x1 open tracking pixel
    const trackingPixelUrl = `http://0.0.0.0:3000/api/track/open?leadId=${encodeURIComponent(targetLead.id)}&campId=${encodeURIComponent(campaign.id)}&sentAt=${now}`;
    const htmlWithBeacon = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 14px; line-height: 1.6; color: #1e293b;">
        ${renderedBody.split('\n\n').map((p: string) => `<p style="margin: 0 0 14px 0;">${p.replace(/\n/g, '<br/>')}</p>`).join('')}
        <img src="${trackingPixelUrl}" width="1" height="1" alt="" style="display:none; width:1px; height:1px; border:0;" />
      </div>
    `;

    // Dispatch via real SMTP if configured
    let dispatchedSuccessfully = false;
    let transportResponse = '';

    if (senderAccount.smtpConfig?.host && senderAccount.smtpConfig?.user && senderAccount.smtpConfig?.pass) {
      try {
        const transporter = createTransporter(senderAccount.smtpConfig);
        const fromHeader = senderAccount.senderName
          ? `"${senderAccount.senderName.replace(/"/g, '')}" <${senderAccount.email || senderAccount.smtpConfig.user}>`
          : (senderAccount.email || senderAccount.smtpConfig.user);

        const info = await transporter.sendMail({
          from: fromHeader,
          to: targetLead.email,
          subject: renderedSubject,
          text: renderedBody,
          html: htmlWithBeacon,
          replyTo: senderAccount.email || senderAccount.smtpConfig.user,
          headers: {
            'X-Mailer': 'NexusReach Headless Outreach Engine v1.0',
          },
        });

        dispatchedSuccessfully = true;
        transportResponse = info.response || info.messageId || 'Delivered';
      } catch (err: any) {
        console.error('[Headless SMTP Dispatch Error]:', err);
        addSchedulerLog({
          type: 'error',
          campaignName: campaign.name,
          leadEmail: targetLead.email,
          accountEmail: senderAccount.email,
          message: `SMTP dispatch failed: ${err?.message || 'Transport error'}`,
          status: 'error',
        });
      }
    } else {
      // Local/simulated dispatch for accounts without real credentials
      dispatchedSuccessfully = true;
      transportResponse = 'Local Sandbox Handshake';
    }

    if (dispatchedSuccessfully) {
      // Advance lead state
      const nextStepIndex = stepIndex + 1;
      const nextStep = sequenceSteps[nextStepIndex];
      let nextFollowUpAt: number | null = null;

      if (nextStep) {
        let delayMs = 60 * 1000;
        if (nextStep.delayUnit === 'minutes') delayMs = nextStep.delayAmount * 60 * 1000;
        if (nextStep.delayUnit === 'hours') delayMs = nextStep.delayAmount * 3600 * 1000;
        if (nextStep.delayUnit === 'days') delayMs = nextStep.delayAmount * 24 * 3600 * 1000;
        nextFollowUpAt = now + delayMs;
      }

      targetLead.status = nextStep ? 'outreach_sent' : 'completed';
      targetLead.assignedAccountId = senderAccount.id;
      targetLead.currentStepIndex = nextStepIndex;
      targetLead.lastContactedAt = now;
      targetLead.nextFollowUpAt = nextFollowUpAt;

      // Add to lead history
      targetLead.history = targetLead.history || [];
      targetLead.history.push({
        id: `msg-${now}`,
        leadId: targetLead.id,
        accountId: senderAccount.id,
        accountEmail: senderAccount.email,
        direction: 'outbound',
        senderEmail: senderAccount.email,
        recipientEmail: targetLead.email,
        subject: renderedSubject,
        body: renderedBody,
        timestamp: now,
        stepIndex,
        status: 'sent',
        read: true,
      });

      // Update campaign stats
      campaign.stats = campaign.stats || {};
      campaign.stats.sent = (campaign.stats.sent || 0) + 1;
      senderAccount.sentToday = (senderAccount.sentToday || 0) + 1;

      addSchedulerLog({
        type: isInitial ? 'dispatch_outreach' : 'dispatch_followup',
        campaignName: campaign.name,
        leadEmail: targetLead.email,
        accountEmail: senderAccount.email,
        message: `${isInitial ? 'Initial outreach' : `Follow-up #${currentStep.stepNumber}`} dispatched to ${targetLead.firstName} (${targetLead.email}) via ${senderAccount.email}. [${transportResponse}] Next cooldown: ${randomMin.toFixed(1)}m.`,
        status: 'success',
      });
    }
  }
}

// Background poll for IMAP inbound replies
async function executeBackgroundImapPoll() {
  if (!schedulerState.isRunning) return;

  for (const account of schedulerState.accounts) {
    if (!account.imapConfig?.host || !account.imapConfig?.user || !account.imapConfig?.pass) {
      continue;
    }

    try {
      const client = createImapClient(account.imapConfig);
      await client.connect();
      const lock = await client.getMailboxLock('INBOX');

      try {
        const status = await client.status('INBOX', { messages: true });
        const total = status ? status.messages || 0 : 0;
        if (total > 0) {
          const fetchStart = Math.max(1, total - 20);
          for await (const msg of client.fetch(`${fetchStart}:*`, { envelope: true })) {
            const fromAddr = (msg.envelope?.from?.[0]?.address || '').toLowerCase().trim();
            if (fromAddr) {
              handleInboundReplyMatch(
                fromAddr,
                msg.envelope?.subject || 'Re: Outreach',
                msg.envelope?.date ? new Date(msg.envelope.date).getTime() : Date.now()
              );
            }
          }
        }
      } finally {
        lock.release();
        await client.logout().catch(() => {});
      }
    } catch (err: any) {
      // Silent catch for background IMAP check
      console.warn(`[Background IMAP Poller] ${account.email}: ${err?.message}`);
    }
  }
}

// Scheduler Endpoints

app.get('/api/scheduler/status', (_req: Request, res: Response) => {
  let activeCampaignsCount = 0;
  let queuedLeadsCount = 0;

  for (const c of schedulerState.campaigns) {
    if (c.status === 'active') {
      activeCampaignsCount += 1;
      const leads = c.leads || [];
      const pending = leads.filter((l: any) => l.status === 'ready_for_outreach').length;
      const due = leads.filter(
        (l: any) =>
          l.status !== 'replied' &&
          l.status !== 'bounced' &&
          l.status !== 'completed' &&
          l.nextFollowUpAt &&
          l.nextFollowUpAt <= Date.now()
      ).length;
      queuedLeadsCount += pending + due;
    }
  }

  return res.json({
    isRunning: schedulerState.isRunning,
    lastTickAt: schedulerState.lastTickAt,
    activeCampaignsCount,
    queuedLeadsCount,
    accountsCount: schedulerState.accounts.length,
    logs: schedulerState.logs.slice(0, 50),
    cooldowns: schedulerState.accountNextAllowedTime,
  });
});

app.post('/api/scheduler/sync', (req: Request, res: Response) => {
  const { campaigns, accounts } = req.body;

  if (Array.isArray(campaigns)) {
    schedulerState.campaigns = campaigns;
  }
  if (Array.isArray(accounts)) {
    schedulerState.accounts = accounts;
  }

  addSchedulerLog({
    type: 'sync',
    message: `Scheduler synced: ${schedulerState.campaigns.length} campaigns, ${schedulerState.accounts.length} sending accounts.`,
    status: 'info',
  });

  return res.json({
    success: true,
    campaignsCount: schedulerState.campaigns.length,
    accountsCount: schedulerState.accounts.length,
    timestamp: Date.now(),
  });
});

app.post('/api/scheduler/toggle', (req: Request, res: Response) => {
  const { isRunning } = req.body;
  if (typeof isRunning === 'boolean') {
    schedulerState.isRunning = isRunning;
  } else {
    schedulerState.isRunning = !schedulerState.isRunning;
  }

  addSchedulerLog({
    type: 'sync',
    message: `Autonomous scheduler ${schedulerState.isRunning ? 'resumed' : 'paused'} by user.`,
    status: schedulerState.isRunning ? 'success' : 'warning',
  });

  return res.json({
    success: true,
    isRunning: schedulerState.isRunning,
  });
});

app.post('/api/scheduler/trigger-now', async (_req: Request, res: Response) => {
  try {
    await executeSchedulerCycle();
    return res.json({
      success: true,
      message: 'Autonomous scheduler cycle triggered successfully.',
      timestamp: Date.now(),
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: err?.message || 'Cycle failed',
    });
  }
});

app.get('/api/scheduler/state', (_req: Request, res: Response) => {
  return res.json({
    campaigns: schedulerState.campaigns,
    accounts: schedulerState.accounts,
  });
});

// Mount Vite or static server
async function startServer() {
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, HOST, () => {
    console.log(`NexusReach server listening on http://${HOST}:${PORT}`);
    
    // Start background 24/7 cold outreach scheduler (every 10 seconds)
    setInterval(() => {
      executeSchedulerCycle().catch((err) => console.error('[Scheduler Runner Error]:', err));
    }, 10000);

    // Start background IMAP inbound replies poller (every 60 seconds)
    setInterval(() => {
      executeBackgroundImapPoll().catch((err) => console.error('[Background IMAP Poller Error]:', err));
    }, 60000);
  });
}

startServer();
