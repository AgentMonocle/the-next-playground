> **⚠️ ARCHIVED DOCUMENT — HISTORICAL REFERENCE ONLY**
>
> This file was archived on 2026-02-13. It is retained for historical reference
> and **must not** be used as a guiding design or planning document. The
> information, checklist statuses, and infrastructure details herein may be
> outdated or superseded by later work. For current project state, consult
> the beads system (`bd list`, `bd ready`).

---

# Stage 2 Phase B — Entra ID & Azure Permissions Checklist

**Purpose**: Manual steps required in Azure Portal / CLI before Phase B features work.
**Tenant**: `b274090c-1d9c-4722-8c7e-554c3aafd2b2`
**Resource Group**: `rg-tss`

---

## Architecture: Three Separate Identities

| Component | Identity | Auth Flow | Permission Type | Hosts |
|-----------|----------|-----------|-----------------|-------|
| SPA (React app) | App Registration "TSS" (`84b10c49-...`) | Authorization Code (interactive) | **Delegated only** | SWA (salmon-glacier) |
| SPA API (generateId, health) | SWA managed API | N/A (no Graph calls needing app perms) | None | SWA managed Functions |
| Daemon Functions (webhook, subscriptions, renewal) | BYOF Functions app MI | DefaultAzureCredential (MI) | **Application only** | Standalone Functions app |

**Why BYOF?** SWA's managed API does not support Managed Identity for Graph API calls. A standalone Azure Functions app gets a real system-assigned Managed Identity that works with `DefaultAzureCredential`. This keeps secrets out of environment variables entirely.

**Why separate identities?** The SPA only needs delegated permissions (act as the user). The daemon needs application permissions (read any monitored user's mail). Mixing these on one identity violates least privilege and increases blast radius if compromised.

---

## Step 1. SPA Delegated Permissions

> Already complete.

- [x] **User.Read** (Delegated)
- [x] **Sites.ReadWrite.All** (Delegated)
- [x] **Mail.Read** (Delegated)
- [x] **Mail.Send** (Delegated)
- [x] **Calendars.ReadWrite** (Delegated)
- [x] Admin consent granted

---

## Step 2. Create Standalone Azure Functions App

Run the provisioning script:

```bash
./reference/scripts/ProvisionByof.sh
```

This script will:
- [x] Create a Storage Account (`sttsstssdfunc`) for the Functions app
- [x] Create a Functions App (`tss-daemon-func`) on the Consumption plan (Node.js 20)
- [x] Enable system-assigned Managed Identity
- [x] Set environment variables (SHAREPOINT_SITE_ID, WEBHOOK_CLIENT_STATE, WEBHOOK_NOTIFICATION_URL)
- [x] Output the MI Object ID for step 3

**After running**: Note the Managed Identity Object ID printed at the end.

---

## Step 3. Grant MI Application Permissions

Update `reference/scripts/GrantAppPerms.sh` with the new MI Object ID from step 2, then run it:

```bash
./reference/scripts/GrantAppPerms.sh
```

Permissions granted:

| Permission | Type | Purpose |
|------------|------|---------|
| `Mail.Read` | Application | Read email content from webhook notifications |
| `User.Read.All` | Application | Resolve user display names for activity records |
| `Sites.ReadWrite.All` | Application | Create TSS_Activity records in SharePoint |

---

## Step 4. Restrict Mail Access (Application Access Policy)

By default, `Mail.Read` (Application) can read **all** mailboxes in the tenant. Restrict it to only the monitored sales users.

---

## Step 5. Deploy Daemon Functions

The daemon functions are deployed from the `api-daemon/` folder:

```bash
cd api-daemon
npm install && npm run build
func azure functionapp publish tss-daemon-func
```

---

## Step 6. Create Webhook Subscriptions

Create a subscription for each monitored user.

---

## Step 7. Clean Up SWA Config

After the BYOF functions are deployed and working:

- [ ] Remove the temporary anonymous `/api/subscriptions` route from `staticwebapp.config.json`
- [ ] Remove daemon functions from `TSS/api/src/functions/` (createSubscription, emailWebhook, renewSubscriptions)
- [ ] Remove unused SWA environment variables (WEBHOOK_CLIENT_STATE, WEBHOOK_NOTIFICATION_URL)
- [ ] Keep SHAREPOINT_SITE_ID on SWA (used by generateId)

---

## Completion Checklist

| Step | What | Status |
|------|------|--------|
| 1 | SPA delegated permissions | [x] |
| 2 | Create BYOF Functions app with MI | [ ] |
| 3 | Grant MI application permissions | [ ] |
| 4 | Restrict mail access (Application Access Policy) | [ ] |
| 5 | Deploy daemon functions | [ ] |
| 6 | Create webhook subscriptions for users | [ ] |
| 7 | Clean up SWA config | [ ] |
