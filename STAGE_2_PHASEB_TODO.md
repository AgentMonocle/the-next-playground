# Stage 2 Phase B — Entra ID & Azure Permissions Checklist

**Purpose**: Manual steps required in Azure Portal / Entra ID before Phase B features work.
**App Registration**: Tejas Sales System (`84b10c49-3622-42ac-8fec-42a84d148b3b`)
**Tenant**: `b274090c-1d9c-4722-8c7e-554c3aafd2b2`

---

## 1. Add Delegated API Permissions (for SPA email/calendar)

> Portal: Entra ID → App registrations → Tejas Sales System → API permissions

- [ ] Add **Mail.Read** (Delegated) — Read user's email
- [ ] Add **Mail.Send** (Delegated) — Send email on behalf of user
- [ ] Add **Calendars.ReadWrite** (Delegated) — Read/write user calendar
- [ ] Click **Grant admin consent for Tejas Research & Engineering**

**Why**: The SPA needs these scopes to call `/me/messages` and `/me/sendMail` on behalf of the logged-in user. Without admin consent, users will see a consent prompt they can't approve (tenant requires admin consent for Mail scopes).

**After granting**: Users will need to sign out and back in to get a token with the new scopes. The first login will show an updated consent prompt.

---

## 2. Add Application Permissions (for Azure Functions webhook)

> Portal: Entra ID → App registrations → Tejas Sales System → API permissions

- [ ] Add **Mail.Read** (Application) — Read all users' mail (for webhook email auto-link)
- [ ] Add **User.Read.All** (Application) — Resolve user display names
- [ ] Click **Grant admin consent for Tejas Research & Engineering**

**Why**: The email webhook Azure Function runs as a background process (not on behalf of any user). It needs application permissions to read email content when a webhook notification arrives, match senders/recipients against CRM contacts, and create activity records.

**Note**: Application-level `Sites.ReadWrite.All` is already granted (used by provisioning scripts). The webhook function reuses this to create TSS_Activity records.

---

## 3. Enable Managed Identity on SWA (for Azure Functions auth)

> Portal: Static Web Apps → salmon-glacier → Identity → System assigned

- [ ] Set **Status** to **On**
- [ ] Copy the **Object (principal) ID** — you'll need it for step 4

**Why**: Azure Functions in SWA use Managed Identity to authenticate with Graph API using application permissions. This avoids storing client secrets in environment variables.

---

## 4. Grant Managed Identity Graph API Permissions

> This requires PowerShell / Azure CLI — cannot be done in the portal UI

Run the following PowerShell (replace `<MANAGED_IDENTITY_OBJECT_ID>` with the value from step 3):

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

# Sites.ReadWrite.All application role (if not already granted)
$sitesRole = $graphSP.AppRoles | Where-Object { $_.Value -eq "Sites.ReadWrite.All" }
New-MgServicePrincipalAppRoleAssignment -ServicePrincipalId $miSP.Id `
  -PrincipalId $miSP.Id `
  -ResourceId $graphSP.Id `
  -AppRoleId $sitesRole.Id
```

**Alternative (Azure CLI)**:
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
```

---

## 5. Set SWA Application Settings (Environment Variables)

> Portal: Static Web Apps → salmon-glacier → Configuration → Application settings

- [ ] Add `SHAREPOINT_SITE_ID` — The SharePoint site ID (can be retrieved from Graph API)
- [ ] Add `WEBHOOK_CLIENT_STATE` — A random secret string for webhook validation (generate with `openssl rand -hex 32`)

**To get SHAREPOINT_SITE_ID**:
```bash
# Using Graph Explorer or CLI:
GET https://graph.microsoft.com/v1.0/sites/tejasre.sharepoint.com:/sites/sales?$select=id
# Returns something like: "tejasre.sharepoint.com,<guid>,<guid>"
```

---

## 6. Create Webhook Subscription (after deploy)

> This step happens AFTER the Azure Functions are deployed

- [ ] Deploy the `stage-2-activities` branch to SWA
- [ ] Call the subscription creation endpoint:
  ```bash
  # Replace with actual SWA hostname and user IDs to monitor
  curl -X POST "https://salmon-glacier-05e6b7410.4.azurestaticapps.net/api/subscriptions" \
    -H "Content-Type: application/json" \
    -d '{"userIds": ["sebastian@tejasre.onmicrosoft.com"]}'
  ```
- [ ] Verify subscription was created (check function logs)

---

## Completion Checklist

| Step | What | Status |
|------|------|--------|
| 1 | Delegated permissions (Mail.Read, Mail.Send, Calendars.ReadWrite) | [ ] |
| 2 | Application permissions (Mail.Read, User.Read.All) | [ ] |
| 3 | Enable Managed Identity on SWA | [ ] |
| 4 | Grant MI Graph API permissions via PowerShell | [ ] |
| 5 | Set SWA environment variables | [ ] |
| 6 | Create webhook subscription post-deploy | [ ] |

**After completing steps 1-5**: Sign out of TSS and sign back in. You should see an updated consent prompt listing Mail and Calendar permissions. The email panel on Contact detail pages will start working.

**After step 6**: Emails sent to/from CRM contacts will automatically create Activity records in TSS.
