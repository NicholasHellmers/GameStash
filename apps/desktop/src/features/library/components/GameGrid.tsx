import React from 'react';
import { GameCard } from './GameCard';
import type { Game } from '../../../types';
import { Gamepad } from 'lucide-react';

export interface GameGridProps {
  games: Game[];
  isLoading: boolean;
  installedGameIds?: Set<string>;
  onPlayGame?: (game: Game) => void;
  onDownloadGame?: (game: Game) => void;
}

export const GameGrid: React.FC<GameGridProps> = ({
  games,
  isLoading,
  installedGameIds,
  onPlayGame,
  onDownloadGame,
}) => {
  if (isLoading) {
    return (
      <div className="game-grid" style={{ opacity: 0.6 }}>
        {[1, 2, 3, 4].map((i) => (
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
        <Gamepad style={{ width: '48px', height: '48px', color: 'var(--text-subtle)', margin: '0 auto 0.75rem auto' }} />
        <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-main)' }}>No games found</h3>
        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', maxWidth: '380px', margin: '0.25rem auto 0 auto' }}>
          Connect to your GameStash server or add ROMs to your storage bucket to populate your library.
        </p>
      </div>
    );
  }

  return (
    <div className="game-grid">
      {games.map((game: Game) => (
        <GameCard
          key={game.id}
          game={game}
          isInstalled={installedGameIds ? installedGameIds.has(game.id) : false}
          onPlay={onPlayGame}
          onDownload={onDownloadGame}
        />
      ))}
    </div>
  );
};
