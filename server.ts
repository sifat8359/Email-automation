import express, { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import nodemailer, { SendMailOptions } from 'nodemailer';

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
  });
}

startServer();
