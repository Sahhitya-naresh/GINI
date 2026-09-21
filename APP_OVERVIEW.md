# Outreach Flow — Application Overview & Architecture Snapshot

## 1. Stages 1 through 8 Implementation & Verification Matrix

| Stage | Feature / Component | Real Tested Status | Operational Details & Notes |
| :--- | :--- | :--- | :--- |
| **Stage 1** | **Google Sheets Database & Persistence** | **Confirmed Working** | Connect Sheet modal connects or auto-creates formatted sheets (`Leads` & `Campaigns`). All lead CRUD operations (`values.get`, `values.append`, `values.update`, `batchUpdate deleteDimension`) write directly to the Sheet via Google Sheets API. |
| **Stage 1** | **Source of Truth on Server Restart** | **Confirmed Working** | When a Sheet is connected, client restores `spreadsheetId` from storage and loads fresh rows from Google Sheets API, re-hydrating React state and server cache. Sheet is primary source of truth. |
| **Stage 1** | **Disconnected Sheet Limitation** | **Confirmed & Documented** | When disconnected, data resides only in ephemeral container files (`data_store/leads.json`). Surfaced in UI as a known limitation in the header connection indicator, the unconnected banner, and the connection dialog. |
| **Stage 2** | **Leads CRM & Table Operations** | **Confirmed Working** | Filtering by status, stage, campaign, search query, and pagination are operational. Status transitions (`Active`, `Paused`, `Replied`, `Completed`, `Broke Up`) persist directly to the connected Sheet. |
| **Stage 2** | **Lead Deletion with Sheet Sync** | **Confirmed Working** | Row deletion from table and lead drawer issues `deleteDimension` batch updates to the Google Sheet tab, preventing ghost rows. |
| **Stage 2** | **Dedicated "Needs Reply" Inbox** | **Confirmed Working** | Filters leads with `Replied` status, displays conversation snippets, fast status changes, and deep-links to Gmail threads. |
| **Stage 3** | **7 Outreach Stage Templates** | **Confirmed Working** | Templates for Stages 1 through 7 (Intro, Value Prop, Social Proof, Solution, Pricing, Follow-up, Break-up) are pre-loaded, editable, and saved to `data_store/settings.json`. |
| **Stage 3** | **Dynamic Merge Tag Interpolation** | **Confirmed Working** | Replaces `{{FirstName}}`, `{{Company}}`, `{{PainPoint}}`, and sender signatures dynamically across preview and live dispatches. |
| **Stage 4** | **Gmail API Email Dispatching** | **Confirmed Working** | Sends RFC 2822 MIME emails with subject lines, HTML bodies, and tracking tags via `gmail.googleapis.com/gmail/v1/users/me/messages/send`. |
| **Stage 4** | **Gmail Thread Fetching & Sync** | **Confirmed Working** | Retrieves message history via `gmail.googleapis.com/gmail/v1/users/me/threads/{id}` and displays real-time discussion in `LeadDetailModal`. |
| **Stage 4** | **Thread Reply Detection** | **Confirmed Working** | Scans Gmail threads for incoming messages from prospects using `In-Reply-To` and message sender analysis. |
| **Stage 4** | **Real-Time Push Webhooks** | **Unverified / Polling Only** | Real-time Google Cloud Pub/Sub push webhooks are not implemented. Reply detection operates via manual "Check Replies" button and automated campaign runner evaluations. |
| **Stage 5** | **Visual Workflow Canvas (ReactFlow)** | **Confirmed Working** | Interactive canvas supports node dragging, multi-point edge connections, edge deletion, node selection, mini-map, background grid, and multi-campaign switching. |
| **Stage 5** | **Workflow Core Nodes** | **Confirmed Working** | Start Node, Email Node, Wait Node, Condition Node (`has_replied`, `email_opened`, `link_clicked`, `has_linkedin_url`), Manual Task Node, and Merge Node execute properly. |
| **Stage 5** | **LinkedIn Outreach Nodes** | **Placeholder Only** | `linkedin_invite` and `linkedin_message` nodes are UI placeholders with configuration forms marked "Coming Soon". Automated dispatching requires LinkedIn Partner API access. |
| **Stage 5** | **Graph JSON Persistence** | **Confirmed Working** | Serialized ReactFlow graphs persist into the `Campaigns` sheet tab (column `Workflow Graph JSON`) and mirror to `data_store/campaigns.json`. |
| **Stage 6** | **Campaign Runner: Inactive Campaign Isolation** | **Confirmed Working** | Tested in this pass: Campaigns with `isActive: false` are strictly skipped and their leads are left untouched. |
| **Stage 6** | **Campaign Runner: Reply Check Priority** | **Confirmed Working** | Tested in this pass: Evaluates replies prior to any dispatch; transitioned leads are marked `Replied` ("Needs Reply") and halted from receiving further emails. |
| **Stage 6** | **Campaign Runner: Sender Quota Enforcement** | **Confirmed Working** | Tested in this pass: Halts dispatches and defers prospects once the assigned sender's `dailySendLimit` is reached. |
| **Stage 6** | **Campaign Runner: Schedule Window Enforcement** | **Confirmed Working** | Tested in this pass: Enforces Start node `allowedDays` (e.g. Mon–Fri) and active hours (`startHour` to `endHour`), postponing runs outside the window. |
| **Stage 6** | **Campaign Runner: Wait Node Progression** | **Confirmed Working** | Tested in this pass: Calculates elapsed duration against `waitDuration` and advances leads to the next node once satisfied. |
| **Stage 7** | **Tracking Pixel & Redirect Endpoints** | **Confirmed Working (Internal)** | Endpoints `/api/track/open`, `/api/track/click`, and `/api/track/events` successfully log timestamps, lead IDs, and user agents to `tracking-events.json`. |
| **Stage 7** | **Live External Email Client Tracking** | **Unverified in Dev Environment** | Live open tracking via external mail clients (e.g., Gmail image proxy) is blocked by the development sandbox's Google internal auth proxy (`/__cookie_check.html`). Open/click tracking cannot be tested end-to-end in real inboxes until the app is deployed to a publicly accessible URL. |
| **Stage 7** | **Analytics Dashboard & KPI Reporting** | **Confirmed Working** | Funnel visualization, conversion rates, open/click totals, and event timelines render accurately from aggregated tracking data. |
| **Stage 8** | **Manual Tasks Queue Dashboard** | **Confirmed Working** | Lists tasks generated by workflow branches, supports priority filtering, lead context preview, and completion status toggling (`/api/tasks`). |
| **Stage 8** | **Multi-Sender Account Management** | **Confirmed Working** | Supports multiple sender profiles with avatars, status toggling, and daily sending quota limits. |
| **Stage 8** | **CSV & Excel File Importer Engine** | **Confirmed Working** | Multi-format parser (`.csv`, `.xlsx`, `.xls`) with automatic header matching, email validation, duplicate detection, and batch insertion. |
| **Stage 8** | **White-Label Branding & Settings** | **Confirmed Working** | Custom logo URL and application title customization with persistent storage. |

