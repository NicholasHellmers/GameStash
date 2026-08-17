import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LibraryPathSettings } from '../LibraryPathSettings';
import { tauriApi } from '../../../../lib/tauri';

vi.mock('../../../../lib/tauri', () => ({
  tauriApi: {
    getLibraryRootPath: vi.fn(),
    setLibraryRootPath: vi.fn(),
  },
}));

describe('LibraryPathSettings Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders existing library root path', async () => {
    vi.mocked(tauriApi.getLibraryRootPath).mockResolvedValue('C:\\Games\\GameStash\\roms');

    render(<LibraryPathSettings />);

    await waitFor(() => {
      expect(screen.getByDisplayValue('C:\\Games\\GameStash\\roms')).toBeInTheDocument();
    });

    expect(screen.getByText('Directory Structure Convention:')).toBeInTheDocument();
  });

  it('allows updating and saving new library path', async () => {
    vi.mocked(tauriApi.getLibraryRootPath).mockResolvedValue('C:\\Games\\GameStash\\roms');
    vi.mocked(tauriApi.setLibraryRootPath).mockResolvedValue(undefined);
    const handleUpdated = vi.fn();

    render(<LibraryPathSettings onPathUpdated={handleUpdated} />);

    await waitFor(() => {
      expect(screen.getByDisplayValue('C:\\Games\\GameStash\\roms')).toBeInTheDocument();
    });

    const input = screen.getByDisplayValue('C:\\Games\\GameStash\\roms');
    fireEvent.change(input, { target: { value: 'D:\\NewRomsPath' } });

    const saveBtn = screen.getByRole('button', { name: /save path/i });
    expect(saveBtn).not.toBeDisabled();

    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(tauriApi.setLibraryRootPath).toHaveBeenCalledWith('D:\\NewRomsPath');
      expect(handleUpdated).toHaveBeenCalled();
    });

    expect(screen.getByText(/library path updated successfully/i)).toBeInTheDocument();
  });
});
