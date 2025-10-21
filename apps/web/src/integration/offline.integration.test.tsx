import { describe, expect, it, vi } from 'vitest';
import { waitFor, screen, act } from '@testing-library/react';
import { renderWithRouter } from '@/test/test-utils';
import App from '@/App';
import * as authServices from '@/services/auth';
import * as chatHttpClient from '@/services/chat/httpClient';
import type { AuthSession } from '@/types';

const mockAuthSession = (overrides: Partial<AuthSession> = {}): AuthSession => {
  return {
    user: {
      id: 'user-1',
      email: 'user@example.com',
      name: 'Test User',
      ...('user' in overrides ? overrides.user : {}),
    },
    token: 'session-token',
    ...overrides,
  };
};

describe('offline integration (frontend)', () => {
  it('shows offline banner and disables chat features when backend fails', async () => {
    vi.spyOn(authServices, 'fetchCurrentSession').mockResolvedValueOnce(null);
    vi.spyOn(authServices, 'loginWithGoogleIdToken').mockRejectedValueOnce(new Error('Network down'));

    renderWithRouter(<App />);

    expect(await screen.findByText(/LukeLaRue Gaming Lobby/i)).toBeInTheDocument();

    const mockButton = screen.getByRole('button', { name: /sign in \(mock\)/i });
    await act(async () => {
      mockButton.click();
    });

    await waitFor(() => {
      expect(screen.getByText(/network down/i)).toBeInTheDocument();
    });
  });

  it('logs in and exposes chat client headers for authenticated user', async () => {
    vi.spyOn(authServices, 'fetchCurrentSession').mockResolvedValueOnce(null);
    vi.spyOn(authServices, 'loginWithGoogleIdToken').mockResolvedValueOnce(
      mockAuthSession({
        user: {
          id: 'integration-user',
          email: 'integration@example.com',
          name: 'Integration User',
        },
      })
    );

    const sendSpy = vi
      .spyOn(chatHttpClient, 'createHttpChatClient')
      .mockImplementation(({ getAuthHeaders }) => {
        const headers = getAuthHeaders();
        expect(headers?.userId).toBe('integration-user');
        expect(headers?.userName).toBe('Integration User');
        return {
          fetchMessages: vi.fn(),
          fetchMessagesById: vi.fn(),
          listChannels: vi.fn(),
          sendMessage: vi.fn(),
          subscribe: vi.fn(),
        };
      });

    renderWithRouter(<App />);

    const loginButton = await screen.findByRole('button', { name: /sign in \(mock\)/i });
    await act(async () => {
      loginButton.click();
    });

    await waitFor(() => {
      expect(screen.getByText(/welcome back/i)).toBeInTheDocument();
    });

    expect(sendSpy).toHaveBeenCalled();
  });

  it('restores session from storage and hydrates AuthContext', async () => {
    const storedSession = mockAuthSession({
      user: {
        id: 'restored-user',
        email: 'restored@example.com',
        name: 'Restored User',
      },
    });

    window.localStorage.setItem('lukelarue.auth.session', JSON.stringify(storedSession));
    vi.spyOn(authServices, 'fetchCurrentSession').mockResolvedValueOnce(storedSession);

    renderWithRouter(<App />);

    expect(await screen.findByText(/welcome back/i)).toBeInTheDocument();
    expect(screen.getByText(/restored@example.com/i)).toBeInTheDocument();
  });
});
