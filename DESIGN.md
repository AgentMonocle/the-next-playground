# Sales CRM: Technology Path Design

## Requirements

| Requirement | Detail |
|---|---|
| **Platform** | Azure-hosted web application/service |
| **Users** | Desktop browsers + mobile phones |
| **Authentication** | Microsoft Entra ID (Office 365 credentials) |
| **M365 Integration** | SharePoint (lists & libraries), Outlook (email), Teams (meetings, chat, files), Excel |
| **Data Residency** | Stored within M365 ecosystem, consumable by Power BI |
| **Development Tool** | Claude Code for majority of programming |
| **Technology Constraint** | No deprecated or end-of-life components |

## Deprecated Technologies (Excluded from All Paths)

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

## Stable Foundation (Common to All Paths)

These components are actively maintained, production-ready, and not at risk of deprecation:

- **Microsoft Graph API v1.0** — unified API for all M365 services
- **MSAL v5.x** — authentication library (browser and node variants)
- **SharePoint REST API + PnPJS v4** — SharePoint data access
- **Azure Functions v4** (isolated worker model) — serverless compute
- **Azure Static Web Apps** — SPA + API hosting
- **Azure App Service** — traditional web hosting
- **Azure Container Apps** — containerized workloads
- **GitHub Actions** — CI/CD
- **Adaptive Cards** — rich notification format (v1.5 desktop, v1.2 mobile)

---

## Path 1: React SPA + Azure Functions (TypeScript Full-Stack)

### Architecture

```
Browser / Mobile / Teams Tab (iframe)
    │
    ▼
Azure Static Web Apps
├── Frontend: React 18 + Vite + TypeScript + TailwindCSS
├── API: Azure Functions v4 (TypeScript, isolated worker)
│   ├── HTTP triggers (CRUD proxy to Graph API)
│   ├── Timer triggers (email subscription renewal, digests)
│   └── Webhook triggers (Graph change notifications)
    │
    ▼  Microsoft Graph API
SharePoint Lists (CRM data) + Outlook + Calendar + OneDrive + Teams
```

### Key Technologies

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

### How M365 Integration Works

- **SharePoint**: Graph API → `/sites/{id}/lists/{id}/items` for all CRM CRUD
- **Email**: Graph API → `/me/messages` (read) and `/me/sendMail` (send)
- **Calendar**: Graph API → `/me/events` (read/create meetings)
- **Teams notifications**: Azure Functions with app permissions → `POST /teams/{id}/channels/{id}/messages` via Managed Identity (no bot needed)
- **Teams tab**: Simple URL iframe — no Teams SDK dependency. MSAL Browser `acquireTokenSilent()` provides SSO in Teams context
- **OneDrive/SharePoint Libraries**: Graph API → `/me/drive/items` for document management
- **Excel**: SharePoint list native Excel export; or generate workbooks server-side via Graph API

### Background Processing

| Function | Trigger | Purpose |
|---|---|---|
| `email-webhook` | HTTP (Graph webhook) | Detect new emails from CRM contacts |
| `renew-subscriptions` | Timer (every 48h) | Renew Graph email subscriptions (3-day expiry) |
| `daily-digest` | Timer (daily) | Pipeline summary → Teams channel via Graph |
| `stale-deal-alert` | Timer (weekly) | Flag opportunities with no recent activity |

### Mobile Access

Responsive web app in any mobile browser. No native app needed. Optional: wrap as PWA for home screen install + push notifications.

### Claude Code Compatibility: 97%

Everything is TypeScript in text files. Only Azure AD portal configuration (app registration) requires GUI.

### Cost Estimate (10-50 users)

| Service | Monthly |
|---|---|
| Static Web Apps (Free/Standard) | $0–9 |
| Azure Functions (Consumption) | $2–15 |
| Azure Storage | $2–5 |
| Azure Key Vault | $1 |
| **Total** | **$5–30** |

### Pros

- Highest Claude Code compatibility of any path
- Lowest Azure hosting cost
- Modern React 18+ with full npm ecosystem
- Zero Microsoft framework dependencies (no SPFx, no Teams SDK, no Bot Framework)
- Works in any browser, Teams iframe, and mobile
- Fastest development velocity — standard web development patterns
- Data in SharePoint Lists → Power BI connects directly

### Cons

