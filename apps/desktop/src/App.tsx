import React, { useState, useEffect } from 'react';
import { Gamepad2, Settings, Server, RefreshCw, Layers, Search, FolderSearch, HardDrive, Cloud, CheckCircle2 } from 'lucide-react';
import { Button } from './components/Button';
import { useServerConnection } from './features/server-connect';
import { GameGrid, useLibraryManager, useGameDownload } from './features/library';
import { SaveSyncBadge, useSaveSync, SaveConflictModal } from './features/save-sync';
import { SettingsModal } from './features/settings';
import { ManualMatchModal, useGameMetadata } from './features/metadata';
import { tauriApi } from './lib/tauri';
import type { UnifiedGame } from './types';

export const App: React.FC = () => {
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [activeMatchGame, setActiveMatchGame] = useState<UnifiedGame | null>(null);
  const [activeConflict, setActiveConflict] = useState<{
    game: UnifiedGame;
    localModifiedAt: string;
    cloudModifiedAt: string;
  } | null>(null);

  const {
    cache: metadataCache,
    autoScrapeLibrary,
    manualOverrideMetadata,
    searchCandidates,
  } = useGameMetadata();

  const {
    serverUrl,
    isConnected,
    isConnecting,
    error: serverError,
    health,
    connect,
  } = useServerConnection('http://localhost:8080');

  useEffect(() => {
    void connect();
  }, [connect]);

  const {
    games,
    allGames,
    platforms,
    libraryRootPath,
    selectedPlatform,
    setSelectedPlatform,
    selectedStatus,
    setSelectedStatus,
    searchQuery,
    setSearchQuery,
    isLoading: isLibraryLoading,
    error: libraryError,
    refreshLibrary,
    updateLocalGameInstalled,
  } = useLibraryManager(serverUrl, isConnected);

  // Auto-scrape unscraped games in background
  useEffect(() => {
    if (allGames.length > 0) {
      void autoScrapeLibrary(allGames);
    }
  }, [allGames, autoScrapeLibrary]);

  const resolveCoverSrc = (meta?: any, fallbackUrl?: string) => {
    if (!meta) return fallbackUrl;
    if (meta.coverUrl) return meta.coverUrl;
    if (meta.localCoverPath) {
      try {
        const { convertFileSrc } = require('@tauri-apps/api/core');
        return convertFileSrc(meta.localCoverPath);
      } catch {
        return meta.localCoverPath;
      }
    }
    return fallbackUrl;
  };

  const enrichedGames = React.useMemo(() => {
    return games.map((g) => {
      const meta = metadataCache[g.id];
      if (meta) {
        return {
          ...g,
          metadata: meta,
          cover_url: resolveCoverSrc(meta, g.cover_url),
          description: meta.description || g.description,
          release_year: meta.releaseYear || g.release_year,
        };
      }
      return g;
    });
  }, [games, metadataCache]);

  const { downloads, downloadingGameIds, startDownload } = useGameDownload(serverUrl);
  const { status: currentSaveStatus, isSyncing: isSaveSyncing, checkSync } = useSaveSync(serverUrl);

  const handleDownload = async (game: UnifiedGame) => {
    try {
      const localGame = await startDownload(game.id);
      if (localGame) {
        updateLocalGameInstalled(localGame);
      }
    } catch (err) {
      console.error('Download failed:', err);
    }
  };

  const handlePlay = async (game: UnifiedGame) => {
    // 1. Pre-launch save sync check
    if (isConnected && serverUrl) {
      try {
        const syncStatus = await tauriApi.checkSaveSync(serverUrl, game.id, String(game.platform));
        if (syncStatus.status === 'Conflict') {
          setActiveConflict({
            game,
            localModifiedAt: syncStatus.details.local_modified_at,
            cloudModifiedAt: syncStatus.details.cloud_modified_at,
          });
          return;
        } else if (syncStatus.status === 'CloudNewer') {
          // Automatically pull cloud save (with backup) before launch
          await tauriApi.pullCloudSave(serverUrl, game.id, String(game.platform));
        }
      } catch {
        // Continue if offline or sync check fails
      }
    }

    // 2. Launch game
    try {
      await tauriApi.launchGame(
        game.id,
        String(game.platform),
        game.localPath,
        isConnected ? serverUrl : undefined,
      );
    } catch (err) {
      console.error('Launch failed:', err);
    }
  };

  const handleResolveConflictKeepLocal = async () => {
    if (!activeConflict || !serverUrl) return;
    try {
      await tauriApi.triggerSaveSync(serverUrl, activeConflict.game.id, String(activeConflict.game.platform));
      void checkSync(activeConflict.game.id);
      setActiveConflict(null);
      // Launch after resolving
      void handlePlay(activeConflict.game);
    } catch (err) {
      console.error('Save sync push failed:', err);
    }
  };

  const handleResolveConflictKeepCloud = async () => {
    if (!activeConflict || !serverUrl) return;
    try {
      await tauriApi.pullCloudSave(serverUrl, activeConflict.game.id, String(activeConflict.game.platform));
      void checkSync(activeConflict.game.id);
      setActiveConflict(null);
      // Launch after resolving
      void handlePlay(activeConflict.game);
    } catch (err) {
      console.error('Save sync pull failed:', err);
    }
  };

  const installedCount = allGames.filter((g) => g.status === 'installed' || g.status === 'local_only').length;
  const remoteOnlyCount = allGames.filter((g) => g.status === 'remote_only').length;

  return (
    <div className="app-container">
      {/* Top Navigation Bar */}
      <header className="app-header">
        <div className="brand-section">
          <div className="brand-icon">
            <Gamepad2 style={{ width: '22px', height: '22px' }} />
          </div>
          <div>
            <h1 className="brand-title">
              GameStash
              <span className="brand-badge">POC</span>
            </h1>
            <p className="brand-subtitle">Personal Self-Hosted Game Manager</p>
          </div>
        </div>

        {/* Status Badges & Actions */}
        <div className="header-actions">
          <SaveSyncBadge status={currentSaveStatus} isSyncing={isSaveSyncing} />

          <Button variant="outline" size="sm" onClick={() => setIsSettingsOpen(true)}>
            <Server
              style={{
                width: '14px',
                height: '14px',
                marginRight: '0.375rem',
                color: isConnected ? 'var(--success)' : 'var(--warning)',
              }}
            />
            {isConnected ? 'Connected' : 'Offline'}
          </Button>

          <Button
            variant="ghost"
            size="sm"
            style={{ padding: '0.5rem' }}
            onClick={() => setIsSettingsOpen(true)}
            title="Settings & Configurations"
          >
            <Settings style={{ width: '16px', height: '16px' }} />
          </Button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="app-main">
        {/* Search and Quick Filters */}
        <div className="library-top-controls" style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem', alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search
              style={{
                position: 'absolute',
                left: '0.75rem',
                top: '50%',
                transform: 'translateY(-50%)',
                width: '16px',
                height: '16px',
                color: 'var(--text-muted)',
              }}
            />
            <input
              type="text"
              className="form-input"
              style={{ width: '100%', paddingLeft: '2.25rem', height: '36px' }}
              placeholder="Search library by title or platform..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <Button
              variant="outline"
              size="sm"
              onClick={refreshLibrary}
              disabled={isLibraryLoading}
              title="Rescan local folders and fetch catalog"
            >
              <FolderSearch style={{ width: '14px', height: '14px', marginRight: '0.375rem' }} />
              Scan Folders
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={refreshLibrary}
              disabled={isLibraryLoading}
            >
              <RefreshCw
                style={{
                  width: '14px',
                  height: '14px',
                  marginRight: '0.375rem',
                  animation: isLibraryLoading ? 'spin 1s linear infinite' : 'none',
                }}
              />
              Refresh
            </Button>
          </div>
        </div>

        {/* Library Filter Bar */}
        <div className="filter-bar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
          {/* Platform Pills */}
          <div className="platform-pill-group">
            <Layers style={{ width: '16px', height: '16px', color: 'var(--text-subtle)', marginRight: '0.25rem' }} />
            <span className="platform-pill-label">Platform:</span>
            {platforms.map((platform: string) => (
              <button
                key={platform}
                onClick={() => setSelectedPlatform(platform)}
                className={`platform-pill ${selectedPlatform === platform ? 'platform-pill-active' : ''}`}
              >
                {platform}
              </button>
            ))}
          </div>

          {/* Status Filter Pills */}
          <div className="platform-pill-group">
            <span className="platform-pill-label">Status:</span>
            <button
              onClick={() => setSelectedStatus('all')}
              className={`platform-pill ${selectedStatus === 'all' ? 'platform-pill-active' : ''}`}
            >
              All ({allGames.length})
            </button>
            <button
              onClick={() => setSelectedStatus('installed')}
              className={`platform-pill ${selectedStatus === 'installed' ? 'platform-pill-active' : ''}`}
            >
              <CheckCircle2 style={{ width: '12px', height: '12px', marginRight: '3px' }} />
              Installed ({installedCount})
            </button>
            <button
              onClick={() => setSelectedStatus('remote_only')}
              className={`platform-pill ${selectedStatus === 'remote_only' ? 'platform-pill-active' : ''}`}
            >
              <Cloud style={{ width: '12px', height: '12px', marginRight: '3px' }} />
              In Cloud ({remoteOnlyCount})
            </button>
          </div>
        </div>

        {/* Server Offline Banner */}
        {!isConnected ? (
          <div className="alert-banner" style={{ margin: '1rem 0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <Server style={{ width: '20px', height: '20px', color: 'var(--primary)' }} />
              <div>
                <p style={{ fontSize: '0.875rem', fontWeight: 600, color: '#e0e7ff' }}>
                  Server Offline — Local Mode Active
                </p>
                <p style={{ fontSize: '0.75rem', color: '#a5b4fc' }}>
                  Showing local ROMs from {libraryRootPath || 'local storage'}. Connect to your server to download new titles and sync cloud saves.
                </p>
              </div>
            </div>
            <Button size="sm" onClick={() => setIsSettingsOpen(true)}>
              Connect Server
            </Button>
          </div>
        ) : null}

        {libraryError ? (
          <div className="alert-box alert-error" style={{ margin: '1rem 0' }}>
            {libraryError}
          </div>
        ) : null}

        {/* Game Grid */}
        <GameGrid
          games={enrichedGames}
          isLoading={isLibraryLoading}
          downloads={downloads}
          downloadingGameIds={downloadingGameIds}
          onDownloadGame={handleDownload}
          onPlayGame={handlePlay}
          onEditMetadata={(game) => setActiveMatchGame(game)}
        />
      </main>

      {/* Settings Modal (Emulators, Directories, Recently Deleted Saves, Server) */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        serverUrl={serverUrl}
        isConnected={isConnected}
        isConnecting={isConnecting}
        serverError={serverError}
        health={health}
        onConnectServer={connect}
        onLibraryPathUpdated={refreshLibrary}
      />

      {/* Steam-Style Save Conflict Modal */}
      {activeConflict ? (
        <SaveConflictModal
          isOpen={true}
          gameTitle={activeConflict.game.title}
          localModifiedAt={activeConflict.localModifiedAt}
          cloudModifiedAt={activeConflict.cloudModifiedAt}
          onKeepLocal={handleResolveConflictKeepLocal}
          onKeepCloud={handleResolveConflictKeepCloud}
          onCancel={() => setActiveConflict(null)}
        />
      ) : null}

      {/* Manual Metadata Match Modal */}
      <ManualMatchModal
        game={activeMatchGame}
        isOpen={!!activeMatchGame}
        onClose={() => setActiveMatchGame(null)}
        onSelectMetadata={(g, meta) => manualOverrideMetadata(g.id, g.platform, meta)}
        onSearchCandidates={searchCandidates}
      />
    </div>
  );
};

export default App;
