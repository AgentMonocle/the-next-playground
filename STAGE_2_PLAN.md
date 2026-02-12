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
| Email auto-link (webhook → Azure Function → Activity) | Azure Function | P2 |
| Subscription renewal (timer function) | Azure Function | P2 |
| Calendar view (meetings linked to CRM contacts) | SPA + Graph | P3 |
| Dashboard activity feed (recent across all entities) | SPA UI | P2 |

### Phasing Strategy

Stage 2 is split into two delivery phases:

**Phase A (P1 — Core Activities)**: Tasks 2.1–2.8, 2.16–2.19
- TSS_Activity list, types, hooks, CRUD pages
- Activity timeline on all detail pages
- Quick-entry buttons (Log Call, Log Meeting, Log Site Visit)
- Seed data and routing updates
- **Deliverable**: Sales team can manually log and view activities

**Phase B (P2/P3 — Email & Calendar Integration)**: Tasks 2.9–2.15, 2.20
- MSAL scope expansion (Mail.Read, Mail.Send, Calendars.ReadWrite)
- Email panel (read + send)
- Email auto-link (Graph webhook → Azure Function)
- Subscription management (create + renew)
- Calendar view
- **Deliverable**: Full email integration with auto-capture

---

## 2. Architecture & Data Flow

### Manual Activity Flow

```
Sales Rep                  React SPA                SharePoint
   │                          │                        │
   │  Click "Log Call"        │                        │
   │ ─────────────────►       │                        │
   │                          │  POST /lists/TSS_Activity/items
   │                          │ ───────────────────►   │
   │                          │                        │ ◄── item created
   │  See activity in         │  invalidateQueries()   │
   │  timeline                │ ◄──────────────────    │
   │ ◄────────────────        │                        │
```

### Email Auto-Link Flow

```
External Email              Microsoft 365            Azure Function           SharePoint
   │                          │                        │                        │
   │  Email sent TO/FROM      │                        │                        │
   │  CRM contact             │                        │                        │
   │ ─────────────────►       │                        │                        │
   │                          │  Webhook notification  │                        │
   │                          │ ───────────────────►   │                        │
   │                          │                        │  Read email metadata   │
   │                          │ ◄──────────────────    │                        │
   │                          │                        │  Match sender/recipient│
   │                          │                        │  against TSS_Contact   │
   │                          │                        │ ───────────────────►   │
   │                          │                        │                        │
   │                          │                        │  Create TSS_Activity   │
   │                          │                        │ ───────────────────►   │
   │                          │                        │                        │ ◄── done
```

### Email Panel Flow (Read + Send)

```
Sales Rep                  React SPA                 Graph API
   │                          │                        │
   │  Open contact detail     │                        │
   │  → Email tab             │                        │
   │ ─────────────────►       │                        │
   │                          │  GET /me/messages      │
   │                          │  ?$filter=sender eq    │
   │                          │  'contact@company.com' │
   │                          │ ───────────────────►   │
   │                          │                        │ ◄── messages
   │  View email thread       │                        │
   │ ◄────────────────        │                        │
   │                          │                        │
   │  Compose & send          │  POST /me/sendMail     │
   │ ─────────────────►       │ ───────────────────►   │
   │                          │                        │ ◄── sent
   │  Auto-create activity    │  POST TSS_Activity     │
   │ ◄────────────────        │ ───────────────────►   │
```

---

## 3. SharePoint Schema: TSS_Activity

Defined in DEVELOPMENT_PLAN.md Section 2. Reproduced here with implementation notes:

| Column | Internal Name | Type | Required | Indexed | Notes |
|---|---|---|---|---|---|
| Subject | `Title` | Single line text | Yes | Yes | Brief description (built-in column) |
| Type | `tss_activityType` | Choice | Yes | Yes | Email, Call, Meeting, Site Visit, Trade Show, Training, Internal Note, Quote Sent, PO Received, Shipment |
| Date | `tss_activityDate` | DateTime | Yes | Yes | When it occurred |
| Company | `tss_companyId` | Lookup → TSS_Company | No | Yes | Associated account |
| Contact | `tss_contactId` | Lookup → TSS_Contact | No | No | Associated contact |
| Opportunity | `tss_opportunityId` | Lookup → TSS_Opportunity | No | Yes | Associated opportunity |
| Owner | `tss_owner` | Text | Yes | Yes | Tejas user who performed/logged the activity (text field, not Person — see note below) |
| Direction | `tss_direction` | Choice | No | No | Inbound, Outbound, Internal |
| Duration (min) | `tss_duration` | Number | No | No | Call/meeting length |
| Description | `tss_description` | Multiple lines | No | No | Details, notes, outcomes |
| Source | `tss_source` | Choice | No | No | Manual, Email Auto-Link, JotForm, Calendar Sync |
| Is Auto-Created | `tss_isAutoCreated` | Yes/No | No | No | True if created by system |
| Email Message ID | `tss_emailMessageId` | Single line text | No | No | Graph API message ID (prevents duplicates) |

**Lookup budget**: 3 of 12 used (companyId, contactId, opportunityId)

> **Note on `tss_owner`**: The DEVELOPMENT_PLAN.md specifies a Person column. However, Person columns cannot be created via Graph API (SharePoint limitation). We use a text column storing the user's display name or email. The current user is obtained from MSAL `accounts[0].name` on the client side, or from the Graph API `users` endpoint in Azure Functions.

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

## Task 2.1: TSS_Activity SharePoint List

**Bead**: Create before starting work
**Priority**: P1
**Depends on**: None

### 2.1.1 Create List Definition

**New file**: `TSS/scripts/lists/activity.ts`

Define the TSS_Activity list schema following the established pattern:

```typescript
import type { ListDefinition } from '../lib/graphAdmin';

export const activityList: ListDefinition = {
  displayName: 'TSS_Activity',
  description: 'Customer interactions and internal actions',
  columns: [
    // Title is built-in — used as Subject
    {
      name: 'tss_activityType',
      type: 'choice',
      required: true,
      indexed: true,
      choices: [
        'Email', 'Call', 'Meeting', 'Site Visit', 'Trade Show',
        'Training', 'Internal Note', 'Quote Sent', 'PO Received', 'Shipment',
      ],
    },
    {
      name: 'tss_activityDate',
      type: 'dateTime',
      required: true,
      indexed: true,
    },
    {
      name: 'tss_companyId',
      type: 'lookup',
      required: false,
      indexed: true,
      lookupListName: 'TSS_Company',
      lookupColumnName: 'Title',
    },
    {
      name: 'tss_contactId',
      type: 'lookup',
      required: false,
      indexed: false,
      lookupListName: 'TSS_Contact',
      lookupColumnName: 'Title',
    },
    {
      name: 'tss_opportunityId',
      type: 'lookup',
      required: false,
      indexed: true,
      lookupListName: 'TSS_Opportunity',
      lookupColumnName: 'Title',
    },
    {
      name: 'tss_owner',
      type: 'text',
      required: true,
      indexed: true,
      description: 'Display name or email of the Tejas user',
    },
    {
      name: 'tss_direction',
      type: 'choice',
      required: false,
      indexed: false,
      choices: ['Inbound', 'Outbound', 'Internal'],
    },
    {
      name: 'tss_duration',
      type: 'number',
      required: false,
      indexed: false,
      description: 'Duration in minutes',
    },
    {
      name: 'tss_description',
      type: 'note',
      required: false,
      indexed: false,
    },
    {
      name: 'tss_source',
      type: 'choice',
      required: false,
      indexed: false,
      choices: ['Manual', 'Email Auto-Link', 'JotForm', 'Calendar Sync'],
    },
    {
      name: 'tss_isAutoCreated',
      type: 'boolean',
      required: false,
      indexed: false,
    },
    {
      name: 'tss_emailMessageId',
      type: 'text',
      required: false,
      indexed: false,
      description: 'Graph API email message ID for deduplication',
    },
  ],
};
```

### 2.1.2 Add to Provisioning Script

**Modify**: `TSS/scripts/provision.ts`

Insert `activityList` **after** `opportunityList` and **before** the junction lists:

```typescript
// Position in ordered list array:
// ... opportunityList
// activityList         ← NEW (lookups: Company, Contact, Opportunity)
// basinRegionCountryList
// ...
```

### Verification

- [ ] `tsx scripts/provision.ts` creates TSS_Activity with all columns
- [ ] Columns have correct types, indexes, and choice values
- [ ] Lookup columns resolve to TSS_Company, TSS_Contact, TSS_Opportunity
- [ ] Re-running provision is idempotent (no duplicate columns)

---

## Task 2.2: Activity Types & TypeScript Schema

**Priority**: P1
**Depends on**: None (can start in parallel with 2.1)

### 2.2.1 Create Activity Type

**New file**: `TSS/src/types/activity.ts`

```typescript
import { z } from 'zod';

// ---- Constants ----

export const ACTIVITY_TYPES = [
  'Email', 'Call', 'Meeting', 'Site Visit', 'Trade Show',
  'Training', 'Internal Note', 'Quote Sent', 'PO Received', 'Shipment',
] as const;
export type ActivityType = (typeof ACTIVITY_TYPES)[number];

export const ACTIVITY_DIRECTIONS = ['Inbound', 'Outbound', 'Internal'] as const;
export type ActivityDirection = (typeof ACTIVITY_DIRECTIONS)[number];

export const ACTIVITY_SOURCES = ['Manual', 'Email Auto-Link', 'JotForm', 'Calendar Sync'] as const;
export type ActivitySource = (typeof ACTIVITY_SOURCES)[number];

// ---- Interface ----

export interface Activity {
  id: number;
  Title: string;                          // Subject
  tss_activityType: ActivityType;
  tss_activityDate: string;               // ISO 8601
  tss_companyId?: LookupField;
  tss_companyIdLookupId?: number;
  tss_contactId?: LookupField;
  tss_contactIdLookupId?: number;
  tss_opportunityId?: LookupField;
  tss_opportunityIdLookupId?: number;
  tss_owner: string;
  tss_direction?: ActivityDirection;
  tss_duration?: number;
  tss_description?: string;
  tss_source?: ActivitySource;
  tss_isAutoCreated?: boolean;
  tss_emailMessageId?: string;
  Created: string;
  Modified: string;
}

// ---- Zod Schema (form validation) ----

export const activityFormSchema = z.object({
  Title: z.string().min(1, 'Subject is required').max(255),
  tss_activityType: z.enum(ACTIVITY_TYPES),
  tss_activityDate: z.string().min(1, 'Date is required'),
  tss_companyId: z.number().optional(),
  tss_contactId: z.number().optional(),
  tss_opportunityId: z.number().optional(),
  tss_owner: z.string().min(1, 'Owner is required'),
  tss_direction: z.enum(ACTIVITY_DIRECTIONS).optional(),
  tss_duration: z.number().min(0).optional(),
  tss_description: z.string().optional(),
  tss_source: z.enum(ACTIVITY_SOURCES).optional(),
});
```

### 2.2.2 Export from Barrel

**Modify**: `TSS/src/types/index.ts`

Add:
```typescript
export type { Activity, ActivityType, ActivityDirection, ActivitySource } from './activity';
export { ACTIVITY_TYPES, ACTIVITY_DIRECTIONS, ACTIVITY_SOURCES, activityFormSchema } from './activity';
```

### Verification

- [ ] TypeScript compiles with no errors
- [ ] `Activity` interface matches SharePoint schema
- [ ] Zod schema validates form input correctly
- [ ] Import `Activity` from `@/types` works

---

## Task 2.3: Activity CRUD Hooks

**Priority**: P1
**Depends on**: 2.2

### 2.3.1 Create Activity Hooks

**New file**: `TSS/src/hooks/useActivities.ts`

Follow the established hook pattern from `useCompanies.ts`, `useOpportunities.ts`:

