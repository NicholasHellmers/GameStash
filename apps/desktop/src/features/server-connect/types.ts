import type { ServerHealth } from '../../types';

export interface ServerConnectionState {
  serverUrl: string;
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
  health: ServerHealth | null;
}
