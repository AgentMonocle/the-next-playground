> **⚠️ ARCHIVED DOCUMENT — HISTORICAL REFERENCE ONLY**
>
> This file was archived on 2026-02-13. It is retained for historical reference
> and **must not** be used as a guiding design or planning document. The
> information, task statuses, and technical details herein may be outdated or
> superseded by later work. Stage 0 was completed successfully. For current
> project state, consult the beads system (`bd list`, `bd ready`).

---

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

Before any code is written, these items must be in place. Items marked :bust_in_silhouette: require manual action by a human (Azure portal, admin consent, etc.). Items marked :robot: can be done by Claude Code.

### Azure & M365

| # | Item | Owner | Status | Notes |
|---|---|---|---|---|
| P1 | **Azure Subscription** | :bust_in_silhouette: | :white_large_square: | Any subscription where you can create resources. Free tier works for dev. |
| P2 | **M365 Tenant** | :bust_in_silhouette: | :white_large_square: | Tejas `tejasre.com` tenant — already exists |
| P3 | **Azure CLI installed** | :bust_in_silhouette: | :white_large_square: | `az --version` — need v2.60+ |
| P4 | **Azure Functions Core Tools** | :bust_in_silhouette: | :white_large_square: | `func --version` — need v4.0.5382+ |
| P5 | **SWA CLI installed** | :robot: | :white_large_square: | `npm install -g @azure/static-web-apps-cli` (v2.0.7+) |
| P6 | **Node.js 20 LTS** | :bust_in_silhouette: | :white_large_square: | `node --version` — must be 20.x |
| P7 | **GitHub repo access** | :bust_in_silhouette: | :white_large_square: | `AgentMonocle/the-next-playground` — push access required |

### Accounts & Permissions

| # | Item | Owner | Notes |
|---|---|---|---|
| P8 | **Entra ID role: Application Developer** (minimum) | :bust_in_silhouette: | Required to register apps. Or Global Admin / Cloud Application Admin |
| P9 | **Entra ID role: Global Admin** (for admin consent) | :bust_in_silhouette: | Required to grant Application permissions (Sites.ReadWrite.All, Mail.Read, ChannelMessage.Send) |
| P10 | **SharePoint site access** | :bust_in_silhouette: | Verify you can access `https://tejasre.sharepoint.com/sites/sales` |

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

## Task 0.1: Entra ID App Registration (Manual)

**This is a portal-only task.** Claude Code cannot create app registrations — you'll do this in the Azure/Entra portal with guidance below.

### Step 1: Create the App Registration

1. Go to [https://entra.microsoft.com](https://entra.microsoft.com)
2. Sign in with your Tejas admin account
3. Navigate: **Identity** > **Applications** > **App registrations**
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

1. In the app registration, go to **Authentication** > **+ Add a platform** > **Single-page application**
2. Add redirect URIs:

| URI | Purpose |
|---|---|
| `http://localhost:5173/` | Vite dev server (local development) |
| `http://localhost:4280/` | SWA CLI proxy (local development) |

> **Note**: Production URI (`https://<app-name>.azurestaticapps.net/`) will be added after Task 0.6 when we know the SWA hostname.

3. Click **Configure**
4. Verify: **Implicit grant** checkboxes should be **unchecked** (PKCE replaces implicit flow)

### Step 3: Add Delegated API Permissions

1. Go to **API permissions** > **+ Add a permission** > **Microsoft Graph** > **Delegated permissions**
2. Add these permissions:

| Permission | Needed For |
|---|---|
| `User.Read` | Login, display user profile |
| `Sites.ReadWrite.All` | SharePoint List CRUD |

> **Stage 0 only needs these 2.** We'll add Mail.Read, Mail.Send, Calendars.ReadWrite in later stages when those features are built.

3. Click **Grant admin consent for Tejas Research & Engineering** (requires Global Admin)

### Step 4: Record Configuration Values

After completing Steps 1-3, provide these values to Claude Code:

```
VITE_MSAL_CLIENT_ID=<Application (client) ID>
VITE_MSAL_TENANT_ID=<Directory (tenant) ID>
VITE_MSAL_REDIRECT_URI=http://localhost:5173/
```

### Verification

- App registration exists with name "Tejas Sales System (TSS)"
- Platform = Single-page application (NOT "Web")
- Redirect URIs include `http://localhost:5173/` and `http://localhost:4280/`
- Implicit grant is **disabled**
- `User.Read` and `Sites.ReadWrite.All` delegated permissions added
- Admin consent granted (green checkmark on permissions page)

---

## Task 0.2: Project Scaffold (Claude Code)

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

- `npm run dev` starts Vite dev server at `http://localhost:5173/`
- React renders without errors
- TailwindCSS utility classes work
- Fluent UI components render
- TypeScript compiles with no errors
- Path aliases (`@/lib/...`) resolve correctly

---

## Task 0.3: Azure Functions Project (Claude Code)

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

- `cd api && npm run build` compiles TypeScript with no errors
- `cd api && func start` starts function host
- `curl http://localhost:7071/api/health` returns `{ "status": "ok" }`

---

## Task 0.4: MSAL Authentication (Claude Code)

**Depends on**: Task 0.1 (App Registration), Task 0.2 (Scaffold)

(Content continues — see original file for full details on Tasks 0.4 through 0.8)

---

## Dependency Chain

```
P1 (Azure Sub) ──────────────────────────┐
P6 (Node 20) ─────┐                      │
P7 (GitHub) ──────┐│                      │
                  ││                      │
P8-P9 (Entra) ───┐││                     │
                 │││                      │
                 vvv                      │
Task 0.1 ──> Task 0.2 ──> Task 0.3       │
(App Reg)    (Scaffold)   (Functions)     │
  │              │             │          │
  │              v             │          │
  └────────> Task 0.4 <───────┘          │
             (MSAL Auth)                  │
                 │                        │
                 v                        │
             Task 0.5                     │
             (Graph API)                  │
                 │                        │
                 v                        v
             Task 0.6 <──────────────────┘
             (SWA Deploy)
                 │
                 v
             Task 0.7
             (Env Config)
                 │
                 v
             Task 0.8
             (Smoke Test)
```

**Critical path**: P8/P9 > 0.1 > 0.4 > 0.5 > 0.6 > 0.8

---

## Execution Order Summary

| Order | Task | Owner | Estimated Time | Blocks |
|---|---|---|---|---|
| **1** | Prerequisites check (Node, CLI tools) | Manual | 30 min | Everything |
| **2** | Task 0.1: Entra ID App Registration | Manual | 30 min | Auth (0.4) |
| **3** | Task 0.2: Project Scaffold | Claude | 30 min | Functions (0.3), Auth (0.4) |
| **4** | Task 0.3: Azure Functions Project | Claude | 20 min | SWA deploy (0.6) |
| **5** | Task 0.4: MSAL Authentication | Claude | 30 min | Graph (0.5) |
| **6** | Task 0.5: Graph API Connectivity | Claude | 20 min | Smoke test (0.8) |
| **7** | Task 0.6: Azure Static Web Apps | Manual + Claude | 45 min | Env config (0.7) |
| **8** | Task 0.7: Environment Configuration | Claude | 15 min | Smoke test (0.8) |
| **9** | Task 0.8: Smoke Test & Verification | Manual + Claude | 30 min | Stage 1 |

**Total estimated time**: ~4 hours (split across human + Claude Code)