---

## 2. Screens and Views

* **All Leads (`tab-leads`)**: Main CRM table displaying all prospects, search/filtering by status/stage/campaign, pause/resume sequence toggles, immediate manual stage triggers, engagement stats (opens/clicks), detail drawer opener, and permanent lead deletion with sheet synchronization. *(Confirmed Working)*
* **Needs Reply (`tab-replied`)**: Dedicated inbox view filtering prospects who replied or whose status is set to "Replied", presenting thread snippets, fast status updates, and links to open threads in Gmail. *(Confirmed Working)*
* **Workflow Canvas (`tab-workflows`)**: Interactive node-based visual campaign builder powered by ReactFlow (`@xyflow/react`) for creating, configuring, and saving branching email/task sequences. *(Confirmed Working)*
* **Manual Tasks Dashboard (`tab-tasks`)**: Task queue dashboard displaying actionable human tasks generated by workflow executions (e.g., LinkedIn research, custom phone calls) with priority flags, due dates, lead context, and completion checkboxes. *(Confirmed Working)*
* **Stage Templates Admin (`tab-templates`)**: Template configuration screen for Stages 1 through 7 with subject lines, HTML bodies, merge tag replacements (`{{FirstName}}`, `{{Company}}`, `{{PainPoint}}`), sender selection, and real-time preview. *(Confirmed Working)*
* **Analytics Dashboard (`tab-analytics`)**: Metrics overview showing aggregate counts, stage delivery funnel, open rate, click-through rate, reply conversion rate, campaign breakdown, and recent tracking event timeline. *(Confirmed Working)*
* **Lead Detail & Thread Modal (`LeadDetailModal`)**: Slide-over modal showing full prospect metadata, editable pain points/notes, sequence history, live Gmail thread sync via Gmail API, stage dispatching, and direct row deletion. *(Confirmed Working)*
* **Campaign Sequencing Runner Modal (`CampaignSchedulerModal`)**: Sequence execution modal that queries due prospects across campaigns, respects sender rate limits, previews email content, and runs batch sends with live progress updates. *(Confirmed Working)*
* **Import Leads Modal (`ImportLeadsModal`)**: Drag-and-drop CSV and Excel (.xlsx, .xls) importer featuring auto-column mapping, email validation, duplicate detection against existing leads, candidate preview table, and batch append. *(Confirmed Working)*
* **Sheet Connection Modal (`SheetConnectModal`)**: Modal allowing users to create a new auto-formatted Google Sheet in Google Drive or connect an existing Google Sheet by ID or URL. Displays known limitation notice when disconnected. *(Confirmed Working)*
* **Settings Modal (`SettingsModal`)**: Configuration panel for sender profiles, daily sending limits, stage interval business days, weekend skipping, and white-label branding (app name & custom logo). *(Confirmed Working)*

