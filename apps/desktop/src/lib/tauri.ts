import { invoke } from '@tauri-apps/api/core';
import { listen, type UnlistenFn } from '@tauri-apps/api/event';
import type {
  DownloadProgressPayload,
  DownloadUrlResponse,
  EngineConfig,
  Game,
  LocalGame,
  SaveBackupEntry,
  SaveManifest,
  ServerHealth,
  SyncStatus,
} from '../types';

export const tauriApi = {
  pingServer: async (serverUrl: string): Promise<ServerHealth> => {
    return invoke<ServerHealth>('ping_server', { serverUrl });
  },

  fetchCatalog: async (serverUrl: string): Promise<Game[]> => {
    return invoke<Game[]>('fetch_game_catalog', { serverUrl });
  },

  requestDownloadUrl: async (serverUrl: string, gameId: string): Promise<DownloadUrlResponse> => {
    return invoke<DownloadUrlResponse>('request_game_download', { serverUrl, gameId });
  },

  scanLocalLibrary: async (customDir?: string, serverUrl?: string): Promise<LocalGame[]> => {
    return invoke<LocalGame[]>('scan_local_library', { customDir, serverUrl });
  },

  getLibraryRootPath: async (): Promise<string> => {
    return invoke<string>('get_library_root_path');
  },

  setLibraryRootPath: async (newPath: string): Promise<void> => {
    return invoke<void>('set_library_root_path', { newPath });
  },

  startGameDownload: async (serverUrl: string, gameId: string): Promise<LocalGame> => {
    return invoke<LocalGame>('start_game_download', { serverUrl, gameId });
  },

  onDownloadProgress: async (callback: (payload: DownloadProgressPayload) => void): Promise<UnlistenFn> => {
    return listen<DownloadProgressPayload>('game_download_progress', (event) => {
      callback(event.payload);
    });
  },

  getEngineConfigs: async (): Promise<EngineConfig[]> => {
    return invoke<EngineConfig[]>('get_engine_configs');
  },

  saveEngineConfig: async (config: EngineConfig): Promise<void> => {
    return invoke<void>('save_engine_config', { config });
  },

  detectInstalledEngines: async (): Promise<EngineConfig[]> => {
    return invoke<EngineConfig[]>('detect_installed_engines');
  },

  checkSaveSync: async (serverUrl: string, gameId: string, platform?: string): Promise<SyncStatus> => {
    return invoke<SyncStatus>('check_save_sync_status', { serverUrl, gameId, platform });
  },

  triggerSaveSync: async (serverUrl: string, gameId: string, platform?: string): Promise<SaveManifest> => {
    return invoke<SaveManifest>('trigger_cloud_save_sync', { serverUrl, gameId, platform });
  },

  pullCloudSave: async (serverUrl: string, gameId: string, platform?: string): Promise<void> => {
    return invoke<void>('pull_cloud_save', { serverUrl, gameId, platform });
  },

  listSaveBackups: async (gameId?: string): Promise<SaveBackupEntry[]> => {
    return invoke<SaveBackupEntry[]>('list_save_backups', { gameId });
  },

  restoreSaveBackup: async (backupId: string): Promise<SaveBackupEntry> => {
    return invoke<SaveBackupEntry>('restore_save_backup', { backupId });
  },

  launchGame: async (
    gameId: string,
    platform?: string,
    romPath?: string,
    serverUrl?: string,
  ): Promise<{ success: boolean; pid?: number; message?: string }> => {
    return invoke<{ success: boolean; pid?: number; message?: string }>('launch_game', {
      gameId,
      platform,
      romPath,
      serverUrl,
    });
  },

  cacheGameCover: async (platform: string, gameId: string, imageUrl: string): Promise<string> => {
    return invoke<string>('cache_game_cover', { platform, gameId, imageUrl });
  },

  getCachedGameCover: async (platform: string, gameId: string): Promise<string | null> => {
    return invoke<string | null>('get_cached_game_cover', { platform, gameId });
  },

  getMediaRootPath: async (): Promise<string> => {
    return invoke<string>('get_media_root_path');
  },

  getAllStoredMetadata: async (): Promise<Record<string, any>> => {
    return invoke<Record<string, any>>('get_all_stored_metadata');
  },

  saveManualMetadataMatch: async (metadata: any): Promise<void> => {
    return invoke<void>('save_manual_metadata_match', { metadata });
  },

  scrapeGameMetadata: async (
    platform: string,
    title: string,
    md5?: string,
    sha256?: string,
  ): Promise<any | null> => {
    return invoke<any | null>('scrape_game_metadata', { platform, title, md5, sha256 });
  },

  searchGameCandidates: async (
    query: string,
    platform?: string,
  ): Promise<any[]> => {
    return invoke<any[]>('search_game_candidates', { query, platform });
  },
};
