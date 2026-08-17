import React, { useState, useEffect } from 'react';
import { tauriApi } from '../../../lib/tauri';
import { Button } from '../../../components/Button';
import { Folder, Save, Info } from 'lucide-react';

export interface LibraryPathSettingsProps {
  onPathUpdated?: () => void;
}

export const LibraryPathSettings: React.FC<LibraryPathSettingsProps> = ({ onPathUpdated }) => {
  const [currentPath, setCurrentPath] = useState<string>('');
  const [inputPath, setInputPath] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPath = async () => {
      setIsLoading(true);
      try {
        const path = await tauriApi.getLibraryRootPath();
        setCurrentPath(path);
        setInputPath(path);
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        setIsLoading(false);
      }
    };
    void fetchPath();
  }, []);

  const handleSavePath = async () => {
    if (!inputPath.trim()) return;
    setIsSaving(true);
    setError(null);
    try {
      await tauriApi.setLibraryRootPath(inputPath.trim());
      setCurrentPath(inputPath.trim());
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 2000);
      onPathUpdated?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="library-path-settings-container">
      <div className="settings-section-header">
        <div>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-main)' }}>
            Local Game Directory Path
          </h3>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            Specify where your local ROMs, ISOs, and game folders are housed.
          </p>
        </div>
      </div>

      {error ? <div className="alert-box alert-error">{error}</div> : null}
      {savedSuccess ? (
        <div className="alert-box alert-success" style={{ marginBottom: '1rem' }}>
          Library path updated successfully!
        </div>
      ) : null}

      <div className="form-group" style={{ marginBottom: '1.25rem' }}>
        <label className="form-label">Library Root Path</label>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Folder
              style={{
                position: 'absolute',
                left: '0.75rem',
                top: '50%',
                transform: 'translateY(-50%)',
                width: '16px',
                height: '16px',
                color: 'var(--text-muted)',
              }}
            />
            <input
              type="text"
              className="form-input"
              style={{ paddingLeft: '2.25rem' }}
              value={inputPath}
              disabled={isLoading}
              onChange={(e) => setInputPath(e.target.value)}
              placeholder="e.g. C:\Games\GameStash\roms or /home/deck/Games/GameStash/roms"
            />
          </div>
          <Button
            variant="primary"
            onClick={handleSavePath}
            disabled={isSaving || inputPath === currentPath}
            isLoading={isSaving}
          >
            <Save style={{ width: '14px', height: '14px', marginRight: '0.375rem' }} />
            Save Path
          </Button>
        </div>
      </div>

      <div className="info-box">
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
          <Info style={{ width: '18px', height: '18px', color: 'var(--primary)', flexShrink: 0, marginTop: '2px' }} />
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>
            <strong style={{ color: 'var(--text-main)', display: 'block', marginBottom: '0.25rem' }}>
              Directory Structure Convention:
            </strong>
            Place your ROMs in platform subdirectories under this root:
            <ul style={{ margin: '0.25rem 0 0 1rem', padding: 0 }}>
              <li><code>snes/</code> (Super Nintendo .sfc, .smc)</li>
              <li><code>gba/</code> (Game Boy Advance .gba)</li>
              <li><code>ps1/</code> (PlayStation 1 .chd, .bin, .cue, .iso)</li>
              <li><code>ps2/</code> (PlayStation 2 .iso, .chd)</li>
              <li><code>n64/</code> (Nintendo 64 .z64, .n64)</li>
              <li><code>gamecube/</code> (GameCube .iso, .gcz)</li>
              <li><code>pc/</code> (Standalone game executables & folders)</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