---

## 3. Data Schema

The primary data store is Google Sheets via the Google Sheets API v4, with automatic local JSON caching in `data_store/` for offline resilience.

### Sheet Tab: `Leads` (27 Columns)
1. **Lead ID** (`A`): Unique prospect identifier (e.g., `LEAD-101`).
2. **Name** (`B`): Full prospect name.
3. **Email** (`C`): Prospect email address.
4. **Company** (`D`): Company or organization name.
5. **Pain Point(s)** (`E`): Key pain points or personalized conversation hooks used in templates.
6. **Current Stage** (`F`): Numerical sequence stage index (0 = not started, 1–7 = sequence stages).
7. **Status** (`G`): Lifecycle status (`Active`, `Replied`, `Paused`, `Completed`, `Broke Up`).
8. **Last Email Sent Date** (`H`): ISO date string (`YYYY-MM-DD`) when the last email was dispatched.
9. **Next Send Date** (`I`): ISO date string (`YYYY-MM-DD`) when the prospect is next scheduled to receive an email.
10. **Thread ID** (`J`): Gmail Thread ID for conversation tracking and reply detection.
11. **Notes** (`K`): Free-text CRM notes.
12. **First Name** (`L`): Prospect first name.
13. **Last Name** (`M`): Prospect last name.
14. **Job Title** (`N`): Prospect job title.
15. **LinkedIn URL** (`O`): Direct profile URL.
16. **Industry** (`P`): Market sector or vertical.
17. **Campaign** (`Q`): Campaign name or identifier associated with this lead.
18. **Opens Count** (`R`): Total count of tracked email opens.
19. **First Opened Date** (`S`): Timestamp of the first open event.
20. **Last Opened Date** (`T`): Timestamp of the most recent open event.
21. **Clicks Count** (`U`): Total count of tracked link clicks.
22. **First Clicked Date** (`V`): Timestamp of the first link click event.
23. **Last Clicked Date** (`W`): Timestamp of the most recent link click event.
24. **Current Node ID** (`X`): Active node ID within an automated visual workflow graph.
25. **Campaign ID** (`Y`): Associated visual workflow campaign ID.
26. **Node Entered Date** (`Z`): Timestamp when the lead transitioned into the current workflow node.
27. **Sender Used** (`AA`): Connected sender email address used for prior outreach.

### Sheet Tab: `Campaigns` (6 Columns)
1. **Campaign ID** (`A`): Unique campaign identifier (e.g., `camp-123456789`).
2. **Name** (`B`): Human-readable campaign name.
3. **Is Active** (`C`): Boolean flag (`TRUE`/`FALSE`) controlling automated runner execution.
4. **Workflow Graph JSON** (`D`): Serialized JSON string representing ReactFlow nodes, edges, handles, and configuration.
5. **Created Date** (`E`): ISO timestamp when the campaign was created.
6. **Updated Date** (`F`): ISO timestamp of last modification.

### Local JSON Store (`data_store/` Fallback & Auxiliary Storage)
* `data_store/leads.json`: Mirror of the `Leads` sheet tab for fallback and testing.
* `data_store/campaigns.json`: Mirror of the `Campaigns` sheet tab.
* `data_store/settings.json`: Application settings (default gap days, stage gaps, skip weekends, sender profile, branding).
* `data_store/senders.json`: List of configured sender accounts, avatars, status, and daily send limits.
* `data_store/tasks.json`: Queue of human manual tasks generated by workflows.
* `tracking-events.json`: Raw event log for email open pixels and link click redirects.

---

## 4. Backend Endpoints and Functions

