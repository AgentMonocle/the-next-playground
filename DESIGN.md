# Tejas Sales System (TSS) — Architecture Design

**System Name**: Tejas Sales System (TSS)
**Architecture**: Path 1 — React SPA + Azure Functions (TypeScript Full-Stack)
**Data Store**: SharePoint Lists (via Microsoft Graph API)
**Authentication**: Microsoft Entra ID (Microsoft 365 login)
**SharePoint Site**: `https://tejasre.sharepoint.com/sites/sales` (existing)

> **Detailed implementation**: See [DEVELOPMENT_PLAN.md](DEVELOPMENT_PLAN.md) for full schema, sales process, ID generation, staged rollout, and all configuration details.

---

## Requirements

| Requirement | Detail |
|---|---|
| **Platform** | Azure-hosted web application |
| **Users** | Desktop browsers + mobile phones (10-50 users) |
| **Authentication** | Microsoft Entra ID (Office 365 credentials) |
| **M365 Integration** | SharePoint (lists & libraries), Outlook (email), Teams (meetings, chat, files), Excel |
| **Forms & Approvals** | JotForm Enterprise (SSO via Entra ID SAML) |
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
├── Frontend: React 19 + Vite + TypeScript + TailwindCSS
├── Managed API (TSS/api): Azure Functions v4 (TypeScript, isolated worker)
│   └── ID generation (generate-id, generate-quote-id)
│
Standalone Daemon (TSS/api-daemon): Azure Functions v4 (BYOF, Managed Identity)
├── HTTP triggers (email webhook notifications)
├── Timer triggers (subscription renewal, digests)
└── Webhook triggers (Graph change notifications)
    │
    ▼  Microsoft Graph API v1.0
SharePoint Lists (CRM data) + Document Library + Outlook + Calendar + OneDrive + Teams
    │
    ▲
JotForm Enterprise ──► Power Automate ──► SharePoint Lists
(Mobile capture, approvals)
```

## Repository Structure

```
the-next-playground/                    # Monorepo root
├── .beads/                             # Issue tracking (beads)
├── .claude/                            # Claude Code config
├── .github/workflows/                  # CI/CD (Azure Static Web Apps)
├── AGENTS.md                           # Agent instructions
├── COMPANY_PROFILE.md                  # Business context
├── DESIGN.md                           # Architecture (this file)
├── DEVELOPMENT_PLAN.md                 # All stages
├── reference/                          # Reference material
│   ├── archived_planning/             # Completed planning docs
│   ├── datasets/                      # Seed data CSVs
│   ├── deferred_planning/             # Deferred planning docs
│   ├── prompts/                       # Scoping prompts
│   └── scripts/                       # Utility scripts
│
└── TSS/                                # Tejas Sales System application
    ├── src/                            # React SPA source
    │   ├── components/                 # Shared UI components
    │   │   ├── layout/                 # App shell, sidebar, header
    │   │   └── common/                 # Buttons, cards, tables
    │   ├── features/                   # Feature modules (Stage 1+)
    │   ├── hooks/                      # Custom React hooks
    │   ├── lib/                        # Utilities & integrations
    │   │   ├── auth/                   # MSAL config, auth helpers
    │   │   ├── graph/                  # Graph API client, SharePoint helpers
    │   │   └── utils/                  # Formatters, validators
    │   ├── pages/                      # Route pages
    │   ├── stores/                     # Zustand stores
    │   ├── types/                      # TypeScript type definitions
    │   ├── App.tsx                     # Auth-gated root component
    │   ├── main.tsx                    # Entry point (MSAL + Fluent + React Query)
    │   └── index.css                   # Tailwind imports
    ├── api/                            # Azure Functions v4 — SWA-managed API
    │   └── src/functions/              # HTTP endpoints (generate-id, health)
    ├── api-daemon/                     # Azure Functions v4 — standalone daemon
    │   ├── src/functions/              # Webhook & timer functions
    │   ├── package.json                # Independent deps (Graph Client, Azure Identity)
    │   └── tsconfig.json               # Separate TS config
    ├── public/                         # Static assets
    ├── package.json                    # Frontend deps + dev scripts
    ├── vite.config.ts                  # Vite + Tailwind + @/ alias
    ├── tsconfig.json                   # TS project references
    ├── tsconfig.app.json               # Frontend TS config (path aliases)
    ├── tsconfig.node.json              # Node/Vite TS config
    ├── eslint.config.js                # ESLint flat config
    ├── staticwebapp.config.json        # SWA runtime config
    ├── swa-cli.config.json             # SWA CLI local dev config
    ├── .env.example                    # Env var template (committed)
    └── .env.local                      # Actual env vars (NOT committed)
