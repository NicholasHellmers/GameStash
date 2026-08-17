import { describe, it, expect, vi } from 'vitest';
import { tauriApi } from '../tauri';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';

vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}));

vi.mock('@tauri-apps/api/event', () => ({
  listen: vi.fn(),
}));

describe('tauriApi client bridge', () => {
  it('invokes ping_server', async () => {
    vi.mocked(invoke).mockResolvedValue({ status: 'ok', version: '0.1.0' });
    const res = await tauriApi.pingServer('http://localhost:8080');
    expect(invoke).toHaveBeenCalledWith('ping_server', { serverUrl: 'http://localhost:8080' });
    expect(res.status).toBe('ok');
  });

  it('invokes fetch_game_catalog', async () => {
    vi.mocked(invoke).mockResolvedValue([]);
    await tauriApi.fetchCatalog('http://localhost:8080');
    expect(invoke).toHaveBeenCalledWith('fetch_game_catalog', { serverUrl: 'http://localhost:8080' });
  });

  it('invokes request_game_download', async () => {
    vi.mocked(invoke).mockResolvedValue({ download_url: 'http://s3/test' });
    await tauriApi.requestDownloadUrl('http://localhost:8080', 'snes-smw');
    expect(invoke).toHaveBeenCalledWith('request_game_download', {
      serverUrl: 'http://localhost:8080',
      gameId: 'snes-smw',
    });
  });

  it('invokes scan_local_library, getLibraryRootPath, setLibraryRootPath', async () => {
    vi.mocked(invoke).mockResolvedValue([]);
    await tauriApi.scanLocalLibrary('/custom/dir', 'http://localhost:8080');
    expect(invoke).toHaveBeenCalledWith('scan_local_library', {
      customDir: '/custom/dir',
      serverUrl: 'http://localhost:8080',
    });

    vi.mocked(invoke).mockResolvedValue('/default/roms');
    const path = await tauriApi.getLibraryRootPath();
    expect(path).toBe('/default/roms');

    vi.mocked(invoke).mockResolvedValue(undefined);
    await tauriApi.setLibraryRootPath('/new/roms');
    expect(invoke).toHaveBeenCalledWith('set_library_root_path', { newPath: '/new/roms' });
  });

  it('invokes startGameDownload and sets up onDownloadProgress listener', async () => {
    vi.mocked(invoke).mockResolvedValue({ file_path: '/roms/game.sfc' });
    await tauriApi.startGameDownload('http://localhost:8080', 'game-1');
    expect(invoke).toHaveBeenCalledWith('start_game_download', {
      serverUrl: 'http://localhost:8080',
      gameId: 'game-1',
    });

    const unlisten = vi.fn();
    vi.mocked(listen).mockImplementation(async (_event, callback: any) => {
      callback({ payload: { game_id: 'game-1', percentage: 50 } });
      return unlisten;
    });

    const cb = vi.fn();
    const cleanup = await tauriApi.onDownloadProgress(cb);
    expect(listen).toHaveBeenCalledWith('game_download_progress', expect.any(Function));
    expect(cb).toHaveBeenCalledWith({ game_id: 'game-1', percentage: 50 });
    expect(cleanup).toBe(unlisten);
  });

  it('invokes engine configuration APIs', async () => {
    vi.mocked(invoke).mockResolvedValue([]);
    await tauriApi.getEngineConfigs();
    expect(invoke).toHaveBeenCalledWith('get_engine_configs');

    const config = {
      platform: 'snes',
      engine_name: 'RetroArch',
      executable_path: 'retroarch',
      default_args: [],
      is_flatpak: false,
      is_detected: true,
    };
    await tauriApi.saveEngineConfig(config);
    expect(invoke).toHaveBeenCalledWith('save_engine_config', { config });

    await tauriApi.detectInstalledEngines();
    expect(invoke).toHaveBeenCalledWith('detect_installed_engines');
  });

  it('invokes save sync and backup APIs', async () => {
    vi.mocked(invoke).mockResolvedValue({ status: 'InSync' });
    await tauriApi.checkSaveSync('http://localhost:8080', 'game-1', 'snes');
    expect(invoke).toHaveBeenCalledWith('check_save_sync_status', {
      serverUrl: 'http://localhost:8080',
      gameId: 'game-1',
      platform: 'snes',
    });

    vi.mocked(invoke).mockResolvedValue({ game_id: 'game-1', entries: [], updated_at: '' });
    await tauriApi.triggerSaveSync('http://localhost:8080', 'game-1', 'snes');
    expect(invoke).toHaveBeenCalledWith('trigger_cloud_save_sync', {
      serverUrl: 'http://localhost:8080',
      gameId: 'game-1',
      platform: 'snes',
    });

    vi.mocked(invoke).mockResolvedValue(undefined);
    await tauriApi.pullCloudSave('http://localhost:8080', 'game-1', 'snes');
    expect(invoke).toHaveBeenCalledWith('pull_cloud_save', {
      serverUrl: 'http://localhost:8080',
      gameId: 'game-1',
      platform: 'snes',
    });

    vi.mocked(invoke).mockResolvedValue([]);
    await tauriApi.listSaveBackups('game-1');
    expect(invoke).toHaveBeenCalledWith('list_save_backups', { gameId: 'game-1' });

    vi.mocked(invoke).mockResolvedValue({ backup_id: 'b-1' });
    await tauriApi.restoreSaveBackup('b-1');
    expect(invoke).toHaveBeenCalledWith('restore_save_backup', { backupId: 'b-1' });
  });

  it('invokes launchGame', async () => {
    vi.mocked(invoke).mockResolvedValue({ success: true, pid: 1234 });
    const res = await tauriApi.launchGame('game-1', 'snes', '/roms/smw.sfc', 'http://localhost:8080');
    expect(invoke).toHaveBeenCalledWith('launch_game', {
      gameId: 'game-1',
      platform: 'snes',
      romPath: '/roms/smw.sfc',
      serverUrl: 'http://localhost:8080',
    });
    expect(res.success).toBe(true);
  });

  it('invokes metadata caching APIs', async () => {
    vi.mocked(invoke).mockResolvedValue('/media/snes/covers/game_1.jpg');
    const cached = await tauriApi.cacheGameCover('snes', 'game-1', 'https://example.com/cover.jpg');
    expect(invoke).toHaveBeenCalledWith('cache_game_cover', {
      platform: 'snes',
      gameId: 'game-1',
      imageUrl: 'https://example.com/cover.jpg',
    });
    expect(cached).toBe('/media/snes/covers/game_1.jpg');

    vi.mocked(invoke).mockResolvedValue('/media/snes/covers/game_1.jpg');
    const existing = await tauriApi.getCachedGameCover('snes', 'game-1');
    expect(invoke).toHaveBeenCalledWith('get_cached_game_cover', {
      platform: 'snes',
      gameId: 'game-1',
    });
    expect(existing).toBe('/media/snes/covers/game_1.jpg');

    vi.mocked(invoke).mockResolvedValue('/media/root');
    const mediaDir = await tauriApi.getMediaRootPath();
    expect(invoke).toHaveBeenCalledWith('get_media_root_path');
    expect(mediaDir).toBe('/media/root');
  });

  it('invokes native scraper APIs', async () => {
    const mockMeta = {
      game_id: 'snes:mario',
      matched_title: 'Super Mario World',
      cover_url: 'https://screenscraper.fr/smw.png',
    };
    vi.mocked(invoke).mockResolvedValue(mockMeta);

    const scraped = await tauriApi.scrapeGameMetadata('snes', 'Super Mario World', 'md5_123', 'sha256_123');
    expect(invoke).toHaveBeenCalledWith('scrape_game_metadata', {
      platform: 'snes',
      title: 'Super Mario World',
      md5: 'md5_123',
      sha256: 'sha256_123',
    });
    expect(scraped).toEqual(mockMeta);

    vi.mocked(invoke).mockResolvedValue([mockMeta]);
    const candidates = await tauriApi.searchGameCandidates('Mario', 'snes');
    expect(invoke).toHaveBeenCalledWith('search_game_candidates', {
      query: 'Mario',
      platform: 'snes',
    });
    expect(candidates).toEqual([mockMeta]);

    vi.mocked(invoke).mockResolvedValue({ 'snes:mario': mockMeta });
    const stored = await tauriApi.getAllStoredMetadata();
    expect(invoke).toHaveBeenCalledWith('get_all_stored_metadata');
    expect(stored['snes:mario']).toEqual(mockMeta);

    vi.mocked(invoke).mockResolvedValue(undefined);
    await tauriApi.saveManualMetadataMatch(mockMeta);
    expect(invoke).toHaveBeenCalledWith('save_manual_metadata_match', { metadata: mockMeta });
  });
});
