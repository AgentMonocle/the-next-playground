import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useMsal } from '@azure/msal-react';
import { getGraphClient } from '@/lib/graph/graphClient';
import { createBackup, getBackupList, deleteBackup } from '@/lib/backup/backupService';
import { restoreFromBackup } from '@/lib/backup/restoreService';
import { resetAllData } from '@/lib/backup/resetService';
import type { OperationProgress } from '@/types';

// ─── Query Keys ─────────────────────────────────────────────────────────────

export const backupKeys = {
  all: ['backups'] as const,
  list: () => [...backupKeys.all, 'list'] as const,
};

// ─── Progress Hook ──────────────────────────────────────────────────────────

export function useOperationProgress() {
  const [progress, setProgress] = useState<OperationProgress | null>(null);
  const reset = useCallback(() => setProgress(null), []);
  return { progress, setProgress, resetProgress: reset };
}

// ─── Query Hooks ────────────────────────────────────────────────────────────

export function useBackupList() {
  const { instance } = useMsal();

  return useQuery({
    queryKey: backupKeys.list(),
    queryFn: async () => {
      const client = getGraphClient(instance);
      return getBackupList(client);
    },
  });
}

// ─── Mutation Hooks ─────────────────────────────────────────────────────────

export function useCreateBackup() {
  const { instance } = useMsal();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (onProgress?: (p: OperationProgress) => void) => {
      const client = getGraphClient(instance);
      const account = instance.getActiveAccount();
      const email = account?.username ?? 'unknown';
      return createBackup(client, email, onProgress);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: backupKeys.all });
    },
  });
}

export function useRestoreBackup() {
  const { instance } = useMsal();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      folderName,
      onProgress,
    }: {
      folderName: string;
      onProgress?: (p: OperationProgress) => void;
    }) => {
      const client = getGraphClient(instance);
      await restoreFromBackup(client, folderName, onProgress);
    },
    onSuccess: () => {
      // Invalidate all data queries since everything changed
      queryClient.invalidateQueries();
    },
  });
}

export function useDeleteBackup() {
  const { instance } = useMsal();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (folderName: string) => {
      const client = getGraphClient(instance);
      await deleteBackup(client, folderName);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: backupKeys.all });
    },
  });
}

export function useResetAllData() {
  const { instance } = useMsal();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (onProgress?: (p: OperationProgress) => void) => {
      const client = getGraphClient(instance);
      await resetAllData(client, onProgress);
    },
    onSuccess: () => {
      queryClient.invalidateQueries();
    },
  });
}