- Not "inside" Microsoft 365 — it's a web app accessed via URL
- No offline capability without PWA enhancements
- SharePoint Lists 5,000-item view threshold requires careful query design
- Graph API rate limits require batching and caching at scale
- No low-code workflow builder — all automation is code

### Best For

Teams that prioritize development speed, Claude Code productivity, and want a flexible web app with deep M365 data integration.

---

## Path 2: Next.js on Azure (Server-Rendered TypeScript)

### Architecture

```
Browser / Mobile / Teams Tab (iframe)
    │
    ▼
Azure Static Web Apps (hybrid deployment)
├── Next.js App Router (React Server Components + Client Components)
├── Server-side: API routes, server actions, SSR
├── Azure Functions for background tasks
    │
    ▼  Microsoft Graph API
SharePoint Lists + Outlook + Calendar + OneDrive + Teams
```

### Key Technologies

| Layer | Technology | Version | Status |
|---|---|---|---|
| Framework | Next.js (App Router) | 15.x | Stable |
| Runtime | React Server Components + Client | 19.x | Stable |
| Styling | TailwindCSS | 3.x | Stable |
| UI Components | Fluent UI React v9 | 9.72+ | Stable |
| Auth | @azure/msal-browser + NextAuth.js | 5.x | Stable |
| Graph SDK | @microsoft/microsoft-graph-client | 3.x | Stable |
| Background | Azure Functions v4 (isolated) | Node 20 | Stable |
| Hosting | Azure Static Web Apps (hybrid) | Standard | Stable |

### How It Differs from Path 1

- **Server-side rendering**: CRM pages render on the server with fresh data. No loading spinners for initial page load — data arrives with the HTML
- **React Server Components**: Heavy data fetching happens server-side. Graph API tokens stay on the server (never exposed to browser JavaScript)
- **Server Actions**: Form submissions (create company, update deal stage) execute server-side with type-safe validation
- **API routes**: Backend logic lives alongside the frontend in the same Next.js project — no separate Azure Functions project for HTTP endpoints

### Security Advantage

Graph API tokens are acquired and used **server-side only**. The browser never sees access tokens for SharePoint, Outlook, etc. This eliminates an entire class of XSS token theft attacks.

### Mobile Access

Server-rendered HTML loads fast on mobile connections. No large JavaScript bundle required for initial render. Progressive enhancement for interactive features.

### Claude Code Compatibility: 97%

Same as Path 1 — all TypeScript. Next.js file-based routing and Server Components are well within Claude Code's capabilities.

### Cost Estimate (10-50 users)

| Service | Monthly |
|---|---|
| Static Web Apps Standard (hybrid) | $9 |
| App Service backend (Next.js SSR) | $15–55 |
| Azure Functions (background tasks) | $2–10 |
| Azure Storage | $2–5 |
| **Total** | **$28–80** |

Higher than Path 1 because SSR requires an always-running App Service instance.

### Pros

- Faster initial page loads (server-rendered)
- Tokens never exposed to browser (superior security)
- Single project (frontend + API in one codebase)
- Full npm ecosystem, React 19 features
- Built-in image optimization, caching strategies
- Same Claude Code compatibility as Path 1

### Cons

- Higher hosting cost (SSR requires compute)
- More complex deployment (hybrid Static Web Apps + App Service)
- Next.js upgrade churn (framework has rapid release cadence)
- SSR cold starts can introduce latency on infrequent requests
- Heavier framework compared to plain Vite + React

### Best For

Teams that want the best initial load performance, prioritize security (server-side tokens), and prefer an all-in-one framework.

---

## Path 3: Blazor WebAssembly + .NET Backend (C# Full-Stack)

### Architecture

```
Browser / Mobile / Teams Tab (iframe)
    │
    ▼
Azure Static Web Apps
├── Blazor WebAssembly (C# running in browser via WASM)
├── .NET Azure Functions v4 (isolated worker, C#)
│   ├── Graph API proxy endpoints
│   ├── Timer triggers
│   └── Webhook handlers
    │
    ▼  Microsoft Graph API
SharePoint Lists + Outlook + Calendar + OneDrive + Teams
```

### Key Technologies

