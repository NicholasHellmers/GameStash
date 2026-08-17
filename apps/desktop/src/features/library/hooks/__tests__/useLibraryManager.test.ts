import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useLibraryManager } from '../useLibraryManager';
import { tauriApi } from '../../../../lib/tauri';
import type { Game, LocalGame } from '../../../../types';

vi.mock('../../../../lib/tauri', () => ({
  tauriApi: {
    getLibraryRootPath: vi.fn(),
    fetchCatalog: vi.fn(),
    scanLocalLibrary: vi.fn(),
  },
}));

const mockRemoteGames: Game[] = [
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
  {
    file_path: '/games/roms/gba/pokemon.gba',
    relative_path: 'gba/pokemon.gba',
    platform: 'gba',
    file_size_bytes: 16777216,
    hashes: {
      sha256: 'localonlyhash123',
      headerless_md5: 'localmd5',
      file_size_bytes: 16777216,
    },
    matched_game_id: undefined,
    modified_at: '2026-08-16T12:00:00Z',
  },
];

describe('useLibraryManager hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('merges remote catalog and local games into unified games', async () => {
    vi.mocked(tauriApi.getLibraryRootPath).mockResolvedValue('/games/roms');
    vi.mocked(tauriApi.fetchCatalog).mockResolvedValue(mockRemoteGames);
    vi.mocked(tauriApi.scanLocalLibrary).mockResolvedValue(mockLocalGames);

    const { result } = renderHook(() => useLibraryManager('http://localhost:8080', true));

    await waitFor(() => {
      expect(result.current.allGames).toHaveLength(3);
    });

    const smw = result.current.allGames.find((g) => g.id === 'snes-smw');
    expect(smw?.status).toBe('installed');
    expect(smw?.localPath).toBe('/games/roms/snes/smw.sfc');

    const oot = result.current.allGames.find((g) => g.id === 'n64-oot');
    expect(oot?.status).toBe('remote_only');

    const pokemon = result.current.allGames.find((g) => g.status === 'local_only');
    expect(pokemon).toBeDefined();
    expect(pokemon?.platform).toBe('gba');
  });

  it('filters games by platform, status, and search query', async () => {
    vi.mocked(tauriApi.getLibraryRootPath).mockResolvedValue('/games/roms');
    vi.mocked(tauriApi.fetchCatalog).mockResolvedValue(mockRemoteGames);
    vi.mocked(tauriApi.scanLocalLibrary).mockResolvedValue(mockLocalGames);

    const { result } = renderHook(() => useLibraryManager('http://localhost:8080', true));

    await waitFor(() => {
      expect(result.current.allGames).toHaveLength(3);
    });

    // Filter by platform
    act(() => {
      result.current.setSelectedPlatform('snes');
    });
    expect(result.current.games).toHaveLength(1);
    expect(result.current.games[0].title).toBe('Super Mario World');

    // Filter by status
    act(() => {
      result.current.setSelectedPlatform('all');
      result.current.setSelectedStatus('remote_only');
    });
    expect(result.current.games).toHaveLength(1);
    expect(result.current.games[0].title).toBe('Zelda Ocarina of Time');

    // Search query filter
    act(() => {
      result.current.setSelectedStatus('all');
      result.current.setSearchQuery('pokemon');
    });
    expect(result.current.games).toHaveLength(1);
    expect(result.current.games[0].platform).toBe('gba');
  });

  it('deduplicates multiple local copies sharing the same hash', async () => {
    const duplicateLocalGames: LocalGame[] = [
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
      {
        file_path: '/games/roms/snes/smw_backup.sfc',
        relative_path: 'snes/smw_backup.sfc',
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

    vi.mocked(tauriApi.getLibraryRootPath).mockResolvedValue('/games/roms');
    vi.mocked(tauriApi.fetchCatalog).mockResolvedValue(mockRemoteGames);
    vi.mocked(tauriApi.scanLocalLibrary).mockResolvedValue(duplicateLocalGames);

    const { result } = renderHook(() => useLibraryManager('http://localhost:8080', true));

    await waitFor(() => {
      expect(result.current.allGames).toHaveLength(2); // 1 installed (deduplicated), 1 remote_only
    });

    const smw = result.current.allGames.find((g) => g.id === 'snes-smw');
    expect(smw?.status).toBe('installed');
    expect(smw?.localPaths).toHaveLength(2);
    expect(smw?.localPaths).toContain('/games/roms/snes/smw.sfc');
    expect(smw?.localPaths).toContain('/games/roms/snes/smw_backup.sfc');
  });
});
