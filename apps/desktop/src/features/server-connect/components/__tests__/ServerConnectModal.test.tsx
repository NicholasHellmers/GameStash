import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ServerConnectModal } from '../ServerConnectModal';

describe('ServerConnectModal Component', () => {
  it('renders connection inputs, status indicators, and handles connect', async () => {
    const handleConnect = vi.fn().mockResolvedValue(true);

    render(
      <ServerConnectModal
        currentUrl="http://localhost:8080"
        isConnected={true}
        isConnecting={false}
        error={null}
        health={{
          status: 'ok',
          version: '0.1.0',
          storage_connected: true,
          server_time_utc: '2026-08-16T12:00:00Z',
        }}
        onConnect={handleConnect}
      />,
    );

    expect(screen.getByText('Server Connection')).toBeInTheDocument();
    expect(screen.getByDisplayValue('http://localhost:8080')).toBeInTheDocument();
    expect(screen.getByText('Connected to GameStash v0.1.0')).toBeInTheDocument();
    expect(screen.getByText('Storage: Active')).toBeInTheDocument();

    const connectBtn = screen.getByRole('button', { name: /reconnect/i });
    fireEvent.click(connectBtn);

    await waitFor(() => {
      expect(handleConnect).toHaveBeenCalledWith('http://localhost:8080');
    });
  });

  it('renders error alert when error prop is provided', () => {
    render(
      <ServerConnectModal
        currentUrl="http://invalid-url:9999"
        isConnected={false}
        isConnecting={false}
        error="Connection timed out"
        health={null}
        onConnect={vi.fn().mockResolvedValue(false)}
      />,
    );

    expect(screen.getByText('Connection Failed')).toBeInTheDocument();
    expect(screen.getByText('Connection timed out')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /connect to server/i })).toBeInTheDocument();
  });
});
