import type { ChannelDescriptor, ChatChannelSummary, ChatMessage } from '@/types/chat';

export type SendMessageInput = {
  descriptor: ChannelDescriptor;
  body: string;
  senderId: string;
  senderDisplayName?: string;
  metadata?: Record<string, unknown>;
};

export type ChatClient = {
  fetchMessages(descriptor: ChannelDescriptor, limit?: number): Promise<ChatMessage[]>;
  fetchMessagesById(channelId: string, limit?: number): Promise<ChatMessage[]>;
  listChannels(): Promise<ChatChannelSummary[]>;
  sendMessage(input: SendMessageInput): Promise<ChatMessage>;
  subscribe(
    channelId: string,
    listener: (message: ChatMessage) => void
  ): () => void;
};
