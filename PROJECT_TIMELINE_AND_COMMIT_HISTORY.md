# GINI / Outreach Flow — Project Evolution Timeline & Commit History

> **Document Type:** Project Development Timeline & Commit Audit Log  
> **Repository:** `Sahhitya-naresh/GINI`  
> **Timeline Span:** September 21, 2026 – September 29, 2026  
> **Target Audience:** Engineering Executives, Technical Directors, and Project Auditors  

---

## Executive Summary of Project Evolution

The **GINI (Outreach Flow)** codebase underwent an accelerated, multi-stage architectural transformation over a 9-day development period. It transitioned from an early prototype relying on Google Sheets and user-delegated Gmail APIs into a resilient, enterprise-grade cold-outreach automation engine powered by:
1. **Single Source of Truth Database**: Migrated from Google Sheets and local JSON files to **MongoDB Atlas** (with an embedded in-memory server for zero-dependency offline local development).
2. **Microsoft 365 Enterprise Integration**: Replaced personal Gmail accounts with application-level **Microsoft Graph OAuth 2.0 (Client Credentials)** scoped to a dedicated corporate service account.
3. **Native Conversation Threading**: Implemented RFC 2822 threading headers (`In-Reply-To`, `References`, and `conversationId`) to group multi-stage outreach into continuous Outlook and Gmail threads.
4. **Internal Engagement Tracking Engine**: Built 1x1 transparent GIF open pixels and link click redirection with automatic synchronization to lead documents and protection against in-app preview false positives.
5. **Visual Workflow Automation**: Built a drag-and-drop flowchart sequence builder using `@xyflow/react` with behavioral branching based on prospect engagement (opens, clicks, replies).
6. **Real-Time Reply Detection via Webhooks**: Eliminated periodic mailbox polling in favor of **Microsoft Graph Change Notifications (Webhooks)**, protected by a cryptographic `clientState` security boundary and automated daily subscription renewal crons.

---

## Project Chronological Phases & Milestones

```
+---------------------------------------------------------------------------------------------------+
|                                      PROJECT PHASES & TIMELINE                                     |
|                                                                                                   |
|  [Sep 21]       Phase 1: Foundation & Initial Prototyping                                        |
|  [Sep 23-24]    Phase 2: Data Layer Migration from JSON/Sheets to MongoDB & Serverless Prep      |
|  [Sep 25]       Phase 3: Migration from Gmail to Microsoft Graph API & Conversation Threading     |
|  [Sep 28]       Phase 4: Mandatory Campaign Associations & Lead Engagement Tracking Engine        |
|  [Sep 29 AM]    Phase 5: Background Reply Detection, Reply Alerts, and Tracking In-App Protection |
|  [Sep 29 Mid]   Phase 6: Stale Data Cleanout, Database Reset Hardening, and E2E Live Testing     |
|  [Sep 29 PM]    Phase 7: Transition to Microsoft Graph Webhooks & Daily Subscription Renewal Cron |
+---------------------------------------------------------------------------------------------------+
```

---

## Detailed Commit-by-Commit Audit Log

### Phase 1: Foundation & Initial Prototyping (September 21, 2026)

#### Commit 1: `6115236`
* **Date & Time:** `2026-09-21T12:08:13+05:30`
* **Author:** Sahhitya-naresh
* **Commit Message:** `Initial commit`
* **Architectural Impact:**
  - Initialized the repository structure with Vite, React, TypeScript, and Tailwind CSS.
  - Set up standard package dependencies, ESLint, and configuration scaffolding.

#### Commit 2: `5966b90`
* **Date & Time:** `2026-09-21T12:08:45+05:30`
* **Author:** Sahhitya-naresh
* **Commit Message:** `starting to test`
* **Architectural Impact:**
  - Configured early development test harnesses and initial UI layout components.

---

### Phase 2: Data Layer Migration to MongoDB & Serverless Preparation (September 23–24, 2026)

