import { beforeEach,describe, expect, it, vi } from 'vitest';

import { render, screen } from '../../test/utils';
import StatusPage from '../StatusPage';

vi.mock('../../lib/buildInfo', () => ({
  default: {
    version: '1.2.3',
    buildTimestamp: '2024-01-15T10:00:00Z',
    gitCommit: 'abc1234',
  },
}));

vi.mock('../../lib/config', () => ({
  default: {
    environment: 'staging',
  },
  // Named export consumed by featureFlags.js (reached transitively now that
  // AppProvider routes through the Data_Layer facade → feature flags).
  appConfig: {
    environment: 'staging',
    featureFlags: '',
  },
}));

describe('StatusPage', () => {
  beforeEach(() => {
    vi.stubGlobal('navigator', {
      ...navigator,
      onLine: true,
      serviceWorker: { controller: null },
    });
  });

  it('renders version info', () => {
    render(<StatusPage />);

    expect(screen.getByTestId('app-version')).toHaveTextContent('1.2.3');
    expect(screen.getByTestId('build-timestamp')).toHaveTextContent(
      '2024-01-15T10:00:00Z'
    );
    expect(screen.getByTestId('git-commit')).toHaveTextContent('abc1234');
  });

  it('shows environment', () => {
    render(<StatusPage />);

    expect(screen.getByTestId('environment')).toHaveTextContent('staging');
  });

  it('shows online status', () => {
    render(<StatusPage />);

    expect(screen.getByTestId('online-status')).toHaveTextContent('Online');
  });

  it('displays system status heading', () => {
    render(<StatusPage />);

    expect(
      screen.getByRole('heading', { name: /system status/i })
    ).toBeInTheDocument();
  });

  it('shows localStorage usage', () => {
    render(<StatusPage />);

    expect(screen.getByTestId('storage-usage')).toHaveTextContent('KB');
  });
});
