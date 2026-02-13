# Application Access Policy Setup

> **Bead**: `the-next-playground-8ug`
> **Priority**: P1
> **Purpose**: Restrict `Mail.Read` application permission to specific users only

---

## Background

By default, the `Mail.Read` application permission granted to the daemon's Managed Identity
allows it to read **every mailbox** in the Microsoft 365 tenant. An Application Access Policy
restricts this to only the users in a designated mail-enabled security group.

### Current Architecture

| Identity | Type | Permissions | Scope |
|----------|------|-------------|-------|
| SPA App Registration | Delegated | Mail.Read, Mail.Send, Calendars.ReadWrite, Sites.Manage.All | Signed-in user only |
| SWA Managed API | App (MI) | None (Graph calls via SPA token) | N/A |
| Daemon Functions MI | App (MI) | Mail.Read, User.Read.All, Sites.ReadWrite.All | **All mailboxes** (needs restriction) |

**After this task**: Daemon MI can only read mailboxes of users in `TSS Monitored Users` group.

### Key Identifiers

| Resource | Value |
|----------|-------|
| Daemon Functions App | `tss-daemon-func` |
| MI Object ID | `06d318d5-8eb1-4796-98df-b88920377c6b` |
| MI Application ID | *(get from Step 1)* |
| Tenant | `b274090c-1d9c-4722-8c7e-554c3aafd2b2` |

---

## Prerequisites

- [ ] **Exchange Online Management module installed**
  ```powershell
  Install-Module ExchangeOnlineManagement -Scope CurrentUser
  ```
- [ ] **Admin role**: Global Administrator or Exchange Administrator
- [ ] **Daemon deployed** with Managed Identity enabled
- [ ] **Application permissions granted** (Mail.Read, User.Read.All, Sites.ReadWrite.All)

---

## Step 1: Get the Managed Identity Application ID

The Application Access Policy requires the **Application ID** (appId), not the Object ID.

### Option A: Azure CLI

```bash
MI_OBJECT_ID="06d318d5-8eb1-4796-98df-b88920377c6b"
az ad sp show --id "$MI_OBJECT_ID" --query "appId" -o tsv
```

### Option B: Azure Portal

1. **Entra ID** > **Enterprise applications**
2. Search for `tss-daemon-func`
3. Copy the **Application ID**

- [ ] **Record the Application ID**: `___________________________________`

---

## Step 2: Create a Mail-Enabled Security Group

The policy scopes mail access to members of this group.

### Option A: Entra Portal

1. **Entra ID** > **Groups** > **New group**
2. Fill in:
   - **Group type**: Mail-enabled security
   - **Group name**: `TSS Monitored Users`
   - **Group email**: `tss-monitored-users@tejasre.com`
   - **Description**: "Sales users whose emails are auto-linked to CRM activities"
3. Click **Create**
4. **Add members**:
   - Sebastian Nienhuis
   - Moniek Nienhuis
   - Sebastiaan de Kruijf
   - Christien van den Berg

### Option B: Exchange Online PowerShell

```powershell
Connect-ExchangeOnline

# Create group
New-DistributionGroup `
  -Name "TSS Monitored Users" `
  -Type Security `
  -PrimarySmtpAddress "tss-monitored-users@tejasre.com" `
  -ManagedBy "admin@tejasre.com" `
  -MemberJoinRestriction Closed `
  -MemberDepartRestriction Closed

# Add members
Add-DistributionGroupMember -Identity "tss-monitored-users@tejasre.com" -Member "sebastian@tejasre.com"
Add-DistributionGroupMember -Identity "tss-monitored-users@tejasre.com" -Member "moniek@tejasre.com"
Add-DistributionGroupMember -Identity "tss-monitored-users@tejasre.com" -Member "sebastiaan@tejasre.com"
Add-DistributionGroupMember -Identity "tss-monitored-users@tejasre.com" -Member "christien@tejasre.com"
```

### Verification

```powershell
Get-DistributionGroupMember -Identity "tss-monitored-users@tejasre.com" | Select-Object Name, PrimarySmtpAddress
```

- [ ] **Group created**: `tss-monitored-users@tejasre.com`
- [ ] **4 members added and verified**

---

## Step 3: Create the Application Access Policy

```powershell
Connect-ExchangeOnline

$MI_APP_ID = "<Application ID from Step 1>"

New-ApplicationAccessPolicy `
  -AppId $MI_APP_ID `
  -PolicyScopeGroupId "tss-monitored-users@tejasre.com" `
  -AccessRight RestrictAccess `
  -Description "Limit TSS daemon to monitored sales users only"
```