**Query keys:**
```typescript
export const activityKeys = {
  all: ['activities'] as const,
  lists: () => [...activityKeys.all, 'list'] as const,
  list: (filters: UseActivitiesOptions) => [...activityKeys.lists(), filters] as const,
  details: () => [...activityKeys.all, 'detail'] as const,
  detail: (id: number) => [...activityKeys.details(), id] as const,
  byCompany: (companyId: number) => [...activityKeys.all, 'byCompany', companyId] as const,
  byContact: (contactId: number) => [...activityKeys.all, 'byContact', contactId] as const,
  byOpportunity: (oppId: number) => [...activityKeys.all, 'byOpportunity', oppId] as const,
};
```

**Hooks to create:**

| Hook | Purpose | Query/Mutation |
|---|---|---|
| `useActivities(options)` | List activities with filters (type, date range, company, contact, opp) | Query |
| `useActivity(id)` | Single activity detail | Query |
| `useActivitiesByCompany(companyId)` | Activities for a company | Query |
| `useActivitiesByContact(contactId)` | Activities for a contact | Query |
| `useActivitiesByOpportunity(oppId)` | Activities for an opportunity | Query |
| `useRecentActivities(limit)` | Recent activities across all entities (for dashboard) | Query |
| `useCreateActivity()` | Create new activity | Mutation |
| `useUpdateActivity()` | Update existing activity | Mutation |
| `useDeleteActivity()` | Soft delete (or hard delete) activity | Mutation |

**Key implementation details:**

- **Date range filtering**: `tss_activityDate ge '2026-01-01' and tss_activityDate le '2026-12-31'`
- **Company filter**: `fields/tss_companyIdLookupId eq {companyId}`
- **Contact filter**: `fields/tss_contactIdLookupId eq {contactId}`
- **Opportunity filter**: `fields/tss_opportunityIdLookupId eq {opportunityId}`
- **Sorting**: Default `$orderby=fields/tss_activityDate desc` (most recent first)
- **Owner auto-set**: `useCreateActivity` should auto-populate `tss_owner` from `useMsal().accounts[0].name`
- **Source auto-set**: Manual entries default to `tss_source = 'Manual'`

### Verification

- [ ] `useActivities()` returns paginated activity list
- [ ] `useActivitiesByCompany(id)` filters correctly
- [ ] `useCreateActivity()` creates activity in SharePoint
- [ ] `useUpdateActivity()` patches existing activity
- [ ] Date range filters produce correct OData queries
- [ ] Activities sort by date descending

---

## Task 2.4: Activity List Page

**Priority**: P1
**Depends on**: 2.3

### 2.4.1 Create Activity List Page

**New file**: `TSS/src/pages/activities/ActivityList.tsx`

Follow `CompanyList.tsx` / `OpportunityList.tsx` pattern:

**Features:**
- Search by subject (Title field)
- Filter by activity type (multi-select or dropdown)
- Filter by date range (start date / end date)
- Filter by company (Combobox lookup)
- Filter by owner (text or dropdown)
- DataGrid with columns: Date, Subject, Type, Company, Contact, Owner, Direction
- Click row → navigate to ActivityDetail
- "New Activity" button → ActivityForm

**Implementation notes:**
- Use existing `SearchBar` component for subject search
- Use Fluent UI `Combobox` for type filter (allow multi-select)
- Use Fluent UI `DatePicker` for date range
- Client-side search on Title, server-side filter on type/date/company/contact
- Default date range: last 30 days
- Max items per page: 50 (configurable via uiStore)

### Verification

- [ ] Page loads and shows activities
- [ ] Search filters by subject text
- [ ] Type filter works (e.g., show only "Call" activities)
- [ ] Date range filter works
- [ ] Company filter works
- [ ] Click row navigates to detail page
- [ ] "New Activity" button navigates to form

---

## Task 2.5: Activity Form (Quick-Entry)

**Priority**: P1
**Depends on**: 2.3

### 2.5.1 Create Activity Form

**New file**: `TSS/src/pages/activities/ActivityForm.tsx`

**Design philosophy**: This form is for quick-entry. Pre-fill as much as possible to minimize typing.

**Pre-fillable fields (from URL params or context):**
- `type` — activity type (e.g., `?type=Call`)
- `companyId` — pre-select company
- `contactId` — pre-select contact
- `opportunityId` — pre-select opportunity

**Form fields:**
1. **Subject** (Title) — text input, required
2. **Type** — Combobox with ACTIVITY_TYPES, required
3. **Date** — DatePicker, defaults to now, required
4. **Company** — Combobox lookup (searchable), optional
5. **Contact** — Combobox lookup (filtered by selected company), optional
6. **Opportunity** — Combobox lookup (filtered by selected company), optional
7. **Owner** — text, auto-filled with current user name, required
8. **Direction** — Radio group: Inbound / Outbound / Internal, optional
9. **Duration** — Number input (minutes), optional (shown for Call/Meeting types)
10. **Description** — Textarea, optional

**Behavior:**
- When Company changes, Contact and Opportunity dropdowns filter to that company
- When type is "Call" or "Meeting", show Duration field
- "Save" creates activity via `useCreateActivity()`
- "Save & New" creates and resets form (keeping Company/Contact/Opp context)
- Navigate back on success

### 2.5.2 Edit Mode

Same form handles both create and edit:
- Route `/activities/new` → create mode
- Route `/activities/:id/edit` → edit mode (pre-fills from `useActivity(id)`)

### Verification

- [ ] Form renders with correct fields
- [ ] Company Combobox is searchable
- [ ] Contact/Opportunity filter when Company is selected
- [ ] Duration field shows/hides based on type
- [ ] Owner auto-fills with current user
- [ ] "Save" creates activity and navigates back
- [ ] Edit mode pre-fills all fields
- [ ] Zod validation prevents invalid submissions

---

## Task 2.6: Activity Detail Page

**Priority**: P1
**Depends on**: 2.3

### 2.6.1 Create Activity Detail Page

**New file**: `TSS/src/pages/activities/ActivityDetail.tsx`

