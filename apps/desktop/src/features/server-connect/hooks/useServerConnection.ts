import { useState, useCallback } from 'react';
import { tauriApi } from '../../../lib/tauri';
import type { ServerConnectionState } from '../types';

export function useServerConnection(initialUrl: string = 'http://localhost:8080') {
  const [state, setState] = useState<ServerConnectionState>({
    serverUrl: initialUrl,
    isConnected: false,
    isConnecting: false,
    error: null,
    health: null,
  });

  const connect = useCallback(async (urlToConnect?: string) => {
    const targetUrl = urlToConnect || state.serverUrl;
    setState((prev) => ({ ...prev, isConnecting: true, error: null, serverUrl: targetUrl }));

    try {
      const health = await tauriApi.pingServer(targetUrl);
      setState({
        serverUrl: targetUrl,
        isConnected: true,
        isConnecting: false,
        error: null,
        health,
      });
      return true;
    } catch (err) {
      setState((prev) => ({
        ...prev,
        isConnected: false,
        isConnecting: false,
        error: err instanceof Error ? err.message : String(err),
        health: null,
      }));
      return false;
    }
  }, [state.serverUrl]);

  return {
    ...state,
    setServerUrl: (url: string) => setState((prev) => ({ ...prev, serverUrl: url })),
    connect,
  };
}
