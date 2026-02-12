# Stage 2 Phase B — Entra ID & Azure Permissions Checklist

**Purpose**: Manual steps required in Azure Portal / Entra ID before Phase B features work.
**Tenant**: `b274090c-1d9c-4722-8c7e-554c3aafd2b2`

### Architecture: Two Separate Identities

| Component | Identity | Auth Flow | Permission Type |
|-----------|----------|-----------|-----------------|
| SPA (React app) | App Registration "Tejas Sales System (TSS)" (`84b10c49-...`) | Authorization Code (interactive, per-user) | **Delegated only** |
| Azure Functions (webhooks, timers) | SWA Managed Identity (system-assigned) | Client Credentials (no user present) | **Application only** |

**Why separate?** Delegated permissions (act on behalf of a signed-in user) and application permissions (act as the service itself, across all users) serve fundamentally different purposes and have different security profiles. Keeping them on separate identities follows the principle of least privilege — the SPA never carries application-level permissions that could read any user's mailbox, and the background functions never carry delegated permissions they can't use.

---

## 1. Add Delegated API Permissions to SPA App Registration

> Portal: Entra ID → App registrations → **Tejas Sales System (TSS)** → API permissions

This app registration is used by the React SPA only. It should have **delegated permissions only** — no application permissions.

- [x] **User.Read** (Delegated) — Already granted
- [x] **Sites.ReadWrite.All** (Delegated) — Already granted
- [x] **Mail.Read** (Delegated) — Read signed-in user's email
- [x] **Mail.Send** (Delegated) — Send email on behalf of signed-in user
- [x] **Calendars.ReadWrite** (Delegated) — Read/write signed-in user's calendar
- [x] Click **Grant admin consent for Tejas Research & Engineering**

**Why**: The SPA calls `/me/messages`, `/me/sendMail`, and `/me/calendarView` on behalf of the logged-in user. Without admin consent, users see a consent prompt they can't approve (tenant requires admin consent for Mail scopes).

**After granting**: Users need to sign out and back in to get a token with the new scopes.

> **Important**: Do NOT add application permissions (Mail.Read Application, User.Read.All, etc.) to this registration. Those belong to the Managed Identity (see steps 3–4).

---

## 2. Enable Managed Identity on SWA

> Portal: Static Web Apps → salmon-glacier → Identity → System assigned

- [ ] Set **Status** to **On**
- [ ] Copy the **Object (principal) ID** — you'll need it for step 3

**Why**: The Azure Functions (email webhook handler, subscription management, renewal timer) run as background processes with no signed-in user. They authenticate with Graph API via the SWA's Managed Identity using application permissions. This avoids storing client secrets in environment variables.

---

## 3. Grant Application Permissions to the Managed Identity

> This requires PowerShell / Azure CLI — cannot be done in the portal UI.
> These permissions are granted directly to the Managed Identity's service principal, NOT to the SPA app registration.

The Managed Identity needs these **application** permissions:

| Permission | Type | Purpose |
|------------|------|---------|
| `Mail.Read` | Application | Read email content when webhook notification arrives |
| `User.Read.All` | Application | Resolve user display names for activity records |
| `Sites.ReadWrite.All` | Application | Create TSS_Activity records in SharePoint |

### Option A: PowerShell

Replace `<MANAGED_IDENTITY_OBJECT_ID>` with the value from step 2:

```powershell
# Connect to Microsoft Graph
Connect-MgGraph -Scopes "AppRoleAssignment.ReadWrite.All"

# Get the Microsoft Graph service principal
$graphSP = Get-MgServicePrincipal -Filter "appId eq '00000003-0000-0000-c000-000000000000'"

# Get the managed identity service principal
$miSP = Get-MgServicePrincipal -Filter "id eq '<MANAGED_IDENTITY_OBJECT_ID>'"

# Mail.Read application role
$mailReadRole = $graphSP.AppRoles | Where-Object { $_.Value -eq "Mail.Read" }
New-MgServicePrincipalAppRoleAssignment -ServicePrincipalId $miSP.Id `
  -PrincipalId $miSP.Id `
  -ResourceId $graphSP.Id `
  -AppRoleId $mailReadRole.Id

# User.Read.All application role
$userReadRole = $graphSP.AppRoles | Where-Object { $_.Value -eq "User.Read.All" }
New-MgServicePrincipalAppRoleAssignment -ServicePrincipalId $miSP.Id `
  -PrincipalId $miSP.Id `
  -ResourceId $graphSP.Id `
  -AppRoleId $userReadRole.Id

# Sites.ReadWrite.All application role
$sitesRole = $graphSP.AppRoles | Where-Object { $_.Value -eq "Sites.ReadWrite.All" }
New-MgServicePrincipalAppRoleAssignment -ServicePrincipalId $miSP.Id `
  -PrincipalId $miSP.Id `
  -ResourceId $graphSP.Id `
  -AppRoleId $sitesRole.Id
