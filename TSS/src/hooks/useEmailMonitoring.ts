import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useMsal } from '@azure/msal-react';
import {
  getMonitoringStatus,
  enableMonitoring,
  disableMonitoring,
  type MonitoringStatus,
} from '@/lib/daemonApi';

// ---------------------------------------------------------------------------
// Query keys
// ---------------------------------------------------------------------------

export const monitoringKeys = {
  all: ['emailMonitoring'] as const,
  status: (userId: string) => [...monitoringKeys.all, 'status', userId] as const,
};

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------

/**
 * Returns the current user's Entra object ID (GUID).
 * MSAL v5 stores this as `localAccountId` on the account info.
 */
function useCurrentUserId(): string | undefined {
  const { accounts } = useMsal();
  return accounts[0]?.localAccountId;
}

/**
 * Check whether email monitoring is active for the current user.
 */
export function useMonitoringStatus() {
  const userId = useCurrentUserId();

  return useQuery<MonitoringStatus>({
    queryKey: monitoringKeys.status(userId!),
    queryFn: () => getMonitoringStatus(userId!),
    enabled: !!userId,
    staleTime: 30 * 1000, // 30 seconds — status doesn't change often
    retry: 1,
  });
}

/**
 * Toggle email monitoring on for the current user.
 */
export function useEnableMonitoring() {
  const userId = useCurrentUserId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => {
      if (!userId) throw new Error('No active user');
      return enableMonitoring(userId);
    },
    onSuccess: () => {
      if (userId) {
        queryClient.invalidateQueries({ queryKey: monitoringKeys.status(userId) });
      }
    },
  });
}

/**
 * Toggle email monitoring off for the current user.
 */
export function useDisableMonitoring() {
  const userId = useCurrentUserId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => {
      if (!userId) throw new Error('No active user');
      return disableMonitoring(userId);
    },
    onSuccess: () => {
      if (userId) {
        queryClient.invalidateQueries({ queryKey: monitoringKeys.status(userId) });
      }
    },
  });
}
