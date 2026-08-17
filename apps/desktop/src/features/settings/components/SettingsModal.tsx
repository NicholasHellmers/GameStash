import React, { useState } from 'react';
import { Cpu, Folder, History, Server, X } from 'lucide-react';
import { EngineSettings } from './EngineSettings';
import { LibraryPathSettings } from './LibraryPathSettings';
import { RecentlyDeletedSaves } from './RecentlyDeletedSaves';
import { ServerConnectModal } from '../../server-connect';
import type { ServerHealth } from '../../../types';

export interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  serverUrl: string;
  isConnected: boolean;
  isConnecting: boolean;
  serverError: string | null;
  health: ServerHealth | null;
  onConnectServer: (url: string) => Promise<boolean>;
  onLibraryPathUpdated?: () => void;
}

type TabType = 'engines' | 'paths' | 'backups' | 'server';

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  serverUrl,
  isConnected,
  isConnecting,
  serverError,
  health,
  onConnectServer,
  onLibraryPathUpdated,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('engines');

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop">
      <div className="settings-modal-card">
        {/* Header */}
        <div className="settings-modal-header">
          <h2 style={{ fontSize: '1.125rem', fontWeight: 600, color: 'var(--text-main)' }}>
            GameStash Settings & Configurations
          </h2>
          <button onClick={onClose} className="modal-close-btn" title="Close Settings">
            <X style={{ width: '16px', height: '16px' }} />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="settings-tab-bar">
          <button
            className={`settings-tab-btn ${activeTab === 'engines' ? 'settings-tab-active' : ''}`}
            onClick={() => setActiveTab('engines')}
          >
            <Cpu style={{ width: '15px', height: '15px' }} />
            Emulators & Engines
          </button>
          <button
            className={`settings-tab-btn ${activeTab === 'paths' ? 'settings-tab-active' : ''}`}
            onClick={() => setActiveTab('paths')}
          >
            <Folder style={{ width: '15px', height: '15px' }} />
            Local Directory
          </button>
          <button
            className={`settings-tab-btn ${activeTab === 'backups' ? 'settings-tab-active' : ''}`}
            onClick={() => setActiveTab('backups')}
          >
            <History style={{ width: '15px', height: '15px' }} />
            Recently Deleted Saves
          </button>
          <button
            className={`settings-tab-btn ${activeTab === 'server' ? 'settings-tab-active' : ''}`}
            onClick={() => setActiveTab('server')}
          >
            <Server style={{ width: '15px', height: '15px' }} />
            Server Connection
          </button>
        </div>

        {/* Tab Content */}
        <div className="settings-modal-content">
          {activeTab === 'engines' && <EngineSettings />}
          {activeTab === 'paths' && <LibraryPathSettings onPathUpdated={onLibraryPathUpdated} />}
          {activeTab === 'backups' && <RecentlyDeletedSaves />}
          {activeTab === 'server' && (
            <ServerConnectModal
              currentUrl={serverUrl}
              isConnected={isConnected}
              isConnecting={isConnecting}
              error={serverError}
              health={health}
              onConnect={onConnectServer}
            />
          )}
        </div>
      </div>
    </div>
  );
};
