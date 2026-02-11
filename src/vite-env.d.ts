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
