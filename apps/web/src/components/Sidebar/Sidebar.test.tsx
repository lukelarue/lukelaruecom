import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Sidebar } from './Sidebar';
import { renderWithRouter } from '@/test/test-utils';
import type { AuthContextValue } from '@/context/AuthContext';
import { vi, describe, it, expect, beforeEach } from 'vitest';

const mockUseAuthContext = vi.fn();

vi.mock('@/context/AuthContext', () => ({
  useAuthContext: () => mockUseAuthContext(),
}));

describe('Sidebar', () => {
  const baseContext: AuthContextValue = {
    session: null,
    loading: false,
    error: null,
    loginWithCredential: vi.fn(() => Promise.resolve()),
    signOut: vi.fn(() => Promise.resolve()),
  };

  beforeEach(() => {
    mockUseAuthContext.mockReset();
  });

  it('shows guest navigation when no session is present', () => {
    mockUseAuthContext.mockReturnValue(baseContext);

    renderWithRouter(<Sidebar />);

    expect(screen.getByText('Home')).toBeInTheDocument();
    const lobbyLabel = screen.getByText('Lobby');
    expect(lobbyLabel.tagName).toBe('SPAN');
    expect(screen.queryByRole('link', { name: 'Lobby' })).toBeNull();
    expect(screen.queryByRole('button', { name: /sign out/i })).not.toBeInTheDocument();
  });

  it('enables navigation and sign-out for an authenticated user', async () => {
    const signOut = vi.fn().mockResolvedValue(undefined);
    mockUseAuthContext.mockReturnValue({
      ...baseContext,
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
    renderWithRouter(<Sidebar />, {
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
    mockUseAuthContext.mockReturnValue({
      ...baseContext,
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

    renderWithRouter(<Sidebar />);

    const signOutButton = screen.getByRole('button', { name: /signing out/i });
    expect(signOutButton).toBeDisabled();
  });
});
