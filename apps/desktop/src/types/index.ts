export type Platform =
  | 'pc'
  | 'nes'
  | 'snes'
  | 'genesis'
  | 'gb'
  | 'gbc'
  | 'gba'
  | 'ps1'
  | 'ps2'
  | 'n64'
  | 'gamecube'
  | string;

export interface Game {
  id: string;
  title: string;
  platform: Platform;
  file_size_bytes: number;
  storage_key: string;
  sha256_checksum: string;
  retro_hash?: string;
}

export interface GameMetadata {
  gameId: string;
  matchedTitle: string;
  coverUrl?: string;
  bannerUrl?: string;
  description?: string;
  releaseYear?: number;
  developer?: string;
  publisher?: string;
  genres?: string[];
  providerSource: 'retroachievements' | 'opengamedb' | 'igdb' | 'custom' | 'none';
}

export interface SaveFileEntry {
  relative_path: string;
  file_size_bytes: number;
  sha256_hash: string;
  modified_at: string;
}

export interface SaveManifest {
  game_id: string;
  entries: SaveFileEntry[];
  updated_at: string;
}

export type SyncStatus =
  | { status: 'InSync' }
  | { status: 'CloudNewer' }
  | { status: 'LocalNewer' }
  | {
    status: 'Conflict';
    details: {
      local_hash: string;
      cloud_hash: string;
      local_modified_at: string;
      cloud_modified_at: string;
    };
  };

export interface RomHash {
  headerless_md5?: string;
  sha1?: string;
  sha256: string;
  file_size_bytes: number;
}

export type GameInstallStatus = 'installed' | 'remote_only' | 'local_only';

export interface LocalGame {
  file_path: string;
  relative_path: string;
  platform: Platform;
  file_size_bytes: number;
  hashes: RomHash;
  matched_game_id?: string;
  modified_at: string;
}

export interface UnifiedGame {
  id: string;
  title: string;
  platform: Platform;
  status: GameInstallStatus;
  file_size_bytes: number;
  storage_key?: string;
  localPath?: string;
  localPaths?: string[];
  hashes?: RomHash;
  metadata?: GameMetadata;
  release_year?: number;
  cover_url?: string;
  description?: string;
}

export interface EngineConfig {
  platform: Platform;
  engine_name: string;
  executable_path: string;
  default_args: string[];
  is_flatpak: boolean;
  flatpak_id?: string;
  is_detected: boolean;
}

export interface SaveBackupEntry {
  backup_id: string;
  game_id: string;
  timestamp: string;
  original_path: string;
  backup_path: string;
  file_size_bytes: number;
  sha256_hash: string;
  reason: string;
}

export interface DownloadProgressPayload {
  game_id: string;
  bytes_downloaded: number;
  total_bytes: number;
  percentage: number;
  speed_bytes_per_sec: number;
  status: string;
}

export interface ServerHealth {
  status: string;
  version: string;
  storage_connected: boolean;
  server_time_utc: string;
}

export interface DownloadUrlResponse {
  download_url: string;
  expires_in_seconds: number;
  file_size_bytes: number;
  sha256_checksum?: string;
}
