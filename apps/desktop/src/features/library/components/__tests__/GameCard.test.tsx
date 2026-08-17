import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { GameCard } from '../GameCard';
import type { UnifiedGame } from '../../../../types';

const mockRemoteGame: UnifiedGame = {
  id: 'snes-chrono-trigger',
  title: 'Chrono Trigger',
  platform: 'snes',
  status: 'remote_only',
  release_year: 1995,
  cover_url: 'https://example.com/chrono.jpg',
  file_size_bytes: 4 * 1024 * 1024,
  storage_key: 'roms/snes/chrono.sfc',
  description: 'Classic JRPG',
};

const mockInstalledGame: UnifiedGame = {
  ...mockRemoteGame,
  status: 'installed',
  localPath: '/games/roms/snes/chrono.sfc',
};

describe('GameCard Component', () => {
  it('renders game title, platform, formatted file size, and remote badge', () => {
    render(<GameCard game={mockRemoteGame} />);

    expect(screen.getByText('Chrono Trigger')).toBeInTheDocument();
    expect(screen.getByText('snes')).toBeInTheDocument();
    expect(screen.getByText('4.0 MB')).toBeInTheDocument();
    expect(screen.getByText('In Cloud')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /download/i })).toBeInTheDocument();
  });

  it('calls onDownload when Download button is clicked for remote-only game', () => {
    const handleDownload = vi.fn();
    render(<GameCard game={mockRemoteGame} onDownload={handleDownload} />);

    fireEvent.click(screen.getByRole('button', { name: /download/i }));
    expect(handleDownload).toHaveBeenCalledWith(mockRemoteGame);
  });

  it('shows Play button, Installed badge, and calls onPlay when game is installed', () => {
    const handlePlay = vi.fn();
    render(<GameCard game={mockInstalledGame} onPlay={handlePlay} />);

    expect(screen.getByText('Installed')).toBeInTheDocument();
    const playButton = screen.getByRole('button', { name: /play/i });
    expect(playButton).toBeInTheDocument();

    fireEvent.click(playButton);
    expect(handlePlay).toHaveBeenCalledWith(mockInstalledGame);
  });

  it('renders download progress bar when isDownloading is true', () => {
    render(
      <GameCard
        game={mockRemoteGame}
        isDownloading={true}
        downloadProgress={{
          game_id: 'snes-chrono-trigger',
          bytes_downloaded: 2 * 1024 * 1024,
          total_bytes: 4 * 1024 * 1024,
          percentage: 50,
          speed_bytes_per_sec: 1024 * 1024,
          status: 'downloading',
        }}
      />,
    );

    expect(screen.getByText('50%')).toBeInTheDocument();
    expect(screen.getByText('1.0 MB/s')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /downloading/i })).toBeDisabled();
  });

  it('renders fallback placeholder and multi-copy badge when no cover_url is provided', () => {
    const gameWithoutCover: UnifiedGame = {
      id: 'snes:cdd3c8c373244976',
      title: 'EarthBound (USA)',
      platform: 'snes',
      status: 'installed',
      file_size_bytes: 3145728,
      localPath: '/roms/snes/eb.sfc',
      localPaths: ['/roms/snes/eb.sfc', '/roms/snes/eb_backup.sfc'],
    };

    render(<GameCard game={gameWithoutCover} />);

    expect(screen.getByText('EarthBound (USA)')).toBeInTheDocument();
    expect(screen.getByText('2 copies')).toBeInTheDocument();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it('renders metadata overrides when metadata prop is present', () => {
    const gameWithMeta: UnifiedGame = {
      id: 'snes:cdd3c8c373244976',
      title: 'EarthBound (USA)',
      platform: 'snes',
      status: 'remote_only',
      file_size_bytes: 3145728,
      metadata: {
        gameId: 'snes:cdd3c8c373244976',
        matchedTitle: 'EarthBound',
        coverUrl: 'https://images.example.com/eb_cover.jpg',
        description: 'Scraped RPG description',
        releaseYear: 1994,
        providerSource: 'opengamedb',
      },
    };

    render(<GameCard game={gameWithMeta} />);

    expect(screen.getByText('1994')).toBeInTheDocument();
    expect(screen.getByText('Scraped RPG description')).toBeInTheDocument();
    const coverImg = screen.getByRole('img');
    expect(coverImg).toHaveAttribute('src', 'https://images.example.com/eb_cover.jpg');
  });

  it('calls onEditMetadata when edit metadata button is clicked', () => {
    const handleEdit = vi.fn();
    render(<GameCard game={mockRemoteGame} onEditMetadata={handleEdit} />);

    const editBtn = screen.getByRole('button', { name: `Edit metadata for ${mockRemoteGame.title}` });
    expect(editBtn).toBeInTheDocument();

    fireEvent.click(editBtn);
    expect(handleEdit).toHaveBeenCalledWith(mockRemoteGame);
  });
});
