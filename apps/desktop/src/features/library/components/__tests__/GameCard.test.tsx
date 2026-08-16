import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { GameCard } from '../GameCard';
import type { Game } from '../../../../types';

const mockGame: Game = {
  id: 'snes-chrono-trigger',
  title: 'Chrono Trigger',
  platform: 'snes',
  release_year: 1995,
  cover_url: 'https://example.com/chrono.jpg',
  file_size_bytes: 4 * 1024 * 1024,
  storage_key: 'roms/snes/chrono.sfc',
  description: 'Classic JRPG',
};

describe('GameCard Component', () => {
  it('renders game title, platform, and formatted file size', () => {
    render(<GameCard game={mockGame} isInstalled={false} />);

    expect(screen.getByText('Chrono Trigger')).toBeInTheDocument();
    expect(screen.getByText('snes')).toBeInTheDocument();
    expect(screen.getByText('4.0 MB')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /download/i })).toBeInTheDocument();
  });

  it('calls onDownload when Download button is clicked for uninstalled game', () => {
    const handleDownload = vi.fn();
    render(<GameCard game={mockGame} isInstalled={false} onDownload={handleDownload} />);

    fireEvent.click(screen.getByRole('button', { name: /download/i }));
    expect(handleDownload).toHaveBeenCalledWith(mockGame);
  });

  it('shows Play button and calls onPlay when game is installed', () => {
    const handlePlay = vi.fn();
    render(<GameCard game={mockGame} isInstalled={true} onPlay={handlePlay} />);

    const playButton = screen.getByRole('button', { name: /play/i });
    expect(playButton).toBeInTheDocument();

    fireEvent.click(playButton);
    expect(handlePlay).toHaveBeenCalledWith(mockGame);
  });
});