Follow `CompanyDetail.tsx` pattern:

**Sections:**
1. **Header**: Subject, type badge, date, direction badge
2. **Details**: Owner, Duration, Source, Description
3. **Linked Records**: Company (link), Contact (link), Opportunity (link)
4. **Metadata**: Created, Modified

**Actions:** Edit, Delete (with confirmation dialog)

### Verification

- [ ] Detail page loads for valid activity ID
- [ ] All fields display correctly
- [ ] Linked records are clickable links to their detail pages
- [ ] Edit button navigates to form
- [ ] Delete shows confirmation dialog

---

## Task 2.7: Activity Timeline Component

**Priority**: P1
**Depends on**: 2.3

### 2.7.1 Create Timeline Component

**New file**: `TSS/src/components/shared/ActivityTimeline.tsx`

This is the **most important UI component** in Stage 2. It shows a chronological feed of activities on Company, Contact, and Opportunity detail pages.

**Props:**
```typescript
interface ActivityTimelineProps {
  activities: Activity[];
  isLoading: boolean;
  /** Entity context — used for "Log Call" pre-fill */
  entityType?: 'company' | 'contact' | 'opportunity';
  entityId?: number;
  /** Max activities to show before "Show more" */
  initialLimit?: number;
}
```

**Design:**
- Vertical timeline with date markers (group by day or week)
- Each activity entry shows:
  - Icon (based on type: phone icon for Call, email icon for Email, etc.)
  - Time (relative: "2 hours ago" or absolute: "Mar 5, 2026 10:30 AM")
  - Subject (bold)
  - Type badge + Direction badge
  - Owner name
  - Description (truncated, expandable)
  - Source indicator (Manual vs Auto badge)
- "Show more" pagination at bottom
- "Log Activity" button at top (navigates to form with entity pre-filled)

**Icons mapping:**
| Type | Fluent UI Icon |
|---|---|
| Email | `MailRegular` |
| Call | `CallRegular` |
| Meeting | `PeopleRegular` |
| Site Visit | `LocationRegular` |
| Trade Show | `BuildingRegular` |
| Training | `BookRegular` |
| Internal Note | `NoteRegular` |
| Quote Sent | `DocumentRegular` |
| PO Received | `ReceiptRegular` |
| Shipment | `VehicleTruckRegular` |

### Verification

- [ ] Timeline renders activities in reverse chronological order
- [ ] Each activity type shows correct icon
- [ ] Description truncates and expands on click
- [ ] "Show more" loads additional activities
- [ ] "Log Activity" button pre-fills entity context

---

## Task 2.8: Integrate Timeline into Detail Pages

**Priority**: P1
**Depends on**: 2.7

### 2.8.1 Company Detail Page

**Modify**: `TSS/src/pages/companies/CompanyDetail.tsx`

Add `ActivityTimeline` section below existing sections:
- Use `useActivitiesByCompany(companyId)` hook
- Pass `entityType="company"` and `entityId={companyId}`
- Show in a collapsible section titled "Activity History"

### 2.8.2 Contact Detail Page

**Modify**: `TSS/src/pages/contacts/ContactDetail.tsx`

Add `ActivityTimeline` section:
- Use `useActivitiesByContact(contactId)` hook
- Pass `entityType="contact"` and `entityId={contactId}`

### 2.8.3 Opportunity Detail Page

**Modify**: `TSS/src/pages/opportunities/OpportunityDetail.tsx`

Add `ActivityTimeline` section:
- Use `useActivitiesByOpportunity(opportunityId)` hook
- Pass `entityType="opportunity"` and `entityId={opportunityId}`
- Place after Deal Info section, before Basin/Regions

### Verification

- [ ] Company detail shows activity history
- [ ] Contact detail shows activity history
- [ ] Opportunity detail shows activity history
- [ ] Each timeline shows only activities for that specific entity
- [ ] Quick-entry from timeline pre-fills correct entity

---

## Task 2.9: Email Panel — Read Email History

**Priority**: P1
**Depends on**: 2.11 (MSAL scope expansion)

### 2.9.1 Create Email Panel Component

**New file**: `TSS/src/components/email/EmailPanel.tsx`

Displayed on Contact detail pages. Shows email correspondence between the logged-in user and the contact.

**Graph API call:**
```
GET /me/messages
  ?$filter=sender/emailAddress/address eq '{contactEmail}'
    or (toRecipients/any(r: r/emailAddress/address eq '{contactEmail}'))
  &$select=subject,bodyPreview,receivedDateTime,sender,toRecipients,
           conversationId,isRead,hasAttachments
  &$orderby=receivedDateTime desc
  &$top=25
```

> **Note**: The `or` filter with `any()` may not work in a single query. Fallback: make two parallel queries (from contact + to contact) and merge/sort client-side.

**UI Design:**
- Tab within Contact detail page: "Emails"
- Inbox-style list: sender, subject, date, read/unread indicator
- Click email → expand to show body preview
- Group by conversation thread (using `conversationId`)
- "Compose" button → opens send dialog (Task 2.10)

### 2.9.2 Create Email Hook

**New file**: `TSS/src/hooks/useEmails.ts`

```typescript
export function useContactEmails(contactEmail: string | undefined) {
  const { instance } = useMsal();
  return useQuery({
    queryKey: ['emails', 'contact', contactEmail],
    queryFn: async () => {
      const client = getGraphClient(instance);
      // Query /me/messages with filter
      // Merge sent + received, sort by date
    },
    enabled: !!contactEmail,
    staleTime: 2 * 60 * 1000, // 2 minutes (email is more dynamic)
  });
}
```

### 2.9.3 Integrate into Contact Detail

**Modify**: `TSS/src/pages/contacts/ContactDetail.tsx`

Add a tabbed interface or collapsible section:
- "Activity History" tab (existing timeline)
- "Emails" tab (new email panel)

### Verification

- [ ] Email panel loads on contact detail page
- [ ] Shows emails from/to the contact's email address
- [ ] Emails sorted by date (newest first)
- [ ] Click email expands body preview
- [ ] Works when contact has no email (shows empty state)
- [ ] Permission prompt appears if Mail.Read not yet consented

