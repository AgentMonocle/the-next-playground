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

interface GraphNotification {
  value: NotificationItem[];
}

interface NotificationItem {
  subscriptionId: string;
  changeType: string;
  resource: string;
  resourceData: {
    id: string;
    '@odata.type': string;
    '@odata.id': string;
    '@odata.etag': string;
  };
  clientState: string;
  tenantId: string;
}

interface EmailMessage {
  id: string;
  subject: string;
  receivedDateTime: string;
  from: {
    emailAddress: { name: string; address: string };
  };
  toRecipients: Array<{
    emailAddress: { name: string; address: string };
  }>;
  ccRecipients: Array<{
    emailAddress: { name: string; address: string };
  }>;
}

interface ContactItem {
  id: string;
  fields: {
    id: string;
    Title: string;
    tss_email: string;
    tss_companyIdLookupId?: string;
  };
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

function getSiteId(): string {
  const siteId = process.env.SHAREPOINT_SITE_ID;
  if (!siteId) {
    throw new Error('SHAREPOINT_SITE_ID environment variable is not configured.');
  }
  return siteId;
}

function getClientState(): string {
  return process.env.WEBHOOK_CLIENT_STATE ?? '';
}

const ACTIVITY_LIST = 'TSS_Activity';
const CONTACT_LIST = 'TSS_Contact';

// ---------------------------------------------------------------------------
// Contact matching
// ---------------------------------------------------------------------------

/**
 * Queries TSS_Contact for a record matching the given email address.
 * Returns the contact's SharePoint item ID and company lookup ID, or null.
 */
async function findContactByEmail(
  client: Client,
  siteId: string,
  email: string
): Promise<{ contactId: number; contactName: string; companyLookupId?: number } | null> {
  try {
    const path = `/sites/${siteId}/lists/${CONTACT_LIST}/items`;
    const response = await client
      .api(path)
      .filter(`fields/tss_email eq '${email}'`)
      .expand('fields')
      .select('id')
      .top(1)
      .get();

    const items: ContactItem[] = response?.value ?? [];
    if (items.length === 0) return null;

    const item = items[0];
    const companyLookupId = item.fields.tss_companyIdLookupId
      ? Number(item.fields.tss_companyIdLookupId)
      : undefined;

    return {
      contactId: Number(item.id),
      contactName: item.fields.Title,
      companyLookupId,
    };
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Deduplication
// ---------------------------------------------------------------------------

/**
 * Checks if an activity already exists for this email message ID.
 */
async function activityExistsForMessage(
  client: Client,
  siteId: string,
  messageId: string
): Promise<boolean> {
  try {
    const path = `/sites/${siteId}/lists/${ACTIVITY_LIST}/items`;
    const response = await client
      .api(path)
      .filter(`fields/tss_emailMessageId eq '${messageId}'`)
      .select('id')
      .top(1)
      .get();

    return (response?.value?.length ?? 0) > 0;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Activity creation
// ---------------------------------------------------------------------------

async function createEmailActivity(
  client: Client,
  siteId: string,
  email: EmailMessage,
  contact: { contactId: number; contactName: string; companyLookupId?: number },
  direction: 'Inbound' | 'Outbound',
  ownerName: string
): Promise<void> {
  const fields: Record<string, unknown> = {
    Title: email.subject || '(No Subject)',
    tss_activityType: 'Email',
    tss_activityDate: email.receivedDateTime,
    tss_direction: direction,
    tss_owner: ownerName,
    tss_source: 'Email Auto-Link',
    tss_isAutoCreated: true,
    tss_emailMessageId: email.id,
    tss_contactIdLookupId: contact.contactId,
  };

  if (contact.companyLookupId) {
    fields.tss_companyIdLookupId = contact.companyLookupId;
  }

  // Truncate body preview for description (if available)
  const description =
    direction === 'Inbound'
      ? `Email from ${contact.contactName} (${email.from.emailAddress.address})`
      : `Email to ${contact.contactName}`;
  fields.tss_description = description;

  const path = `/sites/${siteId}/lists/${ACTIVITY_LIST}/items`;
  await client.api(path).post({ fields });
}

// ---------------------------------------------------------------------------
// Get user display name from Graph
// ---------------------------------------------------------------------------

async function getUserDisplayName(
  client: Client,
  userId: string
): Promise<string> {
  try {
    const user = await client
      .api(`/users/${userId}`)
      .select('displayName')
      .get();
    return user?.displayName ?? 'Unknown';
  } catch {
    return 'Unknown';
  }
}

// ---------------------------------------------------------------------------
// Process a single notification
// ---------------------------------------------------------------------------

async function processNotification(
  client: Client,
  siteId: string,
  notification: NotificationItem,
  context: InvocationContext
): Promise<void> {
  const { resource } = notification;
  // resource is like: /users/{userId}/messages/{messageId}
  const parts = resource.split('/');
  const userIdIndex = parts.indexOf('users') + 1;
  const messageIdIndex = parts.indexOf('messages') + 1;

  if (userIdIndex === 0 || messageIdIndex === 0) {
    context.warn(`Unexpected resource format: ${resource}`);
    return;
  }

  const userId = parts[userIdIndex];
  const messageId = parts[messageIdIndex];

  // Check dedup first
  if (await activityExistsForMessage(client, siteId, messageId)) {
    context.log(`Skipping duplicate: message ${messageId}`);
    return;
  }

  // Fetch the email message
  let email: EmailMessage;
  try {
    email = await client
      .api(`/users/${userId}/messages/${messageId}`)
      .select('id,subject,receivedDateTime,from,toRecipients,ccRecipients')
      .get();
  } catch (err: unknown) {
    const status = (err as { statusCode?: number }).statusCode;
    if (status === 404) {
      context.log(`Message ${messageId} not found (may have been deleted)`);
      return;
    }
    throw err;
  }

  // Collect all email addresses from the message
  const senderEmail = email.from?.emailAddress?.address?.toLowerCase();
  const recipientEmails = [
    ...(email.toRecipients ?? []),
    ...(email.ccRecipients ?? []),
  ].map((r) => r.emailAddress.address.toLowerCase());

  // Get user display name for the activity owner
  const ownerName = await getUserDisplayName(client, userId);

  // Try to match sender as a CRM contact (inbound email)
  if (senderEmail) {
    const contact = await findContactByEmail(client, siteId, senderEmail);
    if (contact) {
      context.log(
        `Matched inbound email from ${senderEmail} → contact ${contact.contactName}`
      );
      await createEmailActivity(
        client, siteId, email, contact, 'Inbound', ownerName
      );
      return;
    }
  }

  // Try to match any recipient as a CRM contact (outbound email)
  for (const recipientEmail of recipientEmails) {
    const contact = await findContactByEmail(client, siteId, recipientEmail);
    if (contact) {
      context.log(
        `Matched outbound email to ${recipientEmail} → contact ${contact.contactName}`
      );
      await createEmailActivity(
        client, siteId, email, contact, 'Outbound', ownerName
      );
      return;
    }
  }

  // No CRM contacts matched — skip silently
  context.log(`No CRM contact match for message ${messageId}, skipping`);
}

// ---------------------------------------------------------------------------
// HTTP handler — POST /api/email-webhook
// ---------------------------------------------------------------------------

export async function emailWebhook(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  // --- Subscription validation handshake ------------------------------------
  // Graph sends a GET/POST with ?validationToken=<token> during subscription
  // creation. We must echo the token back as text/plain.
  const validationToken = request.query.get('validationToken');
  if (validationToken) {
    context.log('Webhook validation request received');
    return {
      status: 200,
      headers: { 'Content-Type': 'text/plain' },
      body: validationToken,
    };
  }

  // --- Process notification payload -----------------------------------------
  // Graph webhooks require a 202 response within 3 seconds.
  // We process async but need to respond quickly.
  context.log('Email webhook notification received');

  let notifications: GraphNotification;
  try {
    notifications = (await request.json()) as GraphNotification;
  } catch {
    return {
      status: 400,
      jsonBody: { error: 'Invalid JSON in webhook payload.' },
    };
  }

  if (!notifications?.value || notifications.value.length === 0) {
    return { status: 202, jsonBody: { processed: 0 } };
  }

  // Validate clientState to ensure notification is genuine
  const expectedClientState = getClientState();
  if (expectedClientState) {
    const invalidNotifications = notifications.value.filter(
      (n) => n.clientState !== expectedClientState
    );
    if (invalidNotifications.length > 0) {
      context.warn(
        `Rejecting ${invalidNotifications.length} notification(s) with invalid clientState`
      );
    }
  }

  const validNotifications = expectedClientState
    ? notifications.value.filter((n) => n.clientState === expectedClientState)
    : notifications.value;

  // Process each notification
  const client = getGraphClient();
  const siteId = getSiteId();
  let processed = 0;
  let errors = 0;

  for (const notification of validNotifications) {
    try {
      await processNotification(client, siteId, notification, context);
      processed++;
    } catch (err: unknown) {
      errors++;
      const message = err instanceof Error ? err.message : String(err);
      context.error(
        `Error processing notification for ${notification.resource}: ${message}`
      );
    }
  }

  context.log(
    `Webhook processing complete: ${processed} processed, ${errors} errors`
  );

  // Always return 202 quickly — Graph will retry on 5xx
  return {
    status: 202,
    jsonBody: { processed, errors },
  };
}

// ---------------------------------------------------------------------------
// Function registration
// ---------------------------------------------------------------------------

app.http('emailWebhook', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'email-webhook',
  handler: emailWebhook,
});
