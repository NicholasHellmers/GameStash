import React from 'react';
import { AlertTriangle, HardDrive, Cloud, ShieldCheck, X } from 'lucide-react';
import { Button } from '../../../components/Button';

export interface SaveConflictModalProps {
  isOpen: boolean;
  gameTitle: string;
  localModifiedAt: string;
  cloudModifiedAt: string;
  onKeepLocal: () => void;
  onKeepCloud: () => void;
  onCancel: () => void;
}

export const SaveConflictModal: React.FC<SaveConflictModalProps> = ({
  isOpen,
  gameTitle,
  localModifiedAt,
  cloudModifiedAt,
  onKeepLocal,
  onKeepCloud,
  onCancel,
}) => {
  if (!isOpen) return null;

  const formatDate = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleString();
    } catch {
      return isoString;
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="conflict-modal-card">
        {/* Header */}
        <div className="conflict-modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
            <div className="conflict-icon-wrapper">
              <AlertTriangle style={{ width: '22px', height: '22px', color: 'var(--warning)' }} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.125rem', fontWeight: 600, color: 'var(--text-main)' }}>
                Cloud Save Conflict
              </h2>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                {gameTitle} has conflicting local and cloud save states.
              </p>
            </div>
          </div>
          <button onClick={onCancel} className="modal-close-btn">
            <X style={{ width: '16px', height: '16px' }} />
          </button>
        </div>

        {/* Comparison Cards */}
        <div className="conflict-comparison-grid">
          {/* Local Save Option */}
          <div className="conflict-option-card">
            <div className="conflict-option-header">
              <HardDrive style={{ width: '20px', height: '20px', color: 'var(--primary)' }} />
              <div>
                <h3 style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--text-main)' }}>
                  Local Device Save
                </h3>
                <span className="conflict-source-label">Current Machine</span>
              </div>
            </div>
            <div className="conflict-meta-box">
              <div className="conflict-meta-label">Modified:</div>
              <div className="conflict-meta-value">{formatDate(localModifiedAt)}</div>
            </div>
            <Button
              variant="primary"
              size="sm"
              onClick={onKeepLocal}
              style={{ width: '100%', marginTop: '1rem' }}
            >
              Upload Local Save to Cloud
            </Button>
          </div>

          {/* Cloud Save Option */}
          <div className="conflict-option-card">
            <div className="conflict-option-header">
              <Cloud style={{ width: '20px', height: '20px', color: 'var(--secondary)' }} />
              <div>
                <h3 style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--text-main)' }}>
                  Cloud Server Save
                </h3>
                <span className="conflict-source-label">Remote Storage</span>
              </div>
            </div>
            <div className="conflict-meta-box">
              <div className="conflict-meta-label">Modified:</div>
              <div className="conflict-meta-value">{formatDate(cloudModifiedAt)}</div>
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={onKeepCloud}
              style={{ width: '100%', marginTop: '1rem' }}
            >
              Download Cloud Save to Device
            </Button>
          </div>
        </div>

        {/* Safety Archive Note */}
        <div className="conflict-safety-footer">
          <ShieldCheck style={{ width: '18px', height: '18px', color: 'var(--success)', flexShrink: 0 }} />
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>
            <strong>Safety Backup:</strong> The replaced save file will be archived in{' '}
            <strong>Settings &gt; Recently Deleted Saves</strong> and can be restored at any time.
          </p>
        </div>
      </div>
    </div>
  );
};