---

## Task 2.10: Email Panel — Send Email

**Priority**: P2
**Depends on**: 2.9, 2.11

### 2.10.1 Create Compose Dialog

**New file**: `TSS/src/components/email/ComposeDialog.tsx`

**Features:**
- Modal dialog triggered from Email Panel or Contact Detail
- Pre-filled "To" field with contact email
- Subject line input
- Rich text body (use Fluent UI `Textarea` — not a full rich editor for simplicity)
- "Send" button calls Graph API
- Auto-create TSS_Activity (Type: Email, Direction: Outbound)

**Graph API call:**
```
POST /me/sendMail
{
  "message": {
    "subject": "...",
    "body": { "contentType": "text", "content": "..." },
    "toRecipients": [{ "emailAddress": { "address": "contact@company.com" } }]
  }
}
```

### 2.10.2 Create Send Hook

Add to `useEmails.ts`:
```typescript
export function useSendEmail() {
  return useMutation({
    mutationFn: async ({ to, subject, body }) => {
      // POST /me/sendMail
    },
    onSuccess: () => {
      // Auto-create Activity (Type: Email, Direction: Outbound, Source: Manual)
      // Invalidate email queries
    },
  });
}
```

### Verification

- [ ] Compose dialog opens from email panel
- [ ] To field pre-filled with contact email
- [ ] Send button calls Graph API
- [ ] Email appears in user's Sent Items
- [ ] Activity auto-created after send
- [ ] Error handling for send failures

---

## Task 2.11: MSAL Scope Expansion

**Priority**: P1
**Depends on**: None (Entra admin must grant consent)

### 2.11.1 Update MSAL Config

**Modify**: `TSS/src/lib/auth/msalConfig.ts`

Add new scopes:
```typescript
export const graphScopes = {
  sharePoint: ['Sites.ReadWrite.All'],
  userProfile: ['User.Read'],
  mail: ['Mail.Read', 'Mail.Send'],        // NEW
  calendar: ['Calendars.ReadWrite'],         // NEW
};

// Update loginRequest to include email scopes
export const loginRequest = {
  scopes: ['User.Read', 'Sites.ReadWrite.All', 'Mail.Read', 'Mail.Send', 'Calendars.ReadWrite'],
};
```

### 2.11.2 Incremental Consent Strategy

If we want to avoid asking for all permissions upfront, use **incremental consent**:
- Login with base scopes (User.Read, Sites.ReadWrite.All)
- When user first accesses email panel, trigger `acquireTokenSilent` with Mail scopes
- If consent needed, falls back to `acquireTokenPopup`

**Recommended approach**: Request all scopes upfront in `loginRequest` (simpler UX for internal app). Users will see a consent prompt listing all permissions on first login after the scope change.

### 2.11.3 Entra ID Admin Consent (Manual)

**User action required**: Add these delegated permissions to the TSS app registration and grant admin consent:
- `Mail.Read`
- `Mail.Send`
- `Calendars.ReadWrite`

### Verification

- [ ] Users prompted for new permissions on next login
- [ ] Token includes Mail.Read, Mail.Send, Calendars.ReadWrite scopes
- [ ] Graph API `/me/messages` returns data (not 403)
- [ ] Existing SharePoint functionality still works

---

## Task 2.12: Email Auto-Link Azure Function

**Priority**: P2
**Depends on**: 2.13 (webhook subscription), Task 2.1 (TSS_Activity list)

### 2.12.1 Create Email Webhook Handler

**New file**: `TSS/api/src/functions/emailWebhook.ts`

This function processes Graph webhook notifications for new emails.

**Flow:**
1. Receive POST from Microsoft Graph with notification payload
2. If `validationToken` query param present → return it (subscription validation)
3. Extract `resource` path from notification (e.g., `/users/{userId}/messages/{messageId}`)
4. Fetch the email message via Graph API (using application permissions)
5. Extract sender email and all recipient emails
6. Query TSS_Contact for matches on `tss_email`
7. If match found:
   a. Determine direction (sender is CRM contact → Inbound; recipient is CRM contact → Outbound)
   b. Look up the contact's company via `tss_companyIdLookupId`
   c. Check for existing activity with same `tss_emailMessageId` (deduplication)
   d. Create TSS_Activity record:
      - Title: email subject
      - tss_activityType: "Email"
      - tss_activityDate: email receivedDateTime
      - tss_companyId: contact's company
      - tss_contactId: matched contact
      - tss_direction: Inbound or Outbound
      - tss_owner: user display name (from Graph /users/{userId})
      - tss_source: "Email Auto-Link"
      - tss_isAutoCreated: true
      - tss_emailMessageId: message ID
8. Return 202 Accepted (quick response required by Graph webhooks)

### 2.12.2 Application Permissions Required

The email webhook function needs **application permissions** (not delegated) because it runs as a background process:

| Permission | Type | Purpose |
|---|---|---|
| `Mail.Read` | Application | Read email content from user mailboxes |
| `Sites.ReadWrite.All` | Application | Create TSS_Activity records in SharePoint |

**These require Managed Identity setup** (see Task 2.13 for details).

### Verification

- [ ] Function responds to validation requests with token
- [ ] Function processes email notifications
- [ ] Creates TSS_Activity for emails from/to CRM contacts
- [ ] Skips duplicate emails (same emailMessageId)
- [ ] Handles missing contacts gracefully (no error, just skip)
- [ ] Returns 202 within 3 seconds (Graph webhook requirement)

---

## Task 2.13: Graph Webhook Subscription Function

**Priority**: P2
**Depends on**: None (infrastructure setup)

### 2.13.1 Create Subscription Management Function

**New file**: `TSS/api/src/functions/createSubscription.ts`

Creates Graph API webhook subscriptions for email monitoring.

