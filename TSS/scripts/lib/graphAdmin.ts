/**
 * Graph API client for provisioning scripts.
 * Uses DefaultAzureCredential which falls back through:
 *   1. Environment variables (CI/CD)
 *   2. Managed Identity (Azure)
 *   3. Azure CLI (`az login`) — local dev
 */
import { Client } from '@microsoft/microsoft-graph-client';
import { DeviceCodeCredential, DefaultAzureCredential } from '@azure/identity';
import 'isomorphic-fetch';

const SHAREPOINT_SITE_URL = 'https://tejasre.sharepoint.com/sites/sales';
const GRAPH_SCOPES = ['https://graph.microsoft.com/.default'];

let cachedClient: Client | null = null;
let cachedSiteId: string | null = null;

/**
 * Create a Graph client authenticated via DefaultAzureCredential.
 * For local dev, make sure you've run `az login` first.
 */
export function getAdminClient(): Client {
  if (cachedClient) return cachedClient;

  const credential = new DefaultAzureCredential();

  cachedClient = Client.initWithMiddleware({
    authProvider: {
      getAccessToken: async () => {
        const token = await credential.getToken(GRAPH_SCOPES);
        return token.token;
      },
    },
  });

  return cachedClient;
}

/**
 * Get the SharePoint site ID for the TSS site.
 */
export async function getSiteId(client: Client): Promise<string> {
  if (cachedSiteId) return cachedSiteId;

  const url = new URL(SHAREPOINT_SITE_URL);
  const hostname = url.hostname;
  const sitePath = url.pathname;

  const site = await client.api(`/sites/${hostname}:${sitePath}`).get();
  cachedSiteId = site.id as string;
  console.log(`  Site ID: ${cachedSiteId}`);
  return cachedSiteId;
}

// ─── Column type definitions ─────────────────────────────────────────────────

export type ColumnType =
  | 'text'
  | 'note'
  | 'choice'
  | 'number'
  | 'currency'
  | 'dateTime'
  | 'boolean'
  | 'lookup'
  | 'person'
  | 'hyperlink';

export interface ColumnDefinition {
  name: string;           // Internal name (e.g., tss_companyCode)
  displayName: string;    // Display name (e.g., Company Code)
  type: ColumnType;
  required?: boolean;
  indexed?: boolean;
  // Type-specific options
  choices?: string[];     // For 'choice' type
  lookupListName?: string;  // For 'lookup' type — list display name to look up
  lookupColumnName?: string; // For 'lookup' type — column to display (default: Title)
  multiline?: boolean;    // For 'note' type
  maxLength?: number;     // For 'text' type
}

export interface ListDefinition {
  displayName: string;
  description?: string;
  columns: ColumnDefinition[];
}

// ─── List provisioning ──────────────────────────────────────────────────────

/**
 * Check if a list already exists on the site.
 */
async function listExists(client: Client, siteId: string, listName: string): Promise<boolean> {
  try {
    await client.api(`/sites/${siteId}/lists/${listName}`).get();
    return true;
  } catch (err: unknown) {
    const error = err as { statusCode?: number };
    if (error.statusCode === 404) return false;
    throw err;
  }
}

/**
 * Get existing columns for a list.
 */
async function getExistingColumns(client: Client, siteId: string, listName: string): Promise<Set<string>> {
  const response = await client.api(`/sites/${siteId}/lists/${listName}/columns`).get();
  const names = new Set<string>();
  for (const col of response.value) {
    names.add(col.name as string);
  }
  return names;
}

/**
 * Get the list ID for a list by its display name (needed for lookup columns).
 */
async function getListId(client: Client, siteId: string, listDisplayName: string): Promise<string> {
  const list = await client.api(`/sites/${siteId}/lists/${listDisplayName}`).get();
  return list.id as string;
}

/**
 * Build the Graph API column creation body for a given column definition.
 */
function buildColumnBody(col: ColumnDefinition, siteId: string, listIdLookup: Map<string, string>): Record<string, unknown> {
  const body: Record<string, unknown> = {
    name: col.name,
    displayName: col.displayName,
    enforceUniqueValues: false,
  };

  if (col.required) {
    body.required = true;
  }

  if (col.indexed) {
    body.indexed = true;
  }

  switch (col.type) {
    case 'text':
      body.text = {
        allowMultipleLines: false,
        maxLength: col.maxLength ?? 255,
      };
      break;

    case 'note':
      body.text = {
        allowMultipleLines: true,
        textType: 'plain',
      };
      break;

    case 'choice':
      body.choice = {
        allowTextEntry: false,
        choices: col.choices ?? [],
        displayAs: 'dropDownMenu',
      };
      break;

    case 'number':
      body.number = {
        decimalPlaces: 'automatic',
      };
      break;

    case 'currency':
      body.currency = {
        locale: 'en-US',
      };
      break;

    case 'dateTime':
      body.dateTime = {
        format: 'dateTime',
      };
      break;

    case 'boolean':
      body.boolean = {};
      break;

    case 'lookup': {
      if (!col.lookupListName) {
        throw new Error(`Lookup column ${col.name} must specify lookupListName`);
      }
      const lookupListId = listIdLookup.get(col.lookupListName);
      if (!lookupListId) {
        throw new Error(`Lookup list "${col.lookupListName}" not found. Make sure it's created first.`);
      }
      body.lookup = {
        listId: lookupListId,
        columnName: col.lookupColumnName ?? 'Title',
      };
      break;
    }

    case 'person':
      body.personOrGroup = {
        allowMultipleSelection: false,
        chooseFromType: 'peopleOnly',
      };
      break;

    case 'hyperlink':
      // Graph API represents hyperlinks as text columns with a specific format
      // SharePoint uses hyperlinkOrPicture internally
      body.hyperlinkOrPicture = {
        isPicture: false,
      };
      break;
  }

  return body;
}

