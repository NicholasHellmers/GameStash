import React from 'react';
import { Button } from '../../../components/Button';
import { Play, Download, HardDrive, Gamepad2, CheckCircle2, Cloud, FolderCheck, Layers, Sparkles } from 'lucide-react';
import type { DownloadProgressPayload, UnifiedGame } from '../../../types';

export interface GameCardProps {
  game: UnifiedGame;
  downloadProgress?: DownloadProgressPayload;
  isDownloading?: boolean;
  onPlay?: (game: UnifiedGame) => void;
  onDownload?: (game: UnifiedGame) => void;
  onEditMetadata?: (game: UnifiedGame) => void;
}

export const GameCard: React.FC<GameCardProps> = ({
  game,
  downloadProgress,
  isDownloading = false,
  onPlay,
  onDownload,
  onEditMetadata,
}) => {
  const formatFileSize = (bytes: number): string => {
    if (!bytes || bytes <= 0) return '0 KB';
    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    }
    if (bytes < 1024 * 1024 * 1024) {
      return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    }
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  };

  const formatSpeed = (bps: number): string => {
    if (bps < 1024 * 1024) {
      return `${(bps / 1024).toFixed(1)} KB/s`;
    }
    return `${(bps / (1024 * 1024)).toFixed(1)} MB/s`;
  };

  const isPlayable = game.status === 'installed' || game.status === 'local_only';
  const coverImage = game.metadata?.coverUrl || game.cover_url;
  const description = game.metadata?.description || game.description;
  const releaseYear = game.metadata?.releaseYear || game.release_year;

  const renderStatusBadge = () => {
    switch (game.status) {
      case 'installed':
        return (
          <span className="status-badge status-badge-installed" title="Installed and ready to play">
            <CheckCircle2 style={{ width: '12px', height: '12px' }} />
            Installed
          </span>
        );
      case 'remote_only':
        return (
          <span className="status-badge status-badge-remote" title="Available to download from cloud server">
            <Cloud style={{ width: '12px', height: '12px' }} />
            In Cloud
          </span>
        );
      case 'local_only':
        return (
          <span className="status-badge status-badge-local" title="Local ROM file present">
            <FolderCheck style={{ width: '12px', height: '12px' }} />
            Local
          </span>
        );
    }
  };

  return (
    <div data-testid={`game-card-${game.id}`} className="game-card">
      {/* Cover Art / Banner */}
      <div className="card-cover-wrapper">
        {coverImage ? (
          <img
            src={coverImage}
            alt={game.title}
            className="card-cover-img"
            loading="lazy"
          />
        ) : (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              width: '100%',
              height: '100%',
              background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.9) 0%, rgba(15, 23, 42, 0.95) 100%)',
              padding: '1rem',
              textAlign: 'center',
              gap: '0.5rem',
            }}
          >
            <Gamepad2 style={{ width: '40px', height: '40px', color: 'var(--accent-primary)', opacity: 0.8 }} />
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {game.platform}
            </span>
          </div>
        )}
        <div className="card-platform-badge">{game.platform}</div>
        {game.localPaths && game.localPaths.length > 1 ? (
          <div
            style={{
              position: 'absolute',
              top: '8px',
              left: '8px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.25rem',
              padding: '0.2rem 0.4rem',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.65rem',
              fontWeight: 600,
              background: 'rgba(15, 23, 42, 0.85)',
              color: 'var(--text-muted)',
              border: '1px solid var(--border-subtle)',
            }}
            title={`${game.localPaths.length} local copies detected`}
          >
            <Layers style={{ width: '10px', height: '10px' }} />
            {game.localPaths.length} copies
          </div>
        ) : null}
        <div className="card-status-badge-container">{renderStatusBadge()}</div>
      </div>

      {/* Info Section */}
      <div className="card-body">
        <div>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.5rem' }}>
            <h3 className="card-title" title={game.title}>
              {game.title}
            </h3>
            {onEditMetadata ? (
              <button
                type="button"
                aria-label={`Edit metadata for ${game.title}`}
                title="Edit Metadata / Match Game"
                onClick={() => onEditMetadata(game)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  padding: '0.2rem',
                  borderRadius: 'var(--radius-sm)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  transition: 'color 0.2s, background 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = 'var(--accent-primary)';
                  e.currentTarget.style.background = 'rgba(99, 102, 241, 0.15)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = 'var(--text-muted)';
                  e.currentTarget.style.background = 'transparent';
                }}
              >
                <Sparkles style={{ width: '13px', height: '13px' }} />
              </button>
            ) : null}
          </div>
          <div className="card-meta">
            {releaseYear ? <span>{releaseYear}</span> : null}
            {releaseYear ? <span>•</span> : null}
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.25rem',
                fontFamily: 'var(--font-mono)',
              }}
            >
              <HardDrive style={{ width: '12px', height: '12px' }} />
              {formatFileSize(game.file_size_bytes)}
            </span>
          </div>
          {description ? (
            <p className="card-description">{description}</p>
          ) : null}
        </div>

        {/* Download Progress Bar */}
        {isDownloading && downloadProgress ? (
          <div className="download-progress-box">
            <div className="download-progress-info">
              <span>{formatSpeed(downloadProgress.speed_bytes_per_sec)}</span>
              <span>{Math.round(downloadProgress.percentage)}%</span>
            </div>
            <div className="progress-bar-bg">
              <div
                className="progress-bar-fill"
                style={{ width: `${Math.min(100, Math.max(0, downloadProgress.percentage))}%` }}
              />
            </div>
          </div>
        ) : null}

        {/* Action Button */}
        <div className="card-footer">
          <Button
            variant={isPlayable ? 'primary' : 'secondary'}
            size="sm"
            isLoading={isDownloading}
            disabled={isDownloading}
            onClick={() => {
              if (isPlayable) {
                onPlay?.(game);
              } else {
                onDownload?.(game);
              }
            }}
            style={{ width: '100%' }}
          >
            {isPlayable ? (
              <>
                <Play
                  style={{
                    width: '14px',
                    height: '14px',
                    marginRight: '0.375rem',
                    fill: 'currentColor',
                  }}
                />
                Play
              </>
            ) : isDownloading ? (
              'Downloading...'
            ) : (
              <>
                <Download style={{ width: '14px', height: '14px', marginRight: '0.375rem' }} />
                Download
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};