```

Design docs and reference data live at the repo root. The TSS application (frontend + both API apps) is self-contained under `TSS/` — frontend builds run from that directory (`cd TSS && npm run build`).

**Dual API architecture**: `TSS/api/` is the SWA-managed API (deployed automatically with the frontend, uses delegated user permissions). `TSS/api-daemon/` is a standalone Azure Functions app deployed independently to `tss-daemon-func.azurewebsites.net` (uses application permissions via Managed Identity for background tasks like email webhooks and subscription renewal). The daemon is accessed from the frontend via `VITE_DAEMON_API_URL`.

## Technology Stack

| Layer | Technology | Version | Status |
|---|---|---|---|
| Frontend | React + Vite + TypeScript | 19.x / 7.x / 5.x | Stable |
| Styling | TailwindCSS | 4.x | Stable |
| UI Components | Fluent UI React v9 or Headless UI | 9.72+ | Stable |
| State (client) | Zustand | 5.x | Stable |
| State (server) | TanStack React Query | 5.x | Stable |
| Auth | @azure/msal-browser | 5.x | Stable |
| Graph SDK | @microsoft/microsoft-graph-client | 3.x | Stable |
| Backend | Azure Functions v4 (isolated) | Node 20 | Stable |
| Server Auth | @azure/identity (Managed Identity) | latest | Stable |
| Hosting | Azure Static Web Apps | Standard | Stable |
| Forms | JotForm Enterprise | — | SSO via Entra ID (SAML) |

## Claude Code Compatibility: 97%

Everything is TypeScript in text files. Only Azure AD portal configuration (app registration) requires GUI.

---

## Data Store: SharePoint Lists

### Architecture

```
React SPA (MSAL Browser)
    │  Bearer token (delegated)
    ▼
Microsoft Graph API v1.0
    │  /sites/{siteId}/lists/{listId}/items
    ▼