All endpoints are hosted in Express (`server.ts`) behind the Vite dev server / production proxy on port 3000:

| Endpoint | Method | Description | Tested Status |
| :--- | :--- | :--- | :--- |
| `/api/health` | GET | Healthcheck returning server uptime and tracking event counts | Confirmed Working |
| `/api/track/open` | GET | Serves 1x1 no-cache transparent GIF and records email open event | Confirmed Working (Internal API) / Unverified in Live Inboxes |
| `/api/track/open/:leadId/:stage` | GET | Parameterized open tracking pixel URL | Confirmed Working (Internal API) / Unverified in Live Inboxes |
| `/api/track/click` | GET | Logs link click event and redirects (302) to target destination URL | Confirmed Working (Internal API) / Unverified in Live Inboxes |
| `/api/track/events` | GET | Returns all recorded open and click events with per-lead aggregates | Confirmed Working |
| `/api/track/event` | POST | Manually logs an event (for testing or simulation) | Confirmed Working |
| `/api/track/clear` | POST | Clears recorded tracking events | Confirmed Working |
| `/api/leads/list` | GET / POST | Retrieves leads from Google Sheets or local store fallback | Confirmed Working |
| `/api/leads/create` | POST | Appends a single lead to Google Sheets and local store | Confirmed Working |
| `/api/leads/update` | POST | Updates a lead row in Google Sheets and local store | Confirmed Working |
| `/api/leads/delete` | POST | Deletes lead row from Google Sheets and local store | Confirmed Working |
| `/api/leads/batch` | POST | Appends multiple leads to Google Sheets and local store | Confirmed Working |
| `/api/campaigns/list` | GET / POST | Fetches all campaigns and workflow graphs from Google Sheets or local store | Confirmed Working |
| `/api/campaigns/save` | POST | Creates or updates a campaign and its visual workflow graph | Confirmed Working |
| `/api/campaigns/delete` | POST | Deletes a campaign from Google Sheets and local store | Confirmed Working |
| `/api/campaigns/toggle-active` | POST | Toggles campaign active/paused status | Confirmed Working |
| `/api/import/parse` | POST | Parses CSV or Excel (`.xlsx`, `.xls`) file buffer, auto-maps columns, validates emails, and identifies duplicates | Confirmed Working |
| `/api/campaigns/run-due` | POST | Evaluates due sequence stages and transitions leads along active workflow nodes | Confirmed Working |
| `/api/settings` | GET / POST | Reads or saves application settings and default sequence gaps | Confirmed Working |
| `/api/senders` | GET / POST | Reads or saves connected sender accounts and daily quota caps | Confirmed Working |
| `/api/tasks` | GET / POST | Reads or saves manual tasks generated by workflow execution | Confirmed Working |
| `/api/tasks/update` | POST | Updates completion status or metadata of a manual task | Confirmed Working |
| `/api/system/stats` | GET | Returns high-level metrics (leads count, active campaigns, pending tasks, tracking totals) | Confirmed Working |
| `/api/emails/send` | POST | Dispatches email and injects tracking pixel into HTML payload | Confirmed Working |

---

## 5. Workflow / Campaign System Status

### Canvas Architecture
* Implemented with `@xyflow/react` (ReactFlow v12).
* Supports node dragging, edge connection, edge deletion, node selection, zoom, minimap, background grid, and multi-campaign switching.
* Right-hand node inspector panel edits properties based on the selected node type.

### Node Types and Implementation State
* **Start Node (`start`)**: *Confirmed Working.* Configures campaign entry parameters, sender selection, allowed sending days (e.g., Monday–Friday), and daily active sending time windows.
* **Email Node (`email`)**: *Confirmed Working.* Configures stage assignment (1–7) or custom subject line and body HTML with token substitution.
* **Wait Node (`wait`)**: *Confirmed Working.* Specifies waiting periods in business days or hours before advancing to the next node. Evaluated against elapsed time during runner execution.
* **Condition Node (`condition`)**: *Confirmed Working.* Branches prospect execution via dual output handles (`Yes` / `No`). Supports evaluation rules:
  * `has_replied`: Checks if prospect replied to prior emails.
  * `email_opened`: Checks if prospect opened any sequence email.
  * `link_clicked`: Checks if prospect clicked a tracked link.
  * `has_linkedin_url`: Checks whether LinkedIn profile exists on lead record.
