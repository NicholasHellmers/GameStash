export type Platform =
  | 'pc'
  | 'snes'
  | 'genesis'
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
  release_year?: number;
  cover_url?: string;
  file_size_bytes: number;
  storage_key: string;
  description?: string;
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
