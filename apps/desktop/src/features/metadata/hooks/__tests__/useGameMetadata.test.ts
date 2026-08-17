import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useGameMetadata } from '../useGameMetadata';
import { IMetadataProvider, GameMetadata } from '../../types';
import { UnifiedGame } from '../../../../types';

describe('useGameMetadata hook', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  const mockProvider: IMetadataProvider = {
    name: 'mock',
    searchByHash: vi.fn(),
    searchByTitle: vi.fn(),
  };

  const sampleGame: UnifiedGame = {
    id: 'snes:cdd3c8c373244976',
    title: 'EarthBound (USA)',
    platform: 'snes',
    status: 'installed',
    file_size_bytes: 3145728,
    hashes: {
      sha256: 'sha256test',
      headerless_md5: 'cdd3c8c373244976',
      file_size_bytes: 3145728,
    },
  };

  const sampleMetadata: GameMetadata = {
    gameId: 'snes:cdd3c8c373244976',
    matchedTitle: 'EarthBound',
    coverUrl: 'https://images.example.com/earthbound.jpg',
    description: 'A boy and his friends save the world from Giygas.',
    releaseYear: 1994,
    providerSource: 'opengamedb',
  };

  it('resolves metadata from provider when not in cache', async () => {
    vi.mocked(mockProvider.searchByHash).mockResolvedValue(sampleMetadata);

    const { result } = renderHook(() => useGameMetadata(mockProvider));

    let resolved: GameMetadata | null = null;
    await act(async () => {
      resolved = await result.current.resolveMetadata(sampleGame);
    });

    expect(resolved).toEqual(sampleMetadata);
    expect(result.current.getMetadata('snes:cdd3c8c373244976')).toEqual(sampleMetadata);
    expect(mockProvider.searchByHash).toHaveBeenCalledWith(sampleGame.hashes, 'snes');
  });

  it('uses cached metadata on subsequent calls without querying provider', async () => {
    vi.mocked(mockProvider.searchByHash).mockResolvedValue(sampleMetadata);

    const { result } = renderHook(() => useGameMetadata(mockProvider));

    await act(async () => {
      await result.current.resolveMetadata(sampleGame);
    });

    // Second call should return cached value without calling provider again
    let cached: GameMetadata | null = null;
    await act(async () => {
      cached = await result.current.resolveMetadata(sampleGame);
    });

    expect(cached).toEqual(sampleMetadata);
    expect(mockProvider.searchByHash).toHaveBeenCalledTimes(1);
  });

  it('falls back to title search when hash search returns null', async () => {
    vi.mocked(mockProvider.searchByHash).mockResolvedValue(null);
    vi.mocked(mockProvider.searchByTitle).mockResolvedValue(sampleMetadata);

    const { result } = renderHook(() => useGameMetadata(mockProvider));

    let resolved: GameMetadata | null = null;
    await act(async () => {
      resolved = await result.current.resolveMetadata(sampleGame);
    });

    expect(resolved).toEqual(sampleMetadata);
    expect(mockProvider.searchByTitle).toHaveBeenCalledWith('EarthBound (USA)', 'snes');
  });

  it('autoScrapes unscraped library games and supports manual override and candidate search', async () => {
    vi.mocked(mockProvider.searchByHash).mockResolvedValue(null);
    vi.mocked(mockProvider.searchByTitle).mockResolvedValue(sampleMetadata);

    const { result } = renderHook(() => useGameMetadata(mockProvider));

    await act(async () => {
      await result.current.autoScrapeLibrary([sampleGame]);
    });

    expect(result.current.getMetadata(sampleGame.id)).toBeDefined();

    // Manual override
    const customMeta: GameMetadata = {
      gameId: sampleGame.id,
      matchedTitle: 'Custom EarthBound Hack',
      providerSource: 'custom',
    };

    await act(async () => {
      await result.current.manualOverrideMetadata(sampleGame.id, sampleGame.platform, customMeta);
    });

    expect(result.current.getMetadata(sampleGame.id)?.matchedTitle).toBe('Custom EarthBound Hack');

    // Candidate search
    const candidates = await result.current.searchCandidates('EarthBound', sampleGame.platform);
    expect(candidates).toEqual([]);

    expect(result.current.isScraping('snes:test')).toBe(false);
  });
});
