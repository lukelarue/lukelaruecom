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
  const client = axios.create({
    baseURL: baseUrl,
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
    const response = await client.post('chat/messages', {
      ...routeForDescriptor(input.descriptor),
      body: input.body,
      metadata: input.metadata,
      senderDisplayName: input.senderDisplayName,
    });
    return response.data.message as ChatMessage;
  };

  const fetch = async (descriptor: ChannelDescriptor, limit: number): Promise<ChatMessage[]> => {
    const response = await client.get('chat/messages', {
      params: queryForDescriptor(descriptor, limit),
    });
    return ensureMessages(response.data.messages);
  };

  const fetchById = async (channelId: string, limit: number): Promise<ChatMessage[]> => {
    const response = await client.get('chat/messages', {
      params: {
        channelId,
        limit,
      },
    });
    return ensureMessages(response.data.messages);
  };

  const list = async (): Promise<ChatChannelSummary[]> => {
    const response = await client.get('chat/channels');
    return ensureChannels(response.data.channels);
  };

  const subscribe = (channelId: string, listener: (message: ChatMessage) => void): (() => void) => {
    let timer: ReturnType<typeof setInterval> | null = null;
    let lastSeen: string | null = null;

    const poll = async () => {
      try {
        const response = await client.get('chat/messages', {
          params: {
            channelId,
            limit: 50,
          },
        });
        const messages = ensureMessages(response.data.messages);
        if (messages.length === 0) {
          return;
        }
        if (!lastSeen) {
          lastSeen = messages[messages.length - 1]!.createdAt;
          return;
        }
        const newMessages = messages.filter((m) => m.createdAt > lastSeen!);
        if (newMessages.length > 0) {
          lastSeen = newMessages[newMessages.length - 1]!.createdAt;
          for (const m of newMessages) {
            listener(m);
          }
        }
      } catch {
        return;
      }
    };

    void poll();
    timer = setInterval(() => {
      void poll();
    }, 3000);

    return () => {
      if (timer) {
        clearInterval(timer);
      }
    };
  };

  return {
    fetchMessages: async (descriptor, limit = 50) => fetch(descriptor, limit),
    fetchMessagesById: async (channelId, limit = 50) => fetchById(channelId, limit),
    listChannels: async () => list(),
    sendMessage: async (input) => send(input),
    subscribe: (channelId, listener) => subscribe(channelId, listener),
  };
};
