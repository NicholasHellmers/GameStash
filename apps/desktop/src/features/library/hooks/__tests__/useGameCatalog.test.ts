import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useGameCatalog } from '../useGameCatalog';
import { tauriApi } from '../../../../lib/tauri';
import type { Game } from '../../../../types';

vi.mock('../../../../lib/tauri', () => ({
  tauriApi: {
    fetchCatalog: vi.fn(),
  },
}));

const mockGames: Game[] = [
  {
    id: 'snes-smw',
    title: 'Super Mario World',
    platform: 'snes',
    file_size_bytes: 524288,
    storage_key: 'roms/snes/smw.sfc',
    sha256_checksum: 'abc',
    retro_hash: '123',
  },
];

describe('useGameCatalog hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches game catalog when connected', async () => {
    vi.mocked(tauriApi.fetchCatalog).mockResolvedValue(mockGames);

    const { result } = renderHook(() => useGameCatalog('http://localhost:8080', true));

    await waitFor(() => {
      expect(result.current.games).toHaveLength(1);
    });

    expect(result.current.games[0].title).toBe('Super Mario World');
    expect(result.current.error).toBeNull();
  });

  it('handles error when fetching catalog fails', async () => {
    vi.mocked(tauriApi.fetchCatalog).mockRejectedValue(new Error('500 Server Error'));

    const { result } = renderHook(() => useGameCatalog('http://localhost:8080', true));

    await waitFor(() => {
      expect(result.current.error).toBe('500 Server Error');
    });

    expect(result.current.games).toHaveLength(0);
  });
});
