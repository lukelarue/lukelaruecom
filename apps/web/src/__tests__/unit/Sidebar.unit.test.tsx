import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Sidebar } from '@/components/Sidebar/Sidebar';
import { renderWithRouter } from '@/test/test-utils';
import { AuthContext, type AuthContextValue } from '@/context/AuthContext';
import { vi, describe, it, expect } from 'vitest';

const createAuthContext = (overrides: Partial<AuthContextValue> = {}): AuthContextValue => ({
  session: null,
  loading: false,
  bootstrapped: true,
  error: null,
  loginWithCredential: vi.fn(() => Promise.resolve()),
  signOut: vi.fn(() => Promise.resolve()),
  ...overrides,
});

const renderSidebar = (authContext: AuthContextValue, options?: Parameters<typeof renderWithRouter>[1]) => {
  return renderWithRouter(
    <AuthContext.Provider value={authContext}>
      <Sidebar />
    </AuthContext.Provider>,
    options
  );
};

describe('Sidebar', () => {
  it('shows guest navigation when no session is present', () => {
    const context = createAuthContext();

    renderSidebar(context);

    expect(screen.getByText('Home')).toBeInTheDocument();
    const lobbyLabel = screen.getByText('Lobby');
    expect(lobbyLabel.tagName).toBe('SPAN');
    expect(screen.queryByRole('link', { name: 'Lobby' })).toBeNull();
    expect(screen.queryByRole('button', { name: /sign out/i })).not.toBeInTheDocument();
  });

  it('enables navigation and sign-out for an authenticated user', async () => {
    const signOut = vi.fn().mockResolvedValue(undefined);
    const context = createAuthContext({
      session: {
        user: {
          id: 'user-1',
          email: 'mock@example.com',
          name: 'Mocky',
        },
        token: 'token-123',
      },
      signOut,
    });

    const user = userEvent.setup();
    renderSidebar(context, {
      initialEntries: ['/lobby'],
    });

    const lobbyLink = screen.getByRole('link', { name: 'Lobby' });
    expect(lobbyLink).toHaveAttribute('href', '/lobby');

    const signOutButton = screen.getByRole('button', { name: /sign out/i });
    expect(signOutButton).toBeEnabled();

    await user.click(signOutButton);
    expect(signOut).toHaveBeenCalledTimes(1);
  });

  it('shows loading state on sign-out button when auth is busy', () => {
    const context = createAuthContext({
      session: {
        user: {
          id: 'user-1',
          email: 'mock@example.com',
          name: 'Mocky',
        },
        token: 'token-123',
      },
      loading: true,
    });

    renderSidebar(context);

    const signOutButton = screen.getByRole('button', { name: /signing out/i });
    expect(signOutButton).toBeDisabled();
  });
});
