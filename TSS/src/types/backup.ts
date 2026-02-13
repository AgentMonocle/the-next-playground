/** Metadata stored in manifest.json for each backup */
export interface BackupManifest {
  /** Schema version for forward compatibility */
  version: number;
  /** ISO timestamp when backup was created */
  createdAt: string;
  /** Email of user who created the backup */
  createdBy: string;
  /** Item counts per list */
  lists: Record<string, { count: number }>;
}

/** Summary info for a backup shown in the admin UI */
export interface BackupInfo {
  /** Folder name (ISO timestamp) */
  folderName: string;
  /** Parsed manifest (null if manifest couldn't be read) */
  manifest: BackupManifest | null;
}

/** Progress reporting during backup/restore/reset operations */
export interface OperationProgress {
  /** Current phase description */
  phase: string;
  /** Current list being processed */
  currentList?: string;
  /** Number of lists completed */
  listsCompleted: number;
  /** Total number of lists to process */
  listsTotal: number;
  /** Number of items processed in current list */
  itemsProcessed: number;
  /** Total items in current list */
  itemsTotal: number;
}