#### Commit 3: `fc8acdd`
* **Date & Time:** `2026-09-23T14:47:50+05:30`
* **Author:** Sahhitya-naresh
* **Commit Message:** `feat: migrate data storage from JSON to MongoDB`
* **Architectural Impact:**
  - Began migrating backend persistence away from flat JSON files in `data_store/` toward MongoDB.
  - Introduced the initial MongoDB connection logic and collections for leads and campaigns.

#### Commit 4: `7df5dcc`
* **Date & Time:** `2026-09-23T15:15:34+05:30`
* **Author:** Sahhitya-naresh
* **Commit Message:** `feat: add mongodb and memory server support`
* **Architectural Impact:**
  - Integrated `mongodb-memory-server` to allow developers to run the application completely offline without needing a live MongoDB Atlas cluster.
  - Established automatic fallback detection: if `MONGODB_URI` is unreachable or unconfigured, the server spins up an in-memory replica set.

#### Commits 5 & 6: `f0280b3` & `e74ce52`
* **Date & Time:** `2026-09-23T15:51:15+05:30` & `2026-09-23T15:57:08+05:30`
* **Author:** Sahhitya-naresh
* **Commit Message:** `chore: update Firebase configuration`
* **Architectural Impact:**
  - Maintained configuration alignment during intermediate evaluation of authentication providers.

#### Commit 7: `a9d539a`
* **Date & Time:** `2026-09-23T16:06:31+05:30`
* **Author:** Sahhitya-naresh
* **Commit Message:** `feat(db): add diagnostic logging to mongodb connection`
* **Architectural Impact:**
  - Added structured connection step logging in `server/mongodb.ts` (package validation, environment inspection, URI length masking, connection status).

#### Commits 8 & 9: `64a6a39` & `f4a0de5`
* **Date & Time:** `2026-09-23T16:12:02+05:30` & `2026-09-23T16:14:46+05:30`
* **Author:** Sahhitya-naresh
* **Commit Messages:**
  - `build: add API build step for Vercel deployment`
  - `build: rename api entry point to server/api-entry.ts`
* **Architectural Impact:**
  - Established dual build pipeline: Vite builds the SPA bundle into `dist/`, and esbuild bundles `server/api-entry.ts` into `api/index.js` for zero-configuration Vercel Serverless Function deployment.

#### Commit 10: `355d1e3`
* **Date & Time:** `2026-09-24T10:14:23+05:30`
* **Author:** Sahhitya-naresh
* **Commit Message:** `feat(database): add MongoDB connection management`
* **Architectural Impact:**
  - Refactored MongoDB connection pooling, client reuse, and graceful error handling. Added connection health diagnostics endpoint.

---

### Phase 3: Transition from Gmail to Microsoft Graph & Threading (September 25, 2026)

#### Commit 11: `1baa7d5`
* **Date & Time:** `2026-09-25T11:32:32+05:30`
* **Author:** Sahhitya-naresh
* **Commit Message:** `feat: replace Gmail with Microsoft Outlook provider`
* **Architectural Impact:**
  - Replaced the legacy Gmail API client (`gmail.googleapis.com`) with Microsoft Outlook/Graph email service abstractions in `src/services/email/`.

#### Commit 12: `394c4fe`
* **Date & Time:** `2026-09-25T13:05:14+05:30`
* **Author:** Sahhitya-naresh
* **Commit Message:** `feat: add Microsoft Graph app-only service integration`
* **Architectural Impact:**
  - Implemented `server/msGraphAuth.ts` and `server/msGraphService.ts`.
  - Switched from fragile user-interactive OAuth consents to **App-Only (Client Credentials)** grant against Microsoft Entra ID.
  - Implemented in-memory token caching with proactive pre-expiry refreshes.
  - Routed all outreach sends through `POST /users/{MICROSOFT_GRAPH_SERVICE_ACCOUNT}/sendMail`.

#### Commit 13: `77d69b5`
* **Date & Time:** `2026-09-25T15:27:39+05:30`
* **Author:** Sahhitya-naresh
* **Commit Message:** `feat(mail): enable email threading in MS Graph`
* **Architectural Impact:**
  - Solved broken conversation grouping: queried Microsoft Graph `SentItems` upon dispatch to reliably obtain the true `conversationId` and `internetMessageId`.
  - Injected `In-Reply-To` and `References` headers on all follow-up sequence stages to keep emails in a single conversation thread.

