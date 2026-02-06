# Detailed Plan Comparison: Paths 1, 2, and 6

This document provides deep technical analysis of the three shortlisted technology paths, focusing on **data storage**, **email integration**, **security**, and comprehensive **pros/cons** to support path selection.

---

## Path 1: React SPA + Azure Functions (TypeScript Full-Stack)

### Data Storage: SharePoint Lists via Graph API

**How it works**: The React SPA authenticates the user via MSAL Browser, acquires a delegated Graph API token, and performs CRUD operations against SharePoint Lists. Azure Functions handle background operations using Managed Identity (application permissions).

**SharePoint Lists Capabilities & Constraints**:

| Aspect | Detail |
|---|---|
| **Max items per list** | 30 million rows |
| **View threshold** | 5,000 items — queries returning >5,000 unindexed results are throttled |
| **Indexed columns** | Up to 20 per list. Queries filtering on indexed columns bypass the 5K threshold |
| **Lookup columns** | Maximum 12 per list (includes cascading lookups) |
| **Column types** | Text, Number, DateTime, Choice, Lookup, Currency, Boolean, Calculated, Person |
| **Calculated columns** | Cannot be used in Graph API `$filter` — only for display |
| **Cascade deletes** | Supported on lookup columns (e.g., delete Company → deletes linked Contacts) |
| **Version history** | Built-in — tracks all field changes with author and timestamp |
| **Field validation** | Column-level and list-level validation formulas (e.g., CloseDate > Created) |

**Graph API CRUD Performance**:

| Operation | Typical Latency |
|---|---|
| Single item GET (filtered, indexed column) | 200–400ms |
| Batch operation (20 items) | 400–800ms |
| Create single item | 300–500ms |
| Update single item | 200–400ms |
| Delta query (changes since last sync) | 200–600ms |

**Critical Limitations**:

- **No ACID transactions**: Graph API batch operations (max 20 per batch) are NOT atomic — if item 15 fails, items 1-14 are already committed. The application must implement compensating transactions (rollback logic)
- **OData filter limitations**: `$filter` supports `eq`, `ne`, `gt`, `lt`, `startsWith`, `contains` (text only). No `endsWith`, no regex, no complex joins. Date range queries work but syntax is specific
- **Delta queries**: Support limited filter expressions — cannot filter delta results by arbitrary columns. Best used for "give me everything that changed" and filter client-side
- **Rate limiting**: 10,000 API calls per 10 minutes per tenant (shared across all apps). Burst: ~5 requests/second per user
- **No server-side aggregation**: No `SUM`, `AVG`, `GROUP BY` — all aggregation must happen in application code or Power BI

**Power BI Integration**:

| Aspect | Detail |
|---|---|
| Connector | Native SharePoint Online List connector |
| Refresh frequency | 8/day (Pro license), 48/day (Premium) |
| Minimum interval | 30 minutes |
| Real-time | Not natively — use Power BI streaming datasets or push API for near-real-time |
| Column mapping | Automatic — SharePoint column types map to Power BI types |

**Scaling Strategy**:
For a 10-50 user sales CRM, SharePoint Lists are well within limits. A typical CRM might have:
- ~500 Companies, ~2,000 Contacts, ~1,000 Opportunities, ~10,000 Activities per year
- All well below the 5K view threshold with proper indexing
- Index `Stage`, `Owner`, `CloseDate`, `Company` on Opportunities list
- Index `Company`, `Email` on Contacts list

**Dataverse Migration Path**: If the CRM outgrows SharePoint Lists (>50K active records, need for complex queries, row-level security), migration to Dataverse is straightforward — same Graph API surface, richer query capabilities, but requires Power Platform licensing ($20/user/month).

---

### Email Integration

**Architecture**: The React SPA reads/sends email using delegated Graph API permissions. Azure Functions handle webhook-based email monitoring via application permissions.

**Reading Email**:
```
GET /me/messages?$filter=sender/emailAddress/address eq 'contact@company.com'
    &$select=subject,body,receivedDateTime,conversationId
    &$orderby=receivedDateTime desc
    &$top=25
```
- Permission required: `Mail.Read` (delegated)
- Supports filtering by sender, subject (startsWith), received date range, folder
- `conversationId` groups email threads — use this to show conversation history per contact

**Sending Email**:
```
POST /me/sendMail
{
  "message": {
    "subject": "Follow-up: Q2 Proposal",
    "body": { "contentType": "HTML", "content": "<p>Hi...</p>" },
    "toRecipients": [{ "emailAddress": { "address": "contact@company.com" } }]
  }
}
```
- Permission required: `Mail.Send` (delegated)
- Sent mail appears in user's Outlook Sent Items folder
- Can include attachments via base64 or reference (OneDrive link)

