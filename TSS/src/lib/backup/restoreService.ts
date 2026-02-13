/**
 * Restore service — restores SharePoint list data from a TSS_Backups snapshot.
 *
 * Downloads all JSON files from a backup folder, deletes existing items,
 * then recreates items in dependency order with ID remapping for lookups.
 *
 * Two-pass approach for self-referential lists (Company.parentCompanyId,
 * Opportunity.relatedOpportunityId): create items without self-refs first,
 * then patch self-refs using the old→new ID map.
 */
import type { Client } from '@microsoft/microsoft-graph-client';
import type { OperationProgress } from '@/types';
import { getSiteId } from '@/lib/graph/sharepoint';
import { downloadBackupFile } from '@/lib/graph/drive';
import { BACKUP_LIST_ORDER } from './backupService';

type ProgressCallback = (progress: OperationProgress) => void;

/** Fields that contain lookup references (fieldName → target list) */
const LOOKUP_FIELDS: Record<string, Record<string, string>> = {
  TSS_BasinRegion: { tss_countryIdLookupId: 'TSS_Country' },
  TSS_Company: {
    tss_countryIdLookupId: 'TSS_Country',
    tss_parentCompanyIdLookupId: 'TSS_Company', // self-ref
  },
  TSS_Contact: { tss_companyIdLookupId: 'TSS_Company' },
  TSS_Opportunity: {
    tss_companyIdLookupId: 'TSS_Company',
    tss_primaryContactIdLookupId: 'TSS_Contact',
    tss_relatedOpportunityIdLookupId: 'TSS_Opportunity', // self-ref
  },
  TSS_Activity: {
    tss_companyIdLookupId: 'TSS_Company',
    tss_contactIdLookupId: 'TSS_Contact',
    tss_opportunityIdLookupId: 'TSS_Opportunity',
  },
  TSS_BasinRegionCountry: {
    tss_basinRegionIdLookupId: 'TSS_BasinRegion',
    tss_countryIdLookupId: 'TSS_Country',
  },
  TSS_CompanyBasin: {
    tss_companyIdLookupId: 'TSS_Company',
    tss_basinRegionIdLookupId: 'TSS_BasinRegion',
  },
  TSS_ContactBasin: {
    tss_contactIdLookupId: 'TSS_Contact',
    tss_basinRegionIdLookupId: 'TSS_BasinRegion',
  },
  TSS_OpportunityBasin: {
    tss_opportunityIdLookupId: 'TSS_Opportunity',
    tss_basinRegionIdLookupId: 'TSS_BasinRegion',
  },
};

/** Self-referential lookup fields that need a second pass */
const SELF_REF_FIELDS: Record<string, string[]> = {
  TSS_Company: ['tss_parentCompanyIdLookupId'],
  TSS_Opportunity: ['tss_relatedOpportunityIdLookupId'],
};

/** SharePoint system fields to strip before creating items */
const SYSTEM_FIELDS = new Set([
  '_itemId', 'id', 'Created', 'Modified', 'AuthorLookupId', 'EditorLookupId',
  'Author', 'Editor', '_UIVersionString', 'Attachments', 'Edit',
  'ContentType', 'ContentTypeId', '_ComplianceFlags', '_ComplianceTag',
  '_ComplianceTagWrittenTime', '_ComplianceTagUserId',
  '_ModerationComments', '_ModerationStatus',
  'AppAuthorLookupId', 'AppEditorLookupId',
]);

/**
 * Restore all list data from a backup folder.
 *
 * 1. Downloads all list JSON files from the backup
 * 2. Deletes all existing items from each list (reverse dependency order)
 * 3. Creates items in dependency order, building old→new ID maps
 * 4. Second pass: patches self-referential lookups
 */
