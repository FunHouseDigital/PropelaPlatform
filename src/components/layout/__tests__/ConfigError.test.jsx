import { render, screen } from '@testing-library/react';
import { describe, expect,it } from 'vitest';

import ConfigError from '../ConfigError';

describe('ConfigError', () => {
  it('renders an alert region so the error is announced', () => {
    render(<ConfigError missing={['VITE_SUPABASE_URL']} />);

    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText('Configuration error')).toBeInTheDocument();
  });

  it('names each missing configuration variable', () => {
    const missing = ['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY'];
    render(<ConfigError missing={missing} />);

    for (const name of missing) {
      expect(screen.getByText(name)).toBeInTheDocument();
    }
  });

  it('renders one list item per missing variable', () => {
    render(<ConfigError missing={['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY']} />);

    expect(screen.getAllByRole('listitem')).toHaveLength(2);
  });

  it('renders without crashing when no missing list is provided', () => {
    render(<ConfigError />);

    expect(screen.getByText('Configuration error')).toBeInTheDocument();
    expect(screen.queryAllByRole('listitem')).toHaveLength(0);
  });
});