#### Commit 14: `d212924`
* **Date & Time:** `2026-09-25T15:46:50+05:30`
* **Author:** Sahhitya-naresh
* **Commit Message:** `refactor: migrate lead storage from Sheets to MongoDB`
* **Architectural Impact:**
  - Fully detached lead storage from Google Sheets API. Made MongoDB the primary operational data store across the frontend UI, modals, and campaign runner.

---

### Phase 4: Campaign Association & Engagement Tracking (September 28, 2026)

#### Commit 15: `6bf8da2`
* **Date & Time:** `2026-09-28T13:27:51+05:30`
* **Author:** Sahhitya-naresh
* **Commit Message:** `feat: implement mandatory campaign assignment for leads`
* **Architectural Impact:**
  - Enforced campaign validation rules so leads cannot exist in an unassigned state.
  - Updated CSV importer, manual lead modal, and table to require campaign assignment.

#### Commit 16: `809beb5`
* **Date & Time:** `2026-09-28T15:13:36+05:30`
* **Author:** Sahhitya-naresh
* **Commit Message:** `feat: add automated lead engagement tracking`
* **Architectural Impact:**
  - Created `server/urlHelper.ts` to construct public base URLs for tracking.
  - Built automatic hyperlink wrapping for click tracking (`/api/track/click`) and transparent GIF injection (`/api/track/open`).
  - Added real-time aggregation of opens and clicks on lead records.

---

### Phase 5: Automated Reply Detection & UI Protection (September 29 Morning)