export async function restoreFromBackup(
  client: Client,
  folderName: string,
  onProgress?: ProgressCallback
): Promise<void> {
  const siteId = await getSiteId(client);

  // Maps: listName → (oldItemId → newItemId)
  const idMaps = new Map<string, Map<number, number>>();

  // Phase 1: Download all backup data
  onProgress?.({
    phase: 'Downloading backup',
    listsCompleted: 0,
    listsTotal: BACKUP_LIST_ORDER.length,
    itemsProcessed: 0,
    itemsTotal: 0,
  });

  const backupData = new Map<string, Record<string, unknown>[]>();
  for (const listName of BACKUP_LIST_ORDER) {
    try {
      const items = await downloadBackupFile<Record<string, unknown>[]>(
        client,
        folderName,
        `${listName}.json`
      );
      backupData.set(listName, items);
    } catch {
      // List file missing in backup — skip (may not have existed when backup was taken)
      backupData.set(listName, []);
    }
  }

  // Phase 2: Delete existing items (reverse dependency order)
  const reverseOrder = [...BACKUP_LIST_ORDER].reverse();
  for (let i = 0; i < reverseOrder.length; i++) {
    const listName = reverseOrder[i];
    onProgress?.({
      phase: 'Clearing existing data',
      currentList: listName,
      listsCompleted: i,
      listsTotal: reverseOrder.length,
      itemsProcessed: 0,
      itemsTotal: 0,
    });

    await deleteAllItems(client, siteId, listName, (processed, total) => {
      onProgress?.({
        phase: 'Clearing existing data',
        currentList: listName,
        listsCompleted: i,
        listsTotal: reverseOrder.length,
        itemsProcessed: processed,
        itemsTotal: total,
      });
    });
  }

  // Phase 3: Create items in dependency order
  for (let i = 0; i < BACKUP_LIST_ORDER.length; i++) {
    const listName = BACKUP_LIST_ORDER[i];
    const items = backupData.get(listName) ?? [];
    const listIdMap = new Map<number, number>();
    idMaps.set(listName, listIdMap);

    const selfRefFields = SELF_REF_FIELDS[listName] ?? [];

    onProgress?.({
      phase: 'Restoring',
      currentList: listName,
      listsCompleted: i,
      listsTotal: BACKUP_LIST_ORDER.length,
      itemsProcessed: 0,
      itemsTotal: items.length,
    });

    for (let j = 0; j < items.length; j++) {
      const rawItem = items[j];
      const oldId = rawItem._itemId as number;

      // Build fields, remapping lookups and stripping system fields
      const fields = buildRestoreFields(rawItem, listName, idMaps, selfRefFields);

      const newItem = await createItem(client, siteId, listName, fields);
      listIdMap.set(oldId, Number(newItem.id));

      if ((j + 1) % 20 === 0 || j === items.length - 1) {
        onProgress?.({
          phase: 'Restoring',
          currentList: listName,
          listsCompleted: i,
          listsTotal: BACKUP_LIST_ORDER.length,
          itemsProcessed: j + 1,
          itemsTotal: items.length,
        });
      }
    }
  }

  // Phase 4: Patch self-referential lookups
  for (const [listName, selfRefFieldNames] of Object.entries(SELF_REF_FIELDS)) {
    const items = backupData.get(listName) ?? [];
    const listIdMap = idMaps.get(listName)!;

    onProgress?.({
      phase: 'Linking self-references',
      currentList: listName,
      listsCompleted: BACKUP_LIST_ORDER.length,
      listsTotal: BACKUP_LIST_ORDER.length,
      itemsProcessed: 0,
      itemsTotal: items.length,
    });

    for (let j = 0; j < items.length; j++) {
      const rawItem = items[j];
      const oldId = rawItem._itemId as number;
      const newId = listIdMap.get(oldId);
      if (!newId) continue;

      const patchFields: Record<string, unknown> = {};
      let hasPatch = false;

      for (const field of selfRefFieldNames) {
        const oldRefId = rawItem[field];
        if (oldRefId != null) {
          const newRefId = listIdMap.get(Number(oldRefId));
          if (newRefId != null) {
            patchFields[field] = newRefId;
            hasPatch = true;
          }
        }
      }

      if (hasPatch) {
        await patchItem(client, siteId, listName, newId, patchFields);
      }
    }
  }
}

// ─── Internal Helpers ──────────────────────────────────────────────────────

function buildRestoreFields(
  rawItem: Record<string, unknown>,
  listName: string,
  idMaps: Map<string, Map<number, number>>,
  selfRefFields: string[]
): Record<string, unknown> {
  const fields: Record<string, unknown> = {};
  const lookupConfig = LOOKUP_FIELDS[listName] ?? {};

  for (const [key, value] of Object.entries(rawItem)) {
    if (SYSTEM_FIELDS.has(key)) continue;
    // Skip OData metadata fields (@odata.etag, etc.)
    if (key.startsWith('@odata.')) continue;

    // Skip self-referential fields — handled in pass 2
    if (selfRefFields.includes(key)) continue;

    // Remap lookup fields using ID maps
    if (key in lookupConfig && value != null) {
      const targetList = lookupConfig[key];
      const targetIdMap = idMaps.get(targetList);
      if (targetIdMap) {
        const newId = targetIdMap.get(Number(value));
        if (newId != null) {
          fields[key] = newId;
          continue;
        }
      }
      // If we can't remap (target not yet restored), skip the field
      continue;
    }

    fields[key] = value;
  }

  return fields;
}

async function deleteAllItems(
  client: Client,
  siteId: string,
  listName: string,
  onProgress?: (processed: number, total: number) => void
): Promise<void> {
  // First, get all item IDs
  const itemIds: number[] = [];
  let nextLink: string | undefined;

  do {
    let request = client
      .api(`/sites/${siteId}/lists/${listName}/items`)
      .header('Prefer', 'HonorNonIndexedQueriesWarningMayFailRandomly')
      .select('id')
      .top(200);

    if (nextLink) {
      request = client.api(nextLink)
        .header('Prefer', 'HonorNonIndexedQueriesWarningMayFailRandomly');
    }

    const response = await request.get();
    for (const item of response.value as Array<{ id: string }>) {
      itemIds.push(Number(item.id));
    }
    nextLink = response['@odata.nextLink'] as string | undefined;
  } while (nextLink);

  // Delete one by one
  for (let i = 0; i < itemIds.length; i++) {
    await client
      .api(`/sites/${siteId}/lists/${listName}/items/${itemIds[i]}`)
      .delete();

    if ((i + 1) % 20 === 0 || i === itemIds.length - 1) {
      onProgress?.(i + 1, itemIds.length);
    }
  }
}

async function createItem(
  client: Client,
  siteId: string,
  listName: string,
  fields: Record<string, unknown>
): Promise<{ id: string }> {
  return client
    .api(`/sites/${siteId}/lists/${listName}/items`)
    .post({ fields });
}

async function patchItem(
  client: Client,
  siteId: string,
  listName: string,
  itemId: number,
  fields: Record<string, unknown>
): Promise<void> {
  await client
    .api(`/sites/${siteId}/lists/${listName}/items/${itemId}/fields`)
    .patch(fields);
}
