import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { RecentlyDeletedSaves } from '../RecentlyDeletedSaves';
import { tauriApi } from '../../../../lib/tauri';
import type { SaveBackupEntry } from '../../../../types';

vi.mock('../../../../lib/tauri', () => ({
  tauriApi: {
    listSaveBackups: vi.fn(),
    restoreSaveBackup: vi.fn(),
  },
}));

const mockBackups: SaveBackupEntry[] = [
  {
    backup_id: 'backup-123',
    game_id: 'snes-chrono-trigger',
    timestamp: '2026-08-16T15:30:00Z',
    original_path: '/games/saves/snes/chrono.srm',
    backup_path: '/backups/backup-123_chrono.srm',
    file_size_bytes: 8192,
    sha256_hash: 'abcdef123456',
    reason: 'Cloud save pull overwrite',
  },
];

describe('RecentlyDeletedSaves Component', () => {
  it('renders list of backups with game ID and restore button', async () => {
    vi.mocked(tauriApi.listSaveBackups).mockResolvedValue(mockBackups);

    render(<RecentlyDeletedSaves />);

    await waitFor(() => {
      expect(screen.getByText('snes-chrono-trigger')).toBeInTheDocument();
    });

    expect(screen.getByText('Cloud save pull overwrite')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /restore/i })).toBeInTheDocument();
  });

  it('triggers restoreSaveBackup when Restore button is clicked', async () => {
    vi.mocked(tauriApi.listSaveBackups).mockResolvedValue(mockBackups);
    vi.mocked(tauriApi.restoreSaveBackup).mockResolvedValue(mockBackups[0]);

    render(<RecentlyDeletedSaves />);

    await waitFor(() => {
      expect(screen.getByText('snes-chrono-trigger')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /restore/i }));

    await waitFor(() => {
      expect(tauriApi.restoreSaveBackup).toHaveBeenCalledWith('backup-123');
    });

    expect(screen.getByText(/successfully restored save/i)).toBeInTheDocument();
  });
});
