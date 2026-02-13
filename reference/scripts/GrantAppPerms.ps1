# Grant application permissions to SWA Managed Identity using Azure CLI
# Managed Identity Object ID: 434dce4a-899c-404d-8772-b3614970a795

$MI_OBJECT_ID = "434dce4a-899c-404d-8772-b3614970a795"

# Microsoft Graph service principal (well-known appId)
$GRAPH_SP_ID = az ad sp show --id "00000003-0000-0000-c000-000000000000" --query "id" -o tsv

if (-not $GRAPH_SP_ID) {
    Write-Error "Failed to retrieve Microsoft Graph service principal. Make sure you are logged in: az login"
    exit 1
}

Write-Host "Microsoft Graph SP ID: $GRAPH_SP_ID"
Write-Host "Managed Identity ID:   $MI_OBJECT_ID"
Write-Host ""

# App Role IDs (well-known GUIDs for Microsoft Graph)
$roles = @(
    @{ Name = "Mail.Read";           Id = "810c84a8-4a9e-49e6-bf7d-12d183f40d01" },
    @{ Name = "User.Read.All";       Id = "df021288-bdef-4463-88db-98f22de89214" },
    @{ Name = "Sites.ReadWrite.All"; Id = "9492366f-7969-46a4-8d15-ed1a20078fff" }
)

foreach ($role in $roles) {
    Write-Host "Granting $($role.Name)..." -NoNewline

    $body = @{
        principalId = $MI_OBJECT_ID
        resourceId  = $GRAPH_SP_ID
        appRoleId   = $role.Id
    } | ConvertTo-Json -Compress

    $result = az rest --method POST `
        --uri "https://graph.microsoft.com/v1.0/servicePrincipals/$MI_OBJECT_ID/appRoleAssignments" `
        --body $body `
        --headers "Content-Type=application/json" 2>&1

    if ($LASTEXITCODE -eq 0) {
        Write-Host " OK" -ForegroundColor Green
    } else {
        # Check if it's a "permission already granted" conflict
        if ($result -match "Permission being assigned already exists") {
            Write-Host " Already granted (skipped)" -ForegroundColor Yellow
        } else {
            Write-Host " FAILED" -ForegroundColor Red
            Write-Host $result
        }
    }
}

Write-Host ""
Write-Host "Verifying assignments..." -ForegroundColor Cyan
az rest --method GET `
    --uri "https://graph.microsoft.com/v1.0/servicePrincipals/$MI_OBJECT_ID/appRoleAssignments" `
    --query "value[].{Permission:appRoleId, Resource:resourceDisplayName}" `
    -o table
