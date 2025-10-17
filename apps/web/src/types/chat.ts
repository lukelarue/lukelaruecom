export type ChannelType = 'global' | 'direct' | 'game';

export type ChannelDescriptor =
  | { channelType: 'global'; scope?: string }
  | { channelType: 'direct'; participantIds: [string, string] }
  | { channelType: 'game'; gameId: string };

export type ChatMessage = {
  id: string;
  channelId: string;
  channelType: ChannelType;
  senderId: string;
  senderDisplayName?: string;
  body: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

export type ChatChannelSummary = {
  channelId: string;
  channelType: ChannelType;
  metadata?: Record<string, unknown>;
};
