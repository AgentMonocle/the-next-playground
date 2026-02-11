/**
 * Generic SharePoint List CRUD service via Microsoft Graph API.
 *
 * Provides typed operations for any TSS SharePoint list:
 *   - getListItems / getListItem — read with filtering, sorting, pagination
 *   - createListItem / updateListItem / deleteListItem — write operations
 *   - OData filter builder utilities
 */
import type { Client } from '@microsoft/microsoft-graph-client';
import { getSiteId } from './sharepoint';
import type { PaginatedResponse } from '@/types';

// ─── Query Options ──────────────────────────────────────────────────────────

export interface ListQueryOptions {
  filter?: string;
  orderBy?: string;
  top?: number;
  select?: string[];
  expand?: string[];
  skipToken?: string;
}

// ─── Read Operations ────────────────────────────────────────────────────────

/**
 * Fetch items from a SharePoint list with optional filtering, sorting, and pagination.
 */
export async function getListItems<T>(
  client: Client,
  listName: string,
  options: ListQueryOptions = {}
): Promise<PaginatedResponse<T>> {
  const siteId = await getSiteId(client);
  const { filter, orderBy, top = 100, select, skipToken } = options;

  let request = client
    .api(`/sites/${siteId}/lists/${listName}/items`)
    .header('Prefer', 'HonorNonIndexedQueriesWarningMayFailRandomly')
    .expand('fields')
    .top(top);

  if (filter) {
    request = request.filter(filter);
  }

  if (orderBy) {
    request = request.orderby(orderBy);
  }

  if (select && select.length > 0) {
    // Select specific fields from the expanded fields
    request = request.select(`id,fields`);
  }

  if (skipToken) {
    request = request.skipToken(skipToken);
  }

  const response = await request.get();

  const items: T[] = (response.value as Array<{ id: string; fields: Record<string, unknown> }>).map(
    (item) => ({
      id: Number(item.id),
      ...item.fields,
    }) as T
  );

  return {
    items,
    nextLink: response['@odata.nextLink'] as string | undefined,
  };
}

/**
 * Fetch ALL items from a list (follows pagination links).
 * Use with caution on large lists — prefer getListItems with pagination for UI.
 */
export async function getAllListItems<T>(
  client: Client,
  listName: string,
  options: Omit<ListQueryOptions, 'skipToken' | 'top'> = {}
): Promise<T[]> {
  const allItems: T[] = [];
  let nextLink: string | undefined;

  do {
    const result = await getListItems<T>(client, listName, {
      ...options,
      top: 200,
      skipToken: nextLink ? extractSkipToken(nextLink) : undefined,
    });
    allItems.push(...result.items);
    nextLink = result.nextLink;
  } while (nextLink);

  return allItems;
}

/**
 * Fetch a single item by its SharePoint list item ID.
 */
export async function getListItem<T>(
  client: Client,
  listName: string,
  itemId: number
): Promise<T> {
  const siteId = await getSiteId(client);

  const response = await client
    .api(`/sites/${siteId}/lists/${listName}/items/${itemId}`)
    .expand('fields')
    .get();

  return {
    id: Number(response.id),
    ...response.fields,
  } as T;
}

// ─── Write Operations ───────────────────────────────────────────────────────

/**
 * Create a new item in a SharePoint list.
 */
export async function createListItem<T>(
  client: Client,
  listName: string,
  fields: Record<string, unknown>
): Promise<T> {
  const siteId = await getSiteId(client);

  const response = await client
    .api(`/sites/${siteId}/lists/${listName}/items`)
    .post({ fields });

  return {
    id: Number(response.id),
    ...response.fields,
  } as T;
}

/**
 * Update an existing item's fields.
 * Optionally pass an ETag for optimistic concurrency.
 */
export async function updateListItem(
  client: Client,
  listName: string,
  itemId: number,
  fields: Record<string, unknown>,
  etag?: string
): Promise<void> {
  const siteId = await getSiteId(client);

  let request = client
    .api(`/sites/${siteId}/lists/${listName}/items/${itemId}/fields`);

  if (etag) {
    request = request.header('If-Match', etag);
  }

  await request.patch(fields);
}

/**
 * Soft-delete an item by setting tss_isActive = false.
 * Use this for entities that support soft delete (Company, Contact, etc.)
 */
export async function softDeleteListItem(
  client: Client,
  listName: string,
  itemId: number
): Promise<void> {
  await updateListItem(client, listName, itemId, { tss_isActive: false });
}

// ─── OData Filter Helpers ───────────────────────────────────────────────────

/**
 * Build an OData filter string from conditions.
 * All conditions are AND'd together.
 */
export function buildFilter(conditions: FilterCondition[]): string {
  return conditions
    .filter((c) => c.value !== undefined && c.value !== null && c.value !== '')
    .map((c) => {
      const fieldPath = `fields/${c.field}`;
      switch (c.operator) {
        case 'eq':
          return typeof c.value === 'string'
            ? `${fieldPath} eq '${escapeOData(c.value)}'`
            : `${fieldPath} eq ${c.value}`;
        case 'ne':
          return typeof c.value === 'string'
            ? `${fieldPath} ne '${escapeOData(c.value)}'`
            : `${fieldPath} ne ${c.value}`;
        case 'contains':
          return `contains(${fieldPath},'${escapeOData(String(c.value))}')`;
        case 'startsWith':
          return `startsWith(${fieldPath},'${escapeOData(String(c.value))}')`;
        case 'gt':
          return `${fieldPath} gt ${c.value}`;
        case 'lt':
          return `${fieldPath} lt ${c.value}`;
        case 'ge':
          return `${fieldPath} ge ${c.value}`;
        case 'le':
          return `${fieldPath} le ${c.value}`;
        default:
          return '';
      }
    })
    .filter(Boolean)
    .join(' and ');
}

export interface FilterCondition {
  field: string;
  operator: 'eq' | 'ne' | 'contains' | 'startsWith' | 'gt' | 'lt' | 'ge' | 'le';
  value: string | number | boolean | undefined | null;
}

// ─── Lookup Field Helpers ───────────────────────────────────────────────────

/**
 * Format a lookup field value for create/update operations.
 * SharePoint Graph API expects lookup fields as `{fieldName}LookupId: number`.
 */
export function setLookupField(fieldName: string, lookupId: number | undefined): Record<string, unknown> {
  if (lookupId === undefined) return {};
  return { [`${fieldName}LookupId`]: lookupId };
}

// ─── Internal Helpers ───────────────────────────────────────────────────────

function escapeOData(value: string): string {
  return value.replace(/'/g, "''");
}

function extractSkipToken(nextLink: string): string | undefined {
  try {
    const url = new URL(nextLink);
    return url.searchParams.get('$skipToken') ?? undefined;
  } catch {
    return undefined;
  }
}