```

### Option B: Azure CLI

```bash
MI_OBJECT_ID="<MANAGED_IDENTITY_OBJECT_ID>"
GRAPH_SP_ID=$(az ad sp show --id 00000003-0000-0000-c000-000000000000 --query id -o tsv)

# Mail.Read = 810c84a8-4a9e-49e6-bf7d-12d183f40d01
az rest --method POST \
  --uri "https://graph.microsoft.com/v1.0/servicePrincipals/$MI_OBJECT_ID/appRoleAssignments" \
  --body "{\"principalId\":\"$MI_OBJECT_ID\",\"resourceId\":\"$GRAPH_SP_ID\",\"appRoleId\":\"810c84a8-4a9e-49e6-bf7d-12d183f40d01\"}"

# User.Read.All = df021288-bdef-4463-88db-98f22de89214
az rest --method POST \
  --uri "https://graph.microsoft.com/v1.0/servicePrincipals/$MI_OBJECT_ID/appRoleAssignments" \
  --body "{\"principalId\":\"$MI_OBJECT_ID\",\"resourceId\":\"$GRAPH_SP_ID\",\"appRoleId\":\"df021288-bdef-4463-88db-98f22de89214\"}"

# Sites.ReadWrite.All = 9492366f-7969-46a4-8d15-ed1a20078fff
az rest --method POST \
  --uri "https://graph.microsoft.com/v1.0/servicePrincipals/$MI_OBJECT_ID/appRoleAssignments" \
  --body "{\"principalId\":\"$MI_OBJECT_ID\",\"resourceId\":\"$GRAPH_SP_ID\",\"appRoleId\":\"9492366f-7969-46a4-8d15-ed1a20078fff\"}"
```

### Verify Permissions Were Granted

```powershell
# List app role assignments for the managed identity
Get-MgServicePrincipalAppRoleAssignment -ServicePrincipalId $miSP.Id | Format-Table AppRoleId, ResourceDisplayName
```

Or in the portal: Entra ID → Enterprise applications → (search for MI name) → Permissions

---

## 4. Set SWA Application Settings (Environment Variables)

> Portal: Static Web Apps → salmon-glacier → Configuration → Application settings

- [ ] Add `SHAREPOINT_SITE_ID` — The SharePoint site ID
- [ ] Add `WEBHOOK_CLIENT_STATE` — A random secret string for webhook validation (generate with `openssl rand -hex 32`)
- [ ] Add `WEBHOOK_NOTIFICATION_URL` — `https://salmon-glacier-05e6b7410.4.azurestaticapps.net/api/email-webhook`

**To get SHAREPOINT_SITE_ID**:

```bash
# Using Graph Explorer or CLI:
GET https://graph.microsoft.com/v1.0/sites/tejasre.sharepoint.com:/sites/sales?$select=id
# Returns something like: "tejasre.sharepoint.com,<guid>,<guid>"
# Use the full value (including commas) as SHAREPOINT_SITE_ID
```

---

## 5. Create Webhook Subscription (after deploy)

> This step happens AFTER the Azure Functions are deployed and steps 2–4 are complete.

- [ ] Deploy the `stage-2-activities` branch to SWA (merge to master)
- [ ] Get the user ID (GUID) for each user to monitor:
  ```bash
  # Graph Explorer or CLI:
  GET https://graph.microsoft.com/v1.0/users/sebastian@tejasre.onmicrosoft.com?$select=id
  ```
- [ ] Call the subscription creation endpoint for each user:
  ```bash
  curl -X POST "https://salmon-glacier-05e6b7410.4.azurestaticapps.net/api/subscriptions" \
    -H "Content-Type: application/json" \
    -d '{"userId": "<USER_GUID>"}'
  ```
- [ ] Verify subscription was created:
  ```bash
  curl "https://salmon-glacier-05e6b7410.4.azurestaticapps.net/api/subscriptions"
  ```

---

## Completion Checklist

| Step | What | Identity | Status |
|------|------|----------|--------|
| 1 | Delegated permissions (Mail, Calendar) on SPA app reg | App Registration (TSS) | [x] |
| 2 | Enable Managed Identity on SWA | Managed Identity | [ ] |
| 3 | Grant MI application permissions (Mail.Read, User.Read.All, Sites.ReadWrite.All) | Managed Identity | [ ] |
| 4 | Set SWA environment variables | SWA Config | [ ] |
| 5 | Deploy & create webhook subscription | Post-deploy | [ ] |

### What works after each step:

- **After step 1**: Sign out and back in → Email panel on Contact pages works (read + send), Calendar view on Dashboard works
- **After steps 2–4**: Azure Functions can authenticate with Graph API using application permissions
- **After step 5**: Emails to/from CRM contacts automatically create Activity records in TSS
