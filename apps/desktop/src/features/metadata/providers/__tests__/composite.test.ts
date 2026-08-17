import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CompositeMetadataProvider } from '../composite';
import { IMetadataProvider, GameMetadata } from '../../types';

describe('CompositeMetadataProvider', () => {
  const mockProvider1: IMetadataProvider = {
    name: 'provider1',
    searchByHash: vi.fn(),
    searchByTitle: vi.fn(),
    searchCandidates: vi.fn(),
  };

  const mockProvider2: IMetadataProvider = {
    name: 'provider2',
    searchByHash: vi.fn(),
    searchByTitle: vi.fn(),
    searchCandidates: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('searchByHash returns result from first provider that hits', async () => {
    const composite = new CompositeMetadataProvider([mockProvider1, mockProvider2]);
    const mockMeta: GameMetadata = {
      gameId: 'snes:hash1',
      matchedTitle: 'Chrono Trigger',
      providerSource: 'screenscraper',
    };

    vi.mocked(mockProvider1.searchByHash).mockResolvedValue(mockMeta);

    const result = await composite.searchByHash(
      { headerless_md5: 'hash1', file_size_bytes: 1000 },
      'snes',
    );

    expect(result).toEqual(mockMeta);
    expect(mockProvider1.searchByHash).toHaveBeenCalled();
    expect(mockProvider2.searchByHash).not.toHaveBeenCalled();
  });

  it('searchByHash falls back to second provider if first returns null', async () => {
    const composite = new CompositeMetadataProvider([mockProvider1, mockProvider2]);
    const mockMeta: GameMetadata = {
      gameId: 'snes:hash2',
      matchedTitle: 'Secret of Mana',
      providerSource: 'opengamedb',
    };

    vi.mocked(mockProvider1.searchByHash).mockResolvedValue(null);
    vi.mocked(mockProvider2.searchByHash).mockResolvedValue(mockMeta);

    const result = await composite.searchByHash(
      { headerless_md5: 'hash2', file_size_bytes: 1000 },
      'snes',
    );

    expect(result).toEqual(mockMeta);
    expect(mockProvider1.searchByHash).toHaveBeenCalled();
    expect(mockProvider2.searchByHash).toHaveBeenCalled();
  });

  it('searchByTitle returns result and falls back to clean title when none match', async () => {
    const composite = new CompositeMetadataProvider([mockProvider1, mockProvider2]);

    vi.mocked(mockProvider1.searchByTitle).mockResolvedValue(null);
    vi.mocked(mockProvider2.searchByTitle).mockResolvedValue(null);

    const fallback = await composite.searchByTitle('EarthBound (USA) [!]', 'snes');
    expect(fallback).toBeDefined();
    expect(fallback?.matchedTitle).toBe('EarthBound');
    expect(fallback?.providerSource).toBe('none');
  });

  it('searchByTitle returns rich result from provider when available', async () => {
    const composite = new CompositeMetadataProvider([mockProvider1, mockProvider2]);
    const mockMeta: GameMetadata = {
      gameId: 'snes:mario',
      matchedTitle: 'Super Mario World',
      coverUrl: 'https://screenscraper.fr/smw.png',
      providerSource: 'screenscraper',
    };

    vi.mocked(mockProvider1.searchByTitle).mockResolvedValue(mockMeta);

    const result = await composite.searchByTitle('Super Mario World', 'snes');
    expect(result).toEqual(mockMeta);
  });

  it('handles provider throwing errors gracefully across all methods', async () => {
    const composite = new CompositeMetadataProvider([mockProvider1, mockProvider2]);

    vi.mocked(mockProvider1.searchByHash).mockRejectedValue(new Error('Provider 1 error'));
    vi.mocked(mockProvider2.searchByHash).mockResolvedValue(null);

    const hashRes = await composite.searchByHash({ headerless_md5: 'h1', file_size_bytes: 100 }, 'snes');
    expect(hashRes).toBeNull();

    vi.mocked(mockProvider1.searchByTitle).mockRejectedValue(new Error('Provider 1 error'));
    vi.mocked(mockProvider2.searchByTitle).mockRejectedValue(new Error('Provider 2 error'));

    const titleRes = await composite.searchByTitle('EarthBound', 'snes');
    expect(titleRes?.matchedTitle).toBe('EarthBound');

    const emptyTitleRes = await composite.searchByTitle('', 'snes');
    expect(emptyTitleRes).toBeNull();

    vi.mocked(mockProvider1.searchCandidates!).mockRejectedValue(new Error('Candidate error'));
    vi.mocked(mockProvider2.searchCandidates!).mockResolvedValue([]);

    const candRes = await composite.searchCandidates('Mario', 'snes');
    expect(candRes).toEqual([]);
  });
});