**Background Email Monitoring (via Azure Functions)**:
- **Graph webhooks**: Subscribe to `/users/{id}/messages` — Graph sends HTTP POST to your Azure Function when new email arrives
- **Subscription lifecycle**: Subscriptions expire after **3 days max**. A timer-triggered Azure Function must renew subscriptions every 48 hours
- **Subscription limit**: 1,000 subscriptions per mailbox
- **Processing flow**: Webhook fires → Azure Function receives notification → checks sender against CRM contacts → auto-creates Activity record in SharePoint List → optionally notifies user

**Calendar Integration**:
- `GET /me/events` — list meetings
- `POST /me/events` — create meetings (with attendees, Teams meeting link)
- `GET /me/calendarView?startDateTime=...&endDateTime=...` — date range queries

**Teams Notifications (without Bot Framework)**:
- Azure Functions with Managed Identity → `POST /teams/{teamId}/channels/{channelId}/messages`
- Permission: `ChannelMessage.Send` (application)
- Sends Adaptive Card notifications for deal stage changes, daily digests, etc.

---

### Security

**Authentication Flow**:
1. User visits the SPA → MSAL Browser triggers Authorization Code with PKCE flow
2. User signs in with Microsoft Entra ID credentials
3. MSAL acquires access tokens for Graph API scopes
4. Tokens are stored **in browser memory** (default) — not localStorage

**Token Storage in SPA**:

| Storage Method | Risk | Recommendation |
|---|---|---|
| **In-memory** (MSAL default) | Lost on page refresh; most secure | Use for short-lived sessions |
| **sessionStorage** | XSS-accessible; cleared on tab close | Acceptable for CRM with proper CSP |
| **localStorage** | XSS-accessible; persists across tabs | Avoid for Graph API tokens |

**Recommendation for this CRM**: Use `sessionStorage` cache with MSAL's `cacheLocation: "sessionStorage"` — survives page refresh within a tab but clears on browser close. Combined with strong CSP headers, this is appropriate for an internal corporate CRM.

**Token Security Details**:
- Access tokens are short-lived (typically 60-90 minutes)
- MSAL automatically handles silent token refresh via hidden iframe
- Refresh tokens (for persistent sessions) are stored in MSAL cache
- Conditional Access policies (if configured in Entra ID) apply to all Graph API calls — MFA, device compliance, location-based policies are enforced

**XSS Mitigation**:
- **Content Security Policy (CSP)** headers: `script-src 'self'; connect-src https://graph.microsoft.com https://login.microsoftonline.com`
- React's JSX auto-escapes HTML by default (prevents most injection)
- No `dangerouslySetInnerHTML` for user-provided content
- Azure Static Web Apps supports custom response headers for CSP

**Application Permissions (Azure Functions)**:
- Azure Functions use **Managed Identity** — no client secrets stored in code
- Application permissions (`Sites.ReadWrite.All`, `Mail.Read`, `ChannelMessage.Send`) are granted via Entra ID admin consent
- Managed Identity tokens are issued by Azure — cannot be stolen from application code

**Permission Model**:

| Component | Permission Type | Scopes |
|---|---|---|
| React SPA (user context) | Delegated | `Sites.ReadWrite.All`, `Mail.Read`, `Mail.Send`, `Calendars.ReadWrite`, `User.Read` |
| Azure Functions (background) | Application (Managed Identity) | `Sites.ReadWrite.All`, `Mail.Read`, `ChannelMessage.Send` |

---

### Pros (Detailed)

1. **Highest Claude Code compatibility (97%)** — entire codebase is TypeScript. React components, Azure Functions, Graph API calls, test files — all standard TypeScript that Claude Code handles natively. Only Azure AD portal app registration requires GUI
2. **Lowest hosting cost ($5-30/month)** — Azure Static Web Apps Free tier hosts the SPA. Azure Functions Consumption plan charges only per execution. A 10-50 user CRM will cost single-digit dollars per month
3. **Fastest development velocity** — standard React + TypeScript patterns with the full npm ecosystem. No framework-specific abstractions to learn. Thousands of community packages available
4. **Zero Microsoft framework dependency** — no SPFx, no Teams SDK, no Bot Framework, no PowerApps. If Microsoft deprecates any of these frameworks, this architecture is unaffected
5. **Simple deployment** — `swa deploy` pushes both frontend and API in a single command. Azure Static Web Apps handles SSL, CDN, and routing automatically
6. **Flexible UI** — full control over UX design. TailwindCSS or Fluent UI v9 — your choice. Not constrained by Teams SDK component library or PowerApps form patterns
7. **Data stays in SharePoint Lists** — Power BI connects directly. No ETL, no data pipeline. SharePoint version history provides audit trail for free
8. **Works in Teams as URL tab** — zero Teams SDK code. Just add the SPA URL as a Teams tab. MSAL `acquireTokenSilent()` provides SSO in the Teams iframe context

