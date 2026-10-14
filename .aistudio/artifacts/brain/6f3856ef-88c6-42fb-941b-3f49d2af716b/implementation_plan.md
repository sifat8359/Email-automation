# Implementation Plan: Instantly.ai Process & UI Redesign

Transform the application into an authentic **Instantly.ai** cold outreach automation platform with its signature dark-slate aesthetic, 5-tab campaign process, automated sequence execution, CSV leads ingestion, customizable follow-up sequences with dynamic variables, and persistent Supabase integration.

---

## 1. User Requirements & Confirmed Specifications

1. **Visual Aesthetic & Theme**: Signature Instantly dark slate (`#0B0F19` canvas, `#111827` surface cards, `#1E293B` hairline borders, `#6366F1` indigo action accents).
2. **Campaign Process UI**: Exact Instantly 5-tab campaign workflow:
   - **Tab 1: Analytics**: Live funnel metrics (Emails Sent, Open Rate %, Reply Rate %, Opportunities, Bounced %, Unsubscribed %), step-by-step dropoff table.
   - **Tab 2: Leads**: Campaign-specific lead table with status badges (`Sent`, `Opened`, `Replied`, `Follow-up Due`, `Bounced`), CSV file upload modal with column mapping (`First Name`, `Last Name`, `Email`, `Company`, `Website`, `Title`), and manual quick-add.
   - **Tab 3: Sequences**: Multi-step builder with Step 1 (Subject line + Rich body editor with `{{firstName}}`, `{{companyName}}`, `{{website}}` variable tags) $\to$ visual connector with delay configuration ("Wait X days / hours if no reply") $\to$ Step 2, Step 3, etc., with variant A/B testing support and instant preview.
   - **Tab 4: Schedule**: Sending schedule configuration including active days of week (e.g. Mon–Fri or 24/7), daily send window (e.g. 8:00 AM to 10:00 PM), local timezone selector, and max new leads per day.
   - **Tab 5: Options**: Multi-account mailbox selection (choose which connected Gmail accounts send for this campaign), daily email send limits, "Stop sending on reply" toggle, and delay between emails.
3. **Sequence Automation & Sending Execution**:
   - Time-window-aware execution engine honoring 8:00 AM – 10:00 PM (or custom schedule) with live window status indicator ("Window Active" vs "Window Closed").
   - Auto-tick interval simulation + instant **"Send Next Due / Run Now"** button for immediate testing.
4. **Global Navigation**:
   - Sidebar with Instantly icons: **Campaigns**, **Unibox (Unified Inbox)**, **Email Accounts**, **Leads / Contacts**, and **Settings (Supabase Config)**.
5. **Supabase Persistence**:
   - Direct integration via `@supabase/supabase-js` with persistent credentials stored in local settings and schema-ready fallback to resilient local storage.

---

## 2. Design System & Domain Layout (SaaS / Instantly Style)

- **Palette**:
  - Dominant Neutral (60%): `#090D16` / `#0B0F19` background.
  - Surface Containers (30%): `#111827` / `#141C2E` with crisp 1px hairline borders (`#1E293B`).
  - Accent (10%): `#6366F1` (Indigo-500) and `#4F46E5` for primary buttons, active tabs, and focus outlines.
  - Status Indicators: Emerald (`#10B981`) for Active/Replied, Violet (`#8B5CF6`) for Opened, Sky (`#0284C7`) for Sent, Amber (`#F59E0B`) for Follow-up Due, Rose (`#EF4444`) for Bounced.
- **Typographic & Zero-Pill Discipline**:
  - Headings: Crisp sans (`Plus Jakarta Sans` or modern geometric sans).
  - Metrics & Numbers: Strict `tabular-nums` / `font-mono` to prevent jitter.
  - Clean unboxed metadata with subtle typographic separators (`·` or `/`) rather than cluttered pill clusters.
- **Campaign Top Bar Contract**:
  - Left: Back arrow $\to$ Campaign Name (editable in-place) $\to$ Status toggle (Draft / Active / Paused).
  - Center: 5 tabs (`Analytics`, `Leads`, `Sequences`, `Schedule`, `Options`) with clean indicator underline and badge counts.
  - Right: "Run Automation / Send Now" trigger, Save status, and Quick Settings.

---

## 3. Technical Architecture & Component Structure

