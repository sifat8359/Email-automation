# NexusReach: Production-Ready Cold Outreach Automation Platform

Transform NexusReach from a prototype UI into a fully autonomous, production-ready cold email automation platform with a 24/7 Node.js backend scheduler, live IMAP inbound synchronization for the Unibox, direct Supabase cloud persistence, and high-deliverability SMTP sequence dispatching.

---

## User Review & Critical Decisions

> [!IMPORTANT]
> The following architectural specifications were confirmed for production readiness:
> - **Backend Automation Engine**: Outbound cold outreach sequences must dispatch 24/7 on the server even when the user closes their browser tab, respecting active sending windows (8:00 AM – 10:00 PM), randomized delays (2–5 min), and account daily caps.
> - **Direct Supabase Persistence**: Campaigns, leads, sequence steps, account configurations, and dispatch logs persist directly to Supabase with real-time updates and seamless local caching fallback.
> - **Live IMAP Inbound Sync**: The Unibox automatically polls connected IMAP mailboxes (port 993 SSL) to ingest real prospect replies, tag sentiment, and auto-stop sequences immediately upon receipt of an inbound reply.

---

## 1. Overview & Core Concept

- **What It Does**: NexusReach is a cold outreach automation SaaS (mirroring Instantly.ai and Smartlead) that connects real Google Workspace, Microsoft 365, Zoho, and custom SMTP/IMAP mailboxes. It autonomously manages multi-step email sequences, enforces sending schedules and cooldown intervals, filters false-positive security scanner opens, synchronizes real inbound replies via IMAP, and centralizes conversations in a unified Unibox.
- **Target Audience / Persona**: B2B sales development reps, agency owners, growth engineers, and founders running multi-inbox outbound campaigns needing high deliverability, automated sequence execution, and cross-device persistence.
- **Key Value**: Operates completely headless in the background without needing a browser window open, delivering verified emails through genuine RFC-compliant SMTP/IMAP transport and keeping data backed up in Supabase.

---

## 2. User Experience & Visual Design

### A. Key User Flows

1. **Mailbox Connection & Verification**:
   - User navigates to **Email Accounts** $\rightarrow$ clicks **"+ Connect New Account"**.
   - Selects provider preset: **Google Workspace**, **Microsoft 365**, **Zoho Mail**, or **Custom SMTP/IMAP**.
   - Enters email and 16-character App Password.
   - Clicks **"Test Connection"**: Server runs live SMTP handshake (`/api/email/verify-smtp`) and IMAP verification.
   - Once verified, account enters rotation with warmup tracking and daily limits.

2. **Campaign Creation & Unified Leads/Analytics**:
   - User creates an outreach campaign.
   - Top banner displays key analytics KPIs: **Total Leads**, **Contacted/Sent**, **Open Rate %**, **Reply Rate %**, **Opportunities**, and **Bot Scans Filtered**.
   - Directly below, the prospect table allows CSV import, manual lead addition, status filtering, and live search.

3. **Multi-Step Sequences & Auto-Throttling**:
   - Sequences tab offers multi-step builder with delay triggers (`Wait 2 days then send if no reply`) and personalization variables (`{{firstName}}`, `{{companyName}}`, `{{website}}`).
   - The backend scheduler checks sending windows (e.g. Mon–Fri, 8 AM–10 PM), picks eligible leads, cycles through assigned mailboxes, applies randomized delays, and fires verified emails via Nodemailer.

4. **Live Inbound Sync & Unibox Conversation**:
   - Server polls IMAP mailboxes periodically (or on-demand via **"Sync Inbound"** button).
   - Inbound replies from prospects are matched to campaign leads by email address or message reference headers.
   - Lead status automatically transitions to `Replied`, follow-ups halt immediately to protect domain reputation, and the conversation appears in the Unibox for 1-click reply drafting.

### B. Visual Identity & Theme

- **Palette**: Dark slate canvas (`#0E1116`), container surfaces (`#171B22`), hairline borders (`#262B35`), indigo accent (`#5B8DEF`), emerald (`#34D399`) for verified handshakes & positive replies, and amber (`#F5A623`) for cooldown states.
- **Typography**: Clean contemporary sans hierarchy with strict `tabular-nums` monospace figures for dates, counters, rates, and timestamps.
- **Zero-Pill Discipline**: Status pills use soft 12% opacity tints with matching text color; metadata uses clean typographic separators (`·`).

---

## 3. Key Product Decisions & Trade-Offs

- **Backend Background Scheduler (`server.ts`) vs Client-Side Interval**:
  - *Chosen Approach*: Embed an autonomous background dispatch runner in Express (`server.ts`) with a client WebSocket/polling endpoint.
  - *Why*: In a cold outreach tool, sequences must continue sending reliably even when the SDR closes their laptop.
  - *Alternatives Considered*: Client-side `setInterval` (fails when browser closes or tab sleeps).