**Expected output**:
```
Identity            AppId               PolicyScopeGroupId                  AccessRight
--------            -----               ------------------                  -----------
AppPolicy-<hash>    <MI_APP_ID>         tss-monitored-users@tejasre.com     RestrictAccess
```

- [ ] **Policy created successfully**

---

## Step 4: Verify the Policy

### List policies

```powershell
Get-ApplicationAccessPolicy | Format-List
```

### Test access — monitored user (should be Granted)

```powershell
Test-ApplicationAccessPolicy `
  -Identity "sebastian@tejasre.com" `
  -AppId $MI_APP_ID
```

Expected: `AccessCheckResult : Granted`

### Test access — non-monitored user (should be Denied)

```powershell
Test-ApplicationAccessPolicy `
  -Identity "admin@tejasre.com" `
  -AppId $MI_APP_ID
```

Expected: `AccessCheckResult : Denied`

- [ ] **Monitored user access: Granted**
- [ ] **Non-monitored user access: Denied**

---

## Step 5: Wait for Propagation

Application Access Policies can take **up to 30 minutes** to propagate across Exchange Online.

- [ ] **Wait 30 minutes after policy creation**

---

## Step 6: End-to-End Verification

### Test 1: Monitored user email monitoring works

1. Navigate to TSS Settings page as a monitored user
2. Toggle email monitoring ON
3. Send a test email to/from a CRM contact
4. Wait ~30 seconds for webhook processing
5. Check Activities list for auto-created email activity

- [ ] **Email activity created for monitored user**

### Test 2: Non-monitored user cannot be subscribed

1. Attempt to create subscription for a non-monitored user via curl:
   ```bash
   curl -X POST https://tss-daemon-func.azurewebsites.net/api/subscriptions \
     -H "Content-Type: application/json" \
     -d '{"userId": "<non-monitored-user-guid>"}'
   ```
2. Subscription may create, but webhook will fail to read their email

- [ ] **Non-monitored user email access denied (403 from Graph)**

### Test 3: Settings page reflects correct state

1. Log in as each of the 4 monitored users
2. Navigate to Settings
3. Each should be able to enable/disable monitoring successfully

- [ ] **All 4 monitored users can toggle monitoring**

---

## Troubleshooting

### Policy not taking effect

| Symptom | Cause | Fix |
|---------|-------|-----|
| Daemon still reads all mailboxes | Propagation delay | Wait 30 minutes |
| Daemon still reads all mailboxes | Wrong AppId used | Verify with `az ad sp show --id <MI_OBJECT_ID> --query appId` |
| Monitored user access denied | User not in group | `Add-DistributionGroupMember` |
| Group not found in policy command | Group not mail-enabled | Recreate as mail-enabled security group |

### Useful debug commands

```powershell
# View all policies
Get-ApplicationAccessPolicy

# View group members
Get-DistributionGroupMember -Identity "tss-monitored-users@tejasre.com"

# Test specific user
Test-ApplicationAccessPolicy -Identity "user@tejasre.com" -AppId $MI_APP_ID

# Remove policy (if needed)
Remove-ApplicationAccessPolicy -Identity "AppPolicy-<hash>" -Confirm:$false
```

### Verify MI permissions (Azure CLI)

```bash
MI_OBJECT_ID="06d318d5-8eb1-4796-98df-b88920377c6b"

az rest --method GET \
  --uri "https://graph.microsoft.com/v1.0/servicePrincipals/$MI_OBJECT_ID/appRoleAssignments" \
  --query "value[].{Role:appRoleId}" -o table
```

---

## Policy Reference

| Parameter | Value | Notes |
|-----------|-------|-------|
| `AppId` | MI Application ID | NOT the Object ID |
| `PolicyScopeGroupId` | Group email address | Must be mail-enabled |
| `AccessRight` | `RestrictAccess` | Allow-list (only group members) |
| | `DenyAccess` | Block-list (everyone except group) |

---

## Security Best Practices

- [ ] Only add users who actively use email monitoring to the group
- [ ] Review group membership quarterly
- [ ] Document the AppId and group in your runbook
- [ ] Set up audit alerts for policy changes in Exchange admin center
- [ ] When onboarding new sales users: add to group AND have them enable monitoring in Settings
- [ ] When offboarding: remove from group (monitoring auto-stops when subscription expires)
