/**
 * SharePoint Document Library file operations via Microsoft Graph API.
 *
 * Used by the backup/restore system to store and retrieve JSON snapshots
 * in the TSS_Backups document library.
 */
import type { Client } from '@microsoft/microsoft-graph-client';
import { getSiteId } from './sharepoint';

const BACKUP_LIBRARY = 'TSS_Backups';

interface DriveItem {
  id: string;
  name: string;
  folder?: { childCount: number };
  file?: { mimeType: string };
  size: number;
  createdDateTime: string;
  lastModifiedDateTime: string;
}

/**
 * List all backup folders in the TSS_Backups document library.
 * Returns folder names sorted newest-first.
 */
export async function listBackupFolders(client: Client): Promise<DriveItem[]> {
  let driveId: string;
  try {
    driveId = await getBackupDriveId(client);
  } catch {
    return []; // Library doesn't exist yet
  }

  const items = await client
    .api(`/drives/${driveId}/root/children`)
    .orderby('name desc')
    .get();

  return (items.value as DriveItem[]).filter((item) => item.folder);
}

/**
 * Create a new backup folder with the given name.
 */
export async function createBackupFolder(
  client: Client,
  folderName: string
): Promise<string> {
  const driveId = await getBackupDriveId(client);

  const response = await client.api(`/drives/${driveId}/root/children`).post({
    name: folderName,
    folder: {},
    '@microsoft.graph.conflictBehavior': 'fail',
  });

  return response.id as string;
}

/**
 * Upload a JSON file to a backup folder.
 * Uses the simple upload path (< 4MB per file, sufficient for list JSON).
 */
export async function uploadBackupFile(
  client: Client,
  folderName: string,
  fileName: string,
  content: string
): Promise<void> {
  const driveId = await getBackupDriveId(client);
  const encodedPath = encodeURIComponent(folderName) + '/' + encodeURIComponent(fileName);

  await client
    .api(`/drives/${driveId}/root:/${encodedPath}:/content`)
    .header('Content-Type', 'application/json')
    .put(content);
}

/**
 * Download a JSON file from a backup folder and parse it.
 */
export async function downloadBackupFile<T>(
  client: Client,
  folderName: string,
  fileName: string
): Promise<T> {
  const driveId = await getBackupDriveId(client);
  const encodedPath = encodeURIComponent(folderName) + '/' + encodeURIComponent(fileName);

  const response = await client
    .api(`/drives/${driveId}/root:/${encodedPath}:/content`)
    .get();

  // Graph SDK returns parsed JSON for .json files or raw text
  if (typeof response === 'string') {
    return JSON.parse(response) as T;
  }
  return response as T;
}

/**
 * Delete a backup folder and all its contents.
 */
export async function deleteBackupFolder(
  client: Client,
  folderName: string
): Promise<void> {
  const driveId = await getBackupDriveId(client);

  // Get the folder item ID
  const folder = await client
    .api(`/drives/${driveId}/root:/${encodeURIComponent(folderName)}`)
    .get();

  await client.api(`/drives/${driveId}/items/${folder.id}`).delete();
}

/**
 * List all files in a backup folder.
 */
export async function listBackupFiles(
  client: Client,
  folderName: string
): Promise<DriveItem[]> {
  const driveId = await getBackupDriveId(client);

  const response = await client
    .api(`/drives/${driveId}/root:/${encodeURIComponent(folderName)}:/children`)
    .get();

  return (response.value as DriveItem[]).filter((item) => item.file);
}

// ─── Internal ──────────────────────────────────────────────────────────────

let cachedDriveId: string | null = null;

async function getBackupDriveId(client: Client): Promise<string> {
  if (cachedDriveId) return cachedDriveId;

  const siteId = await getSiteId(client);
  const response = await client
    .api(`/sites/${siteId}/drives`)
    .filter(`name eq '${BACKUP_LIBRARY}'`)
    .get();

  const drives = response.value as Array<{ id: string; name: string }>;
  if (drives.length === 0) {
    throw new Error(
      `Document library "${BACKUP_LIBRARY}" not found. Run the provisioning script first.`
    );
  }

  cachedDriveId = drives[0].id;
  return cachedDriveId;
}
