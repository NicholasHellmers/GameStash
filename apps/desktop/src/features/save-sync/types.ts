import type { SyncStatus } from '../../types';

export interface SaveSyncState {
  status: SyncStatus | null;
  isSyncing: boolean;
  error: string | null;
}
