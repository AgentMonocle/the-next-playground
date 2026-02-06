# Sales CRM: Architecture Design

**Decision**: Path 1 — React SPA + Azure Functions (TypeScript Full-Stack)

---

## Requirements

| Requirement | Detail |
|---|---|
| **Platform** | Azure-hosted web application |
| **Users** | Desktop browsers + mobile phones (10-50 users) |
| **Authentication** | Microsoft Entra ID (Office 365 credentials) |
| **M365 Integration** | SharePoint (lists & libraries), Outlook (email), Teams (meetings, chat, files), Excel |
| **Data Residency** | Stored within M365 ecosystem, consumable by Power BI |
| **Development Tool** | Claude Code for majority of programming |
| **Technology Constraint** | No deprecated or end-of-life components |

## Deprecated Technologies (Excluded)

| Technology | Status | Reason |
|---|---|---|
| Bot Framework SDK | End-of-life Dec 31, 2025 | Archived, no patches |
| TeamsFx SDK | Deprecated, sunset Sept 2026 | Replaced by Agents Toolkit |
| Teams AI Library v1 | Deprecated Sept 2025 | Replaced by v2 |
| Office 365 Connectors | Retiring March 31, 2026 | Use Teams Workflows webhooks |
| Microsoft Graph Toolkit | Retiring Aug 28, 2026 | Use Fluent UI + Graph SDK |
| MSAL v4 and earlier | Superseded | Use MSAL v5.x |
| Azure Functions v1.x | End-of-support Sept 2026 | Use v4.x isolated worker |
| Azure Functions in-process model | End-of-support Nov 2026 | Use isolated worker model |
| Fluent UI Northstar | End-of-life July 2025 | Use Fluent UI v9 |

---

## Architecture

```
Browser / Mobile / Teams Tab (iframe)
    │
    ▼
Azure Static Web Apps
├── Frontend: React 18 + Vite + TypeScript + TailwindCSS
├── API: Azure Functions v4 (TypeScript, isolated worker)
│   ├── HTTP triggers (CRUD proxy to Graph/Dataverse API)
│   ├── Timer triggers (email subscription renewal, digests)
│   └── Webhook triggers (Graph change notifications)
    │
    ▼  Microsoft Graph API / Dataverse Web API
Data Store (SharePoint Lists OR Dataverse) + Outlook + Calendar + OneDrive + Teams
```

## Technology Stack

| Layer | Technology | Version | Status |
|---|---|---|---|
| Frontend | React + Vite + TypeScript | 18.x / 6.x / 5.x | Stable |
| Styling | TailwindCSS | 3.x | Stable |
| UI Components | Fluent UI React v9 or Headless UI | 9.72+ | Stable |
| State (client) | Zustand | 5.x | Stable |
| State (server) | TanStack React Query | 5.x | Stable |
| Auth | @azure/msal-browser | 5.x | Stable |
| Graph SDK | @microsoft/microsoft-graph-client | 3.x | Stable |
| Backend | Azure Functions v4 (isolated) | Node 20 | Stable |
| Server Auth | @azure/identity (Managed Identity) | latest | Stable |
| Hosting | Azure Static Web Apps | Standard | Stable |

## M365 Integration

| Service | Method | API |
|---|---|---|
| **SharePoint Lists** | Graph API → `/sites/{id}/lists/{id}/items` | Delegated: `Sites.ReadWrite.All` |
| **Outlook Email** | Graph API → `/me/messages`, `/me/sendMail` | Delegated: `Mail.Read`, `Mail.Send` |
| **Calendar** | Graph API → `/me/events`, `/me/calendarView` | Delegated: `Calendars.ReadWrite` |
| **Teams Notifications** | Azure Functions → `/teams/{id}/channels/{id}/messages` | Application: `ChannelMessage.Send` (Managed Identity) |
| **Teams Tab** | URL iframe — no Teams SDK | MSAL `acquireTokenSilent()` for SSO |
| **OneDrive/SharePoint Libraries** | Graph API → `/me/drive/items` | Delegated: `Files.ReadWrite` |
| **Excel** | SharePoint list native Excel export; or Graph API workbook generation | — |

