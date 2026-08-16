import { useState, useCallback } from 'react';
import { tauriApi } from '../../../lib/tauri';
import type { SaveSyncState } from '../types';

export function useSaveSync(serverUrl: string) {
  const [state, setState] = useState<SaveSyncState>({
    status: null,
    isSyncing: false,
    error: null,
  });

  const checkSync = useCallback(async (gameId: string) => {
    if (!serverUrl) return;

    setState((prev) => ({ ...prev, isSyncing: true, error: null }));
    try {
      const status = await tauriApi.checkSaveSync(serverUrl, gameId);
      setState({ status, isSyncing: false, error: null });
    } catch (err) {
      setState((prev) => ({
        ...prev,
        isSyncing: false,
        error: err instanceof Error ? err.message : String(err),
      }));
    }
  }, [serverUrl]);

  return {
    ...state,
    checkSync,
  };
}
