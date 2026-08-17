import { useState, useEffect, useCallback, useMemo } from 'react';
import { tauriApi } from '../../../lib/tauri';
import type { Game, LocalGame, UnifiedGame } from '../../../types';

export function useLibraryManager(serverUrl: string, isServerConnected: boolean) {
  const [remoteGames, setRemoteGames] = useState<Game[]>([]);
  const [localGames, setLocalGames] = useState<LocalGame[]>([]);
  const [libraryRootPath, setLibraryRootPath] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const [selectedPlatform, setSelectedPlatform] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const refreshLibrary = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // 1. Fetch library root path
      try {
        const root = await tauriApi.getLibraryRootPath();
        setLibraryRootPath(root);
      } catch {
        // Fallback for tests / mock
      }

      // 2. Fetch server catalog if connected
      let serverCatalog: Game[] = [];
      if (isServerConnected && serverUrl) {
        try {
          serverCatalog = await tauriApi.fetchCatalog(serverUrl);
          setRemoteGames(serverCatalog);
        } catch (e) {
          setError(`Failed to fetch catalog: ${e instanceof Error ? e.message : String(e)}`);
        }
      }

      // 3. Scan local library
      try {
        const scanned = await tauriApi.scanLocalLibrary(undefined, isServerConnected ? serverUrl : undefined);
        setLocalGames(scanned);
      } catch {
        // In browser mock / standalone mode without Tauri filesystem
        setLocalGames([]);
      }
    } finally {
      setIsLoading(false);
    }
  }, [serverUrl, isServerConnected]);

  useEffect(() => {
    void refreshLibrary();
  }, [refreshLibrary]);

  // Merge remote catalog and local games into UnifiedGame list with content-addressable deduplication
  const unifiedGames = useMemo<UnifiedGame[]>(() => {
    const list: UnifiedGame[] = [];
    const matchedLocalPaths = new Set<string>();

    // 1. Process server games and correlate with local files
    for (const remote of remoteGames) {
      const matchedLocals = localGames.filter(
        (local) =>
          local.matched_game_id === remote.id ||
          (remote.sha256_checksum &&
            local.hashes.sha256.toLowerCase() === remote.sha256_checksum.toLowerCase()) ||
          (remote.retro_hash &&
            local.hashes.headerless_md5 &&
            local.hashes.headerless_md5.toLowerCase() === remote.retro_hash.toLowerCase()),
      );

      if (matchedLocals.length > 0) {
        for (const local of matchedLocals) {
          matchedLocalPaths.add(local.file_path);
        }
        const primaryLocal = matchedLocals[0];
        list.push({
          id: remote.id,
          title: remote.title,
          platform: remote.platform,
          status: 'installed',
          file_size_bytes: remote.file_size_bytes,
          storage_key: remote.storage_key,
          localPath: primaryLocal.file_path,
          localPaths: matchedLocals.map((l) => l.file_path),
          hashes: primaryLocal.hashes,
        });
      } else {
        list.push({
          id: remote.id,
          title: remote.title,
          platform: remote.platform,
          status: 'remote_only',
          file_size_bytes: remote.file_size_bytes,
          storage_key: remote.storage_key,
        });
      }
    }

    // 2. Add remaining unmatched local games (grouped & deduplicated by content hash)
    const unmatchedByHash = new Map<string, LocalGame[]>();
    for (const local of localGames) {
      if (!matchedLocalPaths.has(local.file_path)) {
        const hashKey = `${local.platform}:${local.hashes.headerless_md5 || local.hashes.sha256}`;
        const group = unmatchedByHash.get(hashKey) || [];
        group.push(local);
        unmatchedByHash.set(hashKey, group);
      }
    }

    for (const [hashKey, group] of unmatchedByHash.entries()) {
      const primaryLocal = group[0];
      const filename = primaryLocal.relative_path.split('/').pop() || 'Unknown Game';
      const cleanTitle = filename.replace(/\.[^/.]+$/, '').replace(/_/g, ' ');

      list.push({
        id: hashKey,
        title: cleanTitle,
        platform: primaryLocal.platform,
        status: 'local_only',
        file_size_bytes: primaryLocal.file_size_bytes,
        localPath: primaryLocal.file_path,
        localPaths: group.map((l) => l.file_path),
        hashes: primaryLocal.hashes,
        description: `Local file: ${primaryLocal.relative_path}`,
      });
    }

    return list;
  }, [remoteGames, localGames]);

  // Filtered games based on platform, status, and search query
  const filteredGames = useMemo(() => {
    return unifiedGames.filter((game) => {
      // Platform filter
      if (
        selectedPlatform !== 'all' &&
        game.platform.toLowerCase() !== selectedPlatform.toLowerCase()
      ) {
        return false;
      }

      // Status filter
      if (selectedStatus !== 'all' && game.status !== selectedStatus) {
        return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = game.title.toLowerCase().includes(q);
        const matchesPlatform = String(game.platform).toLowerCase().includes(q);
        if (!matchesTitle && !matchesPlatform) return false;
      }

      return true;
    });
  }, [unifiedGames, selectedPlatform, selectedStatus, searchQuery]);

  // Unique platform list
  const platforms = useMemo(() => {
    const set = new Set<string>();
    for (const g of unifiedGames) {
      set.add(String(g.platform).toLowerCase());
    }
    return ['all', ...Array.from(set)];
  }, [unifiedGames]);

  const updateLocalGameInstalled = useCallback((localGame: LocalGame) => {
    setLocalGames((prev) => {
      const exists = prev.some((g) => g.file_path === localGame.file_path);
      if (exists) {
        return prev.map((g) => (g.file_path === localGame.file_path ? localGame : g));
      }
      return [...prev, localGame];
    });
  }, []);

  return {
    games: filteredGames,
    allGames: unifiedGames,
    platforms,
    libraryRootPath,
    selectedPlatform,
    setSelectedPlatform,
    selectedStatus,
    setSelectedStatus,
    searchQuery,
    setSearchQuery,
    isLoading,
    error,
    refreshLibrary,
    updateLocalGameInstalled,
  };
}