## Background Processing

| Function | Trigger | Purpose |
|---|---|---|
| `email-webhook` | HTTP (Graph webhook) | Detect new emails from CRM contacts |
| `renew-subscriptions` | Timer (every 48h) | Renew Graph email subscriptions (3-day expiry) |
| `daily-digest` | Timer (daily) | Pipeline summary → Teams channel via Graph |
| `stale-deal-alert` | Timer (weekly) | Flag opportunities with no recent activity |

## Hosting Cost (10-50 users)

| Service | Monthly |
|---|---|
| Static Web Apps (Free/Standard) | $0-9 |
| Azure Functions (Consumption) | $2-15 |
| Azure Storage | $2-5 |
| Azure Key Vault | $1 |
| **Total (hosting only)** | **$5-30** |

Data storage licensing depends on storage strategy — see below.

## Claude Code Compatibility: 97%

Everything is TypeScript in text files. Only Azure AD portal configuration (app registration) requires GUI.

---

# Storage Strategy Comparison

The CRM data store is the most impactful architectural decision within Path 1. Both strategies use the same React SPA + Azure Functions architecture — only the data layer and its API differ.

---

## Strategy A: SharePoint Lists (via Microsoft Graph API)

### Architecture

```
React SPA (MSAL Browser)
    │  Bearer token (delegated)
    ▼
Microsoft Graph API v1.0
    │  /sites/{siteId}/lists/{listId}/items
    ▼
SharePoint Online Lists
├── CRM_Countries     (reference data)
├── CRM_Companies     (accounts)
├── CRM_Contacts      (people)
├── CRM_Opportunities (deals)
├── CRM_Activities    (interactions)
└── CRM_Documents     (file references)
```

### Schema

| List | Key Columns | Indexed Columns |
|---|---|---|
| `CRM_Countries` | Title, CountryCode, Region | Title |
| `CRM_Companies` | Title, Industry, Revenue, Owner, Country (lookup) | Title, Owner, Industry |
| `CRM_Contacts` | Name, Email, Phone, Company (lookup), JobTitle | Email, Company |
| `CRM_Opportunities` | Title, Amount, Stage, Probability, CloseDate, Company (lookup) | Stage, Owner, CloseDate, Company |
| `CRM_Activities` | Type, Description, Date, Contact (lookup), Opportunity (lookup) | Date, Type, Opportunity |
| `CRM_Documents` | Title, Type, DocumentLink, Opportunity (lookup) | Opportunity |

### Capabilities & Constraints

| Aspect | Detail |
|---|---|
| **Max items per list** | 30 million rows |
| **View threshold** | 5,000 items — queries on unindexed columns scanning >5K items are throttled |
| **Indexed columns** | Up to 20 per list; queries on indexed columns bypass the 5K threshold |
| **Lookup columns** | Maximum 12 per list (includes cascading lookups) |
| **Cascade delete** | Supported on lookup columns |
| **Version history** | Built-in — tracks all field changes with author and timestamp |
| **Field validation** | Column-level and list-level formulas (only enforced in SharePoint UI, NOT via Graph API) |
| **Calculated columns** | Supported but cannot be used in Graph API `$filter` |
| **Transactions** | **None** — batch operations (max 20) are NOT atomic |
| **Server-side aggregation** | **None** — no SUM, AVG, GROUP BY |
| **Row-level security** | **None** — must implement in application code |
| **Full-text search** | Limited — `$filter` supports `startsWith` and `contains` (text only) |
| **N:N relationships** | **Not supported** — requires manual junction list |

### Graph API Performance

| Operation | Typical Latency |
|---|---|
| Single item GET (indexed filter) | 200-400ms |
| Batch operation (20 items) | 400-800ms |
| Create single item | 300-500ms |
| Update single item | 200-400ms |
| Delta query (changes since last sync) | 200-600ms |

**Rate limits**: 10,000 API calls per 10 minutes per tenant (shared across all apps).

### Power BI Integration

