import { useState, useEffect, useCallback } from 'react';
import { tauriApi } from '../../../lib/tauri';
import type { GameCatalogState } from '../types';

export function useGameCatalog(serverUrl: string, isConnected: boolean) {
  const [state, setState] = useState<GameCatalogState>({
    games: [],
    isLoading: false,
    error: null,
  });

  const fetchGames = useCallback(async () => {
    if (!isConnected || !serverUrl) return;

    setState((prev) => ({ ...prev, isLoading: true, error: null }));
    try {
      const games = await tauriApi.fetchCatalog(serverUrl);
      setState({ games, isLoading: false, error: null });
    } catch (err) {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: err instanceof Error ? err.message : String(err),
      }));
    }
  }, [serverUrl, isConnected]);

  useEffect(() => {
    fetchGames();
  }, [fetchGames]);

  return {
    ...state,
    refresh: fetchGames,
  };
}
