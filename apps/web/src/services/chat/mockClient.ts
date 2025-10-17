import type { ChannelDescriptor, ChatChannelSummary, ChatMessage } from '@/types/chat';
import { buildChannelMetadata, DEFAULT_GLOBAL_SCOPE, descriptorFromSummary, parseChannelId, resolveChannelId } from '@/utils/chatChannels';

import type { ChatClient, SendMessageInput } from './index';

const STORAGE_KEY = 'lukelarue.chat.mock';

const nowIso = () => new Date().toISOString();

const randomId = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2);
};

const defaultChannels: ChatChannelSummary[] = [
  {
    channelId: `global:${DEFAULT_GLOBAL_SCOPE}`,
    channelType: 'global',
    metadata: {
      scope: DEFAULT_GLOBAL_SCOPE,
    },
  },
];

const defaultMessages: Record<string, ChatMessage[]> = {
  [`global:${DEFAULT_GLOBAL_SCOPE}`]: [
    {
      id: randomId(),
      channelId: `global:${DEFAULT_GLOBAL_SCOPE}`,
      channelType: 'global',
      senderId: 'system',
      senderDisplayName: 'System',
      body: 'Welcome to the lobby chat! Say hi to other players while you wait.',
      createdAt: nowIso(),
      updatedAt: nowIso(),
    },
  ],
};

type StoredState = {
  channels: Record<string, ChatChannelSummary>;
  messages: Record<string, ChatMessage[]>;
};

const loadState = (): StoredState => {
  if (typeof window === 'undefined') {
    return { channels: {}, messages: {} };
  }
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return { channels: {}, messages: {} };
  }
  try {
    const parsed = JSON.parse(raw) as StoredState;
    return parsed;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.warn('Failed to parse chat mock state', error);
    return { channels: {}, messages: {} };
  }
};

const persistState = (state: StoredState) => {
  if (typeof window === 'undefined') {
    return;
  }
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
};

const ensureDefaultState = (state: StoredState): StoredState => {
  const updated = { ...state };
  if (!updated.channels) {
    updated.channels = {};
  }
  if (!updated.messages) {
    updated.messages = {};
  }

  for (const channel of defaultChannels) {
    if (!updated.channels[channel.channelId]) {
      updated.channels[channel.channelId] = channel;
    }
    if (!updated.messages[channel.channelId]) {
      updated.messages[channel.channelId] = [...(defaultMessages[channel.channelId] ?? [])];
    }
  }

  return updated;
};

type Listener = (message: ChatMessage) => void;

export const createMockChatClient = ({
  currentUserId,
}: {
  currentUserId?: string;
} = {}): ChatClient => {
  let state = ensureDefaultState(loadState());
  const listeners = new Map<string, Set<Listener>>();

  const notify = (channelId: string, message: ChatMessage) => {
    const channelListeners = listeners.get(channelId);
    if (!channelListeners) {
      return;
    }
    for (const listener of channelListeners) {
      listener(message);
    }
  };

  const registerChannel = (descriptor: ChannelDescriptor) => {
    const channelId = resolveChannelId(descriptor);
    if (!state.channels[channelId]) {
      state.channels[channelId] = {
        channelId,
        channelType: descriptor.channelType,
        metadata: buildChannelMetadata(descriptor),
      } satisfies ChatChannelSummary;
    }
  };

  const fetchMessages = (channelId: string, limit: number): ChatMessage[] => {
    const entries = state.messages[channelId] ?? [];
    if (entries.length <= limit) {
      return entries.slice();
    }
    return entries.slice(entries.length - limit);
  };

  const saveMessage = (descriptor: ChannelDescriptor, payload: SendMessageInput): ChatMessage => {
    const channelId = resolveChannelId(descriptor);
    const record: ChatMessage = {
      id: randomId(),
      channelId,
      channelType: descriptor.channelType,
      senderId: payload.senderId,
      senderDisplayName: payload.senderDisplayName,
      body: payload.body,
      metadata: {
        ...buildChannelMetadata(descriptor),
        ...(payload.metadata ?? {}),
      },
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };

    const messages = state.messages[channelId] ?? [];
    state = {
      ...state,
      messages: {
        ...state.messages,
        [channelId]: [...messages, record],
      },
    };

    persistState(state);
    return record;
  };

  const maybeSeedDirectChannel = () => {
    if (!currentUserId) {
      return;
    }
    const channelId = `direct:${currentUserId}--friend`; // not sorted yet
    const parsed = parseChannelId(channelId);
    const descriptor = descriptorFromSummary({
      channelId: parsed.channelId,
      channelType: parsed.channelType,
      metadata: parsed.channelType === 'direct' ? { participantIds: parsed.participantIds } : {},
    });
    if (!descriptor) {
      return;
    }

    registerChannel(descriptor);

    if (!state.messages[parsed.channelId] || state.messages[parsed.channelId].length === 0) {
      const welcome: ChatMessage = {
        id: randomId(),
        channelId: parsed.channelId,
        channelType: 'direct',
        senderId: 'mock-friend',
        senderDisplayName: 'Friendly Bot',
        body: 'Ping me anytime! I am a mock direct message.',
        createdAt: nowIso(),
        updatedAt: nowIso(),
      };
      state = {
        ...state,
        messages: {
          ...state.messages,
          [parsed.channelId]: [welcome],
        },
      };
      persistState(state);
    }
  };

  maybeSeedDirectChannel();

  return {
    fetchMessages: async (descriptor, limit = 50) => {
      registerChannel(descriptor);
      const channelId = resolveChannelId(descriptor);
      return fetchMessages(channelId, limit);
    },
    fetchMessagesById: async (channelId, limit = 50) => fetchMessages(channelId, limit),
    listChannels: async () => Object.values(state.channels),
    sendMessage: async (input) => {
      registerChannel(input.descriptor);
      await new Promise((resolve) => setTimeout(resolve, 150));
      const record = saveMessage(input.descriptor, input);
      notify(record.channelId, record);
      return record;
    },
    subscribe: (channelId, listener) => {
      if (!listeners.has(channelId)) {
        listeners.set(channelId, new Set());
      }
      listeners.get(channelId)?.add(listener);
      return () => {
        listeners.get(channelId)?.delete(listener);
      };
    },
  };
};