* **Manual Task Node (`manual_task`)**: *Confirmed Working.* Creates an actionable task in the `ManualTasksDashboard` with a title, description, priority (`low`, `medium`, `high`), and target offset due date.
* **Merge Node (`merge`)**: *Confirmed Working.* Combines multiple upstream decision branches back into a single sequence path.
* **LinkedIn Connection Invite (`linkedin_invite`)**: *Placeholder Only.* Displays connection note editor in inspector; marked with a "Coming Soon" badge. Automated dispatching requires LinkedIn enterprise partner API access.
* **LinkedIn Direct Message (`linkedin_message`)**: *Placeholder Only.* Displays direct message editor in inspector; marked with a "Coming Soon" badge.

---

## 6. Integrations Connected

### 1. Google Sheets API v4
* **Library / Transport**: Direct REST API calls using client-side OAuth Bearer token (`https://sheets.googleapis.com/v4/spreadsheets/...`) with backend mirroring.
* **Capabilities Used**:
  * Spreadsheet creation with initial headers and formatting.
  * Range reads (`values.get`), appends (`values.append`), updates (`values.update`), and clears (`values.clear`).
  * Row deletion using `batchUpdate` with `deleteDimension` requests.
  * Sheet tab creation and header initialization for the `Campaigns` tab.
* **Required Scope**: `https://www.googleapis.com/auth/spreadsheets`
* **Status**: Confirmed Working.

### 2. Gmail API v1
* **Library / Transport**: REST API (`https://gmail.googleapis.com/gmail/v1/users/me/...`).
* **Capabilities Used**:
  * Direct sending of RFC 2822 formatted emails with MIME headers, tracking pixel, and link wrapping.
  * Thread fetching (`/users/me/threads/{id}`) to render full conversation histories in the lead drawer.
  * Automated reply scanning using thread analysis and `In-Reply-To` / `References` headers.
* **Required Scopes**: `https://www.googleapis.com/auth/gmail.send`, `https://www.googleapis.com/auth/gmail.readonly`
* **Status**: Confirmed Working for sending, threading, and polling reply detection. Push notifications unverified.

### 3. Google OAuth 2.0 (Google Identity Services / Firebase Auth)
* Client-side token acquisition and session management for Google Workspace access.
* **Status**: Confirmed Working.

---

## 7. Known Limitations and Unverified Features

1. **Email Open and Click Tracking in Development Sandbox (Unverified in Live Inboxes)**:
   * Endpoints `/api/track/open` and `/api/track/click` are implemented and verified internally.
   * However, when running in the AI Studio development container, the app is hosted behind an authentication gateway requiring session cookies (`/__cookie_check.html`).
   * External email services (such as Gmail's proxy server `googleusercontent.com`) cannot reach the tracking URL from an external recipient inbox.
   * **Resolution**: Full live open/click tracking requires deploying the applet to a public production URL on Cloud Run or a custom domain.
2. **Local Data Persistence Without Google Sheet (Confirmed Limitation)**:
   * When disconnected from Google Sheets, data is written only to local container files (`data_store/leads.json`).
   * Container restarts or re-deployments without a persistent volume mount will reset local data to the default seed leads.
   * **Resolution**: Surfaced in the UI near the connection status indicator, in the top warning banner, and in the connection modal. Connecting a Google Sheet prevents any data loss.
3. **LinkedIn Automated Outreach (Placeholder / Coming Soon)**:
   * The visual workflow canvas includes `linkedin_invite` and `linkedin_message` nodes for sequence modeling.
   * Actual dispatching to LinkedIn's network is not implemented, as it requires LinkedIn Marketing Partner or Community Management API access. Leads reaching these nodes are flagged or routed to manual tasks.
4. **Real-Time Reply Push Notifications (Polling-Based Fallback)**:
   * Inbound replies are detected through on-demand polling ("Check Replies" button in the runner or lead drawer) and sequence evaluation runs.
   * Google Cloud Pub/Sub push webhooks are not configured.

---

## 8. Summary of Recent Verification Passes

* **Campaign Scheduler Safeguards & Execution**:
  * Verified inactive campaigns are skipped and untouched.
  * Verified reply detection priority halts sequence for replied leads and moves them to "Needs Reply".
  * Verified daily send limit caps postponement of sends.
  * Verified schedule node day/hour window adherence.
  * Verified wait node duration calculation and stage progression.
* **Server Restart & Sheet as Source of Truth**:
  * Verified that on application startup, if a Google Sheet is connected, the app fetches directly from the Google Sheets API as the authoritative source of truth, updating client state and server cache.
  * Surfaced prominent warnings across the UI regarding local data loss risk on restart when disconnected.