| Aspect | Detail |
|---|---|
| **Connector** | Native SharePoint Online List connector |
| **Mode** | Import only (no DirectQuery) |
| **Refresh frequency** | 8/day (Pro), 48/day (Premium) |
| **Minimum interval** | 30 minutes |
| **Real-time** | Not supported natively |

### Developer Experience

| Aspect | Detail |
|---|---|
| **TypeScript SDK** | `@microsoft/microsoft-graph-client` (official, first-party) |
| **API documentation** | Extensive — Microsoft Graph is one of the most documented APIs |
| **Claude Code training data** | Extensive — Graph API is heavily represented |
| **Local emulator** | None (requires M365 tenant) |
| **CI/CD for schema** | PnP provisioning templates (XML) or PnP PowerShell |

### Scaling Strategy

For a 10-50 user CRM, SharePoint Lists are well within limits:
- ~500 Companies, ~2,000 Contacts, ~1,000 Opportunities, ~10,000 Activities/year
- All below the 5K view threshold with proper indexing
- Becomes a concern if Activities exceeds 50K rows without archival

**Dataverse migration path**: If the CRM outgrows SharePoint Lists (>50K active records, need complex queries, row-level security), migration to Dataverse is possible — same architecture, different API endpoint and auth scope.

### Pros

1. **$0 licensing** — included with any M365 subscription. No per-user CRM licensing
2. **Official TypeScript SDK** — `@microsoft/microsoft-graph-client` with full typing
3. **97% Claude Code compatibility** — Graph API has extensive training data coverage
4. **Unified API** — same Graph API for CRM data, email, calendar, Teams, OneDrive
5. **Version history for free** — every field change tracked with author and timestamp
6. **No additional infrastructure** — data lives in your existing SharePoint site
7. **Simplest developer experience** — standard REST API, well-documented, massive community
8. **Power BI connects directly** — native SharePoint list connector, no ETL needed
9. **Users can browse data in SharePoint** — list views, Excel export available natively

### Cons

1. **5,000-item view threshold** — queries on unindexed columns that scan >5K items are throttled. Requires careful index planning. Activities table will hit this first as it grows
2. **No ACID transactions** — batch operations are NOT atomic. Creating Opportunity + Activities in one operation could leave orphaned records on partial failure. Must implement compensating rollback logic
3. **No server-side aggregation** — pipeline totals, revenue forecasts, and dashboard KPIs must be calculated client-side by fetching all records. Relies on Power BI for heavy analytics
4. **No row-level security** — all authenticated users can read/write all CRM data via Graph API. Access control must be enforced entirely in application code (Azure Functions middleware). A bug in your app = data exposure
5. **Validation not enforced via API** — SharePoint column validation formulas only run in the SharePoint UI. When your React SPA writes via Graph API, all validation must be in your TypeScript code
6. **12 lookup column limit per list** — limits relationship complexity. Adding an Activity that references Contact, Opportunity, Company, and Owner consumes 4 of 12 slots
7. **No N:N relationships** — many-to-many (e.g., multiple Contacts per Opportunity) requires a manual junction list with two lookups
8. **Power BI limited to import mode** — 30-minute minimum refresh. Dashboards always show slightly stale data
9. **Rate limiting shared across tenant** — 10,000 calls/10min is shared with all other Graph API consumers in your organization (Teams, Outlook, SharePoint, other apps)

---

## Strategy B: Dataverse (via Dataverse Web API)

### Architecture

```
React SPA (MSAL Browser)
    │  Bearer token (delegated, scope: https://<org>.crm.dynamics.com/user_impersonation)
    ▼
Dataverse Web API (OData v4.0)
    │  https://<org>.api.crm.dynamics.com/api/data/v9.2/
    ▼
Dataverse Tables
├── crm_country       (reference data)
├── crm_company       (accounts)
├── crm_contact       (people)
├── crm_opportunity   (deals)
├── crm_activity      (interactions)
└── crm_document      (file references)

    +
React SPA (MSAL Browser)
    │  Bearer token (delegated, scope: Graph API)
    ▼
Microsoft Graph API v1.0
    │  /me/messages, /me/events, /teams/...
    ▼
Outlook + Calendar + Teams + OneDrive
```

