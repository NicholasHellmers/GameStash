import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import App from '../App';
import { tauriApi } from '../lib/tauri';
import type { Game, LocalGame, ServerHealth, SyncStatus } from '../types';

vi.mock('../lib/tauri', () => ({
  tauriApi: {
    pingServer: vi.fn(),
    getLibraryRootPath: vi.fn(),
    fetchCatalog: vi.fn(),
    scanLocalLibrary: vi.fn(),
    launchGame: vi.fn(),
    startGameDownload: vi.fn(),
    onDownloadProgress: vi.fn().mockResolvedValue(() => {}),
    getEngineConfigs: vi.fn().mockResolvedValue([]),
    listSaveBackups: vi.fn().mockResolvedValue([]),
    checkSaveSync: vi.fn(),
    pullCloudSave: vi.fn(),
    triggerSaveSync: vi.fn(),
  },
}));

const mockHealth: ServerHealth = {
  status: 'ok',
  version: '0.1.0',
  storage_connected: true,
  server_time_utc: '2026-08-16T12:00:00Z',
};

const mockCatalog: Game[] = [
  {
    id: 'snes-smw',
    title: 'Super Mario World',
    platform: 'snes',
    file_size_bytes: 524288,
    storage_key: 'roms/snes/smw.sfc',
    sha256_checksum: 'abc123sha256',
    retro_hash: 'md5retro123',
  },
  {
    id: 'n64-oot',
    title: 'Zelda Ocarina of Time',
    platform: 'n64',
    file_size_bytes: 33554432,
    storage_key: 'roms/n64/oot.z64',
    sha256_checksum: 'def456sha256',
    retro_hash: 'md5retro456',
  },
];

const mockLocalGames: LocalGame[] = [
  {
    file_path: '/games/roms/snes/smw.sfc',
    relative_path: 'snes/smw.sfc',
    platform: 'snes',
    file_size_bytes: 524288,
    hashes: {
      sha256: 'abc123sha256',
      headerless_md5: 'md5retro123',
      file_size_bytes: 524288,
    },
    matched_game_id: 'snes-smw',
    modified_at: '2026-08-16T12:00:00Z',
  },
];

