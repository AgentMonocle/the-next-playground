import { app, BrowserWindow, ipcMain, shell } from 'electron';
import path from 'path';
import { AuthService } from './auth/authService';
import { GraphService } from './services/graphClient';
import { DataSeeder } from './services/seedData';

// Keep a global reference of the window object
let mainWindow: BrowserWindow | null = null;
let authService: AuthService;
let graphService: GraphService | null = null;

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 768,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    titleBarStyle: 'hiddenInset',
    show: false,
  });

  // Load the app
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }

  // Show window when ready
  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  // Handle external links
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Initialize auth service
function initializeAuth() {
  authService = new AuthService();
}

// IPC Handlers for Authentication
ipcMain.handle('auth:login', async () => {
  try {
    const account = await authService.login();
    if (account) {
      const accessToken = await authService.getAccessToken();
      if (accessToken) {
        graphService = new GraphService(accessToken);
      }
    }
    return { success: true, account };
  } catch (error) {
    console.error('Login error:', error);
    return { success: false, error: (error as Error).message };
  }
});

ipcMain.handle('auth:logout', async () => {
  try {
    await authService.logout();
    graphService = null;
    return { success: true };
  } catch (error) {
    console.error('Logout error:', error);
    return { success: false, error: (error as Error).message };
  }
});

ipcMain.handle('auth:getAccount', async () => {
  try {
    const account = authService.getAccount();
    return { success: true, account };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
});

ipcMain.handle('auth:silentLogin', async () => {
  try {
    const account = await authService.silentLogin();
    if (account) {
      const accessToken = await authService.getAccessToken();
      if (accessToken) {
        graphService = new GraphService(accessToken);
      }
    }
    return { success: true, account };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
});

// IPC Handlers for Graph API - User
ipcMain.handle('graph:getUser', async () => {
  if (!graphService) {
    return { success: false, error: 'Not authenticated' };
  }
  try {
    const user = await graphService.getUser();
    return { success: true, data: user };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
});

// IPC Handlers for SharePoint
ipcMain.handle('sharepoint:getSiteId', async (_event, siteUrl: string) => {
  if (!graphService) {
    return { success: false, error: 'Not authenticated' };
  }
  try {
    const site = await graphService.getSiteByUrl(siteUrl);
    return { success: true, data: site };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
});

ipcMain.handle('sharepoint:getLists', async (_event, siteId: string) => {
  if (!graphService) {
    return { success: false, error: 'Not authenticated' };
  }
  try {
    const lists = await graphService.getLists(siteId);
    return { success: true, data: lists };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
});

ipcMain.handle('sharepoint:getListItems', async (_event, siteId: string, listId: string, expand?: string) => {
  if (!graphService) {
    return { success: false, error: 'Not authenticated' };
  }
  try {
    const items = await graphService.getListItems(siteId, listId, expand);
    return { success: true, data: items };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
});

ipcMain.handle('sharepoint:createListItem', async (_event, siteId: string, listId: string, fields: Record<string, unknown>) => {
  if (!graphService) {
    return { success: false, error: 'Not authenticated' };
  }
  try {
    const item = await graphService.createListItem(siteId, listId, fields);
    return { success: true, data: item };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
});

ipcMain.handle('sharepoint:updateListItem', async (_event, siteId: string, listId: string, itemId: string, fields: Record<string, unknown>) => {
  if (!graphService) {
    return { success: false, error: 'Not authenticated' };
  }
  try {
    const item = await graphService.updateListItem(siteId, listId, itemId, fields);
    return { success: true, data: item };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
});

ipcMain.handle('sharepoint:deleteListItem', async (_event, siteId: string, listId: string, itemId: string) => {
  if (!graphService) {
    return { success: false, error: 'Not authenticated' };
  }
  try {
    await graphService.deleteListItem(siteId, listId, itemId);
    return { success: true };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
});

// IPC Handlers for Outlook
ipcMain.handle('outlook:getEmails', async (_event, filter?: string) => {
  if (!graphService) {
    return { success: false, error: 'Not authenticated' };
  }
  try {
    const emails = await graphService.getEmails(filter);
    return { success: true, data: emails };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
});

ipcMain.handle('outlook:sendEmail', async (_event, to: string, subject: string, body: string) => {
  if (!graphService) {
    return { success: false, error: 'Not authenticated' };
  }
  try {
    await graphService.sendEmail(to, subject, body);
    return { success: true };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
});

ipcMain.handle('outlook:createEvent', async (_event, event: { subject: string; start: string; end: string; attendees?: string[] }) => {
  if (!graphService) {
    return { success: false, error: 'Not authenticated' };
  }
  try {
    const createdEvent = await graphService.createCalendarEvent(event);
    return { success: true, data: createdEvent };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
});

// IPC Handlers for Data Seeding
ipcMain.handle('seed:seedAllData', async () => {
  const accessToken = await authService.getAccessToken();
  if (!accessToken) {
    return { success: false, error: 'Not authenticated' };
  }
  try {
    const seeder = new DataSeeder(accessToken);
    const results = await seeder.seedAllData((progress) => {
      // Send progress to renderer
      mainWindow?.webContents.send('seed:progress', progress);
    });
    return { success: true, data: results };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
});

ipcMain.handle('seed:clearData', async () => {
  const accessToken = await authService.getAccessToken();
  if (!accessToken) {
    return { success: false, error: 'Not authenticated' };
  }
  try {
    const seeder = new DataSeeder(accessToken);
    await seeder.clearAllCrmData();
    return { success: true };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
});

// App lifecycle
app.whenReady().then(() => {
  initializeAuth();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