/**
 * Ensure a SharePoint list exists with the specified columns.
 * Idempotent: skips creation if list exists, only adds missing columns.
 */
export async function ensureList(
  client: Client,
  siteId: string,
  definition: ListDefinition,
  listIdLookup: Map<string, string>
): Promise<void> {
  const { displayName, description, columns } = definition;

  console.log(`\n📋 Ensuring list: ${displayName}`);

  // Step 1: Create list if it doesn't exist
  const exists = await listExists(client, siteId, displayName);
  if (!exists) {
    console.log(`  Creating list...`);
    const newList = await client.api(`/sites/${siteId}/lists`).post({
      displayName,
      description: description ?? `TSS ${displayName} list`,
      list: {
        template: 'genericList',
      },
    });
    listIdLookup.set(displayName, newList.id as string);
    console.log(`  ✅ Created (ID: ${newList.id})`);
  } else {
    console.log(`  Already exists, checking columns...`);
    // Cache the list ID
    if (!listIdLookup.has(displayName)) {
      const listId = await getListId(client, siteId, displayName);
      listIdLookup.set(displayName, listId);
    }
  }

  // Step 2: Add missing columns
  const existingColumns = await getExistingColumns(client, siteId, displayName);
  let addedCount = 0;

  for (const col of columns) {
    if (existingColumns.has(col.name)) {
      continue;
    }

    try {
      const body = buildColumnBody(col, siteId, listIdLookup);
      await client.api(`/sites/${siteId}/lists/${displayName}/columns`).post(body);
      console.log(`  + ${col.name} (${col.type})`);
      addedCount++;
    } catch (err: unknown) {
      const error = err as { message?: string; statusCode?: number };
      console.error(`  ❌ Failed to add column ${col.name}: ${error.message ?? 'Unknown error'}`);
      throw err;
    }
  }

  if (addedCount === 0) {
    console.log(`  All columns present`);
  } else {
    console.log(`  ✅ Added ${addedCount} column(s)`);
  }
}

// ─── Seed data helpers ──────────────────────────────────────────────────────

/**
 * Get all items from a list (handles pagination).
 */
export async function getAllListItems(
  client: Client,
  siteId: string,
  listName: string,
  select?: string[]
): Promise<Record<string, unknown>[]> {
  const items: Record<string, unknown>[] = [];
  let url = `/sites/${siteId}/lists/${listName}/items?$expand=fields`;
  if (select && select.length > 0) {
    url += `&$select=fields&$expand=fields($select=${select.join(',')})`;
  }
  url += '&$top=200';

  let response = await client.api(url).get();
  items.push(...(response.value as Record<string, unknown>[]));

  while (response['@odata.nextLink']) {
    response = await client.api(response['@odata.nextLink']).get();
    items.push(...(response.value as Record<string, unknown>[]));
  }

  return items;
}

/**
 * Create a single item in a list.
 */
export async function createListItem(
  client: Client,
  siteId: string,
  listName: string,
  fields: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const response = await client.api(`/sites/${siteId}/lists/${listName}/items`).post({
    fields,
  });
  return response as Record<string, unknown>;
}

/**
 * Update a single item in a list.
 */
export async function updateListItemFields(
  client: Client,
  siteId: string,
  listName: string,
  itemId: string | number,
  fields: Record<string, unknown>
): Promise<void> {
  await client.api(`/sites/${siteId}/lists/${listName}/items/${itemId}/fields`).patch(fields);
}

/**
 * Create items in batches for performance.
 * Graph API batch requests support up to 20 requests per batch.
 */
export async function batchCreateItems(
  client: Client,
  siteId: string,
  listName: string,
  itemsData: Record<string, unknown>[],
  batchSize = 20
): Promise<number> {
  let created = 0;

  for (let i = 0; i < itemsData.length; i += batchSize) {
    const batch = itemsData.slice(i, i + batchSize);

    const batchRequestContent = {
      requests: batch.map((fields, idx) => ({
        id: String(idx + 1),
        method: 'POST',
        url: `/sites/${siteId}/lists/${listName}/items`,
        headers: { 'Content-Type': 'application/json' },
        body: { fields },
      })),
    };

    const response = await client.api('/$batch').post(batchRequestContent);
    const responses = response.responses as Array<{ id: string; status: number; body?: unknown }>;

    for (const r of responses) {
      if (r.status >= 200 && r.status < 300) {
        created++;
      } else {
        console.error(`  ❌ Batch item ${r.id} failed (${r.status}):`, r.body);
      }
    }

    if (i + batchSize < itemsData.length) {
      // Small delay between batches to avoid throttling
      await new Promise(resolve => setTimeout(resolve, 200));
    }
  }

  return created;
}

/**
 * Find an item by a field value (e.g., find a country by its code).
 */
export async function findItemByField(
  client: Client,
  siteId: string,
  listName: string,
  fieldName: string,
  fieldValue: string
): Promise<Record<string, unknown> | null> {
  const response = await client
    .api(`/sites/${siteId}/lists/${listName}/items`)
    .filter(`fields/${fieldName} eq '${fieldValue.replace(/'/g, "''")}'`)
    .expand('fields')
    .top(1)
    .get();

  const items = response.value as Record<string, unknown>[];
  return items.length > 0 ? items[0] : null;
}
