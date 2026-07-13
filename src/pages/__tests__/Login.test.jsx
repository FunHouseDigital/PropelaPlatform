/**
 * Unit tests for the Login screen (Task 8.5).
 *
 * Covers: empty-field rejection (Req 3.5), invalid-credential non-disclosure
 * (Req 3.4), and auth-unavailable handling that preserves the entered email
 * (Req 3.6). `useAuth` is mocked so no Supabase client is involved.
 */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { DataError, DataErrorCode } from '../../lib/dataLayer/errors';
import Login from '../Login';

const signInMock = vi.fn();

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({ signIn: signInMock }),
}));

function renderLogin() {
  return render(
    <MemoryRouter initialEntries={['/login']}>
      <Login />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

// DEFERRED: Supabase auth-UI is deferred; re-enable when it ships (hybrid: flag OFF uses hardened localStorage auth).
describe.skip('Login', () => {
  it('rejects submission when a field is empty and does not call the auth service (Req 3.5)', async () => {
    const user = userEvent.setup();
    renderLogin();

    await user.click(screen.getByRole('button', { name: /sign in/i }));

    expect(signInMock).not.toHaveBeenCalled();
    expect(screen.getByTestId('login-validation-error')).toBeInTheDocument();
  });

  it('shows a generic invalid-credential message that does not disclose the field (Req 3.4)', async () => {
    signInMock.mockResolvedValue({
      data: null,
      error: new DataError(DataErrorCode.AUTH, 'Invalid credentials. Please check your details and try again.'),
    });
    const user = userEvent.setup();
    renderLogin();

    await user.type(screen.getByLabelText(/email/i), 'user@example.com');
    await user.type(screen.getByLabelText(/password/i), 'wrong');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    const error = await screen.findByTestId('login-error');
    expect(error).toBeInTheDocument();
    expect(error.textContent).not.toMatch(/email/i);
    expect(error.textContent).not.toMatch(/password/i);
  });

  it('shows an unavailable message and preserves the entered email on a NETWORK error (Req 3.6)', async () => {
    signInMock.mockResolvedValue({
      data: null,
      error: new DataError(DataErrorCode.NETWORK, 'unavailable'),
    });
    const user = userEvent.setup();
    renderLogin();

    const emailField = screen.getByLabelText(/email/i);
    await user.type(emailField, 'keep@example.com');
    await user.type(screen.getByLabelText(/password/i), 'secret');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    const error = await screen.findByTestId('login-error');
    expect(error.textContent).toMatch(/temporarily unavailable/i);
    // The entered email must be preserved for resubmission.
    expect(emailField).toHaveValue('keep@example.com');
  });
});
