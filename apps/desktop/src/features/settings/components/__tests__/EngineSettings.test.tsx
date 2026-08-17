import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EngineSettings } from '../EngineSettings';
import { tauriApi } from '../../../../lib/tauri';
import type { EngineConfig } from '../../../../types';

vi.mock('../../../../lib/tauri', () => ({
  tauriApi: {
    getEngineConfigs: vi.fn(),
    saveEngineConfig: vi.fn(),
    detectInstalledEngines: vi.fn(),
  },
}));

const mockConfigs: EngineConfig[] = [
  {
    platform: 'snes',
    engine_name: 'RetroArch (Snes9x)',
    executable_path: 'retroarch',
    default_args: ['-L', 'snes9x_libretro'],
    is_flatpak: false,
    flatpak_id: undefined,
    is_detected: true,
  },
  {
    platform: 'ps1',
    engine_name: 'DuckStation',
    executable_path: 'duckstation-qt',
    default_args: ['-batch'],
    is_flatpak: false,
    flatpak_id: undefined,
    is_detected: false,
  },
];

describe('EngineSettings Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders list of engine configurations with detection status', async () => {
    vi.mocked(tauriApi.getEngineConfigs).mockResolvedValue(mockConfigs);

    render(<EngineSettings />);

    await waitFor(() => {
      expect(screen.getByText('RetroArch (Snes9x)')).toBeInTheDocument();
      expect(screen.getByText('DuckStation')).toBeInTheDocument();
    });

    expect(screen.getByText('Detected')).toBeInTheDocument();
    expect(screen.getByText('Manual / Unverified')).toBeInTheDocument();
  });

  it('handles auto-detect button click', async () => {
    vi.mocked(tauriApi.getEngineConfigs).mockResolvedValue(mockConfigs);
    vi.mocked(tauriApi.detectInstalledEngines).mockResolvedValue(mockConfigs);

    render(<EngineSettings />);

    await waitFor(() => {
      expect(screen.getByText('RetroArch (Snes9x)')).toBeInTheDocument();
    });

    const autoDetectBtn = screen.getByRole('button', { name: /auto-detect/i });
    fireEvent.click(autoDetectBtn);

    await waitFor(() => {
      expect(tauriApi.detectInstalledEngines).toHaveBeenCalledTimes(1);
    });
  });

  it('allows editing and saving an engine configuration', async () => {
    vi.mocked(tauriApi.getEngineConfigs).mockResolvedValue(mockConfigs);
    vi.mocked(tauriApi.saveEngineConfig).mockResolvedValue(undefined);

    render(<EngineSettings />);

    await waitFor(() => {
      expect(screen.getByText('RetroArch (Snes9x)')).toBeInTheDocument();
    });

    const saveButtons = screen.getAllByRole('button', { name: /save/i });
    fireEvent.click(saveButtons[0]);

    await waitFor(() => {
      expect(tauriApi.saveEngineConfig).toHaveBeenCalled();
    });

    expect(screen.getByText(/engine settings saved successfully/i)).toBeInTheDocument();
  });
});