**Graph API call:**
```
POST /subscriptions
{
  "changeType": "created",
  "notificationUrl": "https://<swa-hostname>/api/email-webhook",
  "resource": "/users/{userId}/messages",
  "expirationDateTime": "2026-03-08T00:00:00Z",  // max 3 days for messages
  "clientState": "<secret>"
}
```

**Implementation:**
- HTTP trigger (POST `/api/subscriptions`)
- Accepts user ID(s) to monitor
- Creates subscription via Graph API with application permissions
- Stores subscription ID in TSS_Sequence or a new config list for renewal tracking
- Returns subscription details

### 2.13.2 Managed Identity Setup (Manual)

**User action required:**
1. Enable System-assigned Managed Identity on the Azure Static Web App
2. Grant the Managed Identity these application permissions in Entra ID:
   - `Mail.Read` (Application)
   - `Sites.ReadWrite.All` (Application)
3. Set environment variable `SHAREPOINT_SITE_ID` in SWA Application Settings

### 2.13.3 Webhook Validation

Graph API validates webhooks by sending a GET with `?validationToken=<token>`. The `emailWebhook` function must:
- Check for `validationToken` query parameter
- If present, return it as `text/plain` with 200 OK
- If absent, process the notification payload

### Verification

- [ ] Function creates subscription via Graph API
- [ ] Graph validates webhook URL successfully
- [ ] Subscription appears in Graph subscription list
- [ ] Subscription expiration is within 3-day limit
- [ ] Client state secret is verified on webhook calls

---

## Task 2.14: Subscription Renewal Timer Function

**Priority**: P2
**Depends on**: 2.13

### 2.14.1 Create Timer Function

**New file**: `TSS/api/src/functions/renewSubscriptions.ts`

Timer-triggered function that runs every 48 hours to renew Graph webhook subscriptions before they expire.

**Implementation:**
```typescript
app.timer('renewSubscriptions', {
  schedule: '0 0 */48 * * *',  // Every 48 hours
  handler: async (timer, context) => {
    // 1. List all active subscriptions via GET /subscriptions
    // 2. For each subscription nearing expiration (< 24h remaining)
    //    PATCH /subscriptions/{id} with new expirationDateTime
    // 3. Log results
  },
});
```

**Key details:**
- Graph message subscriptions expire after max 3 days (4230 minutes)
- Renew every 48h → always have >24h buffer
- If renewal fails, log error and trigger alert
- Store subscription metadata in an environment variable or TSS_Sequence for tracking

### Verification

- [ ] Timer fires on schedule
- [ ] Renews subscriptions with new expiration
- [ ] Handles expired subscriptions (recreate instead of renew)
- [ ] Logs renewal success/failure

---

## Task 2.15: Calendar View

**Priority**: P3
**Depends on**: 2.11

### 2.15.1 Create Calendar Hook

**New file** or add to `useEmails.ts`:

```typescript
export function useCalendarEvents(startDate: string, endDate: string) {
  const { instance } = useMsal();
  return useQuery({
    queryKey: ['calendar', startDate, endDate],
    queryFn: async () => {
      const client = getGraphClient(instance);
      // GET /me/calendarView?startDateTime={}&endDateTime={}
      //   &$select=subject,start,end,attendees,onlineMeeting,location
      //   &$orderby=start/dateTime
    },
    staleTime: 5 * 60 * 1000,
  });
}
```

### 2.15.2 Create Calendar Component

**New file**: `TSS/src/components/calendar/CalendarView.tsx`

**Features:**
- Week view or list view of upcoming meetings
- Highlight meetings where attendees match CRM contacts
- Click meeting → show details with attendee list
- Link attendees to CRM contacts where email matches
- "Log as Activity" button → creates Meeting activity from calendar event

**Graph API call:**
```
GET /me/calendarView
  ?startDateTime=2026-03-01T00:00:00Z
  &endDateTime=2026-03-08T00:00:00Z
  &$select=subject,start,end,attendees,location,onlineMeeting,bodyPreview
  &$orderby=start/dateTime
```

### 2.15.3 Integration

Option A: Standalone page at `/calendar`
Option B: Section on Dashboard
Option C: Tab on Contact detail page

**Recommended**: Start with Dashboard section (upcoming meetings this week), add standalone page later.

### Verification

- [ ] Calendar view loads meetings for date range
- [ ] Meetings with CRM contact attendees are highlighted
- [ ] "Log as Activity" creates TSS_Activity (Type: Meeting)
- [ ] Works with empty calendar (shows empty state)

---

## Task 2.16: Quick-Action Buttons

**Priority**: P1
**Depends on**: 2.5

### 2.16.1 Create Quick-Action Component

**New file**: `TSS/src/components/shared/QuickActions.tsx`

A reusable button group for "Log Call", "Log Meeting", "Log Site Visit" that appears on:
- Company detail pages
- Contact detail pages
- Opportunity detail pages

**Props:**
```typescript
interface QuickActionsProps {
  companyId?: number;
  contactId?: number;
  opportunityId?: number;
}
```

**Buttons:**
| Button | Label | Navigates To |
|---|---|---|
| `CallRegular` | Log Call | `/activities/new?type=Call&companyId=X&contactId=Y` |
| `PeopleRegular` | Log Meeting | `/activities/new?type=Meeting&companyId=X&contactId=Y` |
| `LocationRegular` | Log Site Visit | `/activities/new?type=Site Visit&companyId=X` |
| `NoteRegular` | Add Note | `/activities/new?type=Internal Note&companyId=X` |

Each button is a small Fluent UI `Button` with icon and label. The component auto-fills URL params based on which IDs are provided.

### 2.16.2 Add to Detail Pages

**Modify**: CompanyDetail.tsx, ContactDetail.tsx, OpportunityDetail.tsx

Add `<QuickActions>` component in the header area or above the activity timeline.

### Verification

- [ ] Buttons render on all three detail pages
- [ ] Clicking "Log Call" navigates to pre-filled form
- [ ] URL params correctly pre-fill the form
- [ ] Contact quick-actions also pre-fill company from contact's company

---

## Task 2.17: Dashboard Activity Feed

