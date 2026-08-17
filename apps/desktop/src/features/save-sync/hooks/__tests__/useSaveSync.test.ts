import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useSaveSync } from '../useSaveSync';
import { tauriApi } from '../../../../lib/tauri';
import type { SyncStatus } from '../../../../types';

vi.mock('../../../../lib/tauri', () => ({
  tauriApi: {
    checkSaveSync: vi.fn(),
  },
}));

describe('useSaveSync hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('checks sync status and updates state', async () => {
    const mockSyncStatus: SyncStatus = { status: 'InSync' };
    vi.mocked(tauriApi.checkSaveSync).mockResolvedValue(mockSyncStatus);

    const { result } = renderHook(() => useSaveSync('http://localhost:8080'));

    await act(async () => {
      await result.current.checkSync('snes-smw');
    });

    expect(result.current.status).toEqual(mockSyncStatus);
    expect(result.current.isSyncing).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('handles error during sync check', async () => {
    vi.mocked(tauriApi.checkSaveSync).mockRejectedValue(new Error('Network offline'));

    const { result } = renderHook(() => useSaveSync('http://localhost:8080'));

    await act(async () => {
      await result.current.checkSync('snes-smw');
    });

    expect(result.current.isSyncing).toBe(false);
    expect(result.current.error).toBe('Network offline');
  });
});
