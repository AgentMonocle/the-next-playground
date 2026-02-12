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

interface CreateSubscriptionRequestBody {
  /** Microsoft Entra user ID (GUID) to monitor for new emails. */
  userId: string;
}

interface SubscriptionResponse {
  id: string;
  resource: string;
  changeType: string;
  expirationDateTime: string;
  clientState: string;
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
// Helpers
// ---------------------------------------------------------------------------

function getNotificationUrl(): string {
  // In production, SWA hostname is auto-resolved.
  // Allow override via environment variable for testing.
  const overrideUrl = process.env.WEBHOOK_NOTIFICATION_URL;
  if (overrideUrl) return overrideUrl;

  // Azure Static Web Apps host the API at the same origin
  // The SWA runtime proxies /api/* to the Functions backend
  // We cannot auto-detect the hostname in Azure Functions v4,
  // so this MUST be set via application settings.
  throw new Error(
    'WEBHOOK_NOTIFICATION_URL environment variable is not configured. ' +
    'Set it to https://<your-swa-hostname>/api/email-webhook'
  );
}

function getClientState(): string {
  const secret = process.env.WEBHOOK_CLIENT_STATE;
  if (!secret) {
    throw new Error(
      'WEBHOOK_CLIENT_STATE environment variable is not configured. ' +
      'Set a random string to validate incoming webhook calls.'
    );
  }
  return secret;
}

/**
 * Graph message subscriptions expire after a maximum of 3 days (4230 minutes).
 * We set expiration to 2 days from now to leave a comfortable renewal buffer.
 */
function getExpirationDateTime(): string {
  const expiry = new Date();
  expiry.setHours(expiry.getHours() + 48);
  return expiry.toISOString();
}

// ---------------------------------------------------------------------------
// HTTP handler — POST /api/subscriptions
// ---------------------------------------------------------------------------

export async function createSubscription(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  context.log('create-subscription requested');

  // --- Parse request body ---------------------------------------------------
  let body: CreateSubscriptionRequestBody;
  try {
    body = (await request.json()) as CreateSubscriptionRequestBody;
  } catch {
    return {
      status: 400,
      jsonBody: { error: 'Invalid JSON in request body.' },
    };
  }

  const { userId } = body;
  if (!userId) {
    return {
      status: 400,
      jsonBody: { error: 'Request body must include "userId" (Entra user GUID).' },
    };
  }

  // --- Create Graph webhook subscription ------------------------------------
  try {
    const client = getGraphClient();
    const notificationUrl = getNotificationUrl();
    const clientState = getClientState();
    const expirationDateTime = getExpirationDateTime();

    const subscriptionPayload = {
      changeType: 'created',
      notificationUrl,
      resource: `/users/${userId}/messages`,
      expirationDateTime,
      clientState,
    };

    context.log(
      `Creating subscription for user ${userId}, expiry: ${expirationDateTime}`
    );

    const subscription: SubscriptionResponse = await client
      .api('/subscriptions')
      .post(subscriptionPayload);

    context.log(`Subscription created: ${subscription.id}`);

    return {
      status: 201,
      jsonBody: {
        subscriptionId: subscription.id,
        resource: subscription.resource,
        expirationDateTime: subscription.expirationDateTime,
      },
    };
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : 'Unknown error creating subscription.';
    context.error(`create-subscription failed: ${message}`);
    return {
      status: 500,
      jsonBody: { error: message },
    };
  }
}

// ---------------------------------------------------------------------------
// GET /api/subscriptions — List active subscriptions
// ---------------------------------------------------------------------------

export async function listSubscriptions(
  _request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  context.log('list-subscriptions requested');

  try {
    const client = getGraphClient();
    const response = await client.api('/subscriptions').get();

    const subscriptions = (response?.value ?? []).map(
      (sub: SubscriptionResponse) => ({
        id: sub.id,
        resource: sub.resource,
        changeType: sub.changeType,
        expirationDateTime: sub.expirationDateTime,
      })
    );

    return { status: 200, jsonBody: { subscriptions } };
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : 'Unknown error listing subscriptions.';
    context.error(`list-subscriptions failed: ${message}`);
    return {
      status: 500,
      jsonBody: { error: message },
    };
  }
}

// ---------------------------------------------------------------------------
// DELETE /api/subscriptions/{id} — Delete a subscription
// ---------------------------------------------------------------------------

export async function deleteSubscription(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  const subscriptionId = request.params.id;
  if (!subscriptionId) {
    return {
      status: 400,
      jsonBody: { error: 'Subscription ID is required.' },
    };
  }

  context.log(`delete-subscription requested: ${subscriptionId}`);

  try {
    const client = getGraphClient();
    await client.api(`/subscriptions/${subscriptionId}`).delete();

    context.log(`Subscription deleted: ${subscriptionId}`);
    return { status: 204 };
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : 'Unknown error deleting subscription.';
    context.error(`delete-subscription failed: ${message}`);
    return {
      status: 500,
      jsonBody: { error: message },
    };
  }
}

// ---------------------------------------------------------------------------
// Function registrations
// ---------------------------------------------------------------------------

app.http('createSubscription', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'subscriptions',
  handler: createSubscription,
});

app.http('listSubscriptions', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'subscriptions',
  handler: listSubscriptions,
});

app.http('deleteSubscription', {
  methods: ['DELETE'],
  authLevel: 'anonymous',
  route: 'subscriptions/{id}',
  handler: deleteSubscription,
});
