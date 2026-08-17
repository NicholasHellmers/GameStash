import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { SaveConflictModal } from '../SaveConflictModal';

describe('SaveConflictModal Component', () => {
  it('renders title, local timestamp, and cloud timestamp', () => {
    render(
      <SaveConflictModal
        isOpen={true}
        gameTitle="Chrono Trigger"
        localModifiedAt="2026-08-16T12:00:00Z"
        cloudModifiedAt="2026-08-16T14:00:00Z"
        onKeepLocal={vi.fn()}
        onKeepCloud={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    expect(screen.getByText('Cloud Save Conflict')).toBeInTheDocument();
    expect(screen.getByText(/Chrono Trigger has conflicting/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /upload local save to cloud/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /download cloud save to device/i })).toBeInTheDocument();
  });

  it('triggers onKeepLocal and onKeepCloud handlers correctly', () => {
    const handleKeepLocal = vi.fn();
    const handleKeepCloud = vi.fn();

    render(
      <SaveConflictModal
        isOpen={true}
        gameTitle="Super Mario World"
        localModifiedAt="2026-08-16T12:00:00Z"
        cloudModifiedAt="2026-08-16T14:00:00Z"
        onKeepLocal={handleKeepLocal}
        onKeepCloud={handleKeepCloud}
        onCancel={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /upload local save to cloud/i }));
    expect(handleKeepLocal).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: /download cloud save to device/i }));
    expect(handleKeepCloud).toHaveBeenCalledTimes(1);
  });
});