SharePoint Online Lists (https://tejasre.sharepoint.com/sites/sales)
├── TSS_Country           (reference data — 146 countries, 7 regions)
├── TSS_Product           (product catalog — Well Intervention, New Completions, Green Energy, Services)
├── TSS_Company           (customer accounts — 133 seed records, parent/subsidiary hierarchy)
├── TSS_Contact           (people at customer companies — 36 seed records)
├── TSS_InternalTeam      (Tejas staff for team assignments)
├── TSS_Opportunity       (sales deals — ID: OPP-[CompanyCode]-YYYY-MM-NNN)
├── TSS_OpportunityContact      (junction: multiple contacts per opportunity)
├── TSS_OpportunityTeam         (junction: internal team assignments per opportunity)
├── TSS_OpportunityLineItem     (products on an opportunity)
├── TSS_Quotation               (formal quotes — ID: QUO-[XXX]-[XXX]-V[N])
├── TSS_OpportunityQuotation    (junction: links opportunities to quotations)
├── TSS_Activity                (customer interactions & internal actions)
├── TSS_ContractReview          (PO / contract reviews on won opportunities)
├── TSS_Sequence                (ID generation counters)
└── TSS_Opportunity_Documents   (document library — quotations, POs, technical docs)
```

### Naming Conventions

| Item | Pattern | Example |
|---|---|---|
| **Lists** | `TSS_<EntityName>` (PascalCase, singular) | `TSS_Company`, `TSS_Opportunity` |
| **Columns** | `tss_<fieldName>` (camelCase) | `tss_companyId`, `tss_stage` |
| **Libraries** | `TSS_<Context>_Documents` | `TSS_Opportunity_Documents` |

> **Full schema details**: See [DEVELOPMENT_PLAN.md, Section 2](DEVELOPMENT_PLAN.md#2-sharepoint-objects--schema) for all column definitions, types, indexes, and lookup budgets.

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

### Scaling Strategy

For a 10-50 user CRM, SharePoint Lists are well within limits:
- ~500 Companies, ~2,000 Contacts, ~1,000 Opportunities, ~10,000 Activities/year
- All below the 5K view threshold with proper indexing
- Becomes a concern if Activities exceeds 50K rows without archival

### Known Limitations & Mitigations

| Limitation | Impact | Mitigation |
|---|---|---|
| 5K view threshold | Queries on unindexed columns throttled | Index key columns (Stage, Owner, CloseDate, Company, Email, Date) |
| No ACID transactions | Partial failures leave orphaned records | Idempotent operations + compensating rollback logic |
| No server-side aggregation | Pipeline totals computed client-side | React Query caching + Power BI for heavy analytics |
| No row-level security | All users see all CRM data | Application-level access control in Azure Functions |
| Validation not enforced via API | Bad data possible from SPA writes | All validation in TypeScript (shared schemas) |
| 12 lookup column limit | Limits relationship complexity | Design schemas with lookup budget in mind (all lists within budget) |
| No N:N relationships | Junction lists needed for many-to-many | Manual junction lists (TSS_OpportunityContact, TSS_OpportunityTeam, TSS_OpportunityQuotation) |
| Rate limits shared across tenant | Competes with other M365 apps | React Query caching (staleTime: 5min), batch operations, delta queries |

---

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
| **JotForm Enterprise** | Power Automate bridge (JotForm → SharePoint Lists) | SSO via Entra ID (SAML) |

---

## Email Integration

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

## Background Processing

**SWA-managed API** (`TSS/api/` — delegated user permissions):

| Function | Trigger | Purpose |
|---|---|---|
| `generate-id` | HTTP | Generate Opportunity IDs (`OPP-[CompanyCode]-YYYY-MM-NNN`) |
| `generate-quote-id` | HTTP | Generate Quotation IDs (`QUO-[XXX]-[XXX]-V[N]`) |

**Standalone daemon** (`TSS/api-daemon/` — application permissions via Managed Identity):

| Function | Trigger | Purpose |
|---|---|---|
| `email-webhook` | HTTP (Graph webhook) | Detect new emails from CRM contacts |
| `renew-subscriptions` | Timer (every 48h) | Renew Graph email subscriptions (3-day expiry) |
| `daily-digest` | Timer (daily) | Pipeline summary → Teams channel via Graph |
| `stale-deal-alert` | Timer (weekly) | Flag opportunities with no recent activity |

---

## Security

### Authentication

1. User visits React SPA → MSAL Browser triggers Authorization Code with PKCE flow
2. User signs in with Microsoft Entra ID credentials
3. MSAL acquires access tokens for Graph API scopes
4. Tokens stored in browser `sessionStorage` (recommended for internal CRM)

**Token details**:
- Access tokens: 60-90 minute lifetime, auto-refreshed silently via hidden iframe
- Conditional Access policies (MFA, device compliance, location) enforced on all API calls
- CSP headers: `script-src 'self'; connect-src https://graph.microsoft.com https://login.microsoftonline.com`

### Permission Model

| Component | Permission Type | Scopes |
|---|---|---|
| React SPA (user context) | Delegated | `Sites.ReadWrite.All`, `Mail.Read`, `Mail.Send`, `Calendars.ReadWrite`, `User.Read`, `Files.ReadWrite` |
| Azure Functions (background) | Application (Managed Identity) | `Sites.ReadWrite.All`, `Mail.Read`, `ChannelMessage.Send` |

### XSS Mitigation

- React JSX auto-escapes HTML by default
- No `dangerouslySetInnerHTML` for user-provided content
- CSP headers enforced via Azure Static Web Apps custom headers
- Short-lived tokens (60-90 min) limit exposure window

### Data Access Security

All authenticated users with `Sites.ReadWrite.All` can access all CRM data via Graph API. Access control must be enforced in application code:
- Azure Functions middleware validates user identity on every request
- Application-level ownership checks (e.g., "user can only edit their own Opportunities")
- SharePoint version history provides audit trail

> **Note**: If row-level security becomes a requirement in the future, migrating to Dataverse provides platform-enforced security — see Appendix A.

---

## Cost Estimate (10-50 users)

| Service | Monthly |
|---|---|
| Static Web Apps (Free/Standard) | $0-9 |
| Azure Functions (Consumption) | $2-15 |
| Azure Storage | $2-5 |
| Azure Key Vault | $1 |
| Data storage licensing | $0 (SharePoint Lists included with M365) |
| JotForm Enterprise | Custom pricing (contact JotForm) |
| **Total (excl. JotForm)** | **$5-30** |

---

## Developer Experience

| Aspect | Detail |
|---|---|
| **TypeScript SDK** | `@microsoft/microsoft-graph-client` (official, first-party) |
| **API documentation** | Extensive — Microsoft Graph is one of the most documented APIs |
| **Claude Code training data** | Extensive — Graph API is heavily represented |
| **Local emulator** | None (requires M365 tenant) |
| **CI/CD for schema** | PnP provisioning templates (XML) or PnP PowerShell |
| **Unified API** | Same Graph API for CRM data, email, calendar, Teams, OneDrive |

---

## Future Migration Path

If the CRM outgrows SharePoint Lists — specifically if any of these become requirements:
- Row-level security (sales reps see only their own deals)
- ACID transactions (critical data integrity)
- Server-side aggregation (pipeline dashboards via API)
- Real-time Power BI via DirectQuery
- Data volume beyond 50K active records

Then migration to **Dataverse** is possible with moderate effort (2-4 weeks for data layer rewrite), provided the data access layer is properly abstracted behind a TypeScript service interface. See Appendix A for full Dataverse research.

---

# Appendix A: Dataverse Storage Strategy (Archived)

> **Status**: Researched and documented. Not selected for initial implementation due to licensing cost ($200-1,000/month for 10-50 users). Preserved here for future reference if requirements change.

## Architecture

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
```

The SPA acquires **two separate tokens** — one for Dataverse (CRM data) and one for Graph API (email, calendar, Teams). Both use the same MSAL Browser instance and the same app registration.

## How SPA Accesses Dataverse

Dataverse has **CORS enabled server-side** — the React SPA can call the Dataverse Web API directly from the browser.

**App registration**: Add delegated permission `user_impersonation` under "Dynamics CRM" (app ID `00000007-0000-0000-c000-000000000000`).

**Token acquisition**:
```typescript
const dvToken = await msalInstance.acquireTokenSilent({
  scopes: ["https://<org>.crm.dynamics.com/user_impersonation"]
});
```

## Capabilities

| Aspect | Detail |
|---|---|
| **Max rows per table** | Millions (no hard limit, built on SQL Server) |
| **View threshold** | None |
| **Relationships** | 1:N, N:N (native), polymorphic lookups, self-referential |
| **Cascade behaviors** | Delete, Assign, Share, Unshare, Reparent — configurable |
| **Transactions** | ACID — `$batch` with Change Sets (up to 1,000 operations) |
| **Server-side aggregation** | SUM, AVG, COUNT, MIN, MAX, GROUP BY via OData `$apply` and FetchXML |
| **Row-level security** | Business Units, Security Roles, Teams, record ownership |
| **Business rules** | Server-side validation enforced on all API calls |
| **Calculated fields** | Calculated, rollup (hourly recalc), formula columns |
| **Full-text search** | Dataverse Search (Azure Cognitive Search) — fuzzy, multi-table |
| **Change tracking** | Delta queries via `odata.track-changes` header |

## Row-Level Security Model

| Layer | Function |
|---|---|
| **Business Units** | Organizational hierarchy — scope data visibility |
| **Security Roles** | CRUD + Append + Share + Assign per table, scoped by access level |
| **Teams** | Owner teams, access teams, Entra ID group teams |
| **Record Ownership** | Each record owned by user or team |

## Power BI Integration

| Aspect | Detail |
|---|---|
| **Connector** | Native Dataverse connector (TDS endpoint) |
| **DirectQuery** | Supported — real-time data in reports |
| **Query pushdown** | SQL-based TDS endpoint |
| **Security enforcement** | Dataverse security roles enforced in DirectQuery mode |

## Licensing Cost

| Users | Power Apps Premium ($20/user/mo) | Pay-as-you-go ($10/active user/app/mo) |
|---|---|---|
| 10 users | $200/mo | $100/mo |
| 25 users | $500/mo | $250/mo |
| 50 users | $1,000/mo | $500/mo |

- Dataverse for Teams (free with M365) is NOT usable — no API access, Teams-only, 2GB limit
- Default storage: 20GB database (Premium)
- Add-on storage: $40/GB/month (database), $2/GB/month (file)

## Developer Experience

| Aspect | Detail |
|---|---|
| **TypeScript SDK** | No official SDK — use `dynamics-web-api` (community) or typed `fetch()` |
| **Query language** | OData v4.0 + FetchXML (XML-based) |
| **Claude Code compatibility** | ~90% (less TS training data than Graph API) |
| **Local emulator** | None (use Power Apps Developer Plan for free sandbox) |
| **CI/CD** | PAC CLI + Solutions framework, official GitHub Actions |

## Comparison vs SharePoint Lists

| Dimension | SharePoint Lists | Dataverse |
|---|---|---|
| **Data licensing** | **$0** | $200-1,000/mo |
| **Transactions** | None | **ACID** |
| **Row-level security** | None | **Enterprise-grade** |
| **Server-side aggregation** | None | **SUM, AVG, COUNT, GROUP BY** |
| **Server-side validation** | None via API | **Business rules** |
| **Power BI** | Import only (30 min) | **DirectQuery** (real-time) |
| **TypeScript SDK** | **Official** | Community only |
| **Claude Code** | **97%** | ~90% |
| **View threshold** | 5K items | **None** |
| **Relationships** | Lookups (12 max) | **1:N, N:N, polymorphic** |

## When to Revisit This Decision

Consider migrating to Dataverse if:
1. Row-level security becomes a hard requirement
2. Data integrity issues arise from lack of ACID transactions
3. Active record count exceeds 50K (Activities table growing)
4. Real-time Power BI dashboards are needed
5. Complex N:N relationships or server-side aggregation become essential
6. Licensing budget opens up ($200-1,000/month)
