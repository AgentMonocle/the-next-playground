#!/usr/bin/env bash
# Provision a standalone Azure Functions app (BYOF) for TSS daemon functions
# This app hosts the email webhook, subscription management, and renewal timer.

set -e

# --- Configuration -----------------------------------------------------------
RESOURCE_GROUP="rg-tss"
LOCATION="centralus"
STORAGE_ACCOUNT="sttssdfunc"
FUNC_APP_NAME="tss-daemon-func"
NODE_VERSION="20"

SHAREPOINT_SITE_ID="tejasre.sharepoint.com,cd507ef5-d144-41e5-b04a-fe48c257bc86,751e927e-d428-4b9d-902e-ba668896561e"
WEBHOOK_CLIENT_STATE="ea2693a4befa48b1a29056a11714fa1b95c153c729d1db7437797a3e762aa145"

# --- Pre-flight check --------------------------------------------------------
echo "Checking Azure CLI login..."
az account show --query "{Subscription:name, Tenant:tenantId}" -o table || {
    echo "ERROR: Not logged in. Run: az login"
    exit 1
}
echo ""

# --- Create Storage Account --------------------------------------------------
echo "Creating storage account: $STORAGE_ACCOUNT..."
az storage account create \
    --name "$STORAGE_ACCOUNT" \
    --resource-group "$RESOURCE_GROUP" \
    --location "$LOCATION" \
    --sku Standard_LRS \
    --kind StorageV2 \
    --min-tls-version TLS1_2 \
    -o none

echo "  Storage account created."

# --- Create Functions App (Consumption plan) ---------------------------------
echo "Creating Functions app: $FUNC_APP_NAME..."
az functionapp create \
    --name "$FUNC_APP_NAME" \
    --resource-group "$RESOURCE_GROUP" \
    --storage-account "$STORAGE_ACCOUNT" \
    --consumption-plan-location "$LOCATION" \
    --runtime node \
    --runtime-version "$NODE_VERSION" \
    --functions-version 4 \
    --os-type Linux \
    -o none

echo "  Functions app created."

# --- Enable System-Assigned Managed Identity ---------------------------------
echo "Enabling Managed Identity..."
MI_RESULT=$(az functionapp identity assign \
    --name "$FUNC_APP_NAME" \
    --resource-group "$RESOURCE_GROUP" \
    --query "{objectId:principalId, tenantId:tenantId}" \
    -o json)

MI_OBJECT_ID=$(echo "$MI_RESULT" | python3 -c "import sys,json; print(json.load(sys.stdin)['objectId'])" 2>/dev/null || \
               echo "$MI_RESULT" | grep -oP '"objectId":\s*"\K[^"]+')

echo "  Managed Identity Object ID: $MI_OBJECT_ID"

# --- Set Application Settings ------------------------------------------------
echo "Setting application settings..."
WEBHOOK_NOTIFICATION_URL="https://${FUNC_APP_NAME}.azurewebsites.net/api/email-webhook"

az functionapp config appsettings set \
    --name "$FUNC_APP_NAME" \
    --resource-group "$RESOURCE_GROUP" \
    --settings \
        "SHAREPOINT_SITE_ID=$SHAREPOINT_SITE_ID" \
        "WEBHOOK_CLIENT_STATE=$WEBHOOK_CLIENT_STATE" \
        "WEBHOOK_NOTIFICATION_URL=$WEBHOOK_NOTIFICATION_URL" \
    -o none

echo "  Application settings configured."

# --- Summary -----------------------------------------------------------------
echo ""
echo "=============================================="
echo "  BYOF Functions App Provisioned Successfully"
echo "=============================================="
echo ""
echo "  Functions App:    $FUNC_APP_NAME"
echo "  URL:              https://${FUNC_APP_NAME}.azurewebsites.net"
echo "  MI Object ID:     $MI_OBJECT_ID"
echo "  Resource Group:   $RESOURCE_GROUP"
echo ""
echo "  Next steps:"
echo "  1. Update ref_scripts/GrantAppPerms.sh with MI_OBJECT_ID above"
echo "  2. Run: ./ref_scripts/GrantAppPerms.sh"
echo "  3. Deploy functions: cd TSS/api-daemon && func azure functionapp publish $FUNC_APP_NAME"
echo ""
