import { describe, it, expect } from 'vitest';
import { OpenGameDbProvider } from '../openGameDb';

describe('OpenGameDbProvider', () => {
  const provider = new OpenGameDbProvider();

  it('cleans standard ROM dump region and revision tags', () => {
    expect(OpenGameDbProvider.cleanRomTitle('EarthBound (USA)')).toBe('EarthBound');
    expect(
      OpenGameDbProvider.cleanRomTitle(
        'Pokemon - Yellow Version - Special Pikachu Edition (USA, Europe) (CGB+SGB Enhanced)',
      ),
    ).toBe('Pokemon - Yellow Version - Special Pikachu Edition');
    expect(OpenGameDbProvider.cleanRomTitle('Super_Mario_Bros._(World)_[!]')).toBe(
      'Super Mario Bros.',
    );
  });

  it('searches by title and generates dynamic clean metadata', async () => {
    const meta = await provider.searchByTitle('EarthBound (USA)', 'snes');
    expect(meta).toBeDefined();
    expect(meta?.matchedTitle).toBe('EarthBound');
    expect(meta?.gameId).toBe('snes:earthbound');
    expect(meta?.providerSource).toBe('opengamedb');
  });

  it('searches candidates for manual matching', async () => {
    const candidates = await provider.searchCandidates('EarthBound', 'snes');
    expect(candidates.length).toBe(1);
    expect(candidates[0].matchedTitle).toBe('EarthBound');
  });

  it('handles empty titles gracefully', async () => {
    const meta = await provider.searchByTitle('', 'snes');
    expect(meta).toBeNull();
  });

  it('searchByHash returns null when hash is empty or unindexed', async () => {
    const metaEmpty = await provider.searchByHash(
      { sha256: '', file_size_bytes: 0 },
      'snes',
    );
    expect(metaEmpty).toBeNull();

    const metaSample = await provider.searchByHash(
      { sha256: 'abc123sha256', headerless_md5: 'md5123', file_size_bytes: 1024 },
      'snes',
    );
    expect(metaSample).toBeNull();
  });
});
