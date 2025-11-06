import axios from 'axios';

import type { ChannelDescriptor, ChatChannelSummary, ChatMessage } from '@/types/chat';
import type { ChatClient, SendMessageInput } from './index';

const routeForDescriptor = (descriptor: ChannelDescriptor) => {
  const payload: Record<string, unknown> = {
    channelType: descriptor.channelType,
  };
  if (descriptor.channelType === 'global') {
    if (descriptor.scope) {
      payload.scope = descriptor.scope;
    }
  } else if (descriptor.channelType === 'direct') {
    payload.participantIds = descriptor.participantIds;
  } else if (descriptor.channelType === 'game') {
    payload.gameId = descriptor.gameId;
  }
  return payload;
};

const queryForDescriptor = (descriptor: ChannelDescriptor, limit: number) => {
  const query: Record<string, unknown> = {
    channelType: descriptor.channelType,
    limit,
  };
  if (descriptor.channelType === 'global') {
    if (descriptor.scope) {
      query.scope = descriptor.scope;
    }
  } else if (descriptor.channelType === 'direct') {
    query.participantIds = descriptor.participantIds.join(',');
  } else if (descriptor.channelType === 'game') {
    query.gameId = descriptor.gameId;
  }
  return query;
};

export const createHttpChatClient = ({
  baseUrl,
  getAuthHeaders,
}: {
  baseUrl: string;
  getAuthHeaders: () => { userId: string; userName?: string } | null;
}): ChatClient => {
  const normalizedBase = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
  const baseWithChat = `${normalizedBase}/chat`;
  const client = axios.create({
    baseURL: baseWithChat,
    withCredentials: true,
  });

  client.interceptors.request.use((config) => {
    const auth = getAuthHeaders();
    if (!auth) {
      return Promise.reject(new Error('Chat API requires an authenticated session'));
    }
    const headers = config.headers ?? {};
    headers['x-user-id'] = auth.userId;
    if (auth.userName) {
      headers['x-user-name'] = auth.userName;
    }
    config.headers = headers;
    return config;
  });

  const ensureMessages = (messages: unknown): ChatMessage[] => {
    if (!Array.isArray(messages)) {
      return [];
    }
    return messages as ChatMessage[];
  };

  const ensureChannels = (channels: unknown): ChatChannelSummary[] => {
    if (!Array.isArray(channels)) {
      return [];
    }
    return channels as ChatChannelSummary[];
  };

  const send = async (input: SendMessageInput): Promise<ChatMessage> => {
    const response = await client.post('messages', {
      ...routeForDescriptor(input.descriptor),
      body: input.body,
      metadata: input.metadata,
      senderDisplayName: input.senderDisplayName,
    });
    return response.data.message as ChatMessage;
  };

  const fetch = async (descriptor: ChannelDescriptor, limit: number): Promise<ChatMessage[]> => {
    const response = await client.get('messages', {
      params: queryForDescriptor(descriptor, limit),
    });
    return ensureMessages(response.data.messages);
  };

  const fetchById = async (channelId: string, limit: number): Promise<ChatMessage[]> => {
    const response = await client.get('messages', {
      params: {
        channelId,
        limit,
      },
    });
    return ensureMessages(response.data.messages);
  };

  const list = async (): Promise<ChatChannelSummary[]> => {
    const response = await client.get('channels');
    return ensureChannels(response.data.channels);
  };

  return {
    fetchMessages: async (descriptor, limit = 50) => fetch(descriptor, limit),
    fetchMessagesById: async (channelId, limit = 50) => fetchById(channelId, limit),
    listChannels: async () => list(),
    sendMessage: async (input) => send(input),
    subscribe: (channelId, listener) => {
      const auth = getAuthHeaders();
      if (!auth) {
        // Should not happen because axios client would have rejected earlier calls, but guard anyway
        return () => {};
      }

      const sseBase = (normalizedBase + '/chat');
      const url = new URL(sseBase, window.location.origin);
      url.pathname = url.pathname.replace(/\/$/, '') + '/stream';
      url.searchParams.set('channelId', channelId);
      url.searchParams.set('userId', auth.userId);
      if (auth.userName) {
        url.searchParams.set('userName', auth.userName);
      }

      const es = new EventSource(url.toString());
      const onMessage = (event: MessageEvent) => {
        try {
          const data = JSON.parse(event.data) as ChatMessage;
          listener(data);
        } catch {
          // ignore malformed events
        }
      };
      const onError = () => {
        // Close on error; ChatContext will recreate on reselect or reload
        try {
          es.close();
        } catch {
          // noop
        }
      };

      es.addEventListener('message', onMessage);
      es.addEventListener('error', onError);

      return () => {
        try {
          es.removeEventListener('message', onMessage as EventListener);
          es.removeEventListener('error', onError as EventListener);
          es.close();
        } catch {
          // noop
        }
      };
    },
  };
};
