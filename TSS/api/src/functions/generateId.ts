import {
  app,
  type HttpRequest,
  type HttpResponseInit,
  type InvocationContext,
} from '@azure/functions';
import { DefaultAzureCredential } from '@azure/identity';
import { Client } from '@microsoft/microsoft-graph-client';
import { TokenCredentialAuthenticationProvider } from '@microsoft/microsoft-graph-client/authProviders/azureTokenCredentials';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface GenerateIdRequestBody {
  entityType: string;
  companyCode: string;
}

interface GenerateIdResponseBody {
  id: string;
  scopeKey: string;
  counter: number;
}

// ---------------------------------------------------------------------------
// Graph client singleton (lazy-initialised)
// ---------------------------------------------------------------------------

let graphClient: Client | undefined;

function getGraphClient(): Client {
  if (!graphClient) {
    const credential = new DefaultAzureCredential();
    const authProvider = new TokenCredentialAuthenticationProvider(credential, {
      scopes: ['https://graph.microsoft.com/.default'],
    });
    graphClient = Client.initWithMiddleware({ authProvider });
  }
  return graphClient;
}

// ---------------------------------------------------------------------------
// SharePoint helpers
// ---------------------------------------------------------------------------

const LIST_NAME = 'TSS_Sequence';
const MAX_RETRIES = 3;

function getSiteId(): string {
  const siteId = process.env.SHAREPOINT_SITE_ID;
  if (!siteId) {
    throw new Error(
      'SHAREPOINT_SITE_ID environment variable is not configured.'
    );
  }
  return siteId;
}

function buildListItemsPath(siteId: string): string {
  return `/sites/${siteId}/lists/${LIST_NAME}/items`;
}

interface SequenceItem {
  itemId: string;
  counter: number;
  etag: string;
}

/**
 * Reads the current sequence item for the given scope key from the
 * TSS_Sequence SharePoint list.  Returns `null` when no item exists yet.
 */
async function readSequenceItem(
  client: Client,
  siteId: string,
  scopeKey: string
): Promise<SequenceItem | null> {
  const path = buildListItemsPath(siteId);
  const response = await client
    .api(path)
    .filter(`fields/Title eq '${scopeKey}'`)
    .expand('fields')
    .select('id')
    .top(1)
    .get();

  const items: unknown[] | undefined = response?.value;
  if (!items || items.length === 0) {
    return null;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const item = items[0] as any;
  return {
    itemId: item.id as string,
    counter: (item.fields?.tss_counter as number) ?? 0,
    etag: (item['@odata.etag'] ?? item.fields?.['@odata.etag']) as string,
  };
}

/**
 * Creates a brand-new sequence item with counter = 1.
 */
async function createSequenceItem(
  client: Client,
  siteId: string,
  scopeKey: string
): Promise<number> {
  const path = buildListItemsPath(siteId);
  await client.api(path).post({
    fields: {
      Title: scopeKey,
      tss_counter: 1,
    },
  });
  return 1;
}

/**
 * Increments the counter on an existing sequence item using optimistic
 * concurrency (ETag).  Throws on 409 / 412 so the caller can retry.
 */
async function updateSequenceItem(
  client: Client,
  siteId: string,
  item: SequenceItem
): Promise<number> {
  const newCounter = item.counter + 1;
  const itemPath = `${buildListItemsPath(siteId)}/${item.itemId}/fields`;

  await client
    .api(itemPath)
    .header('If-Match', item.etag)
    .patch({
      tss_counter: newCounter,
    });

  return newCounter;
}

// ---------------------------------------------------------------------------
// Core ID generation with retry logic
// ---------------------------------------------------------------------------

async function generateNextId(
  client: Client,
  siteId: string,
  scopeKey: string,
  context: InvocationContext
): Promise<number> {
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const existing = await readSequenceItem(client, siteId, scopeKey);

      if (!existing) {
        // First ID for this scope — create the row.
        return await createSequenceItem(client, siteId, scopeKey);
      }

      // Increment with optimistic concurrency.
      return await updateSequenceItem(client, siteId, existing);
    } catch (err: unknown) {
      const status = (err as { statusCode?: number }).statusCode;
      if ((status === 409 || status === 412) && attempt < MAX_RETRIES) {
        context.log(
          `ETag conflict on attempt ${attempt} for scope "${scopeKey}". Retrying...`
        );
        continue;
      }
      throw err;
    }
  }

  // Should be unreachable, but satisfies the compiler.
  throw new Error(`Failed to generate ID after ${MAX_RETRIES} attempts.`);
}

// ---------------------------------------------------------------------------
// HTTP handler
// ---------------------------------------------------------------------------

export async function generateId(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  context.log('generate-id requested');

  // --- Parse & validate request body ----------------------------------------
  let body: GenerateIdRequestBody;
  try {
    body = (await request.json()) as GenerateIdRequestBody;
  } catch {
    return {
      status: 400,
      jsonBody: { error: 'Invalid JSON in request body.' },
    };
  }

  const { entityType, companyCode } = body;
  if (!entityType || !companyCode) {
    return {
      status: 400,
      jsonBody: {
        error: 'Request body must include "entityType" and "companyCode".',
      },
    };
  }

  // --- Build scope key ------------------------------------------------------
  const now = new Date();
  const year = now.getFullYear().toString();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const scopeKey = `${entityType}-${companyCode}-${year}-${month}`;

  // --- Generate the next sequential counter ----------------------------------
  try {
    const siteId = getSiteId();
    const client = getGraphClient();
    const counter = await generateNextId(client, siteId, scopeKey, context);

    const paddedCounter = String(counter).padStart(3, '0');
    const id = `${entityType}-${companyCode}-${year}-${month}-${paddedCounter}`;

    const responseBody: GenerateIdResponseBody = { id, scopeKey, counter };

    context.log(`Generated ID: ${id}`);
    return { status: 200, jsonBody: responseBody };
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : 'Unknown error generating ID.';
    context.error(`generate-id failed: ${message}`);
    return {
      status: 500,
      jsonBody: { error: message },
    };
  }
}

// ---------------------------------------------------------------------------
// Function registration
// ---------------------------------------------------------------------------

app.http('generateId', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'generate-id',
  handler: generateId,
});
