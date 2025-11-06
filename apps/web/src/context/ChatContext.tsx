import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { isAxiosError } from 'axios';

import type { ChannelDescriptor, ChatChannelSummary, ChatMessage } from '@/types/chat';
import type { ChatClient, SendMessageInput } from '@/services/chat';
import { createHttpChatClient } from '@/services/chat/httpClient';
import { useAuthContext } from '@/hooks/useAuthContext';
import { env } from '@/utils/env';
import {
  buildChannelMetadata,
  descriptorFromSummary,
  formatChannelLabel,
  resolveChannelId,
} from '@/utils/chatChannels';
import { ChatContext, type ChatContextValue } from './ChatContext.shared';

const CHAT_HISTORY_LIMIT = 50;

const shouldDisableChat = (error: unknown): boolean => {
  if (!isAxiosError(error)) {
    return false;
  }
  if (error.code === 'ERR_NETWORK') {
    return true;
  }
  if (!error.response) {
    return true;
  }
  return false;
};

const buildClient = (userId: string | undefined, userName: string | undefined): ChatClient | null => {
  if (!userId) {
    return null;
  }

  return createHttpChatClient({
    baseUrl: env.chatApiBaseUrl,
    getAuthHeaders: () => {
      return userName ? { userId, userName } : { userId };
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
  const [disabled, setDisabled] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const userId = session?.user.id;
    const userName = session?.user.name ?? session?.user.email;
    const chatClient = buildClient(userId, userName);
    setClient(chatClient);
    setChannels([]);
    setActiveChannelId(null);
    setMessages([]);
    setDisabled(false);
    setError(null);
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
      const finalSummaries = (() => {
        if (!defaultChannel) {
          return channelSummaries;
        }
        const defaultId = resolveChannelId(defaultChannel);
        const exists = channelSummaries.some((channel) => channel.channelId === defaultId);
        if (exists) {
          return channelSummaries;
        }
        const summary: ChatChannelSummary = {
          channelId: defaultId,
          channelType: defaultChannel.channelType,
          metadata: buildChannelMetadata(defaultChannel),
        };
        return [...channelSummaries, summary];
      })();

      setChannels(finalSummaries);
      ensureActiveChannel(finalSummaries);
      setDisabled(false);
      setError(null);
    } catch (err) {
      if (shouldDisableChat(err)) {
        setDisabled(true);
        setError('Chat Disabled');
        setChannels([]);
        setActiveChannelId(null);
        setMessages([]);
        return;
      }
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
      if (!client || disabled) {
        return () => {};
      }
      return client.subscribe(channelId, (message) => {
        setMessages((prev) => {
          if (prev.some((m) => m.id === message.id)) {
            return prev;
          }
          return [...prev, message];
        });
      });
    },
    [client, disabled]
  );

  useEffect(() => {
    if (!client || !activeChannelId || disabled) {
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
          setDisabled(false);
        }
      } catch (err) {
        if (!cancelled) {
          if (shouldDisableChat(err)) {
            setDisabled(true);
            setError('Chat Disabled');
            setMessages([]);
            setActiveChannelId(null);
          } else {
            const message = err instanceof Error ? err.message : 'Failed to load messages';
            setError(message);
            setMessages([]);
          }
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
  }, [client, activeChannelId, subscribeToActiveChannel, disabled]);

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
      if (!client || !activeChannelId || disabled) {
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
        setMessages((prev) => {
          if (prev.some((m) => m.id === sent.id)) {
            return prev;
          }
          return [...prev, sent];
        });
        setError(null);
        setDisabled(false);
      } catch (err) {
        if (shouldDisableChat(err)) {
          setDisabled(true);
          setError('Chat Disabled');
          setActiveChannelId(null);
          setMessages([]);
          return;
        }
        const message = err instanceof Error ? err.message : 'Failed to send message';
        setError(message);
      }
    },
    [client, activeChannelId, channels, session, disabled]
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
      disabled,
      error,
      setActiveChannel,
      sendMessage,
      refreshChannels,
      formatChannel,
    }),
    [channels, activeChannelId, messages, loading, disabled, error, setActiveChannel, sendMessage, refreshChannels, formatChannel]
  );

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
};
