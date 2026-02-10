# Stage 0: Foundation — Detailed Implementation Plan

**Goal**: Project scaffolding, authentication, and deployment pipeline working.
**Timeline**: Weeks 1-2
**Deliverable**: User can log in with M365 credentials and see a blank dashboard. Deployment pipeline pushes on every commit.

---

## Table of Contents

0. [Prerequisites & Setup Checklist](#0-prerequisites--setup-checklist)
1. [Task 0.1: Entra ID App Registration](#task-01-entra-id-app-registration-manual)
2. [Task 0.2: Project Scaffold](#task-02-project-scaffold)
3. [Task 0.3: Azure Functions Project](#task-03-azure-functions-project)
4. [Task 0.4: MSAL Authentication](#task-04-msal-authentication)
5. [Task 0.5: Graph API Connectivity](#task-05-graph-api-connectivity)
6. [Task 0.6: Azure Static Web Apps Deployment](#task-06-azure-static-web-apps-deployment)
7. [Task 0.7: Environment Configuration](#task-07-environment-configuration)
8. [Task 0.8: Smoke Test & Verification](#task-08-smoke-test--verification)
9. [Dependency Chain](#dependency-chain)
10. [File Tree (End of Stage 0)](#file-tree-end-of-stage-0)

---

## 0. Prerequisites & Setup Checklist

Before any code is written, these items must be in place. Items marked 👤 require manual action by a human (Azure portal, admin consent, etc.). Items marked 🤖 can be done by Claude Code.

### Azure & M365

| # | Item | Owner | Status | Notes |
|---|---|---|---|---|
| P1 | **Azure Subscription** | 👤 | ☐ | Any subscription where you can create resources. Free tier works for dev. |
| P2 | **M365 Tenant** | 👤 | ☐ | Tejas `tejasre.com` tenant — already exists |
| P3 | **Azure CLI installed** | 👤 | ☐ | `az --version` — need v2.60+ |
| P4 | **Azure Functions Core Tools** | 👤 | ☐ | `func --version` — need v4.0.5382+ |
| P5 | **SWA CLI installed** | 🤖 | ☐ | `npm install -g @azure/static-web-apps-cli` (v2.0.7+) |
| P6 | **Node.js 20 LTS** | 👤 | ☐ | `node --version` — must be 20.x |
| P7 | **GitHub repo access** | 👤 | ☐ | `AgentMonocle/the-next-playground` — push access required |

### Accounts & Permissions

| # | Item | Owner | Notes |
|---|---|---|---|
| P8 | **Entra ID role: Application Developer** (minimum) | 👤 | Required to register apps. Or Global Admin / Cloud Application Admin |
| P9 | **Entra ID role: Global Admin** (for admin consent) | 👤 | Required to grant Application permissions (Sites.ReadWrite.All, Mail.Read, ChannelMessage.Send) |
| P10 | **SharePoint site access** | 👤 | Verify you can access `https://tejasre.sharepoint.com/sites/sales` |

### Software Versions (Target)

| Tool | Version | Install |
|---|---|---|
| Node.js | 20 LTS | https://nodejs.org |
| npm | 10.x+ | Bundled with Node.js |
| Azure CLI | 2.60+ | `winget install Microsoft.AzureCLI` |
| Azure Functions Core Tools | 4.0.5382+ | `npm install -g azure-functions-core-tools@4` |
| SWA CLI | 2.0.7+ | `npm install -g @azure/static-web-apps-cli` |
| Git | 2.40+ | Already installed |

---

## Task 0.1: Entra ID App Registration (👤 Manual)

**This is a portal-only task.** Claude Code cannot create app registrations — you'll do this in the Azure/Entra portal with guidance below.

### Step 1: Create the App Registration

1. Go to [https://entra.microsoft.com](https://entra.microsoft.com)
2. Sign in with your Tejas admin account
3. Navigate: **Identity** → **Applications** → **App registrations**
4. Click **+ New registration**
5. Fill in:

| Field | Value |
|---|---|
| **Name** | `Tejas Sales System (TSS)` |
| **Supported account types** | Accounts in this organizational directory only (Tejas RE only — single tenant) |
| **Redirect URI** | Leave blank (configured in Step 2) |

6. Click **Register**
7. **Record these values** (we'll need them for code):

| Value | Where to Find | Example |
|---|---|---|
| **Application (client) ID** | Overview page | `a1b2c3d4-e5f6-...` |
| **Directory (tenant) ID** | Overview page | `f6e5d4c3-b2a1-...` |

### Step 2: Configure the SPA Platform

1. In the app registration, go to **Authentication** → **+ Add a platform** → **Single-page application**
2. Add redirect URIs:

| URI | Purpose |
|---|---|
| `http://localhost:5173/` | Vite dev server (local development) |
| `http://localhost:4280/` | SWA CLI proxy (local development) |

> **Note**: Production URI (`https://<app-name>.azurestaticapps.net/`) will be added after Task 0.6 when we know the SWA hostname.

3. Click **Configure**
4. Verify: **Implicit grant** checkboxes should be **unchecked** (PKCE replaces implicit flow)

### Step 3: Add Delegated API Permissions

1. Go to **API permissions** → **+ Add a permission** → **Microsoft Graph** → **Delegated permissions**
2. Add these permissions:

| Permission | Needed For |
|---|---|
| `User.Read` | Login, display user profile |
| `Sites.ReadWrite.All` | SharePoint List CRUD |

> **Stage 0 only needs these 2.** We'll add Mail.Read, Mail.Send, Calendars.ReadWrite, Files.ReadWrite in later stages when those features are built.

3. Click **Grant admin consent for Tejas Research & Engineering** (requires Global Admin)

### Step 4: Record Configuration Values

After completing Steps 1-3, provide these values to Claude Code:

```
VITE_MSAL_CLIENT_ID=<Application (client) ID>
VITE_MSAL_TENANT_ID=<Directory (tenant) ID>
VITE_MSAL_REDIRECT_URI=http://localhost:5173/
```

### Verification

- ✅ App registration exists with name "Tejas Sales System (TSS)"
- ✅ Platform = Single-page application (NOT "Web")
- ✅ Redirect URIs include `http://localhost:5173/` and `http://localhost:4280/`
- ✅ Implicit grant is **disabled**
- ✅ `User.Read` and `Sites.ReadWrite.All` delegated permissions added
- ✅ Admin consent granted (green checkmark on permissions page)

---

## Task 0.2: Project Scaffold (🤖 Claude Code)

**Depends on**: P6 (Node.js 20), P7 (GitHub repo)

### 0.2.1 Create Vite + React + TypeScript Project

```bash
npm create vite@latest tss -- --template react-swc-ts
cd tss
npm install
```

> Using `react-swc-ts` template for faster compilation (SWC vs Babel).

### 0.2.2 Install Frontend Dependencies

```bash
# UI framework
npm install @fluentui/react-components @fluentui/react-icons

# State management
npm install zustand
npm install @tanstack/react-query @tanstack/react-query-devtools

# Authentication
npm install @azure/msal-browser@^5.1.0 @azure/msal-react@^5.0.3

# Graph SDK
npm install @microsoft/microsoft-graph-client

# Routing
npm install react-router-dom

# Styling (TailwindCSS)
npm install -D tailwindcss @tailwindcss/vite
```

### 0.2.3 Configure TailwindCSS

**`vite.config.ts`**:
```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
});
```

**`src/index.css`**:
```css
@import "tailwindcss";
```

### 0.2.4 Configure TypeScript Paths

**`tsconfig.json`** — add path aliases:
```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    }
  }
}
```

**`vite.config.ts`** — add resolve alias:
```typescript
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
```

### 0.2.5 Create Source Directory Structure

```
src/
├── components/           # Shared UI components
│   ├── layout/          # App shell, sidebar, header
│   └── common/          # Buttons, cards, tables, etc.
├── features/            # Feature modules (Stage 1+)
├── hooks/               # Custom React hooks
├── lib/                 # Utilities, helpers
│   ├── auth/            # MSAL config, auth helpers
│   ├── graph/           # Graph API client, helpers
│   └── utils/           # Formatters, validators
├── pages/               # Route pages
├── stores/              # Zustand stores
├── types/               # TypeScript type definitions
├── App.tsx              # Root component
├── main.tsx             # Entry point
└── index.css            # Tailwind imports
```

### 0.2.6 Environment Variables

**`.env.local`** (not committed — local development):
```
VITE_MSAL_CLIENT_ID=<from Task 0.1>
VITE_MSAL_TENANT_ID=<from Task 0.1>
VITE_MSAL_REDIRECT_URI=http://localhost:5173/
VITE_SHAREPOINT_SITE_URL=https://tejasre.sharepoint.com/sites/sales
```

**`.env.example`** (committed — template for other developers):
```
VITE_MSAL_CLIENT_ID=
VITE_MSAL_TENANT_ID=
VITE_MSAL_REDIRECT_URI=http://localhost:5173/
VITE_SHAREPOINT_SITE_URL=https://tejasre.sharepoint.com/sites/sales
```

**`.gitignore`** additions:
```
.env.local
.env.*.local
local.settings.json
```

### Verification

- ✅ `npm run dev` starts Vite dev server at `http://localhost:5173/`
- ✅ React renders without errors
- ✅ TailwindCSS utility classes work
- ✅ Fluent UI components render
- ✅ TypeScript compiles with no errors
- ✅ Path aliases (`@/lib/...`) resolve correctly

---

## Task 0.3: Azure Functions Project (🤖 Claude Code)

**Depends on**: P4 (Functions Core Tools), Task 0.2

### 0.3.1 Initialize Functions Project

```bash
# From project root
mkdir api && cd api
func init --worker-runtime node --language typescript --model V4
```

### 0.3.2 Install API Dependencies

```bash
cd api
npm install @azure/identity @microsoft/microsoft-graph-client
npm install -D @types/node
```

### 0.3.3 Configure `api/package.json`

Ensure these fields are set:

```json
{
  "name": "tss-api",
  "version": "1.0.0",
  "main": "dist/src/functions/*.js",
  "engines": { "node": ">=20.0.0" },
  "scripts": {
    "build": "tsc",
    "start": "func start",
    "watch": "tsc -w"
  }
}
```

### 0.3.4 Configure `api/tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  },
  "include": ["src"],
  "exclude": ["node_modules", "dist"]
}
```

### 0.3.5 Create Health Check Function

**`api/src/functions/health.ts`**:
```typescript
import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';

export async function health(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  context.log('Health check requested');

  return {
    status: 200,
    jsonBody: {
      status: 'ok',
      timestamp: new Date().toISOString(),
      version: '0.1.0',
    },
  };
}

app.http('health', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'health',
  handler: health,
});
```

### 0.3.6 Configure `api/host.json`

```json
{
  "version": "2.0",
  "extensionBundle": {
    "id": "Microsoft.Azure.Functions.ExtensionBundle",
    "version": "[4.0.0, 5.0.0)"
  },
  "logging": {
    "applicationInsights": {
      "samplingSettings": {
        "isEnabled": true,
        "maxTelemetryItemsPerSecond": 20
      }
    }
  }
}
```

### 0.3.7 Configure `api/local.settings.json`

```json
{
  "IsEncrypted": false,
  "Values": {
    "AzureWebJobsStorage": "",
    "FUNCTIONS_WORKER_RUNTIME": "node"
  },
  "Host": {
    "CORS": "http://localhost:5173,http://localhost:4280",
    "CORSCredentials": true
  }
}
```

### 0.3.8 Add `staticwebapp.config.json` (Project Root)

```json
{
  "platform": {
    "apiRuntime": "node:20"
  },
  "navigationFallback": {
    "rewrite": "/index.html",
    "exclude": ["/api/*", "/images/*", "/*.css", "/*.js"]
  },
  "routes": [
    {
      "route": "/api/*",
      "allowedRoles": ["authenticated"]
    }
  ],
  "responseOverrides": {
    "401": {
      "redirect": "/",
      "statusCode": 302
    }
  }
}
```

### Verification

- ✅ `cd api && npm run build` compiles TypeScript with no errors
- ✅ `cd api && func start` starts function host
- ✅ `curl http://localhost:7071/api/health` returns `{ "status": "ok" }`

---

## Task 0.4: MSAL Authentication (🤖 Claude Code)

**Depends on**: Task 0.1 (App Registration), Task 0.2 (Scaffold)

### 0.4.1 MSAL Configuration

**`src/lib/auth/msalConfig.ts`**:
```typescript
import { Configuration, LogLevel } from '@azure/msal-browser';

export const msalConfig: Configuration = {
  auth: {
    clientId: import.meta.env.VITE_MSAL_CLIENT_ID,
    authority: `https://login.microsoftonline.com/${import.meta.env.VITE_MSAL_TENANT_ID}`,
    redirectUri: import.meta.env.VITE_MSAL_REDIRECT_URI || window.location.origin,
    postLogoutRedirectUri: window.location.origin,
  },
  cache: {
    cacheLocation: 'sessionStorage',
    storeAuthStateInCookie: false,
  },
  system: {
    loggerOptions: {
      logLevel: import.meta.env.DEV ? LogLevel.Info : LogLevel.Error,
      loggerCallback: (level, message, containsPii) => {
        if (containsPii) return;
        switch (level) {
          case LogLevel.Error: console.error(message); break;
          case LogLevel.Warning: console.warn(message); break;
          case LogLevel.Info: console.info(message); break;
          case LogLevel.Verbose: console.debug(message); break;
        }
      },
    },
  },
};

// Scopes for Stage 0 — expand in later stages
export const loginRequest = {
  scopes: ['User.Read', 'Sites.ReadWrite.All'],
};

export const graphScopes = {
  sharePoint: ['Sites.ReadWrite.All'],
  userProfile: ['User.Read'],
};
```

### 0.4.2 MSAL Provider Setup

**`src/main.tsx`**:
```typescript
import React from 'react';
import ReactDOM from 'react-dom/client';
import { PublicClientApplication, EventType } from '@azure/msal-browser';
import { MsalProvider } from '@azure/msal-react';
import { FluentProvider, webLightTheme } from '@fluentui/react-components';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { msalConfig } from '@/lib/auth/msalConfig';
import App from './App';
import './index.css';

const msalInstance = new PublicClientApplication(msalConfig);

// Set active account on login success
msalInstance.addEventCallback((event) => {
  if (event.eventType === EventType.LOGIN_SUCCESS && event.payload) {
    const account = (event.payload as any).account;
    msalInstance.setActiveAccount(account);
  }
});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,    // 5 minutes
      retry: 2,
      refetchOnWindowFocus: false,
    },
  },
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <MsalProvider instance={msalInstance}>
      <QueryClientProvider client={queryClient}>
        <FluentProvider theme={webLightTheme}>
          <App />
        </FluentProvider>
      </QueryClientProvider>
    </MsalProvider>
  </React.StrictMode>
);
```

### 0.4.3 Auth-Gated App Component

**`src/App.tsx`**:
```typescript
import { AuthenticatedTemplate, UnauthenticatedTemplate, useMsal } from '@azure/msal-react';
import { loginRequest } from '@/lib/auth/msalConfig';
import { Button } from '@fluentui/react-components';

function App() {
  const { instance, accounts } = useMsal();

  const handleLogin = () => {
    instance.loginRedirect(loginRequest);
  };

  const handleLogout = () => {
    instance.logoutRedirect();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <UnauthenticatedTemplate>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center space-y-4">
            <h1 className="text-3xl font-bold text-gray-900">Tejas Sales System</h1>
            <p className="text-gray-600">Sign in with your Microsoft 365 account</p>
            <Button appearance="primary" size="large" onClick={handleLogin}>
              Sign in with Microsoft
            </Button>
          </div>
        </div>
      </UnauthenticatedTemplate>

      <AuthenticatedTemplate>
        <header className="bg-white border-b px-6 py-3 flex items-center justify-between">
          <h1 className="text-xl font-semibold">Tejas Sales System</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">
              {accounts[0]?.name || accounts[0]?.username}
            </span>
            <Button appearance="subtle" size="small" onClick={handleLogout}>
              Sign out
            </Button>
          </div>
        </header>
        <main className="p-6">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl font-bold mb-4">Dashboard</h2>
            <p className="text-gray-500">Stage 0 complete. Pipeline board coming in Stage 1.</p>
          </div>
        </main>
      </AuthenticatedTemplate>
    </div>
  );
}

export default App;
```

### 0.4.4 Type Declarations for Environment Variables

**`src/vite-env.d.ts`** (extend existing):
```typescript
/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_MSAL_CLIENT_ID: string;
  readonly VITE_MSAL_TENANT_ID: string;
  readonly VITE_MSAL_REDIRECT_URI: string;
  readonly VITE_SHAREPOINT_SITE_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
```

### Verification

- ✅ App shows "Sign in with Microsoft" button when not authenticated
- ✅ Clicking sign-in redirects to Microsoft login page
- ✅ After login, redirects back to app showing user name
- ✅ "Sign out" button works
- ✅ Refresh the page — silent token refresh keeps user logged in (within session)

---

## Task 0.5: Graph API Connectivity (🤖 Claude Code)

**Depends on**: Task 0.4 (MSAL Auth), Task 0.1 (Permissions)

### 0.5.1 Graph Client Helper

**`src/lib/graph/graphClient.ts`**:
```typescript
import { Client } from '@microsoft/microsoft-graph-client';
import { PublicClientApplication } from '@azure/msal-browser';
import { graphScopes } from '@/lib/auth/msalConfig';

export function getGraphClient(msalInstance: PublicClientApplication): Client {
  return Client.initWithMiddleware({
    authProvider: {
      getAccessToken: async () => {
        const account = msalInstance.getActiveAccount();
        if (!account) throw new Error('No active account');

        const response = await msalInstance.acquireTokenSilent({
          scopes: [...graphScopes.sharePoint, ...graphScopes.userProfile],
          account,
        });

        return response.accessToken;
      },
    },
  });
}
```

### 0.5.2 SharePoint Site ID Discovery

**`src/lib/graph/sharepoint.ts`**:
```typescript
import { Client } from '@microsoft/microsoft-graph-client';

const SITE_URL = import.meta.env.VITE_SHAREPOINT_SITE_URL;

// Extract hostname and site path from URL
// e.g., "https://tejasre.sharepoint.com/sites/sales" → host: "tejasre.sharepoint.com", path: "/sites/sales"
function parseSiteUrl(url: string): { hostname: string; sitePath: string } {
  const parsed = new URL(url);
  return {
    hostname: parsed.hostname,
    sitePath: parsed.pathname,
  };
}

/**
 * Get the SharePoint site ID — needed for all subsequent Graph API calls.
 * Caches the result since site ID never changes.
 */
let cachedSiteId: string | null = null;

export async function getSiteId(client: Client): Promise<string> {
  if (cachedSiteId) return cachedSiteId;

  const { hostname, sitePath } = parseSiteUrl(SITE_URL);
  const site = await client.api(`/sites/${hostname}:${sitePath}`).get();
  cachedSiteId = site.id;
  return site.id;
}
```

### 0.5.3 Connectivity Smoke Test (Dashboard Component)

Add a simple connectivity check to the dashboard that verifies Graph API can reach the SharePoint site. This is a temporary Stage 0 verification — will be replaced by real content in Stage 1.

**`src/components/ConnectivityCheck.tsx`**:
```typescript
import { useEffect, useState } from 'react';
import { useMsal } from '@azure/msal-react';
import { Badge, Spinner } from '@fluentui/react-components';
import { getGraphClient } from '@/lib/graph/graphClient';
import { getSiteId } from '@/lib/graph/sharepoint';

type Status = 'checking' | 'connected' | 'error';

export function ConnectivityCheck() {
  const { instance } = useMsal();
  const [status, setStatus] = useState<Status>('checking');
  const [siteId, setSiteId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function checkConnectivity() {
      try {
        const client = getGraphClient(instance);
        const id = await getSiteId(client);
        setSiteId(id);
        setStatus('connected');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
        setStatus('error');
      }
    }
    checkConnectivity();
  }, [instance]);

  return (
    <div className="bg-white rounded-lg border p-4 space-y-2">
      <h3 className="font-semibold text-sm text-gray-700">Stage 0 — System Status</h3>
      <div className="flex items-center gap-2">
        {status === 'checking' && <Spinner size="tiny" />}
        <span className="text-sm">SharePoint Site:</span>
        {status === 'connected' && <Badge appearance="filled" color="success">Connected</Badge>}
        {status === 'error' && <Badge appearance="filled" color="danger">Error</Badge>}
      </div>
      {siteId && <p className="text-xs text-gray-400 font-mono">Site ID: {siteId}</p>}
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}
```

### Verification

- ✅ After login, dashboard shows "SharePoint Site: Connected" with green badge
- ✅ Site ID is displayed (confirms Graph API is reachable with correct permissions)
- ✅ If permissions are wrong, error message is shown (not a silent failure)

---

## Task 0.6: Azure Static Web Apps Deployment (👤 + 🤖)

**Depends on**: P1 (Azure Subscription), P7 (GitHub repo), Task 0.2 (Scaffold)

### 0.6.1 Create Azure Static Web App (👤 Azure Portal or CLI)

**Option A: Azure Portal**

1. Go to [Azure Portal](https://portal.azure.com) → **Create a resource** → **Static Web App**
2. Fill in:

| Field | Value |
|---|---|
| **Subscription** | (your subscription) |
| **Resource Group** | `rg-tss` (create new) |
| **Name** | `tss-app` |
| **Plan type** | Free (for development) |
| **Region** | South Central US |
| **Source** | GitHub |
| **Organization** | `AgentMonocle` |
| **Repository** | `the-next-playground` |
| **Branch** | `main` |
| **Build Preset** | Custom |
| **App location** | `/` |
| **API location** | `api` |
| **Output location** | `dist` |

3. Click **Review + create** → **Create**
4. Azure auto-creates a GitHub Actions workflow in your repo

**Option B: Azure CLI**

```bash
az login
az group create --name rg-tss --location southcentralus
az staticwebapp create \
  --name tss-app \
  --resource-group rg-tss \
  --source https://github.com/AgentMonocle/the-next-playground \
  --location southcentralus \
  --branch main \
  --app-location "/" \
  --api-location "api" \
  --output-location "dist" \
  --login-with-github
```

### 0.6.2 Record SWA Hostname

After creation:
- Note the hostname: `https://<random-name>.azurestaticapps.net`
- This becomes the production redirect URI

### 0.6.3 Update Entra ID App Registration (👤 Manual)

Add the SWA production URL as a redirect URI:

1. Go to Entra ID → App registrations → TSS → Authentication
2. Add redirect URI: `https://<random-name>.azurestaticapps.net/`
3. Save

### 0.6.4 Configure GitHub Actions Workflow (🤖 Claude Code)

The Azure portal auto-generates a workflow, but we may need to adjust it. Ensure it matches:

**`.github/workflows/azure-static-web-apps.yml`**:

```yaml
name: Azure Static Web Apps CI/CD

on:
  push:
    branches:
      - main
  pull_request:
    types: [opened, synchronize, reopened, closed]
    branches:
      - main

jobs:
  build_and_deploy_job:
    if: github.event_name == 'push' || (github.event_name == 'pull_request' && github.event.action != 'closed')
    runs-on: ubuntu-latest
    name: Build and Deploy Job
    steps:
      - uses: actions/checkout@v4
        with:
          submodules: true

      - name: Build And Deploy
        id: builddeploy
        uses: Azure/static-web-apps-deploy@v1
        with:
          azure_static_web_apps_api_token: ${{ secrets.AZURE_STATIC_WEB_APPS_API_TOKEN }}
          repo_token: ${{ secrets.GITHUB_TOKEN }}
          action: "upload"
          app_location: "/"
          api_location: "api"
          output_location: "dist"
        env:
          VITE_MSAL_CLIENT_ID: ${{ vars.VITE_MSAL_CLIENT_ID }}
          VITE_MSAL_TENANT_ID: ${{ vars.VITE_MSAL_TENANT_ID }}
          VITE_MSAL_REDIRECT_URI: ${{ vars.VITE_MSAL_REDIRECT_URI }}
          VITE_SHAREPOINT_SITE_URL: ${{ vars.VITE_SHAREPOINT_SITE_URL }}

  close_pull_request_job:
    if: github.event_name == 'pull_request' && github.event.action == 'closed'
    runs-on: ubuntu-latest
    name: Close Pull Request Job
    steps:
      - name: Close Pull Request
        id: closepullrequest
        uses: Azure/static-web-apps-deploy@v1
        with:
          azure_static_web_apps_api_token: ${{ secrets.AZURE_STATIC_WEB_APPS_API_TOKEN }}
          action: "close"
```

### 0.6.5 Set GitHub Repository Variables (👤 Manual)

Go to GitHub → `AgentMonocle/the-next-playground` → Settings → Secrets and variables → Actions:

**Variables** (not secrets — these are non-sensitive build-time values):

| Name | Value |
|---|---|
| `VITE_MSAL_CLIENT_ID` | `<from Task 0.1>` |
| `VITE_MSAL_TENANT_ID` | `<from Task 0.1>` |
| `VITE_MSAL_REDIRECT_URI` | `https://<swa-hostname>.azurestaticapps.net/` |
| `VITE_SHAREPOINT_SITE_URL` | `https://tejasre.sharepoint.com/sites/sales` |

**Secrets** (auto-created by Azure):

| Name | Value |
|---|---|
| `AZURE_STATIC_WEB_APPS_API_TOKEN` | (auto-created by Azure when you linked the repo) |

### 0.6.6 SWA CLI Configuration for Local Development (🤖 Claude Code)

**`swa-cli.config.json`** (project root):
```json
{
  "$schema": "https://aka.ms/azure/static-web-apps-cli/schema",
  "configurations": {
    "tss": {
      "appLocation": ".",
      "apiLocation": "api",
      "outputLocation": "dist",
      "appBuildCommand": "npm run build",
      "apiBuildCommand": "cd api && npm run build",
      "run": "npm run dev",
      "appDevserverUrl": "http://localhost:5173"
    }
  }
}
```

### Verification

- ✅ `git push origin main` triggers GitHub Actions build
- ✅ Build succeeds — SPA + Functions deployed
- ✅ Visit `https://<swa-hostname>.azurestaticapps.net/` — login page appears
- ✅ `https://<swa-hostname>.azurestaticapps.net/api/health` returns `{ "status": "ok" }`
- ✅ Login with M365 credentials works on deployed URL

---

## Task 0.7: Environment Configuration (👤 + 🤖)

**Depends on**: Task 0.6 (SWA deployed)

### 0.7.1 Azure Key Vault (Deferred to Stage 2+)

Key Vault is not needed for Stage 0. The health check function has no secrets. Key Vault + Managed Identity will be set up in **Stage 2** when Azure Functions need application-level Graph API permissions for email webhooks.

### 0.7.2 Local Development Script (🤖 Claude Code)

Add convenience scripts to root `package.json`:

```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview",
    "dev:api": "cd api && func start",
    "build:api": "cd api && npm run build",
    "dev:swa": "swa start http://localhost:5173 --api-location api",
    "start": "concurrently \"npm run dev\" \"npm run dev:api\""
  }
}
```

Install `concurrently`:
```bash
npm install -D concurrently
```

### Verification

- ✅ `npm run dev` — starts frontend only at `:5173`
- ✅ `npm run dev:api` — starts API only at `:7071`
- ✅ `npm run start` — starts both concurrently
- ✅ `npm run dev:swa` — starts SWA CLI at `:4280` proxying both

---

## Task 0.8: Smoke Test & Verification (🤖 + 👤)

**Depends on**: All previous tasks

### Full Test Checklist

| # | Test | Local | Deployed | Owner |
|---|---|---|---|---|
| T1 | `npm run dev` starts without errors | ☐ | — | 🤖 |
| T2 | `npm run build` compiles with zero errors | ☐ | — | 🤖 |
| T3 | `cd api && npm run build` compiles with zero errors | ☐ | — | 🤖 |
| T4 | `cd api && func start` starts function host | ☐ | — | 🤖 |
| T5 | `/api/health` returns `{ "status": "ok" }` | ☐ | ☐ | 🤖/👤 |
| T6 | Login page renders with "Sign in with Microsoft" button | ☐ | ☐ | 👤 |
| T7 | Microsoft login redirect works | ☐ | ☐ | 👤 |
| T8 | After login, user name shown in header | ☐ | ☐ | 👤 |
| T9 | SharePoint connectivity check shows "Connected" | ☐ | ☐ | 👤 |
| T10 | Sign out works | ☐ | ☐ | 👤 |
| T11 | GitHub Actions deploys on push to main | — | ☐ | 👤 |
| T12 | SWA CLI local proxy works (`localhost:4280`) | ☐ | — | 🤖 |

---

## Dependency Chain

```
P1 (Azure Sub) ──────────────────────────┐
P6 (Node 20) ─────┐                      │
P7 (GitHub) ──────┐│                      │
                  ││                      │
P8-P9 (Entra) ───┐││                     │
                 │││                      │
                 ▼▼▼                      │
Task 0.1 ──► Task 0.2 ──► Task 0.3       │
(App Reg)    (Scaffold)   (Functions)     │
  │              │             │          │
  │              ▼             │          │
  └────────► Task 0.4 ◄───────┘          │
             (MSAL Auth)                  │
                 │                        │
                 ▼                        │
             Task 0.5                     │
             (Graph API)                  │
                 │                        │
                 ▼                        ▼
             Task 0.6 ◄──────────────────┘
             (SWA Deploy)
                 │
                 ▼
             Task 0.7
             (Env Config)
                 │
                 ▼
             Task 0.8
             (Smoke Test)
```

**Critical path**: P8/P9 → 0.1 → 0.4 → 0.5 → 0.6 → 0.8

The Entra ID App Registration (0.1) is the first task and it blocks everything auth-related. It's manual and requires admin access. **Start here.**

---

## File Tree (End of Stage 0)

```
the-next-playground/                    # Existing repo root
├── .github/
│   └── workflows/
│       └── azure-static-web-apps.yml   # Auto-deploy pipeline
├── api/                                # Azure Functions v4 (isolated)
│   ├── src/
│   │   └── functions/
│   │       └── health.ts               # Health check endpoint
│   ├── host.json
│   ├── local.settings.json             # NOT committed (.gitignore)
│   ├── package.json
│   └── tsconfig.json
├── src/                                # React SPA
│   ├── components/
│   │   ├── layout/                     # (empty — Stage 1)
│   │   ├── common/                     # (empty — Stage 1)
│   │   └── ConnectivityCheck.tsx       # Graph API connectivity badge
│   ├── features/                       # (empty — Stage 1)
│   ├── hooks/                          # (empty — Stage 1)
│   ├── lib/
│   │   ├── auth/
│   │   │   └── msalConfig.ts           # MSAL configuration + scopes
│   │   ├── graph/
│   │   │   ├── graphClient.ts          # Graph client factory
│   │   │   └── sharepoint.ts           # Site ID helper
│   │   └── utils/                      # (empty — Stage 1)
│   ├── pages/                          # (empty — Stage 1)
│   ├── stores/                         # (empty — Stage 1)
│   ├── types/                          # (empty — Stage 1)
│   ├── App.tsx                         # Auth-gated root component
│   ├── main.tsx                        # MSAL + Fluent + React Query providers
│   ├── index.css                       # Tailwind imports
│   └── vite-env.d.ts                   # Env var types
├── ref_datasets/                       # Existing — seed data CSVs
├── ref_prompts/                        # Existing — scoping prompts
├── .env.example                        # Env var template (committed)
├── .env.local                          # Actual env vars (NOT committed)
├── .gitignore                          # Updated
├── AGENTS.md                           # Existing
├── COMPANY_PROFILE.md                  # Existing
├── DESIGN.md                           # Existing
├── DEVELOPMENT_PLAN.md                 # Existing
├── STAGE_0_PLAN.md                     # This file
├── index.html                          # Vite entry HTML
├── package.json                        # Frontend deps
├── staticwebapp.config.json            # SWA runtime config
├── swa-cli.config.json                 # SWA CLI local dev config
├── tailwind.config.ts                  # Tailwind config
├── tsconfig.json                       # Frontend TS config
└── vite.config.ts                      # Vite config
```

---

## Execution Order Summary

| Order | Task | Owner | Estimated Time | Blocks |
|---|---|---|---|---|
| **1** | Prerequisites check (Node, CLI tools) | 👤 | 30 min | Everything |
| **2** | Task 0.1: Entra ID App Registration | 👤 (with guide) | 30 min | Auth (0.4) |
| **3** | Task 0.2: Project Scaffold | 🤖 | 30 min | Functions (0.3), Auth (0.4) |
| **4** | Task 0.3: Azure Functions Project | 🤖 | 20 min | SWA deploy (0.6) |
| **5** | Task 0.4: MSAL Authentication | 🤖 | 30 min | Graph (0.5) |
| **6** | Task 0.5: Graph API Connectivity | 🤖 | 20 min | Smoke test (0.8) |
| **7** | Task 0.6: Azure Static Web Apps | 👤 + 🤖 | 45 min | Env config (0.7) |
| **8** | Task 0.7: Environment Configuration | 🤖 | 15 min | Smoke test (0.8) |
| **9** | Task 0.8: Smoke Test & Verification | 👤 + 🤖 | 30 min | Stage 1 |

**Total estimated time**: ~4 hours (split across human + Claude Code)

Tasks 0.2 and 0.3 can run in parallel with Task 0.1 (Claude scaffolds code while you do app registration). Once you provide the client ID and tenant ID, Claude wires up auth.