**Key difference**: The SPA acquires **two separate tokens** — one for Dataverse (CRM data) and one for Graph API (email, calendar, Teams). Both use the same MSAL Browser instance and the same app registration.

### How SPA Accesses Dataverse

Dataverse has **CORS enabled server-side** — the React SPA can call the Dataverse Web API directly from the browser. No backend proxy required for CRUD operations.

**App registration**: Add delegated permission `user_impersonation` under "Dynamics CRM" (app ID `00000007-0000-0000-c000-000000000000`) in addition to the existing Graph API permissions.

**Token acquisition**:
```typescript
// Acquire Dataverse token
const dvToken = await msalInstance.acquireTokenSilent({
  scopes: ["https://<org>.crm.dynamics.com/user_impersonation"]
});

// Acquire Graph token (for email, calendar, etc.)
const graphToken = await msalInstance.acquireTokenSilent({
  scopes: ["https://graph.microsoft.com/.default"]
});
```

### Capabilities

| Aspect | Detail |
|---|---|
| **Max rows per table** | Millions (no documented hard limit, built on SQL Server) |
| **View threshold** | **None** — no 5K-item limit |
| **Relationships** | 1:N, N:N (native intersect table), polymorphic lookups, self-referential |
| **Cascade behaviors** | Delete, Assign, Share, Unshare, Reparent — configurable per relationship |
| **Transactions** | **ACID** — `$batch` with Change Sets executes as single transaction (up to 1,000 operations) |
| **Server-side aggregation** | SUM, AVG, COUNT, MIN, MAX, GROUP BY via OData `$apply` and FetchXML |
| **Row-level security** | Enterprise-grade: Business Units, Security Roles, Teams, record ownership |
| **Business rules** | Server-side validation enforced on all API calls (no code required) |
| **Calculated fields** | Calculated columns, rollup columns (hourly recalc), formula columns |
| **Full-text search** | Dataverse Search (Azure Cognitive Search) — fuzzy matching, multi-table, ranked relevance |
| **Change tracking** | Delta queries via `odata.track-changes` header |
| **Field validation** | Column-level and table-level, enforced server-side on ALL access paths |

### Row-Level Security Model

Dataverse provides a multi-layered security model purpose-built for CRM:

| Layer | Function |
|---|---|
| **Business Units** | Organizational hierarchy — scope data visibility (own, business unit, parent-child, organization) |
| **Security Roles** | CRUD + Append + Share + Assign permissions per table, scoped by access level |
| **Teams** | Owner teams (own records), access teams (record-by-record), Entra ID group teams |
| **Record Ownership** | Each record owned by a user or team — determines base access |

**Example**: Sales rep sees only their own Opportunities. Sales manager sees their business unit's Opportunities. VP sees all Opportunities. This is configured via security roles — zero application code.

### Server-Side Business Rules

Declarative, no-code logic that runs server-side regardless of access method:
- "If Stage = 'Won' then Amount is required" → enforced when your React SPA calls the API
- "If Probability > 80% then set forecast category to 'Commit'" → auto-calculated
- Show error messages, set field values, enforce required fields — all without writing validation code

### Server-Side Aggregation

**OData `$apply`**:
```
GET /api/data/v9.2/crm_opportunities?$apply=
  groupby((crm_stage),aggregate(crm_amount with sum as total_revenue))
```

**FetchXML** (more powerful, supports date-part grouping):
```
GET /api/data/v9.2/crm_opportunities?fetchXml=
  <fetch aggregate="true">
    <entity name="crm_opportunity">
      <attribute name="crm_amount" aggregate="sum" alias="total" />
      <attribute name="crm_stage" groupby="true" alias="stage" />
    </entity>
  </fetch>
```

Pipeline dashboard "Total Revenue by Stage" = **one API call**. With SharePoint Lists, this requires fetching every opportunity record and computing in JavaScript.

### Power BI Integration

