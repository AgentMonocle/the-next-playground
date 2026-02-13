import { useState } from 'react';
import {
  Card,
  CardHeader,
  Text,
  Button,
  Dialog,
  DialogSurface,
  DialogBody,
  DialogTitle,
  DialogContent,
  DialogActions,
  Spinner,
  MessageBar,
  MessageBarBody,
  Input,
  ProgressBar,
} from '@fluentui/react-components';
import {
  ArrowDownload24Regular,
  ArrowUpload24Regular,
  Delete24Regular,
  Warning24Regular,
  Info24Regular,
} from '@fluentui/react-icons';
import { PageHeader } from '@/components/shared/PageHeader';
import {
  useBackupList,
  useCreateBackup,
  useRestoreBackup,
  useDeleteBackup,
  useResetAllData,
  useOperationProgress,
} from '@/hooks/useBackup';
import type { BackupInfo, OperationProgress } from '@/types';

export function Admin() {
  const backupListQuery = useBackupList();
  const createBackupMutation = useCreateBackup();
  const restoreMutation = useRestoreBackup();
  const deleteMutation = useDeleteBackup();
  const resetMutation = useResetAllData();
  const { progress, setProgress, resetProgress } = useOperationProgress();

  const [showRestoreDialog, setShowRestoreDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [selectedBackup, setSelectedBackup] = useState<BackupInfo | null>(null);
  const [resetConfirmText, setResetConfirmText] = useState('');

  const isOperating =
    createBackupMutation.isPending ||
    restoreMutation.isPending ||
    deleteMutation.isPending ||
    resetMutation.isPending;

  // ─── Handlers ──────────────────────────────────────────────────────────

  const handleCreateBackup = () => {
    resetProgress();
    createBackupMutation.mutate((p: OperationProgress) => setProgress(p));
  };

  const handleRestore = (backup: BackupInfo) => {
    setSelectedBackup(backup);
    setShowRestoreDialog(true);
  };

  const confirmRestore = () => {
    if (!selectedBackup) return;
    resetProgress();
    setShowRestoreDialog(false);
    restoreMutation.mutate({
      folderName: selectedBackup.folderName,
      onProgress: (p: OperationProgress) => setProgress(p),
    });
  };

  const handleDelete = (backup: BackupInfo) => {
    setSelectedBackup(backup);
    setShowDeleteDialog(true);
  };

  const confirmDelete = () => {
    if (!selectedBackup) return;
    deleteMutation.mutate(selectedBackup.folderName, {
      onSettled: () => {
        setShowDeleteDialog(false);
        setSelectedBackup(null);
      },
    });
  };

  const confirmReset = () => {
    if (resetConfirmText !== 'RESET') return;
    resetProgress();
    setShowResetDialog(false);
    setResetConfirmText('');
    resetMutation.mutate((p: OperationProgress) => setProgress(p));
  };

  // ─── Render Helpers ────────────────────────────────────────────────────

  const formatDate = (iso: string) => {
    const date = new Date(iso);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const totalItems = (backup: BackupInfo) => {
    if (!backup.manifest) return '—';
    return Object.values(backup.manifest.lists).reduce((sum, l) => sum + l.count, 0);
  };

  const progressPercent =
    progress && progress.listsTotal > 0
      ? progress.listsCompleted / progress.listsTotal
      : 0;

  return (
    <div className="space-y-6">
      <PageHeader title="Admin" />

      {/* Operation Progress */}
      {progress && isOperating && (
        <Card>
          <div className="px-4 py-3 space-y-2">
            <div className="flex items-center gap-2">
              <Spinner size="tiny" />
              <Text weight="semibold">
                {progress.phase}
                {progress.currentList ? `: ${progress.currentList}` : ''}
              </Text>
            </div>
            <ProgressBar value={progressPercent} />
            <Text size={200} className="text-gray-500">
              {progress.listsCompleted}/{progress.listsTotal} lists
              {progress.itemsTotal > 0 &&
                ` · ${progress.itemsProcessed}/${progress.itemsTotal} items`}
            </Text>
          </div>
        </Card>
      )}

      {/* Success messages */}
      {createBackupMutation.isSuccess && !createBackupMutation.isPending && (
        <MessageBar intent="success">
          <MessageBarBody>Backup created successfully.</MessageBarBody>
        </MessageBar>
      )}
      {restoreMutation.isSuccess && !restoreMutation.isPending && (
        <MessageBar intent="success">
          <MessageBarBody>Restore completed successfully.</MessageBarBody>
        </MessageBar>
      )}
      {resetMutation.isSuccess && !resetMutation.isPending && (
        <MessageBar intent="success">
          <MessageBarBody>All data has been reset.</MessageBarBody>
        </MessageBar>
      )}

      {/* Error messages */}
      {createBackupMutation.isError && (
        <MessageBar intent="error">
          <MessageBarBody>
            Backup failed: {createBackupMutation.error?.message}
          </MessageBarBody>
        </MessageBar>
      )}
      {restoreMutation.isError && (
        <MessageBar intent="error">
          <MessageBarBody>
            Restore failed: {restoreMutation.error?.message}
          </MessageBarBody>
        </MessageBar>
      )}
      {deleteMutation.isError && (
        <MessageBar intent="error">
          <MessageBarBody>
            Delete failed: {deleteMutation.error?.message}
          </MessageBarBody>
        </MessageBar>
      )}
      {resetMutation.isError && (
        <MessageBar intent="error">
          <MessageBarBody>
            Reset failed: {resetMutation.error?.message}
          </MessageBarBody>
        </MessageBar>
      )}

      {/* Backup Section */}
      <Card>
        <CardHeader
          image={<ArrowDownload24Regular className="text-blue-600" />}
          header={
            <Text weight="semibold" size={400}>
              Backup
            </Text>
          }
          description={
            <Text size={200} className="text-gray-500">
              Export all SharePoint list data to a snapshot in the TSS_Backups
              library
            </Text>
          }
        />
        <div className="px-4 pb-4">
          <Button
            appearance="primary"
            onClick={handleCreateBackup}
            disabled={isOperating}
            icon={
              createBackupMutation.isPending ? (
                <Spinner size="tiny" />
              ) : undefined
            }
          >
            {createBackupMutation.isPending
              ? 'Creating Backup...'
              : 'Create Backup'}
          </Button>
        </div>
      </Card>

      {/* Restore Section */}
      <Card>
        <CardHeader
          image={<ArrowUpload24Regular className="text-green-600" />}
          header={
            <Text weight="semibold" size={400}>
              Restore
            </Text>
          }
          description={
            <Text size={200} className="text-gray-500">
              Replace all current data with a previous backup snapshot
            </Text>
          }
        />
        <div className="px-4 pb-4 space-y-3">
          {backupListQuery.isLoading && <Spinner size="small" label="Loading backups..." />}

          {backupListQuery.isError && (
            <MessageBar intent="warning">
              <MessageBarBody>
                Could not load backups. The TSS_Backups library may not exist
                yet — run the provisioning script.
              </MessageBarBody>
            </MessageBar>
          )}

          {backupListQuery.data?.length === 0 && (
            <div className="flex items-center gap-2 text-gray-500">
              <Info24Regular className="w-5 h-5" />
              <Text size={200}>No backups available. Create one first.</Text>
            </div>
          )}

          {backupListQuery.data?.map((backup) => (
            <div
              key={backup.folderName}
              className="flex items-center justify-between p-3 bg-gray-50 rounded-md"
            >
              <div>
                <Text weight="semibold" size={300}>
                  {backup.manifest
                    ? formatDate(backup.manifest.createdAt)
                    : backup.folderName}
                </Text>
                <Text size={200} className="text-gray-500 block">
                  {backup.manifest
                    ? `${totalItems(backup)} items · ${backup.manifest.createdBy}`
                    : 'Incomplete backup (no manifest)'}
                </Text>
              </div>
              <div className="flex gap-2">
                <Button
                  size="small"
                  appearance="primary"
                  onClick={() => handleRestore(backup)}
                  disabled={isOperating || !backup.manifest}
                >
                  Restore
                </Button>
                <Button
                  size="small"
                  appearance="subtle"
                  icon={<Delete24Regular />}
                  onClick={() => handleDelete(backup)}
                  disabled={isOperating}
                />
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Reset ALL Section */}
      <Card className="border-red-200">
        <CardHeader
          image={<Warning24Regular className="text-red-600" />}
          header={
            <Text weight="semibold" size={400} className="text-red-700">
              Reset ALL Store Data
            </Text>
          }
          description={
            <Text size={200} className="text-gray-500">
              Permanently delete all items from all SharePoint lists. This
              cannot be undone.
            </Text>
          }
        />
        <div className="px-4 pb-4">
          <Button
            appearance="secondary"
            onClick={() => setShowResetDialog(true)}
            disabled={isOperating}
            className="text-red-600 border-red-300 hover:bg-red-50"
          >
            Reset ALL Data
          </Button>
        </div>
      </Card>

      {/* Restore Confirmation Dialog */}
      <Dialog
        open={showRestoreDialog}
        onOpenChange={(_, data) => setShowRestoreDialog(data.open)}
      >
        <DialogSurface>
          <DialogBody>
            <DialogTitle>Restore from Backup?</DialogTitle>
            <DialogContent>
              <Text>
                This will <strong>delete all current data</strong> and replace
                it with the backup from{' '}
                <strong>
                  {selectedBackup?.manifest
                    ? formatDate(selectedBackup.manifest.createdAt)
                    : selectedBackup?.folderName}
                </strong>
                .
              </Text>
              <div className="mt-3 p-3 bg-amber-50 rounded-md">
                <Text size={200} className="text-amber-800">
                  Consider creating a backup of the current data first.
                </Text>
              </div>
            </DialogContent>
            <DialogActions>
              <Button
                appearance="secondary"
                onClick={() => setShowRestoreDialog(false)}
              >
                Cancel
              </Button>
              <Button appearance="primary" onClick={confirmRestore}>
                Restore
              </Button>
            </DialogActions>
          </DialogBody>
        </DialogSurface>
      </Dialog>

      {/* Delete Backup Dialog */}
      <Dialog
        open={showDeleteDialog}
        onOpenChange={(_, data) => setShowDeleteDialog(data.open)}
      >
        <DialogSurface>
          <DialogBody>
            <DialogTitle>Delete Backup?</DialogTitle>
            <DialogContent>
              <Text>
                Permanently delete the backup from{' '}
                <strong>
                  {selectedBackup?.manifest
                    ? formatDate(selectedBackup.manifest.createdAt)
                    : selectedBackup?.folderName}
                </strong>
                ? This cannot be undone.
              </Text>
            </DialogContent>
            <DialogActions>
              <Button
                appearance="secondary"
                onClick={() => setShowDeleteDialog(false)}
                disabled={deleteMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                appearance="primary"
                onClick={confirmDelete}
                disabled={deleteMutation.isPending}
                icon={
                  deleteMutation.isPending ? (
                    <Spinner size="tiny" />
                  ) : undefined
                }
              >
                {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
              </Button>
            </DialogActions>
          </DialogBody>
        </DialogSurface>
      </Dialog>

      {/* Reset Confirmation Dialog (double-confirm) */}
      <Dialog
        open={showResetDialog}
        onOpenChange={(_, data) => {
          setShowResetDialog(data.open);
          if (!data.open) setResetConfirmText('');
        }}
      >
        <DialogSurface>
          <DialogBody>
            <DialogTitle>
              <span className="text-red-700">Reset ALL Store Data?</span>
            </DialogTitle>
            <DialogContent>
              <div className="space-y-3">
                <Text>
                  This will <strong>permanently delete all items</strong> from
                  every SharePoint list (Companies, Contacts, Opportunities,
                  Activities, and all reference data). This action cannot be
                  undone.
                </Text>
                <div className="p-3 bg-red-50 rounded-md">
                  <Text size={200} className="text-red-800">
                    Type <strong>RESET</strong> to confirm:
                  </Text>
                  <Input
                    className="mt-2"
                    value={resetConfirmText}
                    onChange={(_, data) => setResetConfirmText(data.value)}
                    placeholder="Type RESET"
                  />
                </div>
              </div>
            </DialogContent>
            <DialogActions>
              <Button
                appearance="secondary"
                onClick={() => {
                  setShowResetDialog(false);
                  setResetConfirmText('');
                }}
              >
                Cancel
              </Button>
              <Button
                appearance="primary"
                onClick={confirmReset}
                disabled={resetConfirmText !== 'RESET'}
                className="bg-red-600 hover:bg-red-700"
              >
                Reset ALL Data
              </Button>
            </DialogActions>
          </DialogBody>
        </DialogSurface>
      </Dialog>
    </div>
  );
}
