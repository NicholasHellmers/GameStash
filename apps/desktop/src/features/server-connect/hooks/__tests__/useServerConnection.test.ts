import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useServerConnection } from '../useServerConnection';
import { tauriApi } from '../../../../lib/tauri';
import type { ServerHealth } from '../../../../types';

vi.mock('../../../../lib/tauri', () => ({
  tauriApi: {
    pingServer: vi.fn(),
  },
}));

const mockHealth: ServerHealth = {
  status: 'ok',
  version: '0.1.0',
  storage_connected: true,
  server_time_utc: '2026-08-16T12:00:00Z',
};

describe('useServerConnection hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('connects to server and sets health status on success', async () => {
    vi.mocked(tauriApi.pingServer).mockResolvedValue(mockHealth);

    const { result } = renderHook(() => useServerConnection('http://localhost:8080'));

    let success: boolean = false;
    await act(async () => {
      success = await result.current.connect();
    });

    expect(success).toBe(true);
    expect(result.current.isConnected).toBe(true);
    expect(result.current.health).toEqual(mockHealth);
    expect(result.current.error).toBeNull();
  });

  it('handles server connection failure', async () => {
    vi.mocked(tauriApi.pingServer).mockRejectedValue(new Error('Connection refused'));

    const { result } = renderHook(() => useServerConnection('http://invalid:9999'));

    let success: boolean = true;
    await act(async () => {
      success = await result.current.connect();
    });

    expect(success).toBe(false);
    expect(result.current.isConnected).toBe(false);
    expect(result.current.error).toBe('Connection refused');
    expect(result.current.health).toBeNull();
  });

  it('allows manual reconnect with a new URL', async () => {
    vi.mocked(tauriApi.pingServer).mockResolvedValue(mockHealth);

    const { result } = renderHook(() => useServerConnection('http://localhost:8080'));

    await act(async () => {
      result.current.setServerUrl('http://stash.local:8080');
      await result.current.connect('http://stash.local:8080');
    });

    expect(result.current.isConnected).toBe(true);
    expect(result.current.serverUrl).toBe('http://stash.local:8080');
  });
});
