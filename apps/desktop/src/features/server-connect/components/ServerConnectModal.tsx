import React, { useState } from 'react';
import { Button } from '../../../components/Button';
import { Server, Wifi, AlertCircle, CheckCircle2 } from 'lucide-react';
import type { ServerHealth } from '../../../types';

export interface ServerConnectModalProps {
  currentUrl: string;
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
  health: ServerHealth | null;
  onConnect: (url: string) => Promise<boolean>;
}

export const ServerConnectModal: React.FC<ServerConnectModalProps> = ({
  currentUrl,
  isConnected,
  isConnecting,
  error,
  health,
  onConnect,
}) => {
  const [inputUrl, setInputUrl] = useState<string>(currentUrl);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const trimmed = inputUrl.trim();
    if (trimmed) {
      void onConnect(trimmed);
    }
  };

  return (
    <div className="modal-card">
      <div className="modal-header">
        <div className="modal-icon">
          <Server className="w-5 h-5" />
        </div>
        <div>
          <h2 style={{ fontSize: '1.125rem', fontWeight: 600, color: 'var(--text-main)' }}>
            Server Connection
          </h2>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            Connect to your self-hosted GameStash server
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div>
          <label htmlFor="server-endpoint-input" className="input-label">
            Server Endpoint URL
          </label>
          <input
            id="server-endpoint-input"
            type="text"
            value={inputUrl}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setInputUrl(e.target.value)}
            placeholder="http://localhost:8080 or https://stash.home"
            className="input-field"
          />
        </div>

        {error ? (
          <div className="alert-box alert-error">
            <AlertCircle className="w-4 h-4" style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>
              <p style={{ fontWeight: 600 }}>Connection Failed</p>
              <p style={{ opacity: 0.9 }}>{error}</p>
            </div>
          </div>
        ) : null}

        {isConnected && health ? (
          <div className="alert-box alert-success">
            <CheckCircle2 className="w-4 h-4" style={{ flexShrink: 0 }} />
            <div>
              <p style={{ fontWeight: 600 }}>Connected to GameStash v{health.version}</p>
              <p style={{ opacity: 0.85 }}>Storage: {health.storage_connected ? 'Active' : 'Offline'}</p>
            </div>
          </div>
        ) : null}

        <div style={{ marginTop: '0.5rem' }}>
          <Button
            type="submit"
            isLoading={isConnecting}
            style={{ width: '100%' }}
          >
            <Wifi className="w-4 h-4" style={{ marginRight: '0.375rem' }} />
            {isConnected ? 'Reconnect' : 'Connect to Server'}
          </Button>
        </div>
      </form>
    </div>
  );
};
