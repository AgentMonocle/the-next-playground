/**
 * Client for the TSS Daemon Functions API (tss-daemon-func).
 *
 * The daemon API handles background tasks that require application permissions:
 * - Email webhook subscriptions (monitoring)
 * - Email auto-linking to CRM activities
 * - Subscription renewal
 *
 * This is a separate Azure Functions app from the SWA managed API.
 * CORS is configured on the daemon to accept requests from the SWA origin.
 */

const DAEMON_API_URL =
  import.meta.env.VITE_DAEMON_API_URL ?? 'https://tss-daemon-func.azurewebsites.net';

export interface MonitoringStatus {
  monitoring: boolean;
  subscriptionId?: string;
  expirationDateTime?: string;
}

export interface SubscriptionInfo {
  subscriptionId: string;
  resource: string;
  expirationDateTime: string;
}

/**
 * Check if email monitoring is active for a user.
 */
export async function getMonitoringStatus(
  userId: string
): Promise<MonitoringStatus> {
  const response = await fetch(
    `${DAEMON_API_URL}/api/subscriptions/status/${userId}`
  );

  if (!response.ok) {
    throw new Error(`Failed to check monitoring status: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Enable email monitoring for a user by creating a webhook subscription.
 */
export async function enableMonitoring(
  userId: string
): Promise<SubscriptionInfo> {
  const response = await fetch(`${DAEMON_API_URL}/api/subscriptions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(
      (error as { error?: string }).error ??
        `Failed to enable monitoring: ${response.statusText}`
    );
  }

  return response.json();
}

/**
 * Disable email monitoring for a user by deleting their webhook subscription.
 */
export async function disableMonitoring(userId: string): Promise<void> {
  const response = await fetch(
    `${DAEMON_API_URL}/api/subscriptions/user/${userId}`,
    { method: 'DELETE' }
  );

  if (!response.ok && response.status !== 404) {
    const error = await response.json().catch(() => ({}));
    throw new Error(
      (error as { error?: string }).error ??
        `Failed to disable monitoring: ${response.statusText}`
    );
  }
}
