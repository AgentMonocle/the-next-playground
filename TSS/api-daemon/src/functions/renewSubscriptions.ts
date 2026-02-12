import {
  app,
  type InvocationContext,
  type Timer,
} from '@azure/functions';
import { DefaultAzureCredential } from '@azure/identity';
import { Client } from '@microsoft/microsoft-graph-client';
import { TokenCredentialAuthenticationProvider } from '@microsoft/microsoft-graph-client/authProviders/azureTokenCredentials';

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
// Types
// ---------------------------------------------------------------------------

interface GraphSubscription {
  id: string;
  resource: string;
  changeType: string;
  expirationDateTime: string;
  notificationUrl: string;
  clientState?: string;
}

// ---------------------------------------------------------------------------
// Renewal logic
// ---------------------------------------------------------------------------

/** Renew window: subscriptions expiring in less than 24 hours will be renewed. */
const RENEWAL_THRESHOLD_HOURS = 24;

/** New expiration: 48 hours from now (within 3-day max for messages). */
function getNewExpiration(): string {
  const expiry = new Date();
  expiry.setHours(expiry.getHours() + 48);
  return expiry.toISOString();
}

/**
 * Checks if a subscription is nearing expiration (< 24h remaining).
 */
function isNearingExpiration(expirationDateTime: string): boolean {
  const expiry = new Date(expirationDateTime);
  const now = new Date();
  const hoursRemaining = (expiry.getTime() - now.getTime()) / (1000 * 60 * 60);
  return hoursRemaining < RENEWAL_THRESHOLD_HOURS;
}

/**
 * Checks if a subscription has already expired.
 */
function isExpired(expirationDateTime: string): boolean {
  return new Date(expirationDateTime) < new Date();
}

// ---------------------------------------------------------------------------
// Timer handler — runs every 48 hours
// ---------------------------------------------------------------------------

export async function renewSubscriptions(
  _timer: Timer,
  context: InvocationContext
): Promise<void> {
  context.log('Subscription renewal timer triggered');

  const client = getGraphClient();

  // 1. List all active subscriptions
  let subscriptions: GraphSubscription[];
  try {
    const response = await client.api('/subscriptions').get();
    subscriptions = response?.value ?? [];
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    context.error(`Failed to list subscriptions: ${message}`);
    return;
  }

  if (subscriptions.length === 0) {
    context.log('No active subscriptions found.');
    return;
  }

  context.log(`Found ${subscriptions.length} active subscription(s)`);

  // 2. Filter to message subscriptions (our webhook subscriptions)
  const messageSubscriptions = subscriptions.filter((sub) =>
    sub.resource.includes('/messages')
  );

  if (messageSubscriptions.length === 0) {
    context.log('No message subscriptions to renew.');
    return;
  }

  // 3. Renew or recreate each subscription as needed
  let renewed = 0;
  let recreated = 0;
  let errors = 0;

  for (const sub of messageSubscriptions) {
    try {
      if (isExpired(sub.expirationDateTime)) {
        // Subscription already expired — we can't renew, must recreate
        context.warn(
          `Subscription ${sub.id} has expired (${sub.expirationDateTime}). ` +
          `Attempting to recreate...`
        );

        // Delete the expired subscription (Graph may have already cleaned it up)
        try {
          await client.api(`/subscriptions/${sub.id}`).delete();
        } catch {
          // Ignore delete errors for expired subscriptions
        }

        // Recreate with same parameters
        const notificationUrl =
          process.env.WEBHOOK_NOTIFICATION_URL ?? sub.notificationUrl;
        const clientState = process.env.WEBHOOK_CLIENT_STATE ?? sub.clientState ?? '';

        await client.api('/subscriptions').post({
          changeType: sub.changeType,
          notificationUrl,
          resource: sub.resource,
          expirationDateTime: getNewExpiration(),
          clientState,
        });

        context.log(`Recreated subscription for resource: ${sub.resource}`);
        recreated++;
      } else if (isNearingExpiration(sub.expirationDateTime)) {
        // Renew by extending expiration
        const newExpiry = getNewExpiration();

        await client.api(`/subscriptions/${sub.id}`).patch({
          expirationDateTime: newExpiry,
        });

        context.log(
          `Renewed subscription ${sub.id}: ${sub.expirationDateTime} → ${newExpiry}`
        );
        renewed++;
      } else {
        context.log(
          `Subscription ${sub.id} OK — expires ${sub.expirationDateTime}`
        );
      }
    } catch (err: unknown) {
      errors++;
      const message = err instanceof Error ? err.message : String(err);
      context.error(
        `Failed to renew/recreate subscription ${sub.id}: ${message}`
      );
    }
  }

  context.log(
    `Renewal complete: ${renewed} renewed, ${recreated} recreated, ${errors} errors`
  );
}

// ---------------------------------------------------------------------------
// Function registration — Timer trigger every 48 hours
// ---------------------------------------------------------------------------

app.timer('renewSubscriptions', {
  // NCRONTAB: sec min hour day month day-of-week
  // Every 48 hours at minute 0, second 0 → runs at midnight on even-numbered hours
  // Azure Functions NCRONTAB doesn't directly support "every 48h",
  // so we use "every day at midnight" which is sufficient for 3-day subscriptions
  schedule: '0 0 0 * * *', // Daily at midnight
  handler: renewSubscriptions,
});
