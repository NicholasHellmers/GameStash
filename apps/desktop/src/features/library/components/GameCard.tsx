import React, { useState } from 'react';
import { Button } from '../../../components/Button';
import { Play, Download, HardDrive, Gamepad2 } from 'lucide-react';
import type { Game } from '../../../types';

export interface GameCardProps {
  game: Game;
  isInstalled?: boolean;
  onPlay?: (game: Game) => void;
  onDownload?: (game: Game) => void;
}

export const GameCard: React.FC<GameCardProps> = ({
  game,
  isInstalled = false,
  onPlay,
  onDownload,
}) => {
  const [isActionLoading, setIsActionLoading] = useState<boolean>(false);

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    }
    if (bytes < 1024 * 1024 * 1024) {
      return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    }
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  };

  const handleAction = async () => {
    setIsActionLoading(true);
    try {
      if (isInstalled) {
        onPlay?.(game);
      } else {
        onDownload?.(game);
      }
    } finally {
      setIsActionLoading(false);
    }
  };

  return (
    <div data-testid={`game-card-${game.id}`} className="game-card">
      {/* Cover Art / Banner */}
      <div className="card-cover-wrapper">
        {game.cover_url ? (
          <img
            src={game.cover_url}
            alt={game.title}
            className="card-cover-img"
            loading="lazy"
          />
        ) : (
          <Gamepad2 style={{ width: '48px', height: '48px', color: 'var(--text-subtle)' }} />
        )}
        <div className="card-platform-badge">
          {game.platform}
        </div>
      </div>

      {/* Info Section */}
      <div className="card-body">
        <div>
          <h3 className="card-title" title={game.title}>
            {game.title}
          </h3>
          <div className="card-meta">
            {game.release_year ? <span>{game.release_year}</span> : null}
            <span>•</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontFamily: 'var(--font-mono)' }}>
              <HardDrive style={{ width: '12px', height: '12px' }} />
              {formatFileSize(game.file_size_bytes)}
            </span>
          </div>
          {game.description ? (
            <p className="card-description">
              {game.description}
            </p>
          ) : null}
        </div>

        {/* Action Button */}
        <div className="card-footer">
          <Button
            variant={isInstalled ? 'primary' : 'secondary'}
            size="sm"
            isLoading={isActionLoading}
            onClick={handleAction}
            style={{ width: '100%' }}
          >
            {isInstalled ? (
              <>
                <Play style={{ width: '14px', height: '14px', marginRight: '0.375rem', fill: 'currentColor' }} />
                Play
              </>
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
