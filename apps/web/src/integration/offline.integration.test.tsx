import axios from 'axios';
import AxiosMockAdapter from 'axios-mock-adapter';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';

import type { ChatMessage } from '@/types/chat';

vi.mock('@/utils/env', () => ({
  env: {
    loginApiBaseUrl: 'http://localhost:4000/login-api',
    chatApiBaseUrl: 'http://localhost:4100/chat-api',
    googleClientId: 'offline-test-client',
    authMode: 'backend',
    authMock: false,
    chatMode: 'backend',
    chatMock: false,
    googleLoginMock: true,
    fakeGoogleCredential: JSON.stringify({
      sub: 'offline-user',
      email: 'offline-user@example.com',
      name: 'Offline User',
    }),
  },
}));

describe('offline integration (frontend)', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    cleanup();
    window.localStorage.clear();
  });

  const setupApp = async () => {
    const realAxiosCreate = axios.create.bind(axios);
    let loginAdapter: AxiosMockAdapter | undefined;
    let chatAdapter: AxiosMockAdapter | undefined;

    const chatMessages: ChatMessage[] = [
      {
        id: 'seed-1',
        channelId: 'global:default',
        channelType: 'global',
        senderId: 'system',
        senderDisplayName: 'System',
        body: 'Offline lobby is ready.',
        metadata: { scope: 'default' },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];

    const axiosSpy = vi.spyOn(axios, 'create');
    axiosSpy.mockImplementation((config) => {
      const instance = realAxiosCreate(config ?? {});
      const baseURL = config?.baseURL ?? '';

      if (baseURL.includes('/login-api')) {
        loginAdapter = new AxiosMockAdapter(instance, { delayResponse: 5 });
        loginAdapter.onGet('/auth/session').reply(401, { message: 'Not authenticated' });
        loginAdapter.onPost('/auth/google').reply(() => {
          const timestamp = new Date().toISOString();
          return [
            200,
            {
              user: {
                id: 'offline-user',
                email: 'offline-user@example.com',
                name: 'Offline User',
                pictureUrl: 'https://example.com/offline-user.png',
                createdAt: timestamp,
                lastLoginAt: timestamp,
              },
              token: 'offline-session-token',
            },
          ];
        });
      } else if (baseURL.includes('/chat-api')) {
        chatAdapter = new AxiosMockAdapter(instance, { delayResponse: 5 });

        chatAdapter.onGet('/chat/channels').reply(200, {
          channels: [
            {
              channelId: 'global:default',
              channelType: 'global',
              metadata: { scope: 'default' },
            },
          ],
        });

        chatAdapter.onGet('/chat/messages').reply((requestConfig) => {
          const channelId = requestConfig.params?.channelId ?? null;
          if (channelId === 'global:default') {
            return [200, { messages: chatMessages }];
          }
          return [200, { messages: [] }];
        });

        chatAdapter.onPost('/chat/messages').reply((requestConfig) => {
          const payload = JSON.parse(requestConfig.data as string) as { body: string };
          const timestamp = new Date().toISOString();
          const newMessage: ChatMessage = {
            id: `msg-${chatMessages.length + 1}`,
            channelId: 'global:default',
            channelType: 'global',
            senderId: 'offline-user',
            senderDisplayName: 'Offline User',
            body: payload.body,
            metadata: { scope: 'default' },
            createdAt: timestamp,
            updatedAt: timestamp,
          };
          chatMessages.push(newMessage);
          return [201, { message: newMessage }];
        });
      }

      return instance;
    });

    const { default: App } = await import('@/App');

    if (!loginAdapter) {
      throw new Error('Expected login adapter to be initialized');
    }

    const obtainChatAdapter = async () => {
      await waitFor(() => {
        expect(chatAdapter).toBeDefined();
      });
      return chatAdapter!;
    };

    return { App, loginAdapter, obtainChatAdapter, restore: () => axiosSpy.mockRestore() };
  };

  it('logs in with mocked Google credential and interacts with chat over mocked APIs', async () => {
    const { App, loginAdapter, obtainChatAdapter, restore } = await setupApp();

    const user = userEvent.setup();

    render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(loginAdapter.history.get.length).toBeGreaterThanOrEqual(1);
    });

    const signInButton = await screen.findByRole('button', { name: /sign in \(emulator\)/i });
    await user.click(signInButton);

    await waitFor(() => {
      expect(loginAdapter.history.post.length).toBe(1);
    });

    await screen.findByText(/Main Lobby/i);

    const chatAdapter = await obtainChatAdapter();

    await waitFor(() => {
      expect(chatAdapter.history.get.length).toBeGreaterThanOrEqual(1);
    });

    await screen.findByText('Offline lobby is ready.');

    const textarea = await screen.findByPlaceholderText(/say something nice/i);
    await user.type(textarea, 'Offline integration message');

    const sendButton = screen.getByRole('button', { name: /send/i });
    await user.click(sendButton);

    await waitFor(() => {
      expect(chatAdapter.history.post.length).toBe(1);
    });

    await screen.findByText('Offline integration message');

    restore();
  });
});
