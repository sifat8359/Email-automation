# NexusReach: Production SMTP / IMAP Engine & Full-Stack Dispatcher

Transform NexusReach from a simulated client environment into a production-grade cold outreach platform powered by real SMTP/IMAP account connections (Google Workspace, Microsoft 365, Zoho, and custom domains) and a Node.js Express server proxy with Nodemailer for verified outbound delivery, handshake testing, and automated sequence dispatches.

## User Review & Critical Decisions

> [!IMPORTANT]
> The following architectural decisions were selected and confirmed:

- **Email Connection Standard**: Custom SMTP & IMAP with App Passwords (the proven gold standard used by Instantly.ai, Smartlead, and Lemlist). Allows connecting any domain, secondary burner mailbox, Google Workspace, Outlook, or private mail server with zero OAuth hurdles.
- **Backend Architecture**: Node.js Express full-stack entry point (`server.ts`) running on port 3000 with Vite middleware in development (`tsx server.ts`), exposing REST endpoints:
  - `POST /api/email/verify-smtp`: Performs a live SMTP handshake test with the mail server before saving credentials.
  - `POST /api/email/send`: Dispatches real MIME-formatted cold outreach emails with variable replacements and custom message IDs.
  - `POST /api/email/test-send`: Sends a live test email directly to the user's inbox to verify inbox deliverability.
- **Provider Presets**: 1-click presets in the Add Account modal for **Google Workspace / Gmail** (`smtp.gmail.com:587`), **Microsoft 365 / Outlook** (`smtp.office365.com:587`), **Zoho Mail** (`smtppro.zoho.com:465`), and **Custom SMTP** with auto-filled host, port, and security settings (TLS/SSL).
- **Security & Credential Storage**: Passwords and app-specific credentials stored encrypted or in server-side session memory with masked UI display.
- **Deliverability Throttling**: Live sequence loop respecting min/max randomized delays (2–5 minutes), active schedule windows (8 AM – 10 PM), and auto-stopping on prospect reply.

---

## 1. Overview & Core Concept

- **What It Does**: Provides authentic, production-grade email dispatching for cold outreach sequences. Users enter their sender email and App Password, choose their provider preset, run a live connection test to verify SMTP reachability, and launch automated campaigns that deliver genuine emails to real prospects.
- **Target Audience / Persona**: B2B growth teams, agency owners, SDRs, and founders managing multi-domain cold email pipelines who need reliable delivery, high deliverability scores, and unified inbox visibility.
- **Key Value**: Delivers genuine cold emails via real SMTP servers without relying on client-side mocks or restrictive OAuth consent verification screens.

---

## 2. User Experience & Visual Design

### Key User Flows

1. **Adding an Authentic Mailbox with Connection Verification**:
   - In **Accounts** $\rightarrow$ click **"+ Connect New Account"**.
   - Select provider tab: **Google Workspace / Gmail**, **Microsoft 365**, **Zoho Mail**, or **Custom SMTP**.
   - Host, port, and TLS settings auto-populate automatically.
   - User inputs their email address, display name, and App Password (with a helpful tooltip on how to generate a 16-character Google or Microsoft App Password).
   - User clicks **"Test Connection"**: The modal runs a live SMTP handshake via `/api/email/verify-smtp` and displays a green `"SMTP Connected Successfully"` status or a clear diagnostic error (e.g. "Bad credentials / 2FA required").
   - User clicks **"Save & Connect Mailbox"**.

2. **Send Test Email**:
   - Before launching a cold campaign, user clicks **"Send Test Email"** on any connected account card to send a test message to their personal email and verify inbox placement (SPF/DKIM/DMARC headers).

3. **Live Campaign Sequence Dispatch**:
   - When a campaign is active and in its sending window (e.g. 08:00 to 22:00), the automation engine picks the next due lead, rotates through the assigned mailboxes, and calls `/api/email/send`.
   - The email is physically transmitted through the provider's SMTP server.
   - Sent counts and cooldown timers update in real time.

4. **Deliverability Center & Mailbox Health**:
   - Displays real-time daily sent counter, daily cap progress bar, and cooldown countdowns.
   - Senders can be paused, edited, or re-verified at any time.

### Visual Identity & Theme
- **Theme**: Dark obsidian & slate (`#090d16` base, `#0f1423` container cards, `#1b233a` hairline borders).
- **Accents**: Indigo (`#6366f1`) for primary actions, Emerald (`#10b981`) for verified SMTP handshakes, Amber (`#f59e0b`) for cooldown intervals, and Rose (`#f43f5e`) for failed handshakes or auth errors.
- **Typography & Layout**: Plus Jakarta Sans, tabular-nums monospace font for ports, counters, and response times. Clean unboxed metadata with subtle dot separators (`·`).

---

## 3. Key Product Decisions & Trade-Offs

