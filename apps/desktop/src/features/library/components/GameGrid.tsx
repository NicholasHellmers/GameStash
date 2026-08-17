import React from 'react';
import { GameCard } from './GameCard';
import type { DownloadProgressPayload, UnifiedGame } from '../../../types';
import { Gamepad } from 'lucide-react';

export interface GameGridProps {
  games: UnifiedGame[];
  isLoading: boolean;
  downloads?: Record<string, DownloadProgressPayload>;
  downloadingGameIds?: Set<string>;
  onPlayGame?: (game: UnifiedGame) => void;
  onDownloadGame?: (game: UnifiedGame) => void;
  onEditMetadata?: (game: UnifiedGame) => void;
}

export const GameGrid: React.FC<GameGridProps> = ({
  games,
  isLoading,
  downloads = {},
  downloadingGameIds = new Set(),
  onPlayGame,
  onDownloadGame,
  onEditMetadata,
}) => {
  if (isLoading) {
    return (
      <div className="game-grid" style={{ opacity: 0.6 }}>
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="game-card" style={{ height: '360px', opacity: 0.4 }}>
            <div className="card-cover-wrapper" style={{ background: '#0b1120' }} />
          </div>
        ))}
      </div>
    );
  }

  if (games.length === 0) {
    return (
      <div className="empty-state">
        <Gamepad
          style={{
            width: '48px',
            height: '48px',
            color: 'var(--text-subtle)',
            margin: '0 auto 0.75rem auto',
          }}
        />
        <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-main)' }}>
          No games found
        </h3>
        <p
          style={{
            fontSize: '0.75rem',
            color: 'var(--text-muted)',
            maxWidth: '380px',
            margin: '0.25rem auto 0 auto',
          }}
        >
          Connect to your GameStash server or place ROMs into your configured library directory to populate your library.
        </p>
      </div>
    );
  }

  return (
    <div className="game-grid">
      {games.map((game: UnifiedGame) => (
        <GameCard
          key={game.id}
          game={game}
          downloadProgress={downloads[game.id]}
          isDownloading={downloadingGameIds.has(game.id)}
          onPlay={onPlayGame}
          onDownload={onDownloadGame}
          onEditMetadata={onEditMetadata}
        />
      ))}
    </div>
  );
};