**Priority**: P2
**Depends on**: 2.3

### 2.17.1 Update Dashboard

**Modify**: `TSS/src/pages/Dashboard.tsx`

Add a "Recent Activity" section showing the 10 most recent activities across all entities.

**Implementation:**
- Use `useRecentActivities(10)` hook
- Show compact activity cards: icon, subject, type, company name, date
- Click activity → navigate to ActivityDetail
- "View All" link → navigate to ActivityList

### Verification

- [ ] Dashboard shows recent activities
- [ ] Activities link to detail pages
- [ ] "View All" navigates to activity list
- [ ] Empty state shows when no activities exist

---

## Task 2.18: Navigation & Routing Updates

**Priority**: P1
**Depends on**: 2.4, 2.5, 2.6

### 2.18.1 Add Routes

**Modify**: `TSS/src/routes.tsx`

Add:
```typescript
// Activities
{ path: '/activities', element: <ActivityList /> },
{ path: '/activities/new', element: <ActivityForm /> },
{ path: '/activities/:id', element: <ActivityDetail /> },
{ path: '/activities/:id/edit', element: <ActivityForm /> },

// Calendar (if implemented as standalone page)
{ path: '/calendar', element: <CalendarPage /> },
```

### 2.18.2 Add Sidebar Navigation

**Modify**: `TSS/src/components/layout/Sidebar.tsx`

Add navigation items:
- "Activities" (icon: `ClipboardTaskRegular` or `TimelineRegular`) — after Opportunities
- "Calendar" (icon: `CalendarRegular`) — after Activities (P3, add when implemented)

### Verification

- [ ] `/activities` loads ActivityList
- [ ] `/activities/new` loads ActivityForm
- [ ] `/activities/:id` loads ActivityDetail
- [ ] Sidebar shows Activities link
- [ ] Active sidebar item highlights correctly

---

## Task 2.19: Seed Data & Provisioning

**Priority**: P1
**Depends on**: 2.1

### 2.19.1 Create Activity Seed Data

**New file**: `TSS/scripts/data/activities.json`

Seed 20-30 sample activities across different types and entities:

```json
[
  {
    "subject": "Initial discovery call with Chevron Permian team",
    "type": "Call",
    "date": "2026-02-01T14:00:00Z",
    "companyCode": "CVX-PRM",
    "contactEmail": null,
    "direction": "Outbound",
    "duration": 45,
    "owner": "Sebastian Nienhuis",
    "description": "Discussed safety valve requirements for upcoming completions campaign...",
    "source": "Manual"
  },
  ...
]
```

Cover a mix of:
- Calls (6-8)
- Meetings (4-5)
- Emails (4-5, with emailMessageId for dedup testing)
- Site Visits (2-3)
- Internal Notes (3-4)
- Quote Sent (1-2)
- Trade Show (1)

### 2.19.2 Create Seed Script

**New file**: `TSS/scripts/seed/seedActivities.ts`

Follow existing seed pattern:
1. Load activities.json
2. Build company code → ID map from TSS_Company
3. Build contact email → ID map from TSS_Contact
4. Resolve lookups and batch-create items
5. Skip existing items (idempotent by Title + date combination)

### 2.19.3 Update package.json

**Modify**: `TSS/scripts/package.json`

Add:
```json
{
  "scripts": {
    "seed:activities": "tsx seed/seedActivities.ts"
  }
}
```

### Verification

- [ ] `tsx seed/seedActivities.ts` creates activity records
- [ ] Lookups resolve correctly (company, contact)
- [ ] Re-running is idempotent
- [ ] Activities appear in TSS SPA after seeding

---

## Task 2.20: End-to-End Testing & Bug Fixes

**Priority**: P1
**Depends on**: All other tasks

### Test Scenarios

**Phase A (Core Activities):**

| # | Test | Steps | Expected |
|---|---|---|---|
| T1 | Activity list loads | Navigate to /activities | Activities displayed with filters |
| T2 | Create activity (Call) | Click "New Activity", fill form, save | Activity appears in list |
| T3 | Edit activity | Click activity, click Edit, modify, save | Changes persisted |
| T4 | Delete activity | Click activity, click Delete, confirm | Activity removed from list |
| T5 | Company timeline | Open company detail | Activity history shows company activities |
| T6 | Contact timeline | Open contact detail | Activity history shows contact activities |
| T7 | Opportunity timeline | Open opportunity detail | Activity history shows opp activities |
| T8 | Quick-action: Log Call | Click "Log Call" on company detail | Form opens with company pre-filled |
| T9 | Quick-action: Log Meeting | Click "Log Meeting" on contact detail | Form opens with contact + company pre-filled |
| T10 | Dashboard feed | Open dashboard | Recent activities shown |
| T11 | Date range filter | Filter activities by date range | Only activities in range shown |
| T12 | Type filter | Filter by "Call" type | Only calls shown |
| T13 | Search | Search "Chevron" in activities | Matching subjects shown |

**Phase B (Email & Calendar):**

| # | Test | Steps | Expected |
|---|---|---|---|
| T14 | Email panel loads | Open contact with email, click Emails tab | Email history shown |
| T15 | Send email | Click Compose, fill, send | Email sent, activity created |
| T16 | Email auto-link | Send email to CRM contact from Outlook | Activity auto-created in TSS |
| T17 | Webhook validation | Graph validates webhook URL | 200 OK with token |
| T18 | Subscription renewal | Wait for timer (or trigger manually) | Subscription renewed |
| T19 | Calendar view | Open calendar section | Meetings shown with CRM contact matching |
| T20 | Scope consent | First login after scope change | New permission prompt appears |

### Verification

- [ ] All P1 tests pass
- [ ] All P2 tests pass
- [ ] No TypeScript compilation errors
- [ ] Build succeeds (`npm run build`)
- [ ] No console errors in browser DevTools

---

## Dependency Chain

