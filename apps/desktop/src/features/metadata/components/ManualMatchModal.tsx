import React, { useState, useEffect } from 'react';
import { Button } from '../../../components/Button';
import { Search, X, Check, Gamepad2, AlertCircle } from 'lucide-react';
import { UnifiedGame } from '../../../types';
import { GameMetadata } from '../types';

export interface ManualMatchModalProps {
  game: UnifiedGame | null;
  isOpen: boolean;
  onClose: () => void;
  onSelectMetadata: (game: UnifiedGame, metadata: GameMetadata) => void;
  onSearchCandidates: (query: string, platform?: any) => Promise<GameMetadata[]>;
}

export const ManualMatchModal: React.FC<ManualMatchModalProps> = ({
  game,
  isOpen,
  onClose,
  onSelectMetadata,
  onSearchCandidates,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [candidates, setCandidates] = useState<GameMetadata[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selectedCandidate, setSelectedCandidate] = useState<GameMetadata | null>(null);

  useEffect(() => {
    if (game && isOpen) {
      setSearchQuery(game.title);
      setSelectedCandidate(null);
      setErrorMessage(null);
      void handleSearch(game.title);
    }
  }, [game, isOpen]);

  const handleSearch = async (query: string) => {
    const trimmed = query.trim();
    if (!trimmed) return;
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const results = await onSearchCandidates(trimmed, game?.platform);
      setCandidates(results);
      if (results.length > 0) {
        setSelectedCandidate(results[0]);
      } else {
        setSelectedCandidate(null);
      }
    } catch (err: any) {
      setCandidates([]);
      setSelectedCandidate(null);
      setErrorMessage(err?.message || 'Failed to search game databases. Check your connection or search terms.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleApply = () => {
    if (game && selectedCandidate) {
      onSelectMetadata(game, selectedCandidate);
      onClose();
    }
  };

  if (!isOpen || !game) return null;

  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <div
        className="modal-container"
        style={{ maxWidth: '640px', width: '100%' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-card">
          {/* Header */}
          <div className="modal-header" style={{ justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div className="modal-icon">
                <Search className="w-5 h-5" />
              </div>
              <div>
                <h2 id="modal-title" style={{ fontSize: '1.125rem', fontWeight: 600, color: 'var(--text-main)' }}>
                  Match Game Metadata
                </h2>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  File: <span style={{ color: 'var(--text-main)', fontFamily: 'var(--font-mono)' }}>{game.title}</span> ({String(game.platform).toUpperCase()})
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              aria-label="Close"
              className="btn btn-ghost btn-sm"
              style={{ padding: '0.375rem', color: 'var(--text-muted)' }}
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Search Input */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void handleSearch(searchQuery);
            }}
            style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}
          >
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search game title (e.g. Mario Kart)..."
              className="input-field"
              style={{ flex: 1 }}
            />
            <Button type="submit" variant="primary" disabled={isLoading}>
              {isLoading ? 'Searching...' : 'Search'}
            </Button>
          </form>

          {/* Error Banner */}
          {errorMessage && (
            <div className="alert-box alert-error" style={{ marginBottom: '1rem' }}>
              <AlertCircle className="w-4 h-4" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Results List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '360px', overflowY: 'auto' }}>
            <span style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--text-subtle)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Candidate Matches ({candidates.length})
            </span>

            {candidates.length === 0 && !isLoading && !errorMessage && (
              <div className="empty-state" style={{ padding: '2rem 1rem' }}>
                <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                  No matching games found for &quot;{searchQuery}&quot;.
                </p>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-subtle)' }}>
                  Tip: Remove region tags (e.g. search for &quot;Mario Kart 64&quot; instead of &quot;Mario Kart 64 (USA)&quot;).
                </p>
              </div>
            )}

            {candidates.map((candidate, idx) => {
              const isSelected = selectedCandidate?.matchedTitle === candidate.matchedTitle;
              return (
                <div
                  key={idx}
                  onClick={() => setSelectedCandidate(candidate)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1rem',
                    padding: '0.75rem',
                    borderRadius: 'var(--radius-md)',
                    background: isSelected ? 'rgba(99, 102, 241, 0.15)' : '#1e293b',
                    border: isSelected ? '1px solid var(--primary)' : '1px solid var(--border-subtle)',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {/* Cover Preview */}
                  <div
                    style={{
                      width: '46px',
                      height: '62px',
                      borderRadius: 'var(--radius-sm)',
                      overflow: 'hidden',
                      flexShrink: 0,
                      background: '#0f172a',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: '1px solid rgba(255, 255, 255, 0.05)',
                    }}
                  >
                    {candidate.coverUrl ? (
                      <img
                        src={candidate.coverUrl}
                        alt={candidate.matchedTitle}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    ) : (
                      <Gamepad2 style={{ width: '20px', height: '20px', color: 'var(--text-subtle)' }} />
                    )}
                  </div>

                  {/* Details */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-main)' }}>
                        {candidate.matchedTitle}
                      </span>
                      {candidate.releaseYear && (
                        <span
                          style={{
                            fontSize: '0.6875rem',
                            padding: '0.125rem 0.375rem',
                            background: '#0f172a',
                            borderRadius: '4px',
                            color: 'var(--text-muted)',
                          }}
                        >
                          {candidate.releaseYear}
                        </span>
                      )}
                      {candidate.providerSource && (
                        <span
                          style={{
                            fontSize: '0.625rem',
                            padding: '0.125rem 0.375rem',
                            background: 'rgba(99, 102, 241, 0.15)',
                            color: '#818cf8',
                            borderRadius: '4px',
                            textTransform: 'uppercase',
                            fontWeight: 600,
                          }}
                        >
                          {candidate.providerSource}
                        </span>
                      )}
                    </div>
                    {candidate.developer && (
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '0.125rem 0 0 0' }}>
                        {candidate.developer}
                      </p>
                    )}
                    {candidate.description && (
                      <p
                        style={{
                          fontSize: '0.6875rem',
                          color: 'var(--text-subtle)',
                          margin: '0.25rem 0 0 0',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {candidate.description}
                      </p>
                    )}
                  </div>

                  {/* Radio Selection Checkmark */}
                  <div
                    style={{
                      width: '20px',
                      height: '20px',
                      borderRadius: '50%',
                      border: isSelected ? '2px solid var(--primary)' : '2px solid var(--border-subtle)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      background: isSelected ? 'var(--primary)' : 'transparent',
                    }}
                  >
                    {isSelected && <Check style={{ width: '12px', height: '12px', color: '#ffffff' }} />}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Footer */}
          <div className="modal-footer" style={{ marginTop: '1.25rem', paddingTop: '1rem' }}>
            <Button variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button variant="primary" disabled={!selectedCandidate} onClick={handleApply}>
              Apply Match
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
