import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import type { ChannelDescriptor, ChatChannelSummary, ChatMessage } from '@/types/chat';
import type { ChatClient, SendMessageInput } from '@/services/chat';
import { createHttpChatClient } from '@/services/chat/httpClient';
import { createMockChatClient } from '@/services/chat/mockClient';
import { useAuthContext } from '@/hooks/useAuthContext';
import { env } from '@/utils/env';
import {
  buildChannelMetadata,
  descriptorFromSummary,
  formatChannelLabel,
  resolveChannelId,
} from '@/utils/chatChannels';

const CHAT_HISTORY_LIMIT = 50;

type ChatContextValue = {
  channels: ChatChannelSummary[];
  activeChannelId: string | null;
  messages: ChatMessage[];
  loading: boolean;
  error: string | null;
  setActiveChannel: (descriptor: ChannelDescriptor | { channelId: string }) => void;
  sendMessage: (body: string) => Promise<void>;
  refreshChannels: () => Promise<void>;
  formatChannel: (summary: ChatChannelSummary | undefined) => string;
};

const ChatContext = createContext<ChatContextValue | null>(null);

const buildClient = (userId: string | undefined, userName: string | undefined): ChatClient => {
  if (env.chatMock) {
    return createMockChatClient({ currentUserId: userId });
  }

  return createHttpChatClient({
    baseUrl: env.chatApiBaseUrl,
    getAuthHeaders: () => {
      if (!userId) {
        return null;
      }
      return { userId, userName };
    },
  });
};

type ChatProviderProps = {
  children: ReactNode;
  defaultChannel?: ChannelDescriptor;
};

export const ChatProvider = ({ children, defaultChannel }: ChatProviderProps) => {
  const { session } = useAuthContext();
  const [client, setClient] = useState<ChatClient | null>(null);
  const [channels, setChannels] = useState<ChatChannelSummary[]>([]);
  const [activeChannelId, setActiveChannelId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const userId = session?.user.id;
    const userName = session?.user.name ?? session?.user.email;
    const chatClient = buildClient(userId, userName);
    setClient(chatClient);
  }, [session]);

  const ensureActiveChannel = useCallback(
    (channelSummaries: ChatChannelSummary[]) => {
      if (activeChannelId) {
        return;
      }

      if (defaultChannel) {
        const defaultId = resolveChannelId(defaultChannel);
        setActiveChannelId(defaultId);
        return;
      }

      if (channelSummaries.length > 0) {
        setActiveChannelId(channelSummaries[0]!.channelId);
      }
    },
    [activeChannelId, defaultChannel]
  );

  const refreshChannels = useCallback(async () => {
    if (!client) {
      return;
    }
    try {
      const channelSummaries = await client.listChannels();
      if (channelSummaries.length === 0 && defaultChannel) {
        const summary: ChatChannelSummary = {
          channelId: resolveChannelId(defaultChannel),
          channelType: defaultChannel.channelType,
          metadata: buildChannelMetadata(defaultChannel),
        };
        setChannels([summary]);
        ensureActiveChannel([summary]);
        return;
      }

      setChannels(channelSummaries);
      ensureActiveChannel(channelSummaries);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load channels';
      setError(message);
    }
  }, [client, ensureActiveChannel, defaultChannel]);

  useEffect(() => {
    if (!client) {
      return;
    }
    void refreshChannels();
  }, [client, refreshChannels]);

  const subscribeToActiveChannel = useCallback(
    (channelId: string) => {
      if (!client) {
        return () => {};
      }
      return client.subscribe(channelId, (message) => {
        setMessages((prev) => [...prev, message]);
      });
    },
    [client]
  );

  useEffect(() => {
    if (!client || !activeChannelId) {
      setMessages([]);
      return;
    }

    let unsubscribe: (() => void) | undefined;
    let cancelled = false;

    const loadMessages = async () => {
      setLoading(true);
      setError(null);
      try {
        const history = await client.fetchMessagesById(activeChannelId, CHAT_HISTORY_LIMIT);
        if (!cancelled) {
          setMessages(history);
          unsubscribe = subscribeToActiveChannel(activeChannelId);
        }
      } catch (err) {
        if (!cancelled) {
          const message = err instanceof Error ? err.message : 'Failed to load messages';
          setError(message);
          setMessages([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadMessages();

    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, [client, activeChannelId, subscribeToActiveChannel]);

  const setActiveChannel = useCallback((target: ChannelDescriptor | { channelId: string }) => {
    if ('channelId' in target) {
      setActiveChannelId(target.channelId);
      return;
    }
    const channelId = resolveChannelId(target);
    setActiveChannelId(channelId);
  }, []);

  const sendMessage = useCallback(
    async (body: string) => {
      if (!client || !activeChannelId) {
        return;
      }
      const summary = channels.find((channel) => channel.channelId === activeChannelId);
      const descriptor = summary ? descriptorFromSummary(summary) : null;

      if (!descriptor) {
        return;
      }

      const input: SendMessageInput = {
        descriptor,
        body,
        senderId: session?.user.id ?? 'anonymous',
        senderDisplayName: session?.user.name ?? session?.user.email,
      };

      try {
        const sent = await client.sendMessage(input);
        setMessages((prev) => [...prev, sent]);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to send message';
        setError(message);
      }
    },
    [client, activeChannelId, channels, session]
  );

  const formatChannel = useCallback(
    (summary: ChatChannelSummary | undefined) => {
      return summary ? formatChannelLabel(summary, session?.user.id) : 'Unknown channel';
    },
    [session]
  );

  const value = useMemo<ChatContextValue>(
    () => ({
      channels,
      activeChannelId,
      messages,
      loading,
      error,
      setActiveChannel,
      sendMessage,
      refreshChannels,
      formatChannel,
    }),
    [channels, activeChannelId, messages, loading, error, setActiveChannel, sendMessage, refreshChannels, formatChannel]
  );

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
};

export const useChatContext = () => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChatContext must be used within a ChatProvider');
  }
  return context;
};
