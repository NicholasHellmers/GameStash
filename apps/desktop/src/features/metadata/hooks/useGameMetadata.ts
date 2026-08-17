import { useCallback, useEffect, useState } from 'react';
import { Platform, UnifiedGame } from '../../../types';
import { tauriApi } from '../../../lib/tauri';
import { defaultMetadataProvider } from '../providers/composite';
import { GameMetadata, IMetadataProvider } from '../types';

export function useGameMetadata(provider: IMetadataProvider = defaultMetadataProvider) {
  const [cache, setCache] = useState<Record<string, GameMetadata>>({});
  const [scrapingIds, setScrapingIds] = useState<Set<string>>(new Set());

  // 1. Initialize metadata cache from persistent disk store on mount
  useEffect(() => {
    let isMounted = true;
    const loadStored = async () => {
      try {
        const stored = await tauriApi.getAllStoredMetadata();
        if (isMounted && stored && Object.keys(stored).length > 0) {
          const mapped: Record<string, GameMetadata> = {};
          for (const [id, item] of Object.entries(stored)) {
            mapped[id] = {
              gameId: item.game_id,
              matchedTitle: item.matched_title,
              coverUrl: item.cover_url,
              localCoverPath: item.local_cover_path,
              releaseYear: item.release_year,
              developer: item.developer,
              publisher: item.publisher,
              genres: item.genres,
              description: item.description,
              providerSource: item.provider_source,
            };
          }
          setCache((prev) => ({ ...mapped, ...prev }));
        }
      } catch {
        // Test / browser mode fallback
      }
    };

    void loadStored();
    return () => {
      isMounted = false;
    };
  }, []);

  const resolveMetadata = useCallback(
    async (game: UnifiedGame): Promise<GameMetadata | null> => {
      // Check local cache first
      if (cache[game.id]) {
        return cache[game.id];
      }

      setScrapingIds((prev) => new Set(prev).add(game.id));

      try {
        // Query provider (which uses native backend scraper + Libretro/Wikipedia)
        let metadata: GameMetadata | null = null;
        if (game.hashes) {
          metadata = await provider.searchByHash(game.hashes, game.platform);
        }

        if (!metadata) {
          metadata = await provider.searchByTitle(game.title, game.platform);
        }

        if (metadata && (metadata.coverUrl || metadata.description)) {
          setCache((prev) => ({
            ...prev,
            [game.id]: metadata!,
          }));
          return metadata;
        }

        return null;
      } finally {
        setScrapingIds((prev) => {
          const next = new Set(prev);
          next.delete(game.id);
          return next;
        });
      }
    },
    [cache, provider],
  );

  // Auto-scrape unscraped games in background
  const autoScrapeLibrary = useCallback(
    async (games: UnifiedGame[]) => {
      for (const game of games) {
        if (!cache[game.id] && !scrapingIds.has(game.id)) {
          await resolveMetadata(game);
        }
      }
    },
    [cache, scrapingIds, resolveMetadata],
  );

  const manualOverrideMetadata = useCallback(
    async (gameId: string, platform: Platform, metadata: GameMetadata) => {
      let updated = { ...metadata };
      if (updated.coverUrl && !updated.localCoverPath) {
        try {
          const localPath = await tauriApi.cacheGameCover(
            String(platform),
            gameId,
            updated.coverUrl,
          );
          updated.localCoverPath = localPath;
        } catch {
          // Ignore
        }
      }

      // Persist to backend disk store
      try {
        await tauriApi.saveManualMetadataMatch({
          game_id: gameId,
          matched_title: updated.matchedTitle,
          cover_url: updated.coverUrl,
          local_cover_path: updated.localCoverPath,
          release_year: updated.releaseYear,
          developer: updated.developer,
          publisher: updated.publisher,
          genres: updated.genres,
          description: updated.description,
          provider_source: updated.providerSource,
        });
      } catch {
        // Ignore in test mode
      }

      setCache((prev) => ({
        ...prev,
        [gameId]: updated,
      }));
    },
    [],
  );

  const searchCandidates = useCallback(
    async (query: string, platform?: Platform): Promise<GameMetadata[]> => {
      if (provider.searchCandidates) {
        return provider.searchCandidates(query, platform);
      }
      return [];
    },
    [provider],
  );

  const getMetadata = useCallback(
    (gameId: string): GameMetadata | undefined => {
      return cache[gameId];
    },
    [cache],
  );

  const isScraping = useCallback(
    (gameId: string): boolean => {
      return scrapingIds.has(gameId);
    },
    [scrapingIds],
  );

  return {
    cache,
    resolveMetadata,
    autoScrapeLibrary,
    manualOverrideMetadata,
    searchCandidates,
    getMetadata,
    isScraping,
  };
}