### Cons (Detailed)

1. **SharePoint Lists 5,000-item view threshold** — queries on unindexed columns that scan >5,000 items are throttled by SharePoint. **Mitigation**: Index key columns (Stage, Owner, CloseDate, Company). For a CRM with <50K total records, this is manageable with proper indexing. Becomes a real problem only if Activities table grows beyond 50K rows without archival
2. **No ACID transactions** — Graph API batch requests (max 20 per batch) execute independently. If a multi-step operation fails partway through, the application must implement compensating rollback logic. **Impact**: Creating an Opportunity + related Activities in one operation could leave orphaned records if the second step fails. **Mitigation**: Design operations to be idempotent; implement retry + cleanup logic
3. **Tokens in browser** — SPA architecture means Graph API access tokens exist in browser memory/sessionStorage. An XSS attack could steal tokens. **Mitigation**: Strong CSP headers, React's built-in XSS protection, and short-lived tokens (60-90 min). For an internal corporate CRM with trusted users, this risk is acceptable
4. **No offline capability** — if the user loses internet, the CRM is completely non-functional. Users cannot view cached contacts, log meeting notes, or update deal stages. **Impact**: Field sales reps at customer sites or trade shows with poor connectivity will be blocked
5. **No server-side aggregation** — SharePoint Lists don't support `SUM`, `GROUP BY`, etc. Pipeline totals, revenue forecasts, and dashboard KPIs must be calculated client-side by fetching all records. **Mitigation**: Use React Query caching to avoid redundant fetches; rely on Power BI for heavy analytics
6. **Graph API rate limits** — 10,000 calls per 10 minutes per tenant. With 50 concurrent users, each making ~10 calls per minute (page loads, searches, updates), you'd use ~5,000 calls/10min — 50% of the limit. **Mitigation**: Aggressive client-side caching with React Query (staleTime: 5min), batch operations, and delta queries for incremental sync
7. **Manual conflict handling** — two users editing the same Opportunity simultaneously could overwrite each other's changes. SharePoint Lists support ETags for optimistic concurrency, but implementing proper conflict resolution UI adds development effort

---

## Path 2: Next.js SSR on Azure (Server-Rendered TypeScript)

### Data Storage: SharePoint Lists via Graph API (Server-Side)

**How it works**: Next.js server components and API routes call the Graph API **from the server**. The browser never directly calls the Graph API. Data arrives pre-rendered in the HTML response.

**Same SharePoint Lists constraints as Path 1** (5K threshold, 12 lookup limit, no ACID transactions, etc.) — the data store is identical. The difference is *where* the Graph API calls originate.

**Server-Side Advantages for Data Access**:

| Aspect | Path 1 (SPA) | Path 2 (Next.js SSR) |
|---|---|---|
| **Where Graph API is called** | Browser (client-side) | Server (RSC / API routes) |
| **Token exposure** | Browser memory/sessionStorage | Server memory only |
| **Data fetching** | After JS loads → loading spinner | During SSR → HTML arrives with data |
| **Rate limit impact** | Each user's browser makes calls | Server batches and caches calls |
| **Caching** | React Query (per-browser) | Next.js Data Cache (shared server-side) |

**Server-Side Caching Benefits**:
- Next.js Data Cache can share Graph API responses across users. If User A loads the Companies list, User B's request 30 seconds later can serve from server cache — reducing Graph API calls significantly
- `revalidate: 300` (5 min) on server components means the Companies list is fetched once every 5 minutes, not once per page load per user
- This dramatically reduces Graph API rate limit pressure compared to Path 1

**Data Fetching Pattern**:
```
// Server Component (runs on server, never ships to browser)
async function CompaniesPage() {
  const companies = await graphClient.api('/sites/{id}/lists/{id}/items')
    .filter("fields/Stage eq 'Active'")
    .select('fields')
    .get();
  return <CompanyTable data={companies} />;  // HTML sent to browser
}
```

---

### Email Integration

**Architecture**: Same Graph API endpoints as Path 1, but email operations execute server-side. The browser never sees Graph API tokens for email access.

