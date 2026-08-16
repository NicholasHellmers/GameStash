import React from 'react';
import { Cloud, CloudOff, CloudUpload, CloudDownload, AlertTriangle } from 'lucide-react';
import type { SyncStatus } from '../../../types';

export interface SaveSyncBadgeProps {
  status: SyncStatus | null;
  isSyncing?: boolean;
}

export const SaveSyncBadge: React.FC<SaveSyncBadgeProps> = ({ status, isSyncing = false }) => {
  if (isSyncing) {
    return (
      <div className="sync-badge sync-badge-cloudnewer">
        <CloudUpload style={{ width: '14px', height: '14px' }} />
        <span>Syncing Saves...</span>
      </div>
    );
  }

  if (!status) {
    return (
      <div className="sync-badge sync-badge-offline">
        <CloudOff style={{ width: '14px', height: '14px' }} />
        <span>Offline</span>
      </div>
    );
  }

  switch (status.status) {
    case 'InSync':
      return (
        <div className="sync-badge sync-badge-insync">
          <Cloud style={{ width: '14px', height: '14px' }} />
          <span>Cloud Saves Synced</span>
        </div>
      );
    case 'CloudNewer':
      return (
        <div className="sync-badge sync-badge-cloudnewer">
          <CloudDownload style={{ width: '14px', height: '14px' }} />
          <span>Cloud Update Ready</span>
        </div>
      );
    case 'LocalNewer':
      return (
        <div className="sync-badge sync-badge-localnewer">
          <CloudUpload style={{ width: '14px', height: '14px' }} />
          <span>Local Save Newer</span>
        </div>
      );
    case 'Conflict':
      return (
        <div className="sync-badge sync-badge-conflict">
          <AlertTriangle style={{ width: '14px', height: '14px' }} />
          <span>Sync Conflict</span>
        </div>
      );
  }
};