describe('App Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(tauriApi.pingServer).mockResolvedValue(mockHealth);
    vi.mocked(tauriApi.getLibraryRootPath).mockResolvedValue('/games/roms');
    vi.mocked(tauriApi.fetchCatalog).mockResolvedValue(mockCatalog);
    vi.mocked(tauriApi.scanLocalLibrary).mockResolvedValue(mockLocalGames);
    vi.mocked(tauriApi.checkSaveSync).mockResolvedValue({ status: 'InSync' });
    vi.mocked(tauriApi.launchGame).mockResolvedValue({ success: true, pid: 123 });
  });

  it('renders application header, games grid, and status indicators', async () => {
    render(<App />);

    expect(screen.getByText('GameStash')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Connected')).toBeInTheDocument();
      expect(screen.getByText('Super Mario World')).toBeInTheDocument();
    });

    expect(screen.getByText('Installed')).toBeInTheDocument();
  });

  it('opens and closes settings modal when settings button is clicked', async () => {
    render(<App />);

    const settingsBtn = screen.getByTitle('Settings & Configurations');
    fireEvent.click(settingsBtn);

    expect(screen.getByText('GameStash Settings & Configurations')).toBeInTheDocument();

    const closeBtn = screen.getByTitle('Close Settings');
    fireEvent.click(closeBtn);

    await waitFor(() => {
      expect(screen.queryByText('GameStash Settings & Configurations')).not.toBeInTheDocument();
    });
  });

  it('handles search input and platform filter changes', async () => {
    render(<App />);

    await waitFor(() => {
      expect(screen.getByText('Connected')).toBeInTheDocument();
      expect(screen.getByText('Super Mario World')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(/search library by title or platform/i);
    fireEvent.change(searchInput, { target: { value: 'mario' } });

    expect(screen.getByText('Super Mario World')).toBeInTheDocument();

    fireEvent.change(searchInput, { target: { value: 'nonexistent' } });
    expect(screen.getByText('No games found')).toBeInTheDocument();
  });

  it('handles platform and status filter pill clicks', async () => {
    render(<App />);

    await waitFor(() => {
      expect(screen.getByText('Connected')).toBeInTheDocument();
      expect(screen.getByText('Super Mario World')).toBeInTheDocument();
    });

    // Click snes platform filter
    const snesPills = screen.getAllByRole('button', { name: /snes/i });
    fireEvent.click(snesPills[0]);
    expect(screen.getByText('Super Mario World')).toBeInTheDocument();

    // Reset platform to All
    const allPlatforms = screen.getAllByRole('button', { name: /^all$/i });
    if (allPlatforms.length > 0) {
      fireEvent.click(allPlatforms[0]);
    }

    // Click In Cloud status filter
    const inCloudBtn = screen.getByRole('button', { name: /in cloud/i });
    fireEvent.click(inCloudBtn);
    expect(screen.getByText('Zelda Ocarina of Time')).toBeInTheDocument();

    // Click Installed status filter
    const installedBtn = screen.getByRole('button', { name: /installed/i });
    fireEvent.click(installedBtn);
    expect(screen.getByText('Super Mario World')).toBeInTheDocument();

    // Click All filter
    const allBtn = screen.getByRole('button', { name: /all \(/i });
    fireEvent.click(allBtn);
  });

  it('handles game download initiation from card', async () => {
    const downloadedLocal: LocalGame = {
      file_path: '/games/roms/n64/oot.z64',
      relative_path: 'n64/oot.z64',
      platform: 'n64',
      file_size_bytes: 33554432,
      hashes: { sha256: 'def456sha256', file_size_bytes: 33554432 },
      matched_game_id: 'n64-oot',
      modified_at: '2026-08-16T12:00:00Z',
    };
    vi.mocked(tauriApi.startGameDownload).mockResolvedValue(downloadedLocal);

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText('Connected')).toBeInTheDocument();
      expect(screen.getByText('Zelda Ocarina of Time')).toBeInTheDocument();
    });

    const downloadBtn = screen.getByRole('button', { name: /download/i });
    fireEvent.click(downloadBtn);

    await waitFor(() => {
      expect(tauriApi.startGameDownload).toHaveBeenCalledWith('http://localhost:8080', 'n64-oot');
    });
  });

  it('handles game launch happy path', async () => {
    render(<App />);

    await waitFor(() => {
      expect(screen.getByText('Connected')).toBeInTheDocument();
      expect(screen.getByText('Super Mario World')).toBeInTheDocument();
    });

    const playBtn = screen.getByRole('button', { name: /play/i });
    fireEvent.click(playBtn);

    await waitFor(() => {
      expect(tauriApi.checkSaveSync).toHaveBeenCalledWith('http://localhost:8080', 'snes-smw', 'snes');
      expect(tauriApi.launchGame).toHaveBeenCalledWith(
        'snes-smw',
        'snes',
        '/games/roms/snes/smw.sfc',
        'http://localhost:8080',
      );
    });
  });

  it('handles save conflict modal during launch and resolves keeping local', async () => {
    const conflictStatus: SyncStatus = {
      status: 'Conflict',
      details: {
        local_hash: 'local_hash_1',
        cloud_hash: 'cloud_hash_1',
        local_modified_at: '2026-08-16T12:00:00Z',
        cloud_modified_at: '2026-08-16T14:00:00Z',
      },
    };
    vi.mocked(tauriApi.checkSaveSync).mockResolvedValue(conflictStatus);
    vi.mocked(tauriApi.triggerSaveSync).mockResolvedValue({
      game_id: 'snes-smw',
      entries: [],
      updated_at: '2026-08-16T15:00:00Z',
    });

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText('Connected')).toBeInTheDocument();
      expect(screen.getByText('Super Mario World')).toBeInTheDocument();
    });

    const playBtn = screen.getByRole('button', { name: /play/i });
    fireEvent.click(playBtn);

    await waitFor(() => {
      expect(screen.getByText('Cloud Save Conflict')).toBeInTheDocument();
    });

    const keepLocalBtn = screen.getByRole('button', { name: /upload local save to cloud/i });
    fireEvent.click(keepLocalBtn);

    await waitFor(() => {
      expect(tauriApi.triggerSaveSync).toHaveBeenCalledWith('http://localhost:8080', 'snes-smw', 'snes');
    });
  });

  it('handles save conflict modal during launch and resolves keeping cloud', async () => {
    const conflictStatus: SyncStatus = {
      status: 'Conflict',
      details: {
        local_hash: 'local_hash_1',
        cloud_hash: 'cloud_hash_1',
        local_modified_at: '2026-08-16T12:00:00Z',
        cloud_modified_at: '2026-08-16T14:00:00Z',
      },
    };
    vi.mocked(tauriApi.checkSaveSync).mockResolvedValue(conflictStatus);
    vi.mocked(tauriApi.pullCloudSave).mockResolvedValue(undefined);

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText('Connected')).toBeInTheDocument();
      expect(screen.getByText('Super Mario World')).toBeInTheDocument();
    });

    const playBtn = screen.getByRole('button', { name: /play/i });
    fireEvent.click(playBtn);

    await waitFor(() => {
      expect(screen.getByText('Cloud Save Conflict')).toBeInTheDocument();
    });

    const keepCloudBtn = screen.getByRole('button', { name: /download cloud save to device/i });
    fireEvent.click(keepCloudBtn);

    await waitFor(() => {
      expect(tauriApi.pullCloudSave).toHaveBeenCalledWith('http://localhost:8080', 'snes-smw', 'snes');
    });
  });

  it('opens manual match modal from game card and applies selected metadata', async () => {
    render(<App />);

    await waitFor(() => {
      expect(screen.getByText('Super Mario World')).toBeInTheDocument();
    });

    const editBtn = screen.getByRole('button', { name: 'Edit metadata for Super Mario World' });
    fireEvent.click(editBtn);

    await waitFor(() => {
      expect(screen.getByText('Match Game Metadata')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Apply Match' })).not.toBeDisabled();
    });

    const applyBtn = screen.getByRole('button', { name: 'Apply Match' });
    fireEvent.click(applyBtn);

    await waitFor(() => {
      expect(screen.queryByText('Match Game Metadata')).not.toBeInTheDocument();
    });
  });
});