**Reading Email (Server-Side)**:
- Next.js API route receives request from browser → acquires Graph token via MSAL Node → calls `/me/messages` → returns sanitized JSON to browser
- The access token for `Mail.Read` never leaves the server

**Sending Email (Server Action)**:
- User composes email in React client component → submits form → Next.js Server Action executes `/me/sendMail` server-side
- The browser sends only the email content (to, subject, body) — never a Graph API token

**Background Email Monitoring**:
- Same as Path 1 — Azure Functions with Managed Identity handle webhook subscriptions and processing
- Azure Functions are still needed because Next.js SSR cannot run timer triggers or long-lived webhook listeners

**Key Difference from Path 1**: Email operations through the browser are proxied through the Next.js server. This adds ~50-100ms latency per operation but eliminates token exposure for email access. Background monitoring via Azure Functions is identical.

---

### Security

**Authentication Flow**:
1. User visits Next.js app → redirected to Microsoft Entra ID login
2. After sign-in, authorization code is exchanged **server-side** (Next.js API route)
3. Access tokens and refresh tokens are stored **server-side only** (encrypted session cookie references server-side token cache)
4. Browser receives only an HTTP-only session cookie — no Graph API tokens in JavaScript

**Token Architecture Comparison**:

| Aspect | Path 1 (SPA) | Path 2 (Next.js SSR) |
|---|---|---|
| **Access token location** | Browser memory/sessionStorage | Server memory/cache |
| **Refresh token location** | Browser (MSAL cache) | Server (MSAL Node cache) |
| **XSS token theft risk** | Possible (mitigated by CSP) | **Eliminated** — no tokens in JS |
| **Session mechanism** | MSAL manages in browser | HTTP-only encrypted cookie |
| **Token lifetime management** | MSAL Browser silent refresh | MSAL Node `acquireTokenOnBehalfOf` |

**Why This Matters**:
- In Path 1, a successful XSS attack could steal a Graph API token and access the user's SharePoint data, emails, and calendar for up to 90 minutes
- In Path 2, even a successful XSS attack cannot steal Graph API tokens — they don't exist in the browser. The attacker could only make requests through the Next.js server, which can apply additional validation

**Security Headers**:
- Same CSP headers as Path 1, but even stronger because `connect-src` doesn't need `https://graph.microsoft.com` (browser never calls Graph directly)
- HTTP-only, Secure, SameSite=Strict cookie for session management
- CSRF protection built into Next.js Server Actions

**Application Permissions (Azure Functions)**:
- Identical to Path 1 — Azure Functions use Managed Identity for background tasks

**Permission Model**:

| Component | Permission Type | Scopes |
|---|---|---|
| Next.js Server (user context) | Delegated (server-side) | `Sites.ReadWrite.All`, `Mail.Read`, `Mail.Send`, `Calendars.ReadWrite`, `User.Read` |
| Azure Functions (background) | Application (Managed Identity) | `Sites.ReadWrite.All`, `Mail.Read`, `ChannelMessage.Send` |

---

### Pros (Detailed)

1. **Best security posture of all paths** — Graph API tokens never touch the browser. No token in `sessionStorage`, no token in memory, no token in any JavaScript-accessible location. XSS cannot steal tokens. This is the gold standard for M365 web app security
2. **Faster initial page load** — CRM data arrives as rendered HTML. No loading spinners, no skeleton screens, no "fetching data..." states. The Opportunity Pipeline page loads with data already in the HTML. On slow mobile connections, this difference is dramatic
3. **Server-side caching reduces Graph API pressure** — Next.js Data Cache shares responses across users. 50 users loading the Companies page results in ~1 Graph API call per 5 minutes (with `revalidate: 300`), not 50 calls. This makes rate limiting a non-issue
4. **Single project structure** — frontend components, API routes, server actions, and middleware all live in one Next.js project. No separate Azure Functions project for HTTP endpoints. Only background timer/webhook triggers need a separate Functions project
5. **Same Claude Code compatibility as Path 1 (97%)** — all TypeScript. Next.js App Router, Server Components, and Server Actions are well within Claude Code's capabilities
6. **Built-in optimizations** — Next.js provides image optimization, font optimization, route prefetching, and streaming SSR out of the box. These would require manual implementation in Path 1
7. **React 19 features** — Server Components, Server Actions, `use()` hook, `useOptimistic()` — Next.js 15 gives access to the latest React features that aren't yet ergonomic in a Vite SPA
8. **Better SEO** (if needed) — server-rendered HTML is crawlable. Unlikely to matter for an internal CRM, but relevant if any CRM pages become externally accessible