- **Direct IMAP Client Polling (`imapflow` / Node IMAP) vs Webhooks**:
  - *Chosen Approach*: Standard Node.js IMAP connection using user-provided App Passwords on port 993 (TLS/SSL).
  - *Why*: Works universally across all email providers (Google, Office365, Zoho, Namecheap, cPanel) without requiring complex OAuth cloud console verifications or public webhooks.
- **Dual Supabase Direct Mode + Resilient Local Fallback**:
  - *Chosen Approach*: Store campaigns and leads in Supabase SQL tables when credentials exist, with automatic in-memory/localStorage mirroring so the app remains fully functional even in offline or unconfigured environments.

---

## 4. Technical Architecture & Data Strategy

### System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       NexusReach Frontend (React SPA)                       │
│                                                                             │
│  ┌───────────────────────┐  ┌───────────────────────┐  ┌──────────────────┐ │
│  │   Campaigns & Leads   │  │   Sequence Builder    │  │  Unibox & Inbox  │ │
│  │   (Embedded Analytics)│  │   (Multi-Step Delays) │  │  (Live IMAP View)│ │
│  └───────────┬───────────┘  └───────────┬───────────┘  └────────┬─────────┘ │
│              │                          │                       │           │
│              ▼                          ▼                       ▼           │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │                  AppContext & Supabase Client Layer                    │ │
│  │  - Synchronizes state, tracks cooldowns, and updates lead statuses     │ │
│  └───────────────────────────────────┬────────────────────────────────────┘ │
└──────────────────────────────────────┼──────────────────────────────────────┘
                                       │ HTTP REST APIs
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                 Node.js Full-Stack Backend (server.ts)                      │
│                                                                             │
│  ┌─────────────────────────────────┐   ┌──────────────────────────────────┐ │
│  │  Automated Background Scheduler │   │    Outbound Nodemailer Engine    │ │
│  │  - Evaluates schedules & windows│   │    - SMTP handshake verification │ │
│  │  - Enforces randomized delays   │   │    - Real RFC email dispatch     │ │
│  └────────────────┬────────────────┘   └─────────────────┬────────────────┘ │
│                   │                                      │                  │
│                   ▼                                      ▼                  │
│  ┌─────────────────────────────────┐   ┌──────────────────────────────────┐ │
│  │   Inbound IMAP Poller Service   │   │    Security Beacon & Tracking    │ │
│  │   - Fetches prospect replies    │   │    - 10s bot scanner mitigation  │ │
│  │   - Halts pending follow-ups    │   │    - Click & open metrics        │ │
│  └────────────────┬────────────────┘   └──────────────────────────────────┘ │
└───────────────────┼─────────────────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                 External Providers & Cloud Database                         │
│   • Google Workspace / Office 365 / Zoho SMTP & IMAP Servers                │
│   • Supabase PostgreSQL Database (Campaigns, Leads, Accounts, Messages)     │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Key Production Enhancements

1. **Server-Side Background Dispatcher**:
   - Implement `server.ts` autonomous dispatch loop running every 60 seconds.
   - Evaluates active campaigns, checks schedule windows (e.g. 8:00 AM – 10:00 PM in campaign timezone), checks account daily limits and cooldown intervals, and dispatches the next due follow-up.
2. **Live IMAP Inbound Sync Endpoint**:
   - Add `POST /api/email/sync-imap` to connect to accounts via IMAP (`port 993`, `tls: true`), search for unseen messages or recent replies, and return structured thread messages.
   - Automatically match incoming sender address against campaign leads to set status to `replied` and record inbound history.
3. **Database Schema & Automatic Supabase Synchronization**:
   - Provide complete SQL tables in `SettingsView`: `campaigns`, `leads`, `accounts`, `messages`.
   - Update `AppContext.tsx` so state changes automatically push to Supabase when connected, keeping all browsers and team members in sync.
4. **Deliverability & Safety Guardrails**:
   - Prevent sending duplicates, strictly enforce max leads per day cap, honor unsubscribe tags, and maintain bot-filtered open tracking.

---

## 5. Verification Plan

- **Automated Verification**:
  - Run `compile_applet` and `lint_applet` to ensure 100% clean TypeScript build.
  - Test `/api/email/verify-smtp` and `/api/email/sync-imap` endpoints with realistic mock configurations.
- **Manual Verification Steps**:
  - Add account $\rightarrow$ verify SMTP handshake.
  - Enroll lead $\rightarrow$ trigger sequence send $\rightarrow$ inspect sent email payload and cooldown timer.
  - Verify embedded analytics KPI cards on the Leads page update dynamically.
  - Test Unibox sync and confirm reply stops sequence follow-ups.
