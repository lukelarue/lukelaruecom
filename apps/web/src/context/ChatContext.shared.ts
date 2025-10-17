import { createContext } from 'react';

import type { ChannelDescriptor, ChatChannelSummary, ChatMessage } from '@/types/chat';

export type ChatContextValue = {
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

export const ChatContext = createContext<ChatContextValue | undefined>(undefined);