```
                    Task 2.1 (SP List)
                        │
                        ▼
Task 2.2 (Types) ──► Task 2.3 (Hooks)
                        │
          ┌─────────────┼─────────────┬─────────────┐
          ▼             ▼             ▼             ▼
    Task 2.4       Task 2.5       Task 2.6       Task 2.7
    (List Page)    (Form)         (Detail)       (Timeline)
          │             │             │             │
          │             ▼             │             ▼
          │        Task 2.16         │        Task 2.8
          │        (Quick Actions)   │        (Timeline Integration)
          │             │             │
          └──────┬──────┴──────┬──────┘
                 ▼             ▼
           Task 2.18      Task 2.17
           (Routes)       (Dashboard Feed)

Task 2.11 (MSAL Scopes)
      │
      ├──────────────► Task 2.9 (Email Read)
      │                     │
      │                     ▼
      │                Task 2.10 (Email Send)
      │
      └──────────────► Task 2.15 (Calendar)

Task 2.13 (Webhook Subscription)
      │
      ├──────────────► Task 2.12 (Email Auto-Link)
      │
      └──────────────► Task 2.14 (Subscription Renewal)

Task 2.1 ──────────► Task 2.19 (Seed Data)

ALL ──────────────► Task 2.20 (E2E Testing)
```

**Critical path (Phase A)**: 2.1 + 2.2 → 2.3 → 2.7 → 2.8 → 2.18 → 2.20
**Critical path (Phase B)**: 2.11 → 2.9 → 2.10; 2.13 → 2.12 → 2.20

**Parallelization opportunities:**
- 2.1 and 2.2 can run simultaneously
- 2.4, 2.5, 2.6, 2.7 can all start once 2.3 is done
- 2.9 and 2.15 can run simultaneously once 2.11 is done
- 2.12 and 2.14 can run simultaneously once 2.13 is done

---

## File Tree (New & Modified Files)

### New Files

```
TSS/
├── scripts/
│   ├── lists/
│   │   └── activity.ts                        # TSS_Activity list definition
│   ├── data/
│   │   └── activities.json                    # Seed data (20-30 sample activities)
│   └── seed/
│       └── seedActivities.ts                  # Activity seed script
├── api/src/functions/
│   ├── emailWebhook.ts                        # Graph webhook handler for email auto-link
│   ├── createSubscription.ts                  # Create Graph webhook subscriptions
│   └── renewSubscriptions.ts                  # Timer: renew webhook subscriptions every 48h
└── src/
    ├── types/
    │   └── activity.ts                        # Activity interface + Zod schema + constants
    ├── hooks/
    │   ├── useActivities.ts                   # Activity CRUD hooks (9 hooks)
    │   └── useEmails.ts                       # Email read/send + calendar hooks
    ├── pages/
    │   └── activities/
    │       ├── ActivityList.tsx                # Activity list with search/filter
    │       ├── ActivityForm.tsx                # Quick-entry form (create + edit)
    │       └── ActivityDetail.tsx              # Activity detail view
    ├── components/
    │   ├── shared/
    │   │   ├── ActivityTimeline.tsx            # Chronological activity feed
    │   │   └── QuickActions.tsx                # Log Call / Log Meeting / etc. buttons
    │   ├── email/
    │   │   ├── EmailPanel.tsx                  # Email history panel (read)
    │   │   └── ComposeDialog.tsx               # Email compose dialog (send)
    │   └── calendar/
    │       └── CalendarView.tsx                # Calendar view component
    └── pages/
        └── CalendarPage.tsx                   # Standalone calendar page (P3)
```

### Modified Files

```
TSS/
├── scripts/
│   ├── provision.ts                           # Add activityList to provisioning order
│   └── package.json                           # Add seed:activities script
└── src/
    ├── types/
    │   └── index.ts                           # Export Activity types
    ├── lib/auth/
    │   └── msalConfig.ts                      # Add Mail.Read, Mail.Send, Calendars.ReadWrite
    ├── routes.tsx                              # Add /activities/* and /calendar routes
    ├── pages/
    │   ├── Dashboard.tsx                       # Add recent activity feed section
    │   ├── companies/
    │   │   └── CompanyDetail.tsx               # Add ActivityTimeline + QuickActions
    │   ├── contacts/
    │   │   └── ContactDetail.tsx               # Add ActivityTimeline + QuickActions + EmailPanel
    │   └── opportunities/
    │       └── OpportunityDetail.tsx           # Add ActivityTimeline + QuickActions
    └── components/layout/
        └── Sidebar.tsx                        # Add Activities + Calendar nav items
```

**Total**: ~18 new files, ~10 modified files

---

## Risk Register

| Risk | Impact | Likelihood | Mitigation |
|---|---|---|---|
| **Graph email filter limitations** | Email panel may not support complex OR queries | Medium | Fallback: two parallel queries (sent + received), merge client-side |
| **Webhook URL must be HTTPS public** | Can't test email auto-link locally | High | Use SWA staging environment for webhook testing; mock in dev |
| **Mail.Read application permission requires admin consent** | Blocks email auto-link function | Medium | Request admin consent early (Task 2.11); Phase A doesn't need it |
| **Graph webhook 3-day expiration** | Subscriptions silently expire if renewal fails | Medium | 48h renewal timer + monitoring alerts |
| **Person column creation via Graph API** | Can't create Person-type columns | Known | Already mitigated: use text field for tss_owner |
| **SharePoint OData boolean filter bug** | `tss_isAutoCreated eq true` may return 0 results | Known | Filter client-side (established pattern from Stage 1) |
| **Rate limiting on email queries** | High-frequency email panel refreshes | Low | 2-minute staleTime on email queries; batch queries |
| **Azure Functions cold start** | First webhook notification may timeout | Medium | Use warm-up strategy or SWA Standard plan for always-on |

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

**User actions required:**
- Task 2.11: Grant admin consent for Mail.Read, Mail.Send, Calendars.ReadWrite in Entra ID
- Task 2.13: Configure Managed Identity and application permissions for Azure Functions
- Task 2.19: Run provisioning script (`tsx scripts/provision.ts`) and seed script
- Task 2.20: Manual testing of email integration and webhook flows