| Aspect | Detail |
|---|---|
| **Connector** | Native Dataverse connector (TDS endpoint) |
| **DirectQuery** | **Supported** — real-time data in reports |
| **Import mode** | Also supported (scheduled refresh) |
| **Query pushdown** | SQL-based TDS endpoint — Dataverse filters/aggregates before sending to Power BI |
| **Security enforcement** | Dataverse security roles enforced in DirectQuery mode |
| **Lookup handling** | Auto-flattened (lookups, option sets, currency resolved automatically) |

### Developer Experience

| Aspect | Detail |
|---|---|
| **TypeScript SDK** | **No official SDK** — use `dynamics-web-api` (community, actively maintained) or typed `fetch()` wrapper |
| **API documentation** | Well-documented but smaller corpus than Graph API |
| **Claude Code training data** | Less coverage — most Dataverse docs show C# SDK examples, not TypeScript |
| **Query language** | OData v4.0 + FetchXML (XML-based, Dataverse-specific) |
| **Local emulator** | None (use Power Apps Developer Plan for free sandbox environments) |
| **CI/CD for schema** | PAC CLI + Solutions framework, official GitHub Actions (`microsoft/powerplatform-actions`) |

### Licensing Cost

| Users | Power Apps Premium ($20/user/mo) | Pay-as-you-go ($10/active user/app/mo) |
|---|---|---|
| **10 users** | $200/mo | $100/mo |
| **25 users** | $500/mo | $250/mo |
| **50 users** | $1,000/mo | $500/mo |

- **Dataverse for Teams** (free with M365) is NOT usable — no API access, Teams-only, 2GB limit
- Full Dataverse requires Power Apps Premium, per-app ($5/user/app/mo, being phased out), or Pay-as-you-go licensing
- Default storage: 20GB database (Premium) — sufficient for a 10-50 user CRM
- Add-on storage: $40/GB/month (database), $2/GB/month (file)

### Pros

1. **ACID transactions** — batch operations with Change Sets are fully atomic. Create Opportunity + Activities in one transaction — all succeed or all roll back. Zero risk of orphaned records
2. **Row-level security without code** — Business Units + Security Roles provide "sales rep sees own deals, manager sees team's deals" out of the box. No middleware, no application-level access checks, no risk of authorization bugs
3. **Server-side validation** — business rules enforce data integrity on ALL API calls. "Stage = Won requires Amount" is enforced by Dataverse, not by your React code. A bug in your UI cannot create invalid data
4. **Server-side aggregation** — pipeline dashboards, revenue forecasts, and KPIs via single API calls. No need to fetch all records and compute client-side
5. **No view threshold** — queries scale to millions of rows without the 5K-item limitation. No index strategy anxiety
6. **Power BI DirectQuery** — real-time dashboards with no refresh lag. Security roles enforced in reports
7. **Full-text Dataverse Search** — fuzzy matching, multi-table search, relevance ranking. "Find all contacts named 'Jon'" returns "John", "Jonathan", "Jon" — across Companies, Contacts, and Opportunities in one call
8. **N:N relationships native** — multiple Contacts per Opportunity, multiple tags per Company — native intersect tables without manual junction lists
9. **Enterprise cascade behaviors** — configurable delete, assign, share cascading. Reassigning a Company to a new owner can automatically cascade to all child Contacts and Opportunities
10. **Stronger CI/CD** — PAC CLI with official Microsoft GitHub Actions for automated solution deployment

### Cons

1. **$200-1,000/month licensing** — 20-35x more expensive than SharePoint Lists for 10-50 users. This is the dominant cost and may be hard to justify for a small sales team
2. **No official TypeScript SDK** — must use community library (`dynamics-web-api`) or build typed `fetch()` wrappers. Less IDE support, fewer code samples, weaker autocomplete compared to Graph SDK
3. **Two API surfaces** — CRM data via Dataverse Web API, email/calendar/Teams via Graph API. Two different auth scopes, two different query patterns, two different error handling approaches. More cognitive overhead for developers
4. **~90% Claude Code compatibility** — less TypeScript training data for Dataverse Web API. Most Microsoft documentation shows C# examples. FetchXML (XML-based query language) is less natural for Claude Code than Graph API's OData
5. **FetchXML learning curve** — Dataverse's most powerful query language is XML-based and Dataverse-specific. OData `$apply` covers basic aggregation, but complex queries require FetchXML
6. **No local emulator** — all development requires connecting to an online Dataverse environment (free Developer Plan available, but still requires internet)
7. **Solution packaging complexity** — schema changes managed through Solutions framework (managed vs unmanaged, publishers, layers). More complex than SharePoint PnP templates
8. **Licensing lock-in** — once you build on Dataverse, you cannot downgrade to SharePoint Lists without rewriting the entire data layer. The licensing commitment is ongoing
9. **Rollup columns recalculate hourly** — not real-time. "Total Revenue for Account" may be up to 1 hour stale unless manually triggered via API
10. **Anti-multiplexing rules** — Microsoft requires every end user who views or inputs CRM data through your custom app to have a qualifying license, even if access is through an Azure Functions proxy

