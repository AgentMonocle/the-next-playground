/**
 * Reset service — deletes ALL items from ALL TSS SharePoint lists.
 *
 * Deletion order is reverse dependency (junctions first, then entities,
 * then reference data) to avoid lookup constraint violations.
 */
import type { Client } from '@microsoft/microsoft-graph-client';
import type { OperationProgress } from '@/types';
import { getSiteId } from '@/lib/graph/sharepoint';
import { BACKUP_LIST_ORDER } from './backupService';

type ProgressCallback = (progress: OperationProgress) => void;

/** Reverse dependency order for safe deletion */
const DELETE_ORDER = [...BACKUP_LIST_ORDER].reverse();

/**
 * Delete ALL items from ALL TSS lists.
 * Processes lists in reverse dependency order to respect lookup constraints.
 */
export async function resetAllData(
  client: Client,
  onProgress?: ProgressCallback
): Promise<void> {
  const siteId = await getSiteId(client);

  for (let i = 0; i < DELETE_ORDER.length; i++) {
    const listName = DELETE_ORDER[i];

    onProgress?.({
      phase: 'Deleting',
      currentList: listName,
      listsCompleted: i,
      listsTotal: DELETE_ORDER.length,
      itemsProcessed: 0,
      itemsTotal: 0,
    });

    // Get all item IDs
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

    // Delete items one by one
    for (let j = 0; j < itemIds.length; j++) {
      await client
        .api(`/sites/${siteId}/lists/${listName}/items/${itemIds[j]}`)
        .delete();

      if ((j + 1) % 20 === 0 || j === itemIds.length - 1) {
        onProgress?.({
          phase: 'Deleting',
          currentList: listName,
          listsCompleted: i,
          listsTotal: DELETE_ORDER.length,
          itemsProcessed: j + 1,
          itemsTotal: itemIds.length,
        });
      }
    }
  }
}
