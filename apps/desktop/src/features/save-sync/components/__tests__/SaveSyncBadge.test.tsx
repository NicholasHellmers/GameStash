import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { SaveSyncBadge } from '../SaveSyncBadge';

describe('SaveSyncBadge Component', () => {
  it('renders InSync status correctly', () => {
    render(<SaveSyncBadge status={{ status: 'InSync' }} isSyncing={false} />);
    expect(screen.getByText('Cloud Saves Synced')).toBeInTheDocument();
  });

  it('renders CloudNewer status correctly', () => {
    render(<SaveSyncBadge status={{ status: 'CloudNewer' }} isSyncing={false} />);
    expect(screen.getByText('Cloud Update Ready')).toBeInTheDocument();
  });

  it('renders LocalNewer status correctly', () => {
    render(<SaveSyncBadge status={{ status: 'LocalNewer' }} isSyncing={false} />);
    expect(screen.getByText('Local Save Newer')).toBeInTheDocument();
  });

  it('renders Conflict status correctly', () => {
    render(
      <SaveSyncBadge
        status={{
          status: 'Conflict',
          details: {
            local_hash: 'abc',
            cloud_hash: 'xyz',
            local_modified_at: '2026-08-16T12:00:00Z',
            cloud_modified_at: '2026-08-16T14:00:00Z',
          },
        }}
        isSyncing={false}
      />,
    );
    expect(screen.getByText('Sync Conflict')).toBeInTheDocument();
  });

  it('renders Syncing in progress state', () => {
    render(<SaveSyncBadge status={{ status: 'InSync' }} isSyncing={true} />);
    expect(screen.getByText('Syncing Saves...')).toBeInTheDocument();
  });

  it('renders Offline state when status is null', () => {
    render(<SaveSyncBadge status={null} isSyncing={false} />);
    expect(screen.getByText('Offline')).toBeInTheDocument();
  });
});
