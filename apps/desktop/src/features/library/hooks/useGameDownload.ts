import { useState, useEffect, useCallback } from 'react';
import { tauriApi } from '../../../lib/tauri';
import type { DownloadProgressPayload, LocalGame } from '../../../types';

export function useGameDownload(serverUrl: string) {
  const [downloads, setDownloads] = useState<Record<string, DownloadProgressPayload>>({});
  const [downloadingGameIds, setDownloadingGameIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    let unlisten: (() => void) | undefined;

    tauriApi
      .onDownloadProgress((payload) => {
        setDownloads((prev) => ({
          ...prev,
          [payload.game_id]: payload,
        }));

        if (payload.status === 'completed') {
          setDownloadingGameIds((prev) => {
            const next = new Set(prev);
            next.delete(payload.game_id);
            return next;
          });
        }
      })
      .then((fn) => {
        unlisten = fn;
      })
      .catch(() => {
        // In browser / test mode without Tauri event runtime
      });

    return () => {
      unlisten?.();
    };
  }, []);

  const startDownload = useCallback(
    async (gameId: string): Promise<LocalGame | null> => {
      if (!serverUrl) return null;

      setDownloadingGameIds((prev) => new Set([...prev, gameId]));
      setDownloads((prev) => ({
        ...prev,
        [gameId]: {
          game_id: gameId,
          bytes_downloaded: 0,
          total_bytes: 0,
          percentage: 0,
          speed_bytes_per_sec: 0,
          status: 'starting',
        },
      }));

      try {
        const localGame = await tauriApi.startGameDownload(serverUrl, gameId);
        return localGame;
      } catch (err) {
        setDownloadingGameIds((prev) => {
          const next = new Set(prev);
          next.delete(gameId);
          return next;
        });
        throw err;
      }
    },
    [serverUrl],
  );

  return {
    downloads,
    downloadingGameIds,
    startDownload,
  };
}
