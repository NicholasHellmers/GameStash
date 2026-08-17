import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { SettingsModal } from '../SettingsModal';

vi.mock('../../../../lib/tauri', () => ({
  tauriApi: {
    getEngineConfigs: vi.fn().mockResolvedValue([]),
    getLibraryRootPath: vi.fn().mockResolvedValue('/roms'),
    listSaveBackups: vi.fn().mockResolvedValue([]),
  },
}));

describe('SettingsModal Component', () => {
  it('renders tabs and allows switching between tabs', async () => {
    const handleClose = vi.fn();
    const handleConnect = vi.fn().mockResolvedValue(true);

    render(
      <SettingsModal
        isOpen={true}
        onClose={handleClose}
        serverUrl="http://localhost:8080"
        isConnected={true}
        isConnecting={false}
        serverError={null}
        health={null}
        onConnectServer={handleConnect}
      />,
    );

    expect(screen.getByText('GameStash Settings & Configurations')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /emulators & engines/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /local directory/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /recently deleted saves/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /server connection/i })).toBeInTheDocument();

    // Click Local Directory tab
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /local directory/i }));
    });
    expect(screen.getByText('Local Game Directory Path')).toBeInTheDocument();

    // Click Recently Deleted tab
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /recently deleted saves/i }));
    });
    expect(screen.getByText('Recently Overwritten & Deleted Saves')).toBeInTheDocument();

    // Click Close button
    fireEvent.click(screen.getByTitle('Close Settings'));
    expect(handleClose).toHaveBeenCalled();
  });

  it('returns null when isOpen is false', () => {
    const { container } = render(
      <SettingsModal
        isOpen={false}
        onClose={vi.fn()}
        serverUrl="http://localhost:8080"
        isConnected={false}
        isConnecting={false}
        serverError={null}
        health={null}
        onConnectServer={vi.fn().mockResolvedValue(true)}
      />,
    );

    expect(container.firstChild).toBeNull();
  });
});
