import React, { useState } from 'react';
import { Gamepad2, Settings, Server, RefreshCw, Layers } from 'lucide-react';
import { Button } from './components/Button';
import { ServerConnectModal, useServerConnection } from './features/server-connect';
import { GameGrid, useGameCatalog } from './features/library';
import { SaveSyncBadge, useSaveSync } from './features/save-sync';
import type { Game } from './types';

export const App: React.FC = () => {
  const [isServerModalOpen, setIsServerModalOpen] = useState<boolean>(false);
  const [selectedPlatform, setSelectedPlatform] = useState<string>('all');
  const [installedGameIds, setInstalledGameIds] = useState<Set<string>>(new Set());

  const {
    serverUrl,
    isConnected,
    isConnecting,
    error: serverError,
    health,
    connect,
  } = useServerConnection('http://localhost:8080');

  const {
    games,
    isLoading: isCatalogLoading,
    error: catalogError,
    refresh: refreshCatalog,
  } = useGameCatalog(serverUrl, isConnected);

  const { status: currentSaveStatus, isSyncing: isSaveSyncing } = useSaveSync(serverUrl);

  const filteredGames = games.filter((game: Game) => {
    if (selectedPlatform === 'all') return true;
    return game.platform.toLowerCase() === selectedPlatform.toLowerCase();
  });

  const platforms: string[] = ['all', ...Array.from(new Set(games.map((g: Game) => g.platform.toLowerCase())))];

  const handleDownload = (game: Game) => {
    setTimeout(() => {
      setInstalledGameIds((prev: Set<string>) => new Set([...prev, game.id]));
    }, 600);
  };

  const handlePlay = (game: Game) => {
    // Game launch handler
    void game;
  };

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

          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsServerModalOpen(true)}
          >
            <Server
              style={{
                width: '14px',
                height: '14px',
                marginRight: '0.375rem',
                color: isConnected ? 'var(--success)' : 'var(--warning)',
              }}
            />
            {isConnected ? 'Server Connected' : 'Configure Server'}
          </Button>

          <Button variant="ghost" size="sm" style={{ padding: '0.5rem' }}>
            <Settings style={{ width: '16px', height: '16px' }} />
          </Button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="app-main">
        {/* Library Controls Bar */}
        <div className="filter-bar">
          <div className="platform-pill-group">
            <Layers style={{ width: '16px', height: '16px', color: 'var(--text-subtle)', marginRight: '0.25rem' }} />
            <span className="platform-pill-label">Platforms:</span>
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

          <div>
            <Button
              variant="ghost"
              size="sm"
              onClick={refreshCatalog}
              disabled={isCatalogLoading || !isConnected}
            >
              <RefreshCw
                style={{
                  width: '14px',
                  height: '14px',
                  marginRight: '0.375rem',
                  animation: isCatalogLoading ? 'spin 1s linear infinite' : 'none',
                }}
              />
              Refresh
            </Button>
          </div>
        </div>

        {/* Server Offline Banner */}
        {!isConnected ? (
          <div className="alert-banner">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <Server style={{ width: '20px', height: '20px', color: 'var(--primary)' }} />
              <div>
                <p style={{ fontSize: '0.875rem', fontWeight: 600, color: '#e0e7ff' }}>
                  Server Offline or Disconnected
                </p>
                <p style={{ fontSize: '0.75rem', color: '#a5b4fc' }}>
                  Connect to your local or remote server to load your library and sync cloud saves.
                </p>
              </div>
            </div>
            <Button size="sm" onClick={() => setIsServerModalOpen(true)}>
              Connect Now
            </Button>
          </div>
        ) : null}

        {catalogError ? (
          <div className="alert-box alert-error">
            Failed to load game catalog: {catalogError}
          </div>
        ) : null}

        {/* Game Grid */}
        <GameGrid
          games={filteredGames}
          isLoading={isCatalogLoading}
          installedGameIds={installedGameIds}
          onDownloadGame={handleDownload}
          onPlayGame={handlePlay}
        />
      </main>

      {/* Server Connect Modal */}
      {isServerModalOpen ? (
        <div className="modal-backdrop">
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setIsServerModalOpen(false)}
              style={{
                position: 'absolute',
                top: '-10px',
                right: '-10px',
                width: '28px',
                height: '28px',
                borderRadius: '50%',
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-card)',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '12px',
                fontWeight: 700,
                zIndex: 10,
              }}
            >
              ✕
            </button>
            <ServerConnectModal
              currentUrl={serverUrl}
              isConnected={isConnected}
              isConnecting={isConnecting}
              error={serverError}
              health={health}
              onConnect={async (url: string) => {
                const ok = await connect(url);
                if (ok) {
                  setTimeout(() => setIsServerModalOpen(false), 700);
                }
                return ok;
              }}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default App;