| Layer | Technology | Version | Status |
|---|---|---|---|
| Frontend | Blazor WebAssembly | .NET 9 | Stable (support to Nov 2026) |
| UI Components | Fluent UI Blazor | v4.12 (v5 upcoming) | Stable |
| Auth | Microsoft.Identity.Web | latest | Stable |
| Graph SDK | Microsoft.Graph | 5.x | Stable |
| Backend | Azure Functions v4 (C# isolated) | .NET 9 | Stable |
| Hosting | Azure Static Web Apps | Standard | Stable |

### Why Blazor

Microsoft's own framework for building web UIs in C#. Deepest first-party integration with Microsoft Graph — official code samples, built-in auth middleware, and native .NET Graph SDK.

### Unique Advantages

- **Shared C# models**: Same data classes used in frontend and backend. No TypeScript ↔ C# serialization mismatches
- **Microsoft.Identity.Web**: Microsoft's recommended auth library for .NET. Handles token acquisition, caching, and refresh automatically
- **Fluent UI Blazor**: Microsoft-maintained component library designed specifically for Blazor — native Microsoft design language
- **Strong typing end-to-end**: From SharePoint list schema → C# model → Blazor component → user display

### Trade-offs

- **Initial load time**: Blazor WASM downloads a ~2-3MB .NET runtime on first visit (~7-8 seconds). Subsequent visits use cached runtime (~1-2 seconds)
- **Smaller ecosystem**: 353K NuGet packages vs 2.1M npm packages. Fewer UI component choices
- **C# in the browser**: Unusual — debugging WASM in browser DevTools is less intuitive than JavaScript

### Claude Code Compatibility: 95%

Claude Code has strong C# support including LSP integration. Blazor uses Razor syntax (.razor files) which is C# + HTML — well within Claude Code's capabilities. Slightly lower than TypeScript paths due to smaller training data corpus for Blazor-specific patterns.

### Cost Estimate (10-50 users)

| Service | Monthly |
|---|---|
| Static Web Apps (Standard) | $9 |
| Azure Functions (Consumption) | $2–15 |
| Azure Storage | $2–5 |
| **Total** | **$13–30** |

### Pros

- Deepest Microsoft Graph integration (official .NET SDK, samples, middleware)
- Shared C# code between frontend and backend
- Microsoft-maintained Fluent UI Blazor components
- Strong type safety end-to-end
- No JavaScript/TypeScript build toolchain needed
- Growing adoption (43% of .NET developers using Blazor in production)

### Cons

- Slow initial load (7-8s for WASM download, 1-2s cached)
- Smaller component ecosystem than React
- Debugging WASM in browser is less ergonomic
- .NET 9 support ends Nov 2026 — will need .NET 10 upgrade
- Less mobile-optimized than React ecosystem

### Best For

Teams with .NET expertise who want the deepest Microsoft integration and prefer staying in a single-language (C#) stack.

---

## Path 4: Python Backend (FastAPI) + React Frontend

### Architecture

```
Browser / Mobile / Teams Tab (iframe)
    │
    ▼
Azure Static Web Apps (React frontend)
    │
    ▼  REST API
Azure Container Apps or App Service
├── FastAPI (Python 3.12+)
├── Microsoft Graph SDK for Python
├── MSAL Python
├── Background tasks (Celery or APScheduler)
    │
    ▼  Microsoft Graph API
SharePoint Lists + Outlook + Calendar + OneDrive + Teams
```

### Key Technologies

| Layer | Technology | Version | Status |
|---|---|---|---|
| Frontend | React + Vite + TypeScript | 18.x | Stable |
| Backend | FastAPI | 0.115+ | Stable |
| Auth (backend) | MSAL Python | 1.34+ | Stable |
| Auth (frontend) | @azure/msal-browser | 5.x | Stable |
| Graph SDK | msgraph-sdk-python | latest (Jan 2026) | Stable |
| Background | APScheduler or Celery | latest | Stable |
| Hosting (FE) | Azure Static Web Apps | Free/Standard | Stable |
| Hosting (BE) | Azure Container Apps | Consumption | Stable |

### Why Python + React

- **FastAPI performance**: 1,200 req/s throughput, 45ms p95 latency for Graph API calls
- **Python AI ecosystem**: If you want to add AI features later (email summarization, deal scoring, contact enrichment), Python has the richest ML/AI library ecosystem
- **Claude Code loves Python**: Python shows the strongest community satisfaction with Claude Code development
- **Separation of concerns**: React handles UI (TypeScript), FastAPI handles business logic and Graph API (Python)

### How It Works

1. React SPA authenticates user via MSAL Browser → receives access token
2. SPA sends token to FastAPI backend with each request
3. FastAPI validates token, uses On-Behalf-Of flow to call Graph API
4. Graph API reads/writes SharePoint Lists, Outlook, Calendar
5. Background scheduler (APScheduler) handles email monitoring, digest generation

### Claude Code Compatibility: 96%

Both Python (backend) and TypeScript (frontend) are Claude Code strengths. The split-language approach means each layer uses the language Claude Code handles best for that domain.

### Cost Estimate (10-50 users)

| Service | Monthly |
|---|---|
| Static Web Apps (Free) | $0 |
| Container Apps (Consumption) | $5–30 |
| Azure Storage | $2–5 |
| **Total** | **$7–35** |

Container Apps scales to zero when idle — very cost-effective for a CRM with bursty usage.

### Pros

- Best AI/ML extensibility (Python ecosystem: scikit-learn, OpenAI SDK, pandas)
- FastAPI is fast and lightweight
- Container Apps scales to zero (cost-effective)
- React frontend same quality as Path 1
- Claude Code excellent in both Python and TypeScript
- Clean backend/frontend separation

### Cons

- Two languages (Python + TypeScript) — two toolchains to maintain
- On-Behalf-Of auth flow adds complexity
- Python Graph SDK is newer (Jan 2026 release) — fewer community examples
- Container Apps cold start (~2-5s) when scaling from zero
- No shared types between frontend and backend (need API contract discipline)

### Best For

Teams with Python expertise, or those planning AI/ML features (email intelligence, deal scoring, contact enrichment) alongside the CRM.

---

## Path 5: Power Platform Hybrid (Model-Driven App + PCF Components)

### Architecture

```
PowerApps (Model-Driven App)
├── Standard forms/views (low-code, designer)
├── PCF Controls (TypeScript/React, code-first)
│   ├── Pipeline Kanban Board
│   ├── Activity Timeline
│   ├── Email Panel
│   └── Dashboard Charts
├── Power Automate (workflow automation)
│   ├── Deal stage change → Teams notification
│   ├── New email from CRM contact → log activity
│   └── Weekly pipeline digest
    │
    ▼
Dataverse (relational CRM database)
    │
    ▼  Native connectors
Power BI + Excel + Teams + Outlook
```

### Key Technologies

| Layer | Technology | Version | Status |
|---|---|---|---|
| App Shell | Model-Driven PowerApp | latest | Stable |
| Custom Controls | PCF (TypeScript/React) | React 17 (19 with opt-out) | Stable |
| Data | Dataverse | latest | Stable |
| Workflows | Power Automate Cloud Flows | latest | Stable |
| Custom Connectors | OpenAPI/Swagger | 3.0 | Stable |
| Packaging | Power Platform CLI (`pac`) | latest | Stable |

### What Claude Code Builds vs What's Low-Code

**Claude Code writes (55-65% of effort):**
- PCF components in TypeScript/React (pipeline board, activity timeline, charts)
- Custom connectors (OpenAPI definitions)
- Dataverse plugins (C# server-side business logic)
- Power Automate flow definitions (JSON export/import)
- CI/CD scripts (GitHub Actions + `pac` CLI)
- Solution packaging automation

**Designer/GUI work (35-45%):**
- Model-Driven app forms, views, navigation (Dataverse designer)
- Basic Power Automate flow trigger configuration
- Dataverse table/column definitions (can also be done via code)
- App publishing and environment management

### Why Consider This Path

- **Dataverse** is a proper relational database with row-level security, calculated fields, business rules, and rollup fields — purpose-built for CRM scenarios
- **Power BI** has a native Dataverse connector (best performance of any path)
- **Power Automate** provides 400+ pre-built connectors for workflow automation
- **Mobile access** via PowerApps mobile app (native, not just responsive web)
- **Teams embedding** is built-in (PowerApps → Teams tab with zero config)

### Claude Code Compatibility: 62%

The model-driven app shell and Power Automate trigger configuration are GUI-driven. However, the complex, high-value components (PCF controls, plugins, connectors) are fully code-first.

### Cost Estimate (10-50 users)

| Service | Monthly |
|---|---|
| Power Apps Premium | $20/user × 10-50 = $200–1,000 |
| Dataverse storage | Included (1GB base + $40/GB extra) |
| Power Automate (included with Premium) | $0 |
| **Total** | **$200–1,000** |

Significantly higher licensing cost, but zero Azure infrastructure to manage.

### Pros

- Most M365-native experience (PowerApps is a first-class M365 citizen)
- Dataverse is the richest CRM data platform (relational, row-level security, business rules)
- Best Power BI integration (native connector, real-time)
- Power Automate provides workflow automation without writing infrastructure code
- Native mobile app (not just responsive web)
- Zero Azure infrastructure management
- Built-in Teams, Outlook, and Excel integration

### Cons

- Highest licensing cost ($200-1,000/month)
- Lowest Claude Code compatibility (62%)
- Model-Driven app UI is constrained to Dataverse form patterns
- PCF controls limited to React 17 (19 with workaround)
- Power Automate flows lack Git version control
- Vendor lock-in to Microsoft Power Platform
- Learning curve for Dataverse model-driven patterns

### Best For

Organizations that already have Power Platform licensing, want the richest CRM data model (Dataverse), and accept the trade-off of lower Claude Code usage.

---

## Path 6: React SPA + Azure Functions + PWA (Offline-Capable)

### Architecture

```
Browser / Mobile (installed PWA) / Teams Tab (iframe)
    │
    ▼
Azure Static Web Apps
├── React 18 + Vite + TypeScript + TailwindCSS
├── Service Worker (offline caching, background sync)
├── IndexedDB (local CRM data cache)
├── Web Push API (notifications)
├── Azure Functions v4 (isolated, TypeScript)
    │
    ▼  Microsoft Graph API
SharePoint Lists + Outlook + Calendar + OneDrive + Teams
```

### Key Technologies

Everything from Path 1, PLUS:

| Layer | Technology | Purpose |
|---|---|---|
| Offline | Service Worker (Workbox) | Cache app shell + API responses |
| Local DB | IndexedDB (via Dexie.js) | Store CRM records offline |
| Sync | Background Sync API | Queue changes while offline, sync on reconnect |
| Notifications | Web Push API + VAPID keys | Push notifications without native app |
| Install | Web App Manifest | "Install" button in browser, home screen icon |

### How Offline Works

1. **First visit**: Service Worker caches the entire React app shell + static assets
2. **Data caching**: React Query's `persistQueryClient` stores CRM data in IndexedDB
3. **Offline writes**: User creates/edits records → stored in IndexedDB with "pending sync" flag
4. **Reconnection**: Background Sync API detects connectivity → replays pending writes to Azure Functions → Graph API updates SharePoint Lists
5. **Conflict resolution**: Last-write-wins with timestamp comparison (simple) or merge UI (advanced)

### Mobile as First-Class

The PWA is installable on:
- **Android**: Full support — push notifications, home screen, splash screen, background sync
- **iOS**: Push notifications supported for installed PWAs (since iOS 16.4). Some limitations: no Background Sync API, less reliable push
- **Windows/macOS**: Install via Chrome/Edge address bar. Full feature support
- **Teams**: Can be surfaced as a personal app (URL tab)

### Push Notifications

Azure Functions can send push notifications via Web Push Protocol (VAPID):
- Deal stage changes → push to opportunity owner
- New email from CRM contact → push to assigned salesperson
- Overdue activities → push reminder
- No dependency on Teams or Outlook for notifications

### Claude Code Compatibility: 96%

Same as Path 1 for the core app. Service Worker and IndexedDB code are standard JavaScript/TypeScript. Workbox (Google's service worker library) is well-documented.

### Cost Estimate (10-50 users)

| Service | Monthly |
|---|---|
| Static Web Apps (Free/Standard) | $0–9 |
| Azure Functions (Consumption) | $2–15 |
| Azure Storage | $2–5 |
| Azure Key Vault | $1 |
| **Total** | **$5–30** |

Same as Path 1 — PWA capabilities add zero hosting cost.

### Pros

- **Offline access** — CRM works without internet (view cached data, create records)
- **Push notifications** — direct to device, no Teams/Outlook dependency
- **Installable** — looks and feels like a native app on mobile and desktop
- **Zero app store** — no Apple App Store or Google Play review process
- Same Claude Code compatibility and cost as Path 1
- Background sync automatically replays offline changes

### Cons

- **Offline sync complexity** — conflict resolution between local IndexedDB and SharePoint Lists is non-trivial
- **iOS limitations** — no Background Sync API, push notifications only for installed PWAs
- **Service Worker debugging** — caching bugs can serve stale content (hard to diagnose)
- **Initial development overhead** — ~2-3 weeks extra to build offline layer vs Path 1
- **Data staleness** — cached CRM data may be outdated if user was offline for hours

### Best For

Sales teams that work in the field (customer visits, trade shows, areas with poor connectivity) and need CRM access without reliable internet.

---

## Comparison Matrix

| Dimension | Path 1: React SPA | Path 2: Next.js | Path 3: Blazor | Path 4: FastAPI+React | Path 5: Power Platform | Path 6: React PWA |
|---|---|---|---|---|---|---|
| **Claude Code %** | **97%** | **97%** | 95% | 96% | 62% | 96% |
| **M365 Native Feel** | 7/10 | 7/10 | 7/10 | 7/10 | **10/10** | 7/10 |
| **Power BI** | 8/10 (SP Lists) | 8/10 (SP Lists) | 8/10 (SP Lists) | 8/10 (SP Lists) | **10/10 (Dataverse)** | 8/10 (SP Lists) |
| **Mobile** | 8/10 (responsive) | **9/10** (SSR) | 7/10 (WASM) | 8/10 (responsive) | **9/10** (native app) | **9/10** (PWA install) |
| **Offline** | No | No | No | No | Limited | **Yes** |
| **Security** | Good | **Best** (server tokens) | Good | Good (OBO flow) | Good (Dataverse RBAC) | Good |
| **Initial Load** | Fast (~1s) | **Fastest** (SSR) | Slow (7-8s) | Fast (~1s) | Variable | Fast (~500ms cached) |
| **Hosting Cost/mo** | **$5–30** | $28–80 | $13–30 | $7–35 | $200–1,000 | **$5–30** |
| **Licensing Cost** | $0 | $0 | $0 | $0 | **$200–1,000/mo** | $0 |
| **Setup Complexity** | Low | Medium | Medium | Medium | Medium-High | Medium |
| **Languages** | TypeScript | TypeScript | C# | Python + TypeScript | TS + C# + low-code | TypeScript |
| **Background Tasks** | Azure Functions | Azure Functions | Azure Functions | Container Apps | Power Automate | Azure Functions |
| **Teams Integration** | URL tab | URL tab | URL tab | URL tab | Native embed | URL tab |
| **Deprecated Tech** | None | None | None | None | None | None |

---

## Data Layer Options (All Paths Except Path 5)

Paths 1-4 and 6 use **SharePoint Lists** as the CRM data store:

| List | Purpose | Key Columns |
|---|---|---|
| `CRM_Countries` | Reference data | Title, CountryCode, Region |
| `CRM_Companies` | Accounts | Title, Industry, Revenue, Owner, Country (lookup) |
| `CRM_Contacts` | People | Name, Email, Phone, Company (lookup), JobTitle |
| `CRM_Opportunities` | Deals | Title, Amount, Stage, Probability, CloseDate, Company (lookup) |
| `CRM_Activities` | Interactions | Type, Description, Date, Contact (lookup), Opportunity (lookup) |
| `CRM_Documents` | File references | Title, Type, DocumentLink, Opportunity (lookup) |

**Power BI**: Connects via native SharePoint list connector (scheduled refresh, 30min minimum).

**Path 5** uses **Dataverse tables** with the same schema but with proper relational foreign keys, row-level security, and calculated fields.

---

## Recommendation Summary

| Priority | Recommended Path |
|---|---|
| **Maximum Claude Code productivity** | Path 1 (React SPA) or Path 2 (Next.js) |
| **Best security posture** | Path 2 (Next.js — server-side tokens) |
| **Deepest M365 integration** | Path 5 (Power Platform + Dataverse) |
| **Best mobile experience** | Path 6 (PWA) or Path 5 (native PowerApps mobile) |
| **Offline field access** | Path 6 (PWA with IndexedDB + Background Sync) |
| **AI/ML extensibility** | Path 4 (Python FastAPI backend) |
| **Lowest cost** | Path 1 (React SPA) or Path 6 (React PWA) |
| **Single-language stack (C#)** | Path 3 (Blazor) |
| **Single-language stack (TypeScript)** | Path 1, 2, or 6 |
