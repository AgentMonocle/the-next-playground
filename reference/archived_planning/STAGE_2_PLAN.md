> **⚠️ ARCHIVED DOCUMENT — HISTORICAL REFERENCE ONLY**
>
> This file was archived on 2026-02-13. It is retained for historical reference
> and **must not** be used as a guiding design or planning document. The
> information, task breakdowns, architecture diagrams, and estimates herein may
> be outdated or superseded by later work. For current project state, consult
> the beads system (`bd list`, `bd ready`).

---

# Stage 2: Activities & Email — Detailed Implementation Plan

**Goal**: Activity tracking with auto-capture from email and calendar.
**Timeline**: Weeks 7-10
**Epic Bead**: `the-next-playground-rgq`
**Depends on**: Stage 1 (Core CRM Beta) — complete
**Deliverable**: Activities auto-capture from email. Sales team sees full interaction history per contact and opportunity.

---

## Table of Contents

1. [Stage 2 Overview](#1-stage-2-overview)
2. [Architecture & Data Flow](#2-architecture--data-flow)
3. [SharePoint Schema: TSS_Activity](#3-sharepoint-schema-tss_activity)
4. [Task Breakdown](#4-task-breakdown)
5. [Task 2.1: TSS_Activity SharePoint List](#task-21-tss_activity-sharepoint-list)
6. [Task 2.2: Activity Types & TypeScript Schema](#task-22-activity-types--typescript-schema)
7. [Task 2.3: Activity CRUD Hooks](#task-23-activity-crud-hooks)
8. [Task 2.4: Activity List Page](#task-24-activity-list-page)
9. [Task 2.5: Activity Form (Quick-Entry)](#task-25-activity-form-quick-entry)
10. [Task 2.6: Activity Detail Page](#task-26-activity-detail-page)
11. [Task 2.7: Activity Timeline Component](#task-27-activity-timeline-component)
12. [Task 2.8: Integrate Timeline into Detail Pages](#task-28-integrate-timeline-into-detail-pages)
13. [Task 2.9: Email Panel — Read Email History](#task-29-email-panel--read-email-history)
14. [Task 2.10: Email Panel — Send Email](#task-210-email-panel--send-email)
15. [Task 2.11: MSAL Scope Expansion](#task-211-msal-scope-expansion)
16. [Task 2.12: Email Auto-Link Azure Function](#task-212-email-auto-link-azure-function)
17. [Task 2.13: Graph Webhook Subscription Function](#task-213-graph-webhook-subscription-function)
18. [Task 2.14: Subscription Renewal Timer Function](#task-214-subscription-renewal-timer-function)
19. [Task 2.15: Calendar View](#task-215-calendar-view)
20. [Task 2.16: Quick-Action Buttons](#task-216-quick-action-buttons)
21. [Task 2.17: Dashboard Activity Feed](#task-217-dashboard-activity-feed)
22. [Task 2.18: Navigation & Routing Updates](#task-218-navigation--routing-updates)
23. [Task 2.19: Seed Data & Provisioning](#task-219-seed-data--provisioning)
24. [Task 2.20: End-to-End Testing & Bug Fixes](#task-220-end-to-end-testing--bug-fixes)
25. [Dependency Chain](#dependency-chain)
26. [File Tree (New & Modified Files)](#file-tree-new--modified-files)
27. [Risk Register](#risk-register)

---

## 1. Stage 2 Overview

Stage 2 transforms TSS from a static record system into a **living interaction tracker**. Sales reps will see a chronological feed of every customer touchpoint — calls, emails, meetings, site visits — without manually logging most of them.

### Key Capabilities

| Capability | Type | Priority |
|---|---|---|
| Manual activity entry (Log Call, Log Meeting, Log Site Visit) | SPA UI | P1 |
| Activity timeline on Company, Contact, Opportunity detail pages | SPA UI | P1 |
| Activity list page with filtering | SPA UI | P1 |
| Read email history for a contact (Graph API) | SPA + Graph | P1 |
| Send email from CRM (Graph API) | SPA + Graph | P2 |
| Email auto-link (webhook > Azure Function > Activity) | Azure Function | P2 |
| Subscription renewal (timer function) | Azure Function | P2 |
| Calendar view (meetings linked to CRM contacts) | SPA + Graph | P3 |
| Dashboard activity feed (recent across all entities) | SPA UI | P2 |

### Phasing Strategy

Stage 2 is split into two delivery phases:

**Phase A (P1 — Core Activities)**: Tasks 2.1-2.8, 2.16-2.19
- TSS_Activity list, types, hooks, CRUD pages
- Activity timeline on all detail pages
- Quick-entry buttons (Log Call, Log Meeting, Log Site Visit)
- Seed data and routing updates
- **Deliverable**: Sales team can manually log and view activities

**Phase B (P2/P3 — Email & Calendar Integration)**: Tasks 2.9-2.15, 2.20
- MSAL scope expansion (Mail.Read, Mail.Send, Calendars.ReadWrite)
- Email panel (read + send)
- Email auto-link (Graph webhook > Azure Function)
- Subscription management (create + renew)
- Calendar view
- **Deliverable**: Full email integration with auto-capture

---

## 4. Task Breakdown

| # | Task | Type | Priority | Depends On | Est. Hours |
|---|---|---|---|---|---|
| 2.1 | TSS_Activity SharePoint list | Script | P1 | — | 1 |
| 2.2 | Activity types & Zod schema | Types | P1 | — | 1 |
| 2.3 | Activity CRUD hooks | Hooks | P1 | 2.2 | 2 |
| 2.4 | Activity list page | Page | P1 | 2.3 | 2 |
| 2.5 | Activity form (quick-entry) | Page | P1 | 2.3 | 2 |
| 2.6 | Activity detail page | Page | P1 | 2.3 | 1 |
| 2.7 | Activity timeline component | Component | P1 | 2.3 | 2 |
| 2.8 | Integrate timeline into detail pages | Integration | P1 | 2.7 | 2 |
| 2.9 | Email panel — read email history | Component | P1 | 2.11 | 3 |
| 2.10 | Email panel — send email | Component | P2 | 2.11 | 2 |
| 2.11 | MSAL scope expansion | Config | P1 | — | 0.5 |
| 2.12 | Email auto-link Azure Function | Function | P2 | 2.13 | 3 |
| 2.13 | Graph webhook subscription Function | Function | P2 | — | 2 |
| 2.14 | Subscription renewal timer Function | Function | P2 | 2.13 | 1 |
| 2.15 | Calendar view | Page | P3 | 2.11 | 2 |
| 2.16 | Quick-action buttons | Component | P1 | 2.5 | 1 |
| 2.17 | Dashboard activity feed | Component | P2 | 2.3 | 1 |
| 2.18 | Navigation & routing updates | Config | P1 | 2.4, 2.5, 2.6 | 0.5 |
| 2.19 | Seed data & provisioning | Script | P1 | 2.1 | 1 |
| 2.20 | End-to-end testing & bug fixes | Testing | P1 | All | 3 |
| | | | | **Total** | **~33 hrs** |

---

(Full task details, architecture diagrams, dependency chains, file trees, and risk register follow in the original document. Refer to git history for the complete content.)

---

## Execution Order Summary

| Order | Task | Owner | Est. Hours | Phase |
|---|---|---|---|---|
| **1** | Task 2.1: TSS_Activity SharePoint list | Claude | 1 | A |
| **2** | Task 2.2: Activity types & Zod schema | Claude | 1 | A |
| **3** | Task 2.3: Activity CRUD hooks | Claude | 2 | A |
| **4** | Task 2.5: Activity form (quick-entry) | Claude | 2 | A |
| **5** | Task 2.4: Activity list page | Claude | 2 | A |
| **6** | Task 2.6: Activity detail page | Claude | 1 | A |
| **7** | Task 2.7: Activity timeline component | Claude | 2 | A |
| **8** | Task 2.8: Integrate timeline into detail pages | Claude | 2 | A |
| **9** | Task 2.16: Quick-action buttons | Claude | 1 | A |
| **10** | Task 2.17: Dashboard activity feed | Claude | 1 | A |
| **11** | Task 2.18: Navigation & routing updates | Claude | 0.5 | A |
| **12** | Task 2.19: Seed data & provisioning | Claude | 1 | A |
| **--- Phase A Complete ---** | | | **~16.5 hrs** | |
| **13** | Task 2.11: MSAL scope expansion | Claude + User | 0.5 | B |
| **14** | Task 2.9: Email panel — read | Claude | 3 | B |
| **15** | Task 2.10: Email panel — send | Claude | 2 | B |
| **16** | Task 2.13: Webhook subscription Function | Claude + User | 2 | B |
| **17** | Task 2.12: Email auto-link Function | Claude | 3 | B |
| **18** | Task 2.14: Subscription renewal timer | Claude | 1 | B |
| **19** | Task 2.15: Calendar view | Claude | 2 | B |
| **--- Phase B Complete ---** | | | **~13.5 hrs** | |
| **20** | Task 2.20: E2E testing & bug fixes | Claude + User | 3 | Both |
| | | | **Total: ~33 hrs** | |
