import { Platform, RomHash } from '../../../types';
import { GameMetadata, IMetadataProvider } from '../types';
import { tauriApi } from '../../../lib/tauri';
import { OpenGameDbProvider } from './openGameDb';
import { ScreenScraperProvider } from './screenScraper';

export class CompositeMetadataProvider implements IMetadataProvider {
  readonly name = 'composite';
  private providers: IMetadataProvider[];

  constructor(providers?: IMetadataProvider[]) {
    this.providers = providers || [
      new ScreenScraperProvider(),
      new OpenGameDbProvider(),
    ];
  }

  async searchByHash(hashes: RomHash, platform: Platform): Promise<GameMetadata | null> {
    // 1. Try native backend scraper first (bypasses browser CORS and downloads media atomically)
    try {
      const nativeRes = await tauriApi.scrapeGameMetadata(
        platform,
        '',
        hashes.headerless_md5,
        hashes.sha256,
      );
      if (nativeRes && nativeRes.matched_title) {
        return {
          gameId: nativeRes.game_id,
          matchedTitle: nativeRes.matched_title,
          coverUrl: nativeRes.cover_url,
          localCoverPath: nativeRes.local_cover_path,
          releaseYear: nativeRes.release_year,
          developer: nativeRes.developer,
          publisher: nativeRes.publisher,
          genres: nativeRes.genres,
          description: nativeRes.description,
          providerSource: nativeRes.provider_source,
        };
      }
    } catch {
      // Fall through to sub-providers in mock/test mode
    }

    // 2. Sub-provider fallback
    for (const provider of this.providers) {
      try {
        const result = await provider.searchByHash(hashes, platform);
        if (result) {
          return result;
        }
      } catch {
        // Continue to next provider
      }
    }
    return null;
  }

  async searchByTitle(title: string, platform: Platform): Promise<GameMetadata | null> {
    // 1. Try native backend scraper first
    try {
      const nativeRes = await tauriApi.scrapeGameMetadata(platform, title, undefined, undefined);
      if (nativeRes && nativeRes.matched_title && (nativeRes.cover_url || nativeRes.description)) {
        return {
          gameId: nativeRes.game_id,
          matchedTitle: nativeRes.matched_title,
          coverUrl: nativeRes.cover_url,
          localCoverPath: nativeRes.local_cover_path,
          releaseYear: nativeRes.release_year,
          developer: nativeRes.developer,
          publisher: nativeRes.publisher,
          genres: nativeRes.genres,
          description: nativeRes.description,
          providerSource: nativeRes.provider_source,
        };
      }
    } catch {
      // Fall through in mock/test mode
    }

    // 2. Sub-provider fallback
    for (const provider of this.providers) {
      try {
        const result = await provider.searchByTitle(title, platform);
        if (result && (result.coverUrl || result.description)) {
          return result;
        }
      } catch {
        // Continue to next provider
      }
    }

    // 3. Clean title basic fallback
    const cleanTitle = OpenGameDbProvider.cleanRomTitle(title);
    if (!cleanTitle) return null;

    return {
      gameId: `${platform}:${cleanTitle.toLowerCase().replace(/\s+/g, '-')}`,
      matchedTitle: cleanTitle,
      providerSource: 'none',
    };
  }

  async searchCandidates(query: string, platform?: Platform): Promise<GameMetadata[]> {
    const candidates: GameMetadata[] = [];
    const seenTitles = new Set<string>();

    // 1. Try native backend scraper first
    try {
      const nativeCandidates = await tauriApi.searchGameCandidates(query, platform);
      if (nativeCandidates && Array.isArray(nativeCandidates)) {
        for (const item of nativeCandidates) {
          const key = (item.matched_title || '').toLowerCase();
          if (key && !seenTitles.has(key)) {
            seenTitles.add(key);
            candidates.push({
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
            });
          }
        }
      }
    } catch {
      // Fall through in mock/test mode
    }

    // 2. Sub-provider fallback
    for (const provider of this.providers) {
      if (provider.searchCandidates) {
        try {
          const results = await provider.searchCandidates(query, platform);
          for (const item of results) {
            const key = item.matchedTitle.toLowerCase();
            if (!seenTitles.has(key)) {
              seenTitles.add(key);
              candidates.push(item);
            }
          }
        } catch {
          // Continue to next provider
        }
      }
    }

    return candidates;
  }
}

export const defaultMetadataProvider = new CompositeMetadataProvider();
