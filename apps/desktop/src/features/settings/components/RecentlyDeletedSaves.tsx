import React, { useState, useEffect } from 'react';
import { tauriApi } from '../../../lib/tauri';
import type { SaveBackupEntry } from '../../../types';
import { Button } from '../../../components/Button';
import { Undo2, History, CheckCircle2, HardDrive, ShieldCheck } from 'lucide-react';

export const RecentlyDeletedSaves: React.FC = () => {
  const [backups, setBackups] = useState<SaveBackupEntry[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [notification, setNotification] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadBackups = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const list = await tauriApi.listSaveBackups();
      setBackups(list);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadBackups();
  }, []);

  const handleRestore = async (entry: SaveBackupEntry) => {
    setRestoringId(entry.backup_id);
    setError(null);
    try {
      await tauriApi.restoreSaveBackup(entry.backup_id);
      setNotification(`Successfully restored save for ${entry.game_id} to ${entry.original_path}`);
      setTimeout(() => setNotification(null), 4000);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setRestoringId(null);
    }
  };

  const formatDate = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleString();
    } catch {
      return isoString;
    }
  };

  return (
    <div className="recently-deleted-container">
      <div className="settings-section-header">
        <div>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-main)' }}>
            Recently Overwritten & Deleted Saves
          </h3>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            Safety archive of previous save files replaced during cloud synchronization or conflict resolution.
          </p>
        </div>
      </div>

      {notification ? (
        <div className="alert-box alert-success" style={{ marginBottom: '1rem' }}>
          <CheckCircle2 style={{ width: '16px', height: '16px', marginRight: '0.5rem' }} />
          {notification}
        </div>
      ) : null}

      {error ? <div className="alert-box alert-error">{error}</div> : null}

      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
          Loading backup archive...
        </div>
      ) : backups.length === 0 ? (
        <div className="empty-state" style={{ padding: '2rem' }}>
          <ShieldCheck
            style={{ width: '40px', height: '40px', color: 'var(--text-subtle)', margin: '0 auto 0.5rem auto' }}
          />
          <h4 style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-main)' }}>
            No overwritten saves found
          </h4>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            Whenever a cloud sync or overwrite occurs, an automatic snapshot is preserved here for 1-click restoration.
          </p>
        </div>
      ) : (
        <div className="backup-list">
          {backups.map((entry) => (
            <div key={entry.backup_id} className="backup-card">
              <div className="backup-card-info">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <History style={{ width: '16px', height: '16px', color: 'var(--primary)' }} />
                  <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>{entry.game_id}</span>
                  <span className="backup-reason-badge">{entry.reason}</span>
                </div>
                <div className="backup-path-text" title={entry.original_path}>
                  {entry.original_path}
                </div>
                <div className="backup-meta">
                  <span>{formatDate(entry.timestamp)}</span>
                  <span>•</span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                    <HardDrive style={{ width: '11px', height: '11px' }} />
                    {(entry.file_size_bytes / 1024).toFixed(1)} KB
                  </span>
                </div>
              </div>

              <div>
                <Button
                  variant="secondary"
                  size="sm"
                  isLoading={restoringId === entry.backup_id}
                  onClick={() => handleRestore(entry)}
                >
                  <Undo2 style={{ width: '14px', height: '14px', marginRight: '0.375rem' }} />
                  Restore (Undo)
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
