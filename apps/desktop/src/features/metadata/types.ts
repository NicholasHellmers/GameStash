import { Platform, RomHash } from '../../types';

export interface GameMetadata {
  gameId: string;
  matchedTitle: string;
  coverUrl?: string;
  localCoverPath?: string;
  bannerUrl?: string;
  description?: string;
  releaseYear?: number;
  developer?: string;
  publisher?: string;
  genres?: string[];
  providerSource: 'retroachievements' | 'opengamedb' | 'igdb' | 'custom' | 'none';
}

export interface IMetadataProvider {
  name: string;
  searchByHash(hashes: RomHash, platform: Platform): Promise<GameMetadata | null>;
  searchByTitle(title: string, platform: Platform): Promise<GameMetadata | null>;
  searchCandidates?(query: string, platform?: Platform): Promise<GameMetadata[]>;
}
