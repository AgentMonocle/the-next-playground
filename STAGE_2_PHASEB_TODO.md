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

## Step 1. SPA Delegated Permissions ✅

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
./ref_scripts/ProvisionByof.sh
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

Update `ref_scripts/GrantAppPerms.sh` with the new MI Object ID from step 2, then run it:

```bash
./ref_scripts/GrantAppPerms.sh
```

Permissions granted:

| Permission | Type | Purpose |
|------------|------|---------|
| `Mail.Read` | Application | Read email content from webhook notifications |
| `User.Read.All` | Application | Resolve user display names for activity records |
| `Sites.ReadWrite.All` | Application | Create TSS_Activity records in SharePoint |

Verify:

```bash
MI_OBJECT_ID="<from step 2>"
az rest --method GET \
  --uri "https://graph.microsoft.com/v1.0/servicePrincipals/$MI_OBJECT_ID/appRoleAssignments" \
  --query "value[].{Permission:appRoleId, Resource:resourceDisplayName}" \
  -o table
```

---

## Step 4. Restrict Mail Access (Application Access Policy)

By default, `Mail.Read` (Application) can read **all** mailboxes in the tenant. Restrict it to only the monitored sales users:

### 4a. Create a mail-enabled security group

> Portal: Entra ID → Groups → New group

- **Group type**: Mail-enabled security (or Security if mail-enabled not available)
- **Name**: `TSS Monitored Users`
- **Email**: `tss-monitored-users@tejasre.com`
- **Members**: Add the 4 sales users who should have email monitoring

### 4b. Create the Application Access Policy

```powershell
# Connect to Exchange Online
Connect-ExchangeOnline

# Get the MI's application ID (NOT object ID)
# You can find it in: Entra ID → Enterprise applications → tss-daemon-func → Application ID

New-ApplicationAccessPolicy `
  -AppId "<MI_APPLICATION_ID>" `
  -PolicyScopeGroupId "tss-monitored-users@tejasre.com" `
  -AccessRight RestrictAccess `
  -Description "Limit TSS daemon to monitored sales users only"

# Verify the policy
Get-ApplicationAccessPolicy -Identity "<MI_APPLICATION_ID>"

# Test access (should return "Granted")
Test-ApplicationAccessPolicy `
  -Identity "<MI_APPLICATION_ID>" `
  -AppId "<MI_APPLICATION_ID>" `
  -Mailbox "sebastian@tejasre.com"
```

> **Note**: This step requires the Exchange Online PowerShell module (`Install-Module ExchangeOnlineManagement`). The policy can take up to 30 minutes to propagate.

---

## Step 5. Deploy Daemon Functions

The daemon functions are deployed from the `TSS/api-daemon/` folder:

```bash
cd TSS/api-daemon
npm install && npm run build
func azure functionapp publish tss-daemon-func
```

Or if using GitHub Actions (CI/CD pipeline will be set up):

```bash
git push  # triggers deploy via GitHub Actions
```

Verify deployment:

```bash
curl -s "https://tss-daemon-func.azurewebsites.net/api/health"
```

---

## Step 6. Create Webhook Subscriptions

Create a subscription for each monitored user:

```bash
FUNC_URL="https://tss-daemon-func.azurewebsites.net"

# Get user IDs
az rest --method GET \
  --uri "https://graph.microsoft.com/v1.0/users/sebastian@tejasre.com?\$select=id,displayName" \
  --query "{id:id, name:displayName}" -o table

# Create subscription (repeat for each user)
curl -X POST "$FUNC_URL/api/subscriptions" \
  -H "Content-Type: application/json" \
  -d '{"userId": "<USER_GUID>"}'

# List active subscriptions
curl -s "$FUNC_URL/api/subscriptions"
```

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

### What works after each step:

- **After step 1**: Email panel (read + send) and Calendar view work in SPA
- **After steps 2–4**: Daemon functions can securely access only monitored users' mail
- **After step 5**: Functions deployed and reachable
- **After step 6**: Emails to/from CRM contacts automatically create Activity records
- **After step 7**: Clean architecture, no leftover temporary config
