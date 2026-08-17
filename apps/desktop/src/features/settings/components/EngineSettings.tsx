import React, { useState, useEffect } from 'react';
import { tauriApi } from '../../../lib/tauri';
import type { EngineConfig } from '../../../types';
import { Button } from '../../../components/Button';
import { CheckCircle2, AlertCircle, RefreshCw, Save, Cpu } from 'lucide-react';

export const EngineSettings: React.FC = () => {
  const [configs, setConfigs] = useState<EngineConfig[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const loadConfigs = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await tauriApi.getEngineConfigs();
      setConfigs(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadConfigs();
  }, []);

  const handleAutoDetect = async () => {
    setIsLoading(true);
    try {
      const detected = await tauriApi.detectInstalledEngines();
      setConfigs(detected);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateConfig = (index: number, updates: Partial<EngineConfig>) => {
    setConfigs((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], ...updates };
      return next;
    });
  };

  const handleSave = async (config: EngineConfig) => {
    setIsSaving(true);
    try {
      await tauriApi.saveEngineConfig(config);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="engine-settings-container">
      <div className="settings-section-header">
        <div>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-main)' }}>
            Emulation Engines & Launchers
          </h3>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            Configure default launch runners, Flatpaks, and binary overrides per platform.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={handleAutoDetect} disabled={isLoading}>
          <RefreshCw
            style={{
              width: '14px',
              height: '14px',
              marginRight: '0.375rem',
              animation: isLoading ? 'spin 1s linear infinite' : 'none',
            }}
          />
          Auto-Detect
        </Button>
      </div>

      {error ? <div className="alert-box alert-error">{error}</div> : null}
      {saveSuccess ? (
        <div className="alert-box alert-success" style={{ padding: '0.5rem 0.75rem', marginBottom: '1rem' }}>
          Engine settings saved successfully!
        </div>
      ) : null}

      <div className="engine-list">
        {configs.map((config, index) => (
          <div key={config.platform} className="engine-card">
            <div className="engine-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Cpu style={{ width: '18px', height: '18px', color: 'var(--primary)' }} />
                <span style={{ fontWeight: 600, color: 'var(--text-main)', textTransform: 'uppercase' }}>
                  {config.platform}
                </span>
                <span className="engine-name-badge">{config.engine_name}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                {config.is_detected ? (
                  <span className="status-badge status-badge-installed" style={{ fontSize: '11px' }}>
                    <CheckCircle2 style={{ width: '11px', height: '11px' }} />
                    Detected
                  </span>
                ) : (
                  <span className="status-badge status-badge-remote" style={{ fontSize: '11px' }}>
                    <AlertCircle style={{ width: '11px', height: '11px' }} />
                    Manual / Unverified
                  </span>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleSave(config)}
                  disabled={isSaving}
                  style={{ padding: '0.375rem 0.625rem' }}
                >
                  <Save style={{ width: '13px', height: '13px', marginRight: '0.25rem' }} />
                  Save
                </Button>
              </div>
            </div>

            <div className="engine-fields">
              <div className="form-group" style={{ flex: 1 }}>
                <label className="form-label">
                  {config.is_flatpak ? 'Flatpak Application ID' : 'Executable / Binary Path'}
                </label>
                <input
                  type="text"
                  className="form-input"
                  value={config.executable_path}
                  onChange={(e) => handleUpdateConfig(index, { executable_path: e.target.value })}
                  placeholder={config.is_flatpak ? 'e.g. org.libretro.RetroArch' : 'e.g. C:\\Emulators\\retroarch.exe'}
                />
              </div>

              <div className="form-group" style={{ flex: 1 }}>
                <label className="form-label">Default Arguments (space separated)</label>
                <input
                  type="text"
                  className="form-input"
                  value={config.default_args.join(' ')}
                  onChange={(e) =>
                    handleUpdateConfig(index, {
                      default_args: e.target.value ? e.target.value.split(' ') : [],
                    })
                  }
                  placeholder="-L snes9x_libretro"
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
