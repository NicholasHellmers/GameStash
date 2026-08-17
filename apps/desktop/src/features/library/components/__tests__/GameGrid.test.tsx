import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { GameGrid } from '../GameGrid';
import type { UnifiedGame } from '../../../../types';

const mockGames: UnifiedGame[] = [
  {
    id: 'snes-smw',
    title: 'Super Mario World',
    platform: 'snes',
    status: 'installed',
    file_size_bytes: 524288,
    localPath: '/games/roms/snes/smw.sfc',
  },
  {
    id: 'n64-oot',
    title: 'Zelda Ocarina of Time',
    platform: 'n64',
    status: 'remote_only',
    file_size_bytes: 33554432,
  },
];

describe('GameGrid Component', () => {
  it('renders loading state with skeleton cards', () => {
    const { container } = render(<GameGrid games={[]} isLoading={true} />);
    expect(container.querySelectorAll('.game-card')).toHaveLength(6);
  });

  it('renders empty state when no games are found', () => {
    render(<GameGrid games={[]} isLoading={false} />);
    expect(screen.getByText('No games found')).toBeInTheDocument();
  });

  it('renders list of games with play and download actions', () => {
    const handlePlay = vi.fn();
    const handleDownload = vi.fn();

    render(
      <GameGrid
        games={mockGames}
        isLoading={false}
        onPlayGame={handlePlay}
        onDownloadGame={handleDownload}
      />,
    );

    expect(screen.getByText('Super Mario World')).toBeInTheDocument();
    expect(screen.getByText('Zelda Ocarina of Time')).toBeInTheDocument();

    // Play action
    const playBtn = screen.getByRole('button', { name: /play/i });
    fireEvent.click(playBtn);
    expect(handlePlay).toHaveBeenCalledWith(mockGames[0]);

    // Download action
    const downloadBtn = screen.getByRole('button', { name: /download/i });
    fireEvent.click(downloadBtn);
    expect(handleDownload).toHaveBeenCalledWith(mockGames[1]);
  });

  it('forwards onEditMetadata to GameCard components', () => {
    const handleEdit = vi.fn();
    render(
      <GameGrid
        games={mockGames}
        isLoading={false}
        onEditMetadata={handleEdit}
      />,
    );

    const editBtns = screen.getAllByTitle('Edit Metadata / Match Game');
    expect(editBtns.length).toBeGreaterThan(0);
    fireEvent.click(editBtns[0]);
    expect(handleEdit).toHaveBeenCalledWith(mockGames[0]);
  });
});