---

## Side-by-Side Comparison

| Dimension | SharePoint Lists | Dataverse |
|---|---|---|
| **Data licensing** | **$0** (included with M365) | $200-1,000/mo |
| **Total monthly cost** (hosting + licensing) | **$5-30** | $205-1,030 |
| **API** | Graph API (official TS SDK) | Dataverse Web API (no official TS SDK) |
| **Query language** | OData subset | OData v4.0 + FetchXML |
| **Max rows** | 30M (5K view threshold) | Millions (**no threshold**) |
| **Transactions** | None (non-atomic batch) | **ACID** (Change Sets) |
| **Server-side aggregation** | None | **SUM, AVG, COUNT, GROUP BY** |
| **Row-level security** | None (app-level only) | **Enterprise-grade** (BU/roles/teams) |
| **Server-side validation** | None via API | **Business rules** (enforced on all paths) |
| **Relationships** | Lookups only (12 max, no N:N) | **1:N, N:N, polymorphic** |
| **Full-text search** | Basic (`contains`, `startsWith`) | **Relevance-based** (fuzzy, multi-table) |
| **Power BI** | Import only (30 min refresh) | **DirectQuery** (real-time) |
| **Claude Code compatibility** | **97%** | ~90% |
| **Developer experience** | **Simpler** (one API, official SDK) | More complex (two APIs, community SDK) |
| **Cascade behaviors** | Delete only | **Delete, assign, share, reparent** |
| **Version history** | Built-in (free) | Built-in (audit log) |
| **CI/CD** | PnP templates | PAC CLI + official GitHub Actions |
| **Scaling** | Careful indexing required | **No threshold concerns** |

---

## Email Integration (Same for Both Strategies)

Email integration uses **Microsoft Graph API** regardless of storage strategy. The data store choice does not affect how the CRM reads, sends, or monitors email.

### Reading Email

```
GET /me/messages?$filter=sender/emailAddress/address eq 'contact@company.com'
    &$select=subject,body,receivedDateTime,conversationId
    &$orderby=receivedDateTime desc&$top=25
```
- Permission: `Mail.Read` (delegated)
- `conversationId` groups email threads for per-contact conversation view

### Sending Email

```
POST /me/sendMail
{ "message": { "subject": "...", "body": {...}, "toRecipients": [...] } }
```
- Permission: `Mail.Send` (delegated)
- Sent mail appears in user's Outlook Sent Items

### Background Email Monitoring (Azure Functions)

- **Graph webhooks**: Subscribe to `/users/{id}/messages` — new email triggers Azure Function
- **Subscription lifecycle**: Expire after 3 days — timer-triggered Function renews every 48 hours
- **Processing**: Webhook fires → check sender against CRM contacts → auto-create Activity record
- **Subscription limit**: 1,000 per mailbox

### Calendar Integration

- `GET /me/events` — list meetings
- `POST /me/events` — create meetings with Teams link and attendees
- `GET /me/calendarView?startDateTime=...&endDateTime=...` — date range queries

### Teams Notifications (without Bot Framework)

- Azure Functions with Managed Identity → `POST /teams/{teamId}/channels/{channelId}/messages`
- Permission: `ChannelMessage.Send` (application)
- Sends Adaptive Card notifications for deal stage changes, daily digests

---

## Security

### Authentication (Same for Both)

