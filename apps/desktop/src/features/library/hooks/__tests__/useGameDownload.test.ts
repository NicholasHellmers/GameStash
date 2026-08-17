import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useGameDownload } from '../useGameDownload';
import { tauriApi } from '../../../../lib/tauri';
import type { DownloadProgressPayload, LocalGame } from '../../../../types';

vi.mock('../../../../lib/tauri', () => ({
  tauriApi: {
    startGameDownload: vi.fn(),
    onDownloadProgress: vi.fn(),
  },
}));

const mockLocalGame: LocalGame = {
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
};

describe('useGameDownload hook', () => {
  let progressCallback: (payload: DownloadProgressPayload) => void;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(tauriApi.onDownloadProgress).mockImplementation(async (cb) => {
      progressCallback = cb;
      return () => {};
    });
  });

  it('initiates download and tracks download progress events', async () => {
    vi.mocked(tauriApi.startGameDownload).mockResolvedValue(mockLocalGame);

    const { result } = renderHook(() => useGameDownload('http://localhost:8080'));

    let downloadPromise: Promise<LocalGame | null>;
    act(() => {
      downloadPromise = result.current.startDownload('snes-smw');
    });

    expect(result.current.downloadingGameIds.has('snes-smw')).toBe(true);

    // Simulate progress event
    act(() => {
      progressCallback?.({
        game_id: 'snes-smw',
        bytes_downloaded: 262144,
        total_bytes: 524288,
        percentage: 50,
        speed_bytes_per_sec: 524288,
        status: 'downloading',
      });
    });

    expect(result.current.downloads['snes-smw']?.percentage).toBe(50);

    // Simulate complete event
    act(() => {
      progressCallback?.({
        game_id: 'snes-smw',
        bytes_downloaded: 524288,
        total_bytes: 524288,
        percentage: 100,
        speed_bytes_per_sec: 0,
        status: 'completed',
      });
    });

    const downloaded = await downloadPromise!;
    expect(downloaded).toEqual(mockLocalGame);
    expect(result.current.downloadingGameIds.has('snes-smw')).toBe(false);
  });
});
