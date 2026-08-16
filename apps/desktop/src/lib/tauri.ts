import { invoke } from '@tauri-apps/api/core';
import type { DownloadUrlResponse, Game, SaveManifest, ServerHealth, SyncStatus } from '../types';

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

  checkSaveSync: async (serverUrl: string, gameId: string): Promise<SyncStatus> => {
    return invoke<SyncStatus>('check_save_sync_status', { serverUrl, gameId });
  },

  triggerSaveSync: async (serverUrl: string, gameId: string, manifest: SaveManifest): Promise<SaveManifest> => {
    return invoke<SaveManifest>('trigger_cloud_save_sync', { serverUrl, gameId, manifest });
  },

  launchGame: async (gameId: string): Promise<{ success: boolean; pid?: number }> => {
    return invoke<{ success: boolean; pid?: number }>('launch_game', { gameId });
  },
};
