import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { ManualMatchModal } from '../ManualMatchModal';
import { Platform, UnifiedGame } from '../../../../types';
import { GameMetadata } from '../../types';

describe('ManualMatchModal', () => {
  const mockGame: UnifiedGame = {
    id: 'snes:earthbound123',
    title: 'EarthBound (USA)',
    platform: 'snes',
    file_size_bytes: 3145728,
    status: 'installed',
  };

  const mockCandidate: GameMetadata = {
    gameId: 'snes:earthbound',
    matchedTitle: 'EarthBound',
    coverUrl: 'https://images.igdb.com/earthbound.jpg',
    releaseYear: 1994,
    developer: 'Ape / HAL Laboratory',
    publisher: 'Nintendo',
    genres: ['RPG'],
    description: 'Intergalactic terror strikes Onett',
    providerSource: 'opengamedb',
  };

  it('renders nothing when closed', () => {
    const { container } = render(
      <ManualMatchModal
        game={mockGame}
        isOpen={false}
        onClose={vi.fn()}
        onSelectMetadata={vi.fn()}
        onSearchCandidates={vi.fn().mockResolvedValue([])}
      />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders candidate results and allows user to apply a match', async () => {
    const onSelect = vi.fn();
    const onClose = vi.fn();
    const onSearch = vi.fn().mockResolvedValue([mockCandidate]);

    render(
      <ManualMatchModal
        game={mockGame}
        isOpen={true}
        onClose={onClose}
        onSelectMetadata={onSelect}
        onSearchCandidates={onSearch}
      />,
    );

    expect(screen.getByText('Match Game Metadata')).toBeInTheDocument();
    expect(screen.getByDisplayValue('EarthBound (USA)')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('EarthBound')).toBeInTheDocument();
      expect(screen.getByText('Ape / HAL Laboratory')).toBeInTheDocument();
    });

    const applyButton = screen.getByRole('button', { name: 'Apply Match' });
    expect(applyButton).not.toBeDisabled();

    fireEvent.click(applyButton);
    expect(onSelect).toHaveBeenCalledWith(mockGame, mockCandidate);
    expect(onClose).toHaveBeenCalled();
  });

  it('allows manual search querying and handles close', async () => {
    const onClose = vi.fn();
    const onSearch = vi.fn().mockResolvedValue([]);

    render(
      <ManualMatchModal
        game={mockGame}
        isOpen={true}
        onClose={onClose}
        onSelectMetadata={vi.fn()}
        onSearchCandidates={onSearch}
      />,
    );

    const input = screen.getByPlaceholderText(/search game title/i);
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Search' })).toBeInTheDocument();
    });

    fireEvent.change(input, { target: { value: 'Custom Game' } });
    fireEvent.click(screen.getByRole('button', { name: 'Search' }));

    await waitFor(() => {
      expect(onSearch).toHaveBeenCalledWith('Custom Game', 'snes');
    });

    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(onClose).toHaveBeenCalled();
  });
});
