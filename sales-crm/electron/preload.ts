import { contextBridge, ipcRenderer } from 'electron';

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Authentication
  auth: {
    login: () => ipcRenderer.invoke('auth:login'),
    logout: () => ipcRenderer.invoke('auth:logout'),
    getAccount: () => ipcRenderer.invoke('auth:getAccount'),
    silentLogin: () => ipcRenderer.invoke('auth:silentLogin'),
  },

  // Graph API - User
  graph: {
    getUser: () => ipcRenderer.invoke('graph:getUser'),
  },

  // SharePoint
  sharepoint: {
    getSiteId: (siteUrl: string) => ipcRenderer.invoke('sharepoint:getSiteId', siteUrl),
    getLists: (siteId: string) => ipcRenderer.invoke('sharepoint:getLists', siteId),
    getListItems: (siteId: string, listId: string, expand?: string) =>
      ipcRenderer.invoke('sharepoint:getListItems', siteId, listId, expand),
    createListItem: (siteId: string, listId: string, fields: Record<string, unknown>) =>
      ipcRenderer.invoke('sharepoint:createListItem', siteId, listId, fields),
    updateListItem: (siteId: string, listId: string, itemId: string, fields: Record<string, unknown>) =>
      ipcRenderer.invoke('sharepoint:updateListItem', siteId, listId, itemId, fields),
    deleteListItem: (siteId: string, listId: string, itemId: string) =>
      ipcRenderer.invoke('sharepoint:deleteListItem', siteId, listId, itemId),
  },

  // Outlook
  outlook: {
    getEmails: (filter?: string) => ipcRenderer.invoke('outlook:getEmails', filter),
    sendEmail: (to: string, subject: string, body: string) =>
      ipcRenderer.invoke('outlook:sendEmail', to, subject, body),
    createEvent: (event: { subject: string; start: string; end: string; attendees?: string[] }) =>
      ipcRenderer.invoke('outlook:createEvent', event),
  },

  // Data Seeding
  seed: {
    seedAllData: () => ipcRenderer.invoke('seed:seedAllData'),
    clearData: () => ipcRenderer.invoke('seed:clearData'),
    onProgress: (callback: (progress: { stage: string; current: number; total: number; message: string }) => void) => {
      ipcRenderer.on('seed:progress', (_event, progress) => callback(progress));
    },
  },
});

// TypeScript declarations for the exposed API
export interface ElectronAPI {
  auth: {
    login: () => Promise<{ success: boolean; account?: unknown; error?: string }>;
    logout: () => Promise<{ success: boolean; error?: string }>;
    getAccount: () => Promise<{ success: boolean; account?: unknown; error?: string }>;
    silentLogin: () => Promise<{ success: boolean; account?: unknown; error?: string }>;
  };
  graph: {
    getUser: () => Promise<{ success: boolean; data?: unknown; error?: string }>;
  };
  sharepoint: {
    getSiteId: (siteUrl: string) => Promise<{ success: boolean; data?: unknown; error?: string }>;
    getLists: (siteId: string) => Promise<{ success: boolean; data?: unknown; error?: string }>;
    getListItems: (siteId: string, listId: string, expand?: string) => Promise<{ success: boolean; data?: unknown; error?: string }>;
    createListItem: (siteId: string, listId: string, fields: Record<string, unknown>) => Promise<{ success: boolean; data?: unknown; error?: string }>;
    updateListItem: (siteId: string, listId: string, itemId: string, fields: Record<string, unknown>) => Promise<{ success: boolean; data?: unknown; error?: string }>;
    deleteListItem: (siteId: string, listId: string, itemId: string) => Promise<{ success: boolean; error?: string }>;
  };
  outlook: {
    getEmails: (filter?: string) => Promise<{ success: boolean; data?: unknown; error?: string }>;
    sendEmail: (to: string, subject: string, body: string) => Promise<{ success: boolean; error?: string }>;
    createEvent: (event: { subject: string; start: string; end: string; attendees?: string[] }) => Promise<{ success: boolean; data?: unknown; error?: string }>;
  };
  seed: {
    seedAllData: () => Promise<{ success: boolean; data?: { countries: number; companies: number; contacts: number }; error?: string }>;
    clearData: () => Promise<{ success: boolean; error?: string }>;
    onProgress: (callback: (progress: { stage: string; current: number; total: number; message: string }) => void) => void;
  };
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
