import { Platform, RomHash } from '../../../types';
import { GameMetadata, IMetadataProvider } from '../types';

export const SCREEN_SCRAPER_SYSTEM_IDS: Record<Platform, number> = {
  snes: 4,
  nes: 3,
  n64: 14,
  gb: 9,
  gbc: 10,
  gba: 12,
  genesis: 1,
  ps1: 57,
  psp: 61,
  pc: 135,
};

export class ScreenScraperProvider implements IMetadataProvider {
  readonly name = 'screenscraper';

  private devId: string;
  private devPassword?: string;

  constructor(devId: string = 'gamestash', devPassword?: string) {
    this.devId = devId;
    this.devPassword = devPassword;
  }

  // Cleans standard ROM dump naming tags (No-Intro / GoodTools / TOSEC style)
  static cleanRomTitle(rawTitle: string): string {
    return rawTitle
      .replace(/\s*\([^)]*\)/g, '')
      .replace(/\s*\[[^\]]*\]/g, '')
      .replace(/[_]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  async searchByHash(hashes: RomHash, platform: Platform): Promise<GameMetadata | null> {
    const systemId = SCREEN_SCRAPER_SYSTEM_IDS[platform];
    const md5 = hashes.headerless_md5 || hashes.sha256;
    if (!md5 || !systemId) {
      return null;
    }

    try {
      const url = `https://api.screenscraper.fr/api2/jeuInfos.php?devid=${encodeURIComponent(
        this.devId,
      )}${this.devPassword ? `&devpassword=${encodeURIComponent(this.devPassword)}` : ''}&softname=GameStash&output=json&systemeid=${systemId}&md5=${encodeURIComponent(
        md5,
      )}`;

      const response = await fetch(url);
      if (!response.ok) return null;

      const data = await response.json();
      const jeu = data?.response?.jeu;
      if (!jeu) return null;

      const matchedTitle = jeu.noms?.find((n: any) => n.region === 'us' || n.region === 'wor')?.nom || jeu.nom || '';
      const coverUrl = jeu.medias?.find((m: any) => m.type === 'box-2D' || m.type === 'box-3D')?.url;
      const description = jeu.synopsis?.find((s: any) => s.langue === 'en')?.texte;
      const releaseYear = jeu.dates?.find((d: any) => d.region === 'us' || d.region === 'wor')?.text?.slice(0, 4);

      return {
        gameId: `${platform}:${md5}`,
        matchedTitle: matchedTitle || ScreenScraperProvider.cleanRomTitle(md5),
        coverUrl,
        description,
        releaseYear: releaseYear ? parseInt(releaseYear, 10) : undefined,
        developer: jeu.developpeur?.nom,
        publisher: jeu.editeur?.nom,
        genres: jeu.genres?.map((g: any) => g.noms?.find((n: any) => n.langue === 'en')?.nom || g.nom).filter(Boolean),
        providerSource: 'screenscraper' as any,
      };
    } catch {
      return null;
    }
  }

  async searchByTitle(title: string, platform: Platform): Promise<GameMetadata | null> {
    const systemId = SCREEN_SCRAPER_SYSTEM_IDS[platform];
    const cleanTitle = ScreenScraperProvider.cleanRomTitle(title);
    if (!cleanTitle || !systemId) return null;

    try {
      const url = `https://api.screenscraper.fr/api2/jeuRecherche.php?devid=${encodeURIComponent(
        this.devId,
      )}${this.devPassword ? `&devpassword=${encodeURIComponent(this.devPassword)}` : ''}&softname=GameStash&output=json&systemeid=${systemId}&recherche=${encodeURIComponent(
        cleanTitle,
      )}`;

      const response = await fetch(url);
      if (!response.ok) return null;

      const data = await response.json();
      const jeux = data?.response?.jeux;
      if (!jeux || jeux.length === 0) return null;

      const jeu = jeux[0];
      const matchedTitle = jeu.noms?.find((n: any) => n.region === 'us' || n.region === 'wor')?.nom || jeu.nom || cleanTitle;
      const coverUrl = jeu.medias?.find((m: any) => m.type === 'box-2D' || m.type === 'box-3D')?.url;

      return {
        gameId: `${platform}:${cleanTitle.toLowerCase().replace(/\s+/g, '-')}`,
        matchedTitle,
        coverUrl,
        providerSource: 'screenscraper' as any,
      };
    } catch {
      return null;
    }
  }

  async searchCandidates(query: string, platform?: Platform): Promise<GameMetadata[]> {
    const cleanQuery = ScreenScraperProvider.cleanRomTitle(query);
    if (!cleanQuery) return [];

    const systemId = platform ? SCREEN_SCRAPER_SYSTEM_IDS[platform] : undefined;

    try {
      const url = `https://api.screenscraper.fr/api2/jeuRecherche.php?devid=${encodeURIComponent(
        this.devId,
      )}${this.devPassword ? `&devpassword=${encodeURIComponent(this.devPassword)}` : ''}&softname=GameStash&output=json${
        systemId ? `&systemeid=${systemId}` : ''
      }&recherche=${encodeURIComponent(cleanQuery)}`;

      const response = await fetch(url);
      if (!response.ok) return [];

      const data = await response.json();
      const jeux = data?.response?.jeux;
      if (!jeux || !Array.isArray(jeux)) return [];

      return jeux.map((jeu: any) => {
        const matchedTitle =
          jeu.noms?.find((n: any) => n.region === 'us' || n.region === 'wor')?.nom ||
          jeu.nom ||
          cleanQuery;
        const coverUrl = jeu.medias?.find((m: any) => m.type === 'box-2D' || m.type === 'box-3D')?.url;
        const releaseYear = jeu.dates?.find((d: any) => d.region === 'us' || d.region === 'wor')?.text?.slice(0, 4);

        return {
          gameId: `${platform || 'custom'}:${jeu.id || matchedTitle.toLowerCase().replace(/\s+/g, '-')}`,
          matchedTitle,
          coverUrl,
          releaseYear: releaseYear ? parseInt(releaseYear, 10) : undefined,
          developer: jeu.developpeur?.nom,
          publisher: jeu.editeur?.nom,
          providerSource: 'screenscraper' as any,
        };
      });
    } catch {
      return [];
    }
  }
}