#### Commit 17: `af559e8`
* **Date & Time:** `2026-09-29T11:42:23+05:30`
* **Author:** Lavi Singh Jadon
* **Commit Message:** `feat: automated background reply detection and transition to Needs Reply`
* **Architectural Impact:**
  - Added a background interval loop (every 3 minutes) on active browser tabs to evaluate replies.
  - Automated transition of replied leads into the "Needs Reply" tab.
  - Added [scripts/verify-reply-flow.ts](file:///d:/outreach/GINI/scripts/verify-reply-flow.ts) for automated Playwright testing.

#### Commit 18: `661c617`
* **Date & Time:** `2026-09-29T12:41:53+05:30`
* **Author:** Sahhitya Naresh
* **Commit Message:** `feat: prevent in-app open tracking, add reset tracking action, and show reply alert popup`
* **Architectural Impact:**
  - Fixed false-positive tracking: sanitized tracking pixels when emails are previewed inside the app drawer using `emailSanitizer.ts`.
  - Added `ReplyAlertModal.tsx` real-time popup that triggers whenever a prospect replies.
  - Added a reset tracking action for testing and metric clearing.

#### Commit 19: `cee8652`
* **Date & Time:** `2026-09-29T13:27:07+05:30`
* **Author:** Sahhitya Naresh
* **Commit Message:** `fix: resolve reset tracking endpoint error and persist reset metrics to table and state`
* **Architectural Impact:**
  - Hardened `/api/track/reset-lead` endpoint to reset `opensCount`, `clicksCount`, and timestamps in both MongoDB and local UI state.

---

### Phase 6: Stale Data Cleanout & Database Hardening (September 29 Midday)

#### Commit 20: `a6295db`
* **Date & Time:** `2026-09-29T13:54:05+05:30`
* **Author:** Sahhitya Naresh
* **Commit Message:** `fix: remove sample leads auto-seeding and fallback so database reset displays empty state`
* **Architectural Impact:**
  - Exported complete pre-reset backup at `backups/pre-reset-2026-09-29T08-08-57-655Z.json`.
  - Removed hardcoded sample leads from `data_store/leads.json` so resetting leads in MongoDB displays a genuine empty state rather than silently re-seeding test data.

#### Commit 21: `d77ce98`
* **Date & Time:** `2026-09-29T15:09:00+05:30`
* **Author:** Sahhitya Naresh
* **Commit Message:** `chore: clear stale data_store files and replace credentials with placeholders in .env.example`
* **Architectural Impact:**
  - Emptied stale campaigns and senders from `data_store/campaigns.json` and `data_store/senders.json`.
  - Sanitized real Tenant IDs and Client IDs in `.env.example` with standard placeholders.

#### Commit 22: `b485d75`
* **Date & Time:** `2026-09-29T16:10:41+05:30`
* **Author:** Sahhitya Naresh
* **Commit Message:** `fix(security): protect inbound-reply with CRON_SECRET, isolate production reply detection, and auto-resolve campaignId`
* **Architectural Impact:**
  - Added security authentication checks on the mock inbound reply endpoint.
  - Implemented automatic case-insensitive resolution of `campaignId` by campaign name in `server/mongoBackend.ts`.
  - Created automated test scripts covering the complete live system pass (Item 1 to 7).

---

### Phase 7: Microsoft Graph Webhooks & Subscription Renewal Cron (September 29 Late Afternoon)

#### Commit 23: `4da4ccc`
* **Date & Time:** `2026-09-29T16:34:36+05:30`
* **Author:** Sahhitya Naresh
* **Commit Message:** `feat: implement Microsoft Graph change notifications webhook and renewal cron, remove mock inbound-reply`
* **Architectural Impact:**
  - **Full Webhook Architecture**: Mounted `POST /api/webhooks/graph` supporting zero-latency plain-text validation handshakes (`req.query.validationToken`).
  - **Security Boundary**: Implemented constant-time cryptographic verification (`verifyWebhookClientState` via `crypto.timingSafeEqual`) on `clientState`, rejecting spoofed requests with `401 Unauthorized`.
  - **Shared Reply Function**: Built `applyLeadReply()` in `server/mongoBackend.ts` shared across webhooks and manual checks to transition leads to `"Replied"` in MongoDB, record inbound messages, and pause sequences.
  - **Automated Daily Subscription Renewal**: Built `renewExpiringGraphSubscriptions()` and route `/api/cron/renew-subscriptions`. Scheduled daily cron in `vercel.json` (`0 2 * * *`).
  - **Clean Deprecation**: Completely removed the mock `/api/email/inbound-reply` endpoint.
  - **Verification Suite**: Created [scripts/verify-graph-webhook.ts](file:///d:/outreach/GINI/scripts/verify-graph-webhook.ts), passing all tests for handshake, spoofed rejection, real webhook transitions, and subscription renewals.

---

## File Modification Evolution Matrix

| Major Subsystem | Files Created / Modified Across Commits | Key Responsibility |
| :--- | :--- | :--- |
| **Microsoft Graph Integration** | `server/msGraphAuth.ts`, `server/msGraphService.ts` | Token caching, mail sending, conversation threading, webhook subscriptions |
| **API & Webhook Endpoints** | `server/app.ts`, `api/index.js`, `server/api-entry.ts` | Express routing, webhook receivers, tracking redirects, cron endpoints |
| **Database & Persistence** | `server/mongodb.ts`, `server/mongoBackend.ts` | MongoDB connection management, collections, indexes, lead CRUD, shared reply logic |
| **Campaign Sequence Runner** | `server/runnerBackend.ts`, `src/services/replyService.ts` | Node evaluation loop, schedule windows, sender quotas, reply detection checks |
| **Tracking Engine** | `server/urlHelper.ts`, `src/services/trackingService.ts`, `src/utils/emailSanitizer.ts` | 1x1 GIF generation, link wrapping, click redirection, preview sanitization |
| **Frontend UI & Modals** | `src/App.tsx`, `src/components/LeadDetailModal.tsx`, `src/components/ReplyAlertModal.tsx` | Main CRM table, Needs Reply tab, real-time alert popups, conversation threads |
| **Deployment & Config** | `vercel.json`, `package.json`, `.env.example` | Vercel Serverless builds, daily cron schedule, environment documentation |
| **Automated Test Suites** | `scripts/verify-graph-webhook.ts`, `scripts/verify-item1-send-reply.ts`, `scripts/verify-reply-flow.ts` | E2E headless verification, webhook handshake tests, security boundary validation |

---

*Compiled and verified from repository commit history by the Antigravity Engineering Agent.*