### A. Navigation & Views Hierarchy
- **`Sidebar.tsx`**: Updated with Instantly brand lockup, navigation items (Campaigns, Unibox, Accounts, Leads, Settings), and connected account quick-switcher.
- **`CampaignsView.tsx`**: Campaign list table displaying Status, Campaign Name, Total Leads, Sent, Open Rate %, Reply Rate %, and primary action buttons (New Campaign, Delete, Duplicate).
- **`CampaignDetailView.tsx`** (Core new component):
  - Houses the top campaign bar and mounts the active tab:
    1. `CampaignAnalyticsTab.tsx`: Stat metric cards with tabular numbers, conversion funnel, step breakdown.
    2. `CampaignLeadsTab.tsx`: Leads table with status badges (`Opened`, `Sent`, `Replied`, etc.), CSV upload modal with drag-and-drop & header mapper, search and filter chips.
    3. `CampaignSequencesTab.tsx`: Visual multi-step sequence builder. Step cards with subject, body, variable injector dropdown (`{{firstName}}`, `{{companyName}}`, etc.), delay interval ("Wait 2 days"), and "+ Add Step".
    4. `CampaignScheduleTab.tsx`: Day picker (Mon–Sun), time window inputs (`08:00` to `22:00`), timezone selector, and max leads/day.
    5. `CampaignOptionsTab.tsx`: Multi-account selector checkboxes with sending quotas, stop on reply toggle, and deliverability settings.
- **`UniboxView.tsx` (Unified Inbox)**: Instantly-style split inbox (thread list on left, email conversation thread on right with sentiment tags `Interested`, `Meeting booked`, `Not Interested`, and quick reply compose).
- **`AccountsView.tsx`**: Connected Gmail accounts with daily send limits, warm-up scores, and connection status.
- **`SettingsView.tsx`**: Supabase credentials (Project URL & Anon Key) test & sync, and automation options.

### B. Automation Engine (`useAutomationEngine.ts` / `AppContext.tsx`)
- Reads the campaign schedule window (start/end time and active days).
- Evaluates leads whose `nextFollowUpAt` is due and current time is within the configured window.
- Processes initial outreach (Step 1) and subsequent follow-ups (Step 2, Step 3) automatically.
- Stops sequence immediately if lead replies.
- Provides manual **"Send Next Due Lead"** button for immediate verification anytime.

---

## 4. Implementation Steps

1. **Types Enhancement (`src/types.ts`)**:
   - Refine `Campaign` and `SequenceStep` to mirror Instantly models (variants, delay units, multi-account bindings, schedule window, deliverability options).
2. **Campaign Detail & 5 Tabs (`src/components/campaigns/`)**:
   - Build `CampaignDetailView.tsx` with top navigation tabs.
   - Implement `CampaignAnalyticsTab.tsx`, `CampaignLeadsTab.tsx` (with CSV import modal), `CampaignSequencesTab.tsx` (with step cards and delays), `CampaignScheduleTab.tsx`, and `CampaignOptionsTab.tsx`.
3. **Campaigns List View (`src/components/CampaignsView.tsx`)**:
   - Clean Instantly-style campaign table with search, status toggles, metrics, and "+ Add Campaign" modal.
4. **Global Navigation & Unibox (`src/components/Sidebar.tsx` & `src/components/InboxView.tsx`)**:
   - Align sidebar icons and paths with Instantly (Campaigns, Unibox, Accounts, Leads, Settings).
   - Polish Unibox with thread pane, sentiment tagging, and full-width reply editor.
5. **Automation & Schedule Window Engine**:
   - Connect the time-window check (e.g. 8:00 AM to 10:00 PM) to active campaigns, executing sends and updating metrics in real-time.
6. **Supabase & Local Persistence Sync**:
   - Allow seamless connection to user's Supabase project with automated fallback to browser local storage.
7. **Verification & Build Check**:
   - Run compilation and TypeScript validation to ensure clean builds and zero layout shifts.

---

## 5. Verification Plan

- **Campaign Creation**: Create a new campaign, rename it, and toggle between all 5 tabs.
- **CSV Leads Import**: Upload a CSV with leads and verify column mapping and table rendering.
- **Sequence Steps**: Add Step 1 and Step 2 with delay interval and variable substitution.
- **Schedule Window**: Set 8:00 AM to 10:00 PM and test time-window validation.
- **Automation Engine**: Trigger manual send and auto-tick to ensure emails are sent, metrics increment, and statuses update to `Sent` and `Opened`.
- **Unibox Integration**: Confirm replies appear in Unibox and stop further sequence follow-ups for that lead.
