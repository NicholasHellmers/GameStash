import { Platform, RomHash } from '../../../types';
import { GameMetadata, IMetadataProvider } from '../types';

export class OpenGameDbProvider implements IMetadataProvider {
  readonly name = 'opengamedb';

  // Cleans standard ROM dump naming tags (No-Intro / GoodTools / TOSEC style)
  static cleanRomTitle(rawTitle: string): string {
    return rawTitle
      .replace(/\s*\([^)]*\)/g, '') // remove parenthesized tags like (USA), (En,Fr,De), (Rev 1)
      .replace(/\s*\[[^\]]*\]/g, '') // remove bracketed tags like [!], [b1]
      .replace(/[_]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  async searchByHash(hashes: RomHash, platform: Platform): Promise<GameMetadata | null> {
    if (!hashes.headerless_md5 && !hashes.sha256) {
      return null;
    }
    // Remote open API endpoint resolution
    return null;
  }

  async searchByTitle(title: string, platform: Platform): Promise<GameMetadata | null> {
    const cleanTitle = OpenGameDbProvider.cleanRomTitle(title);
    if (!cleanTitle) {
      return null;
    }

    return {
      gameId: `${platform}:${cleanTitle.toLowerCase().replace(/\s+/g, '-')}`,
      matchedTitle: cleanTitle,
      providerSource: 'opengamedb',
    };
  }

  async searchCandidates(query: string, platform?: Platform): Promise<GameMetadata[]> {
    const cleanQuery = OpenGameDbProvider.cleanRomTitle(query);
    if (!cleanQuery) return [];

    return [
      {
        gameId: `${platform || 'custom'}:${cleanQuery.toLowerCase().replace(/\s+/g, '-')}`,
        matchedTitle: cleanQuery,
        providerSource: 'custom',
      },
    ];
  }
}

export const defaultOpenGameDbProvider = new OpenGameDbProvider();
