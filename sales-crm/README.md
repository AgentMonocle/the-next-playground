# Sales CRM - Electron Desktop App

A standalone desktop CRM application that integrates with Microsoft 365 (SharePoint, Outlook, Calendar) using the Microsoft Graph API.

## Prerequisites

- Node.js 18+
- Azure AD admin access (to create app registration)
- SharePoint site at `tejasre.sharepoint.com/sites/sales`

## Setup

### 1. Install Dependencies

```bash
cd sales-crm
npm install
```

### 2. Create Azure AD App Registration

1. Go to [Azure Portal](https://portal.azure.com) > Azure Active Directory > App Registrations
2. Click "New Registration"
3. Configure:
   - **Name**: "Sales CRM Desktop"
   - **Supported account types**: "Accounts in this organizational directory only"
   - **Redirect URI**: Select "Public client/native" → `http://localhost`
4. After creation, go to **API Permissions** and add these Microsoft Graph delegated permissions:
   - `User.Read`
   - `Sites.ReadWrite.All`
   - `Mail.Read`
   - `Mail.Send`
   - `Calendars.ReadWrite`
   - `Files.ReadWrite`
5. Click **Grant admin consent** for your organization
6. Copy the **Application (client) ID** and **Directory (tenant) ID**

### 3. Configure the App

Edit `electron/auth/msalConfig.ts` and replace the placeholder values:

```typescript
export const AZURE_CONFIG = {
  clientId: 'YOUR_CLIENT_ID_HERE',    // <-- Paste your Application (client) ID
  tenantId: 'YOUR_TENANT_ID_HERE',    // <-- Paste your Directory (tenant) ID
};
```

### 4. Create SharePoint Lists

In your SharePoint site (`tejasre.sharepoint.com/sites/sales`), create these lists:

1. **CRM_Countries** - Reference data for countries
2. **CRM_Companies** - Company/Account records
3. **CRM_Contacts** - Contact records
4. **CRM_Opportunities** - Sales pipeline/deals
5. **CRM_Activities** - Activity tracking (calls, emails, meetings)
6. **CRM_Documents** (optional) - Document links

See the plan file for detailed column schemas.

### 5. Run the App

```bash
# Development mode
npm run dev

# Build for production
npm run build:win
```

## Project Structure

```
sales-crm/
├── electron/                 # Electron main process
│   ├── main.ts              # Main entry point
│   ├── preload.ts           # IPC bridge
│   ├── auth/                # MSAL authentication
│   └── services/            # Graph API services
├── src/                     # React renderer
│   ├── components/          # UI components
│   ├── stores/              # Zustand state management
│   ├── types/               # TypeScript types
│   └── hooks/               # Custom React hooks
└── resources/               # App icons
```

## Authentication Flow

The app uses Microsoft's device code flow for authentication:
1. User clicks "Sign in with Microsoft"
2. A browser window opens to `microsoft.com/devicelogin`
3. User enters the code shown in the console/terminal
4. After successful auth, the app has access to Microsoft Graph API

## Features

- **Dashboard** - Pipeline overview and metrics
- **Companies** - Manage company/account records
- **Contacts** - Track people at companies
- **Pipeline** - Kanban board for opportunities
- **Activities** - Log calls, emails, meetings, tasks

## Tech Stack

- **Electron** - Desktop app framework
- **React 18** + TypeScript - UI
- **MSAL Node** - Microsoft authentication
- **Microsoft Graph SDK** - API client
- **Zustand** - State management
- **TailwindCSS** - Styling
- **Vite** - Build tool
