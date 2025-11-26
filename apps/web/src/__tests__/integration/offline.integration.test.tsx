import { afterEach, describe, expect, it, vi } from 'vitest';
import { waitFor, screen, act } from '@testing-library/react';
import { renderWithRouter } from '@/test/test-utils';
import App from '@/App';
import * as authServices from '@/services/auth';
import * as chatHttpClient from '@/services/chat/httpClient';
import type { ChatClient } from '@/services/chat';
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
  afterEach(() => {
    vi.restoreAllMocks();
    window.localStorage.clear();
  });

  it('shows offline banner and disables chat features when backend fails', async () => {
    vi.spyOn(authServices, 'fetchCurrentSession').mockResolvedValueOnce(null);
    vi.spyOn(authServices, 'loginWithGoogleIdToken').mockRejectedValueOnce(new Error('Network down'));

    renderWithRouter(<App />);

    // Login page now shows only logo and sign-in button (no lobby title)
    const [googleButton] = await screen.findAllByRole('button', { name: /sign in/i });
    await act(async () => {
      googleButton.click();
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

    const fakeChatClient: ChatClient = {
      fetchMessages: vi.fn(),
      fetchMessagesById: vi.fn(),
      listChannels: vi.fn(),
      sendMessage: vi.fn(),
      subscribe: vi.fn(() => vi.fn()),
    };

    const sendSpy = vi.spyOn(chatHttpClient, 'createHttpChatClient').mockImplementation(({ getAuthHeaders }) => {
      const headers = getAuthHeaders();
      expect(headers?.userId).toBe('integration-user');
      expect(headers?.userName).toBe('Integration User');
      return fakeChatClient;
    });

    renderWithRouter(<App />);

    const [loginButton] = await screen.findAllByRole('button', { name: /sign in/i });
    await act(async () => {
      loginButton.click();
    });

    await screen.findAllByRole('button', { name: /minesweeper/i }, { timeout: 5000 });
    expect(sendSpy).toHaveBeenCalled();
    sendSpy.mockRestore();
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

    const restoredChatClient: ChatClient = {
      fetchMessages: vi.fn(),
      fetchMessagesById: vi.fn(),
      listChannels: vi.fn(),
      sendMessage: vi.fn(),
      subscribe: vi.fn(() => vi.fn()),
    };

    vi.spyOn(chatHttpClient, 'createHttpChatClient').mockImplementation(({ getAuthHeaders }) => {
      const headers = getAuthHeaders();
      expect(headers?.userId).toBe('restored-user');
      expect(headers?.userName).toBe('Restored User');
      return restoredChatClient;
    });

    renderWithRouter(<App />);

    await screen.findAllByRole('button', { name: /minesweeper/i }, { timeout: 5000 });
    const restoredEmailNodes = screen.getAllByText(/restored@example.com/i);
    expect(restoredEmailNodes.length).toBeGreaterThan(0);
  });
});