### Cons (Detailed)

1. **Higher hosting cost ($28-80/month)** — SSR requires an always-running compute instance. Azure Static Web Apps can host Next.js in hybrid mode, but the SSR tier needs an App Service (B1: $13/month, B2: $26/month, S1: $55/month). A 10-50 user CRM likely needs at minimum a B1 instance. This is 3-5x the cost of Path 1
2. **More complex deployment** — Azure Static Web Apps hybrid deployment (static assets + SSR backend) requires careful configuration. The deployment involves Azure Static Web Apps for static assets, App Service for the Next.js server, and Azure Functions for background tasks — three deployment targets vs Path 1's one
3. **Next.js framework churn** — Next.js has a rapid release cadence with occasional breaking changes. The App Router API stabilized in v14, but Server Actions patterns are still evolving. Expect 1-2 notable migration efforts per year to stay current. If Vercel pivots the framework direction (as they've done before), you're locked in
4. **SSR cold start latency** — if the App Service instance scales down or restarts, the first request takes 3-8 seconds to cold-start the Node.js process. Subsequent requests are fast (<200ms). **Mitigation**: Configure "Always On" in App Service ($13/month minimum) or use health check pings
5. **Debugging complexity** — bugs can originate in server components, client components, server actions, middleware, or API routes. The boundary between server and client code is a common source of errors (e.g., using browser APIs in a server component, or importing server-only code in a client component). Path 1's simpler "everything runs in browser" model is easier to debug
6. **Session management overhead** — maintaining server-side token caches requires additional infrastructure. If using multiple App Service instances (for scale), the token cache must be shared (Redis or similar). Path 1's browser-based MSAL cache handles this automatically with zero infrastructure
7. **Same SharePoint Lists limitations** — 5K threshold, no ACID transactions, no server-side aggregation. The data layer constraints are identical to Path 1. Better security and caching don't fix the underlying data store limitations
8. **Vendor lock-in to Next.js** — while React components are portable, Next.js-specific features (Server Components data fetching, Server Actions, middleware, image optimization) create framework dependency. Migrating away from Next.js to plain React + Vite would require significant refactoring

---

## Path 6: React SPA + Azure Functions + PWA (Offline-Capable)

### Data Storage: SharePoint Lists + IndexedDB (Dual-Layer)

**How it works**: Path 6 starts with Path 1's architecture (React SPA + Azure Functions + SharePoint Lists via Graph API) and adds an offline data layer using IndexedDB in the browser.

**Online Data Flow** (same as Path 1):
- React SPA → MSAL Browser → Graph API → SharePoint Lists

**Offline Data Layer**:

| Component | Technology | Purpose |
|---|---|---|
| Local database | IndexedDB via **Dexie.js** | Store full CRM dataset locally |
| Caching strategy | **React Query `persistQueryClient`** | Persist query cache to IndexedDB |
| Write queue | Custom offline queue | Store pending mutations while offline |
| Sync engine | **Background Sync API** (Chrome/Edge) | Replay write queue when connection returns |
| iOS fallback | Manual sync on `navigator.onLine` event | Background Sync not supported on iOS Safari |

**Dexie.js Schema** (mirrors SharePoint Lists locally):
```
Companies:  ++id, title, industry, revenue, owner, countryId, *tags, lastSynced
Contacts:   ++id, name, email, phone, companyId, jobTitle, lastSynced
Opportunities: ++id, title, amount, stage, probability, closeDate, companyId, ownerId, lastSynced
Activities: ++id, type, description, date, contactId, opportunityId, lastSynced
PendingWrites: ++id, entity, operation, data, timestamp, status, retryCount
```

**Sync Strategy**:
1. **Initial sync**: On first load, fetch all CRM data via Graph API delta queries → store in IndexedDB
2. **Incremental sync**: Every 5 minutes (configurable), use Graph API delta queries to pull only changed items
3. **Offline writes**: User creates/edits records → stored in `PendingWrites` table with "pending" status
4. **Reconnection sync**: Background Sync API (or manual trigger on iOS) replays PendingWrites queue:
   - Each write sent to Graph API in order
   - Successful writes: remove from queue, update local record with server-generated ID
   - Failed writes: increment retryCount, flag for user review after 3 failures

**Conflict Resolution**:

| Strategy | Description | Recommended For |
|---|---|---|
| **Last-write-wins** | Server timestamp always wins; offline changes may be overwritten | Simple, low-collaboration CRMs |
| **Field-level merge** | Compare individual fields; merge non-conflicting changes | Medium complexity, most CRMs |
| **Conflict UI** | Show both versions to user, let them choose | High-data-integrity requirements |

**Recommendation**: Start with **last-write-wins** for v1 (simplest to implement). Add field-level merge in v2 if users report lost updates. For a 10-50 user sales CRM, conflicts will be rare — each salesperson typically owns their own opportunities and contacts.

**SharePoint Lists Constraints**: Same as Path 1 — 5K threshold, no ACID transactions, 12 lookup limit. The offline layer doesn't change the server-side data store limitations.

**Additional Data Concern**: IndexedDB storage varies by browser — Chrome allows up to 60% of disk space, Safari caps at ~1GB. A CRM with 50K records should use <100MB, well within limits.

---

### Email Integration

**Online Email** (same as Path 1):
- Read email: `GET /me/messages` with delegated `Mail.Read`
- Send email: `POST /me/sendMail` with delegated `Mail.Send`
- Background monitoring: Azure Functions with webhooks (application permissions)

**Offline Email Behavior**:
- **Reading cached emails**: Previously fetched emails stored in IndexedDB are viewable offline. Users can search and browse their CRM email history without connectivity
- **Composing offline**: Users can compose emails that are queued in PendingWrites. When connection returns, the queue is replayed via Graph API
- **New email notifications**: NOT available offline. Graph webhook notifications require the Azure Function to be reachable (it always is — the user's device is offline, not Azure). When the user comes back online, a delta sync pulls new emails
- **Limitation**: Cannot receive new emails while offline. Only pre-cached emails are available

**Background Email Monitoring**: Identical to Path 1 — Azure Functions handle webhooks regardless of whether individual users are online or offline.

---

### Security

**Authentication**: Same as Path 1 — MSAL Browser with Authorization Code + PKCE flow. Tokens stored in browser sessionStorage.

**Offline Security Concerns**:

| Concern | Detail | Mitigation |
|---|---|---|
| **Token expiry** | MSAL access tokens expire in 60-90 minutes. After expiry, offline users cannot refresh tokens (requires network) | Cache data aggressively before token expires. Users can view cached data but cannot make new Graph API calls until reconnected |
| **IndexedDB access** | CRM data in IndexedDB is accessible to any JavaScript on the same origin | Strong CSP headers prevent third-party scripts. No user-generated `<script>` content in CRM |
| **Device theft** | If a device is stolen, CRM data in IndexedDB is accessible | Rely on OS-level device encryption (BitLocker/FileVault). IndexedDB is cleared on browser data wipe. No additional encryption layer recommended (performance cost outweighs benefit for internal CRM) |
| **Stale data** | Cached data may be outdated by hours if user was offline for extended periods | Show "Last synced: X hours ago" indicator. Force full sync on reconnection |

**Service Worker Security**:
- Service Worker only caches app shell (HTML, CSS, JS) and static assets — not Graph API tokens
- API responses cached in IndexedDB (not Service Worker cache) — cleaner separation
- Service Worker updates via `skipWaiting` + `clients.claim` ensure latest security patches are applied

**Permission Model**: Identical to Path 1 (delegated for SPA, application for Azure Functions).

---

### PWA-Specific Architecture

**Service Worker (Workbox via `vite-plugin-pwa`)**:

| Caching Strategy | Applied To | Behavior |
|---|---|---|
| **Precache** | App shell (HTML, CSS, JS, images) | Cached at install time, updated on new deploy |
| **Stale-While-Revalidate** | Fluent UI fonts, user avatars | Serve cached, update in background |
| **Network-First** | Graph API responses | Try network, fall back to IndexedDB cache |
| **Cache-Only** | App shell when offline | Always serves from precache when offline |

**Push Notifications (Web Push API)**:
- Azure Functions generate VAPID-signed push payloads → send via Web Push Protocol
- Users subscribe to notifications via the browser's Push API
- Works on: Chrome (desktop/Android), Edge, Firefox, Safari (iOS 16.4+ for installed PWAs only)
- Notification types: deal stage changes, new CRM emails, overdue activity reminders, daily digest

**Installation**:
- Web App Manifest provides "Install" prompt in Chrome/Edge address bar
- Custom install button in the CRM UI for discoverability
- Home screen icon on mobile, standalone window on desktop

**Background Sync API Compatibility**:

| Platform | Background Sync | Push Notifications |
|---|---|---|
| Chrome (desktop) | Yes | Yes |
| Chrome (Android) | Yes | Yes |
| Edge (desktop) | Yes | Yes |
| Safari (macOS) | No | Yes (installed PWAs) |
| Safari (iOS) | **No** | Yes (installed PWAs, iOS 16.4+) |
| Firefox | No | Yes |

**iOS Fallback**: Since Background Sync is not supported on Safari, implement manual sync:
- Listen for `navigator.onLine` changes
- When online detected → trigger sync manually
- Add "Sync Now" button in UI for explicit user control
- Show pending write count badge so users know unsent changes exist

---

### Pros (Detailed)

1. **Offline CRM access** — sales reps at customer sites, trade shows, or areas with poor connectivity can view their pipeline, look up contact details, review company information, and read cached emails without internet. This is a genuine productivity differentiator for field sales teams
2. **Offline data entry** — users can log meeting notes, update deal stages, create new contacts, and compose follow-up emails while offline. Changes queue locally and sync automatically when connectivity returns
3. **Push notifications without native app** — deal stage changes, new CRM emails, overdue activities delivered directly to the device. No Teams dependency, no Outlook dependency, no app store
4. **Installable on all platforms** — looks like a native app on mobile (home screen icon, splash screen, standalone window) and desktop (taskbar icon, separate window). Zero app store submission or review process
5. **Same hosting cost as Path 1 ($5-30/month)** — PWA capabilities are entirely client-side. No additional server infrastructure needed. Service Workers, IndexedDB, Push API — all free browser APIs
6. **Reduced Graph API pressure** — IndexedDB serves as a local cache. Repeated page views serve from local data, only syncing deltas periodically. This naturally reduces API call volume compared to Path 1
7. **Fast subsequent loads** — after initial visit, the entire app shell loads from Service Worker cache in <500ms. Data loads from IndexedDB immediately while delta sync runs in background
8. **Same Claude Code compatibility as Path 1 (96%)** — Service Worker code, Dexie.js schemas, and Background Sync logic are standard TypeScript

### Cons (Detailed)

1. **Significant additional development effort (+10-15 weeks over Path 1)** — the offline layer is a substantial engineering undertaking:
   - Service Worker setup and caching strategies: ~2 weeks
   - IndexedDB schema design and Dexie.js integration: ~2 weeks
   - Offline write queue with retry logic: ~2-3 weeks
   - Conflict resolution (even last-write-wins): ~1-2 weeks
   - Push notification infrastructure (VAPID, subscription management): ~1-2 weeks
   - iOS-specific workarounds (no Background Sync): ~1 week
   - Testing offline scenarios (flaky connections, partial sync, token expiry): ~2-3 weeks
   This is the largest con — Path 6 is Path 1 + 10-15 weeks of additional, complex work

2. **iOS limitations are real** — no Background Sync API means iOS users must manually trigger sync or wait for the app to detect connectivity. Push notifications only work for installed PWAs on iOS 16.4+. Safari has stricter Service Worker and IndexedDB quotas. iOS represents a degraded experience compared to Android/Chrome
3. **Conflict resolution is non-trivial** — even "simple" last-write-wins creates edge cases:
   - User A edits Opportunity offline (changes stage to "Won"), User B edits same Opportunity online (changes amount). Who wins?
   - With last-write-wins: User A's sync overwrites User B's amount change. User B's work is silently lost
   - Proper field-level merge adds significant complexity to the sync engine
   For a 10-50 user CRM where salespeople own their own deals, conflicts will be infrequent — but when they occur, data loss is the worst possible outcome for a CRM
4. **Service Worker debugging is painful** — caching bugs can serve stale versions of the app, stale data, or fail to update after deployments. Common issues:
   - User sees old UI after a deploy (stale app shell in cache)
   - Data appears frozen (stale API response in cache)
   - App works offline but breaks when coming back online (sync errors)
   Service Worker behavior is non-deterministic across browser versions and hard to reproduce locally
5. **MSAL tokens expire offline** — after 60-90 minutes without network, MSAL cannot refresh the access token. Users can still view cached data in IndexedDB, but cannot make any new API calls. Offline write queue items will only sync after the user re-authenticates online. **Impact**: Extended offline sessions (>2 hours) require the user to log in again when reconnecting
6. **Data staleness risk** — if a user was offline for hours, their local CRM data may be significantly outdated. Another salesperson may have already won (or lost) an opportunity the offline user is still working on. The "Last synced: X hours ago" indicator helps, but doesn't prevent users from making decisions on stale data
7. **Storage quotas vary by platform** — Chrome: ~60% of disk. Safari: ~1GB. Firefox: varies. If a user's device is low on storage, IndexedDB writes may fail silently. The app must handle storage quota errors gracefully
8. **Increased testing burden** — every feature must be tested in 4 states: online, offline, transitioning offline→online, and transitioning online→offline. This roughly doubles the QA effort for each CRM feature compared to Path 1

---

## Side-by-Side Comparison

### Data Storage

| Aspect | Path 1 | Path 2 | Path 6 |
|---|---|---|---|
| **Primary data store** | SharePoint Lists | SharePoint Lists | SharePoint Lists + IndexedDB |
| **Where Graph API calls originate** | Browser | Server | Browser (+ background sync) |
| **Caching layer** | React Query (browser) | Next.js Data Cache (server) + React Query | IndexedDB (persistent local) |
| **Cache sharing across users** | No (per-browser) | **Yes (server-side)** | No (per-device) |
| **Offline data access** | No | No | **Yes** |
| **Graph API call volume** | Highest | **Lowest** (server cache) | Medium (delta sync) |
| **5K threshold impact** | Same | Same | Same |

### Email Integration

| Aspect | Path 1 | Path 2 | Path 6 |
|---|---|---|---|
| **Read email** | Browser → Graph API | Server → Graph API | Browser → Graph API (+ cached offline) |
| **Send email** | Browser → Graph API | Server Action → Graph API | Browser → Graph API (+ offline queue) |
| **Email token exposure** | Browser | **Server only** | Browser |
| **Background monitoring** | Azure Functions | Azure Functions | Azure Functions |
| **Offline email** | No | No | **View cached + compose queue** |

### Security

| Aspect | Path 1 | Path 2 | Path 6 |
|---|---|---|---|
| **Token location** | Browser (sessionStorage) | **Server only** | Browser (sessionStorage) |
| **XSS token theft risk** | Low (with CSP) | **None** | Low (with CSP) |
| **Session mechanism** | MSAL Browser | HTTP-only cookie | MSAL Browser |
| **Offline data exposure** | N/A | N/A | IndexedDB on device |
| **Device theft risk** | Minimal | Minimal | **CRM data on device** |
| **Overall security rating** | Good | **Best** | Good (+ device risk) |

### Development & Operations

| Aspect | Path 1 | Path 2 | Path 6 |
|---|---|---|---|
| **Estimated dev time** | Baseline | +2-3 weeks | **+10-15 weeks** |
| **Deployment targets** | 1 (Static Web Apps) | 3 (SWA + App Service + Functions) | 1 (Static Web Apps) |
| **Debugging complexity** | Low | Medium | **High** (offline states) |
| **Testing complexity** | Low | Low-Medium | **High** (4 connectivity states) |
| **Monthly hosting cost** | $5-30 | **$28-80** | $5-30 |
| **Framework dependency** | React + Vite (minimal) | Next.js (heavy) | React + Vite + Workbox |
| **Claude Code compatibility** | 97% | 97% | 96% |

---

## Decision Framework

Choose **Path 1** if:
- You want the fastest time-to-value
- Your sales team primarily works from offices with reliable internet
- You prefer simplicity over advanced features
- You want to minimize ongoing maintenance burden
- Budget for hosting is a priority

Choose **Path 2** if:
- Security is your top priority (tokens never in browser)
- Fast initial page loads matter (mobile users, slow connections)
- You want server-side caching to reduce Graph API pressure
- You're comfortable with Next.js framework dependency and its release cadence
- Slightly higher hosting cost is acceptable ($28-80 vs $5-30)

Choose **Path 6** if:
- Your sales team frequently works offline (field visits, trade shows, poor connectivity areas)
- Push notifications to devices are important (not just Teams/Outlook)
- The "native app feel" (installable PWA) adds real value for your users
- You have the development budget for +10-15 weeks of offline infrastructure
- You accept the iOS limitations (no Background Sync, push only for installed PWAs)

### Migration Path: 1 → 6

Path 1 and Path 6 share the same architecture. You can **start with Path 1** and add PWA capabilities later:
1. Build the full CRM as a React SPA (Path 1)
2. Add Service Worker + app manifest (PWA installability) — 1-2 weeks
3. Add IndexedDB caching for read-only offline access — 2-3 weeks
4. Add offline write queue + sync engine — 3-5 weeks
5. Add push notifications — 1-2 weeks

This incremental approach lets you deliver a working CRM fast (Path 1) and progressively enhance with offline capabilities (→ Path 6) based on real user feedback about whether offline access is actually needed.

### Migration: Path 1 → Path 2

This is **NOT** an incremental migration. Moving from Vite SPA to Next.js SSR requires rewriting the data fetching layer, authentication flow, and deployment configuration. If server-side security is important, choose Path 2 from the start.
