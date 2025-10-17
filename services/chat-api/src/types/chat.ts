export type ChannelType = 'global' | 'direct' | 'game';

export type ChannelDescriptor =
  | { channelType: 'global'; scope?: string }
  | { channelType: 'direct'; participantIds: [string, string] }
  | { channelType: 'game'; gameId: string };

export type ChatMessagePayload = {
  senderId: string;
  senderDisplayName?: string;
  body: string;
  metadata?: Record<string, unknown>;
};

export type ChatMessageRecord = ChatMessagePayload & {
  id: string;
  channelId: string;
  channelType: ChannelType;
  createdAt: string;
  updatedAt: string;
};

export type SendMessageRequest = ChatMessagePayload &
  ChannelDescriptor & {
    id?: string;
  };