- **Node.js Express Full-Stack (`server.ts`) vs Pure Client**:
  - *Chosen Approach*: Implement a full-stack Node.js server with Express hosting Vite middleware for development (`"dev": "tsx server.ts"`).
  - *Why*: Browsers strictly disallow TCP socket connections (e.g., connecting to `smtp.gmail.com:587`). An Express proxy server with `nodemailer` is mandatory to perform standard RFC SMTP network transport.
- **Nodemailer vs Third-Party REST APIs**:
  - *Chosen Approach*: `nodemailer` library directly on the backend.
  - *Why*: Supports all SMTP servers worldwide (Google, Microsoft, Zoho, SendGrid, Amazon SES, Namecheap, cPanel, Postmark) with zero external subscription fees or account bans.
- **Real-Time SMTP Verification Check**:
  - *Chosen Approach*: Dedicated verification endpoint that calls `transporter.verify()`.
  - *Why*: Gives users immediate visual feedback whether their App Password is valid before they start any outreach campaign.

---

## 4. Technical Architecture & Data Strategy

### System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            NexusReach Frontend                              │
│                                                                             │
│  ┌───────────────────────┐  ┌───────────────────────┐  ┌──────────────────┐ │
│  │   AddAccountModal     │  │  CampaignBuilderView  │  │    UniboxView    │ │
│  │  (SMTP Handshake Test)│  │ (Automated Sequences) │  │  (Sent History)  │ │
│  └───────────┬───────────┘  └───────────┬───────────┘  └────────┬─────────┘ │
│              │                          │                       │           │
│              ▼                          ▼                       ▼           │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │                     AppContext (State & Dispatcher)                    │ │
│  │   - Manages accounts, credentials, cooldown timers, and active runs    │ │
│  └───────────────────────────────────┬────────────────────────────────────┘ │
└──────────────────────────────────────┼──────────────────────────────────────┘
                                       │ HTTP POST (fetch /api/email/*)
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                   Full-Stack Express Server (server.ts)                     │
│                                                                             │
│  ┌─────────────────────────────────┐   ┌──────────────────────────────────┐ │
│  │    POST /api/email/verify-smtp  │   │      POST /api/email/send        │ │
│  │   - transporter.verify()        │   │   - transporter.sendMail()       │ │
│  │   - Live diagnostic response    │   │   - RFC 2822 formatting & headers│ │
│  └─────────────────────────────────┘   └──────────────────────────────────┘ │
│                                  │                                          │
│                                  ▼                                          │
│                       Nodemailer SMTP Pool                                  │
└──────────────────────────────────┬──────────────────────────────────────────┘
                                   │ Direct TCP/TLS (Ports 587 / 465)
                                   ▼
        ┌───────────────────────────────────────────────────────┐
        │                 Real Mail Servers                     │
        │  • Google Workspace / Gmail (smtp.gmail.com)          │
        │  • Microsoft 365 / Outlook (smtp.office365.com)       │
        │  • Zoho Mail (smtppro.zoho.com)                       │
        │  • Custom SMTP Domains                                │
        └───────────────────────────────────────────────────────┘
```

### Data Model Additions (`src/types.ts`)

```typescript
export interface SmtpConfig {
  host: string;
  port: number;
  secure: boolean; // true for 465, false for 587/STARTTLS
  user: string;
  pass: string;
  isVerified?: boolean;
  lastVerifiedAt?: number;
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
  smtpConfig?: SmtpConfig;
  connectedAt: string;
}
```

---

## 5. Implementation Steps

1. **Install Dependencies**:
   - Install `nodemailer` and `@types/nodemailer`.
2. **Server-Side Dispatcher (`server.ts`)**:
   - Create `server.ts` mounting Express, Vite middlewares for dev, and JSON body parsing.
   - Implement `POST /api/email/verify-smtp` using `nodemailer.createTransport().verify()`.
   - Implement `POST /api/email/send` using `nodemailer.createTransport().sendMail()`.
   - Update `package.json` scripts: `"dev": "tsx server.ts"` and `"start": "node server.ts"`.
3. **Account Connection Experience (`AddAccountModal.tsx` & `AccountsView.tsx`)**:
   - Add provider selection tabs (Google, Outlook, Zoho, Custom) with auto-filled presets.
   - Add App Password input with step-by-step guidance.
   - Add live "Test Connection" button with real-time handshake check.
   - Add "Send Test Email" action on account cards.
4. **Wire Automation Engine to Real SMTP (`AppContext.tsx`)**:
   - When a campaign dispatches outreach or follow-up, call `/api/email/send` if the sender account has SMTP configured.
   - Display live dispatch feedback with actual SMTP Message ID and timestamp.
5. **Compilation, Linting & Verification**:
   - Verify full-stack execution, type safety, and real email sending capability.