1. User visits React SPA → MSAL Browser triggers Authorization Code with PKCE flow
2. User signs in with Microsoft Entra ID credentials
3. MSAL acquires access tokens for required scopes
4. Tokens stored in browser `sessionStorage` (recommended for internal CRM)

**Token details**:
- Access tokens: 60-90 minute lifetime, auto-refreshed silently via hidden iframe
- Conditional Access policies (MFA, device compliance, location) enforced on all API calls
- CSP headers: `script-src 'self'; connect-src https://graph.microsoft.com https://login.microsoftonline.com` (add Dataverse URL for Strategy B)

### Permission Models

**Strategy A (SharePoint Lists)**:

| Component | Permission Type | Scopes |
|---|---|---|
| React SPA | Delegated | `Sites.ReadWrite.All`, `Mail.Read`, `Mail.Send`, `Calendars.ReadWrite`, `User.Read` |
| Azure Functions | Application (Managed Identity) | `Sites.ReadWrite.All`, `Mail.Read`, `ChannelMessage.Send` |

**Strategy B (Dataverse)**:

| Component | Permission Type | Scopes |
|---|---|---|
| React SPA (CRM data) | Delegated | `https://<org>.crm.dynamics.com/user_impersonation` |
| React SPA (email/cal) | Delegated | `Mail.Read`, `Mail.Send`, `Calendars.ReadWrite`, `User.Read` |
| Azure Functions | Application (Managed Identity) | `Mail.Read`, `ChannelMessage.Send` |

### Data Access Security Comparison

| Aspect | SharePoint Lists | Dataverse |
|---|---|---|
| **Who can see what data** | Everyone with `Sites.ReadWrite.All` sees everything | Row-level security via roles/BUs |
| **Access control enforcement** | Application code (middleware in Azure Functions) | **Platform-enforced** (Dataverse security layer) |
| **Risk of authorization bugs** | High — a bug in your middleware = data exposure | **Low** — platform enforces regardless of app bugs |
| **Granularity** | All-or-nothing per SharePoint site | Per-table, per-record, per-field |
| **Audit trail** | SharePoint version history | Dataverse audit log (who accessed what, when) |

**Bottom line**: If your CRM requires "sales reps see only their own deals," Dataverse provides this natively. SharePoint Lists require you to build and maintain access control in your application code — every API endpoint must check ownership, and a single missed check exposes all data.

---

## Decision Framework

### Choose SharePoint Lists if:

- **Budget is the primary constraint** — $0 vs $200-1,000/month is decisive for a small team
- **All salespeople can see all data** — row-level security is not required
- **Data volumes are modest** — <50K total records with proper indexing
- **Simple relationships suffice** — no N:N needed, <12 lookups per entity
- **You want the simplest developer experience** — one API (Graph), official SDK, extensive docs
- **Power BI 30-minute refresh lag is acceptable**
- **You prefer maximum Claude Code compatibility** (97%)

### Choose Dataverse if:

- **Row-level security is required** — sales reps must see only their own deals
- **Data integrity is critical** — ACID transactions + server-side validation prevent bad data
- **You need real-time Power BI dashboards** — DirectQuery eliminates refresh lag
- **Data will scale beyond 50K active records** — no view threshold concerns
- **You want server-side aggregation** — pipeline dashboards via single API calls
- **The licensing cost ($200-1,000/month) is justifiable** for the features gained
- **You plan to add complex relationships** — N:N, polymorphic lookups, rich cascade behaviors

### Migration Path: SharePoint Lists → Dataverse

It is possible to start with SharePoint Lists and migrate to Dataverse later:
1. Abstract the data access layer behind a TypeScript service interface
2. Implement the interface for SharePoint Lists (Graph API)
3. If/when Dataverse is needed, implement the same interface for Dataverse Web API
4. Migrate data from SharePoint Lists to Dataverse tables
5. Switch the service implementation

This migration is **moderate effort** (2-4 weeks for the data layer rewrite) but requires upfront discipline to keep the data access layer properly abstracted. If you anticipate needing Dataverse features within 6-12 months, choosing it from the start avoids the migration cost.
