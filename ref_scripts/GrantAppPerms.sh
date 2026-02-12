#!/usr/bin/env bash
# Grant application permissions to SWA Managed Identity using Azure CLI
# Managed Identity Object ID: 06d318d5-8eb1-4796-98df-b88920377c6b

set -e

MI_OBJECT_ID="06d318d5-8eb1-4796-98df-b88920377c6b"

# Microsoft Graph service principal (well-known appId)
GRAPH_SP_ID=$(az ad sp show --id "00000003-0000-0000-c000-000000000000" --query "id" -o tsv)

if [ -z "$GRAPH_SP_ID" ]; then
    echo "ERROR: Failed to retrieve Microsoft Graph service principal."
    echo "Make sure you are logged in: az login"
    exit 1
fi

echo "Microsoft Graph SP ID: $GRAPH_SP_ID"
echo "Managed Identity ID:   $MI_OBJECT_ID"
echo ""

# App Role IDs (well-known GUIDs for Microsoft Graph)
declare -A ROLES
ROLES["Mail.Read"]="810c84a8-4a9e-49e6-bf7d-12d183f40d01"
ROLES["User.Read.All"]="df021288-bdef-4463-88db-98f22de89214"
ROLES["Sites.ReadWrite.All"]="9492366f-7969-46a4-8d15-ed1a20078fff"

for ROLE_NAME in "Mail.Read" "User.Read.All" "Sites.ReadWrite.All"; do
    ROLE_ID="${ROLES[$ROLE_NAME]}"
    printf "Granting %-20s ... " "$ROLE_NAME"

    BODY="{\"principalId\":\"$MI_OBJECT_ID\",\"resourceId\":\"$GRAPH_SP_ID\",\"appRoleId\":\"$ROLE_ID\"}"

    RESULT=$(az rest --method POST \
        --uri "https://graph.microsoft.com/v1.0/servicePrincipals/$MI_OBJECT_ID/appRoleAssignments" \
        --body "$BODY" \
        --headers "Content-Type=application/json" 2>&1) && {
        echo "OK"
    } || {
        if echo "$RESULT" | grep -q "Permission being assigned already exists"; then
            echo "Already granted (skipped)"
        else
            echo "FAILED"
            echo "$RESULT"
        fi
    }
done

echo ""
echo "Verifying assignments..."
az rest --method GET \
    --uri "https://graph.microsoft.com/v1.0/servicePrincipals/$MI_OBJECT_ID/appRoleAssignments" \
    --query "value[].{Permission:appRoleId, Resource:resourceDisplayName}" \
    -o table
