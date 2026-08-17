import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ScreenScraperProvider, SCREEN_SCRAPER_SYSTEM_IDS } from '../screenScraper';

describe('ScreenScraperProvider', () => {
  const provider = new ScreenScraperProvider('test_dev_id', 'test_pass');

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('maps platforms to correct ScreenScraper system IDs', () => {
    expect(SCREEN_SCRAPER_SYSTEM_IDS.snes).toBe(4);
    expect(SCREEN_SCRAPER_SYSTEM_IDS.nes).toBe(3);
    expect(SCREEN_SCRAPER_SYSTEM_IDS.n64).toBe(14);
    expect(SCREEN_SCRAPER_SYSTEM_IDS.gb).toBe(9);
    expect(SCREEN_SCRAPER_SYSTEM_IDS.genesis).toBe(1);
    expect(SCREEN_SCRAPER_SYSTEM_IDS.ps1).toBe(57);
  });

  it('cleans ROM filenames according to No-Intro standards', () => {
    expect(ScreenScraperProvider.cleanRomTitle('EarthBound (USA) (Rev 1)')).toBe('EarthBound');
    expect(ScreenScraperProvider.cleanRomTitle('Super_Mario_Bros._[!]')).toBe('Super Mario Bros.');
  });

  it('searchByHash queries ScreenScraper API and parses metadata response', async () => {
    const mockApiResponse = {
      response: {
        jeu: {
          nom: 'EarthBound',
          noms: [{ region: 'us', nom: 'EarthBound' }],
          medias: [{ type: 'box-2D', url: 'https://screenscraper.fr/media/eb.png' }],
          synopsis: [{ langue: 'en', texte: 'Intergalactic adventure in Onett' }],
          dates: [{ region: 'us', text: '1994-08-27' }],
          developpeur: { nom: 'Ape / HAL Laboratory' },
          editeur: { nom: 'Nintendo' },
          genres: [{ nom: 'RPG' }],
        },
      },
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockApiResponse,
    } as any);

    const result = await provider.searchByHash(
      { headerless_md5: 'cdd3c8c373244976', file_size_bytes: 3145728 },
      'snes',
    );

    expect(result).toBeDefined();
    expect(result?.matchedTitle).toBe('EarthBound');
    expect(result?.coverUrl).toBe('https://screenscraper.fr/media/eb.png');
    expect(result?.releaseYear).toBe(1994);
    expect(result?.developer).toBe('Ape / HAL Laboratory');
    expect(result?.providerSource).toBe('screenscraper');
  });

  it('searchByHash returns null on network or parse failure', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
    } as any);

    const result = await provider.searchByHash(
      { headerless_md5: 'unknown_md5', file_size_bytes: 100 },
      'snes',
    );
    expect(result).toBeNull();
  });

  it('searchByTitle searches and parses title response', async () => {
    const mockSearchResponse = {
      response: {
        jeux: [
          {
            nom: 'Super Mario World',
            medias: [{ type: 'box-2D', url: 'https://screenscraper.fr/media/smw.png' }],
          },
        ],
      },
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockSearchResponse,
    } as any);

    const result = await provider.searchByTitle('Super Mario World (USA)', 'snes');
    expect(result).toBeDefined();
    expect(result?.matchedTitle).toBe('Super Mario World');
    expect(result?.coverUrl).toBe('https://screenscraper.fr/media/smw.png');
  });

  it('searchCandidates parses multiple candidates from ScreenScraper', async () => {
    const mockSearchResponse = {
      response: {
        jeux: [
          {
            id: '1234',
            nom: 'Super Mario World',
            noms: [{ region: 'us', nom: 'Super Mario World' }],
            medias: [{ type: 'box-2D', url: 'https://screenscraper.fr/media/smw.png' }],
            dates: [{ region: 'us', text: '1990-11-21' }],
            developpeur: { nom: 'Nintendo EAD' },
            editeur: { nom: 'Nintendo' },
          },
        ],
      },
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockSearchResponse,
    } as any);

    const candidates = await provider.searchCandidates('Mario', 'snes');
    expect(candidates).toHaveLength(1);
    expect(candidates[0].matchedTitle).toBe('Super Mario World');
    expect(candidates[0].releaseYear).toBe(1990);
  });

  it('searchCandidates handles empty query and network errors', async () => {
    const empty = await provider.searchCandidates('');
    expect(empty).toEqual([]);

    global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));
    const errorCandidates = await provider.searchCandidates('Mario');
    expect(errorCandidates).toEqual([]);
  });

  it('returns null on empty inputs or network rejections', async () => {
    const res1 = await provider.searchByHash({ file_size_bytes: 0 }, 'snes');
    expect(res1).toBeNull();

    const res2 = await provider.searchByTitle('', 'snes');
    expect(res2).toBeNull();

    global.fetch = vi.fn().mockRejectedValue(new Error('Fetch failed'));
    const res3 = await provider.searchByHash({ headerless_md5: 'md5', file_size_bytes: 100 }, 'snes');
    expect(res3).toBeNull();

    const res4 = await provider.searchByTitle('Mario', 'snes');
    expect(res4).toBeNull();
  });
});
