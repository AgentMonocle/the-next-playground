/**
 * Backup service — exports all SharePoint list data to TSS_Backups document library.
 *
 * Reads all lists via Graph API in dependency order, serializes each to JSON,
 * and uploads to a timestamped folder in the TSS_Backups document library.
 */
import type { Client } from '@microsoft/microsoft-graph-client';
import type { BackupManifest, BackupInfo, OperationProgress } from '@/types';
import { getSiteId } from '@/lib/graph/sharepoint';
import {
  listBackupFolders,
  createBackupFolder,
  uploadBackupFile,
  downloadBackupFile,
  deleteBackupFolder,
} from '@/lib/graph/drive';

/** All TSS lists in dependency-safe export order */
export const BACKUP_LIST_ORDER = [
  'TSS_Country',
  'TSS_Product',
  'TSS_InternalTeam',
  'TSS_Sequence',
  'TSS_BasinRegion',
  'TSS_Company',
  'TSS_Contact',
  'TSS_Opportunity',
  'TSS_Activity',
  'TSS_BasinRegionCountry',
  'TSS_CompanyBasin',
  'TSS_ContactBasin',
  'TSS_OpportunityBasin',
] as const;

type ProgressCallback = (progress: OperationProgress) => void;

/**
 * Create a full backup of all SharePoint list data.
 * Exports raw SharePoint fields (including LookupId references) so
 * referential integrity is preserved by internal IDs.
 */
export async function createBackup(
  client: Client,
  userEmail: string,
  onProgress?: ProgressCallback
): Promise<string> {
  const folderName = new Date().toISOString().replace(/[:.]/g, '-');
  const manifest: BackupManifest = {
    version: 1,
    createdAt: new Date().toISOString(),
    createdBy: userEmail,
    lists: {},
  };

  onProgress?.({
    phase: 'Creating backup folder',
    listsCompleted: 0,
    listsTotal: BACKUP_LIST_ORDER.length,
    itemsProcessed: 0,
    itemsTotal: 0,
  });

  await createBackupFolder(client, folderName);

  for (let i = 0; i < BACKUP_LIST_ORDER.length; i++) {
    const listName = BACKUP_LIST_ORDER[i];

    onProgress?.({
      phase: 'Exporting',
      currentList: listName,
      listsCompleted: i,
      listsTotal: BACKUP_LIST_ORDER.length,
      itemsProcessed: 0,
      itemsTotal: 0,
    });

    // Fetch all items with raw fields (no transformation — we want LookupId values)
    const items = await getAllRawItems(client, listName);

    manifest.lists[listName] = { count: items.length };

    await uploadBackupFile(
      client,
      folderName,
      `${listName}.json`,
      JSON.stringify(items, null, 2)
    );

    onProgress?.({
      phase: 'Exporting',
      currentList: listName,
      listsCompleted: i + 1,
      listsTotal: BACKUP_LIST_ORDER.length,
      itemsProcessed: items.length,
      itemsTotal: items.length,
    });
  }

  // Upload manifest last (so partial backups are identifiable by missing manifest)
  await uploadBackupFile(
    client,
    folderName,
    'manifest.json',
    JSON.stringify(manifest, null, 2)
  );

  return folderName;
}

/**
 * List available backups with their manifests.
 */
export async function getBackupList(client: Client): Promise<BackupInfo[]> {
  const folders = await listBackupFolders(client);
  const backups: BackupInfo[] = [];

  for (const folder of folders) {
    let manifest: BackupManifest | null = null;
    try {
      manifest = await downloadBackupFile<BackupManifest>(
        client,
        folder.name,
        'manifest.json'
      );
    } catch {
      // Partial/corrupt backup — manifest missing
    }
    backups.push({ folderName: folder.name, manifest });
  }

  return backups;
}

/**
 * Delete a backup folder and all its contents.
 */
export async function deleteBackup(
  client: Client,
  folderName: string
): Promise<void> {
  await deleteBackupFolder(client, folderName);
}

// ─── Internal ──────────────────────────────────────────────────────────────

/**
 * Fetch all items from a list with raw SharePoint fields preserved.
 * Returns the raw Graph API response fields (including LookupId suffixes)
 * plus the numeric item id.
 */
async function getAllRawItems(
  client: Client,
  listName: string
): Promise<Record<string, unknown>[]> {
  // Re-implement pagination to get raw fields (avoid LookupId transformation in lists.ts)
  const siteId = await getSiteId(client);

  const allItems: Record<string, unknown>[] = [];
  let nextLink: string | undefined;

  do {
    let request = client
      .api(`/sites/${siteId}/lists/${listName}/items`)
      .header('Prefer', 'HonorNonIndexedQueriesWarningMayFailRandomly')
      .expand('fields')
      .top(200);

    if (nextLink) {
      request = client.api(nextLink)
        .header('Prefer', 'HonorNonIndexedQueriesWarningMayFailRandomly');
    }

    const response = await request.get();

    for (const item of response.value as Array<{ id: string; fields: Record<string, unknown> }>) {
      allItems.push({
        _itemId: Number(item.id),
        ...item.fields,
      });
    }

    nextLink = response['@odata.nextLink'] as string | undefined;
  } while (nextLink);

  return allItems;
}
