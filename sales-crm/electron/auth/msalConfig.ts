import { Configuration, LogLevel } from '@azure/msal-node';

// ============================================================================
// IMPORTANT: You need to create an Azure AD App Registration and update these
// ============================================================================
// 1. Go to Azure Portal > Azure Active Directory > App Registrations
// 2. Click "New Registration"
// 3. Name: "Sales CRM Desktop"
// 4. Supported account types: "Accounts in this organizational directory only"
// 5. Redirect URI: Select "Public client/native" and enter: http://localhost
// 6. After creation, go to "API Permissions" and add:
//    - Microsoft Graph > Delegated > User.Read
//    - Microsoft Graph > Delegated > Sites.ReadWrite.All
//    - Microsoft Graph > Delegated > Mail.Read
//    - Microsoft Graph > Delegated > Mail.Send
//    - Microsoft Graph > Delegated > Calendars.ReadWrite
//    - Microsoft Graph > Delegated > Files.ReadWrite
// 7. Click "Grant admin consent" for your organization
// 8. Copy the "Application (client) ID" and "Directory (tenant) ID" below

export const AZURE_CONFIG = {
  clientId: 'b390a2d0-4b65-4944-9b30-90ad7d171a20',
  tenantId: 'b274090c-1d9c-4722-8c7e-554c3aafd2b2',
};

export const msalConfig: Configuration = {
  auth: {
    clientId: AZURE_CONFIG.clientId,
    authority: `https://login.microsoftonline.com/${AZURE_CONFIG.tenantId}`,
  },
  system: {
    loggerOptions: {
      loggerCallback: (level, message, containsPii) => {
        if (containsPii) return;
        switch (level) {
          case LogLevel.Error:
            console.error(message);
            break;
          case LogLevel.Warning:
            console.warn(message);
            break;
          case LogLevel.Info:
            console.info(message);
            break;
          case LogLevel.Verbose:
            console.debug(message);
            break;
        }
      },
      piiLoggingEnabled: false,
      logLevel: LogLevel.Warning,
    },
  },
};

// Scopes required for the CRM application
export const graphScopes = [
  'User.Read',
  'Sites.ReadWrite.All',
  'Mail.Read',
  'Mail.Send',
  'Calendars.ReadWrite',
  'Files.ReadWrite',
];

// SharePoint site URLs
export const SHAREPOINT_CONFIG = {
  pmSite: 'tejasre.sharepoint.com:/sites/pm',
  salesSite: 'tejasre.sharepoint.com:/sites/sales',
};
