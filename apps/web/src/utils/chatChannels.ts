import type { ChannelDescriptor, ChatChannelSummary } from '@/types/chat';

export const DEFAULT_GLOBAL_SCOPE = 'default';

const CHANNEL_PREFIX_DELIMITER = ':';
const DIRECT_PARTICIPANT_DELIMITER = '--';

export const sortParticipantIds = (participants: [string, string]): [string, string] => {
  return [...participants].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0)) as [string, string];
};

export type ParsedChannelId =
  | {
      channelId: string;
      channelType: 'global';
      scope: string;
    }
  | {
      channelId: string;
      channelType: 'direct';
      participantIds: [string, string];
    }
  | {
      channelId: string;
      channelType: 'game';
      gameId: string;
    };

export const parseChannelId = (channelId: string): ParsedChannelId => {
  const [prefix, ...rest] = channelId.split(CHANNEL_PREFIX_DELIMITER);
  if (!prefix || rest.length === 0) {
    throw new Error(`Invalid channel id: ${channelId}`);
  }

  const key = rest.join(CHANNEL_PREFIX_DELIMITER);

  switch (prefix) {
    case 'global': {
      const scope = key.trim() || DEFAULT_GLOBAL_SCOPE;
      return {
        channelId,
        channelType: 'global',
        scope: scope.toLowerCase(),
      } satisfies ParsedChannelId;
    }
    case 'direct': {
      const participants = key.split(DIRECT_PARTICIPANT_DELIMITER).map((value) => value.trim()).filter(Boolean);
      if (participants.length !== 2) {
        throw new Error(`Invalid direct channel id: ${channelId}`);
      }
      const tuple = sortParticipantIds(participants as [string, string]);
      return {
        channelId: `direct:${tuple.join(DIRECT_PARTICIPANT_DELIMITER)}`,
        channelType: 'direct',
        participantIds: tuple,
      } satisfies ParsedChannelId;
    }
    case 'game': {
      const gameId = key.trim();
      if (!gameId) {
        throw new Error(`Invalid game channel id: ${channelId}`);
      }
      return {
        channelId,
        channelType: 'game',
        gameId,
      } satisfies ParsedChannelId;
    }
    default:
      throw new Error(`Unsupported channel type: ${prefix}`);
  }
};

export const resolveChannelKey = (descriptor: ChannelDescriptor): string => {
  switch (descriptor.channelType) {
    case 'global': {
      const scope = descriptor.scope?.trim() || DEFAULT_GLOBAL_SCOPE;
      return scope.toLowerCase();
    }
    case 'direct': {
      const [a, b] = sortParticipantIds(descriptor.participantIds);
      return `${a}${DIRECT_PARTICIPANT_DELIMITER}${b}`;
    }
    case 'game':
      return descriptor.gameId.trim();
    default: {
      const _never: never = descriptor;
      return _never;
    }
  }
};

export const resolveChannelId = (descriptor: ChannelDescriptor): string => {
  const key = resolveChannelKey(descriptor);
  return `${descriptor.channelType}${CHANNEL_PREFIX_DELIMITER}${key}`;
};

export const buildChannelMetadata = (descriptor: ChannelDescriptor): Record<string, unknown> => {
  switch (descriptor.channelType) {
    case 'global':
      return {
        scope: descriptor.scope?.trim() || DEFAULT_GLOBAL_SCOPE,
      };
    case 'direct':
      return {
        participantIds: sortParticipantIds(descriptor.participantIds),
      };
    case 'game':
      return {
        gameId: descriptor.gameId.trim(),
      };
    default: {
      const _never: never = descriptor;
      return _never;
    }
  }
};

export const descriptorFromSummary = (summary: ChatChannelSummary): ChannelDescriptor | null => {
  switch (summary.channelType) {
    case 'global':
      return {
        channelType: 'global',
        scope: typeof summary.metadata?.scope === 'string' ? summary.metadata.scope : undefined,
      } satisfies ChannelDescriptor;
    case 'direct': {
      const participants = summary.metadata?.participantIds;
      if (!Array.isArray(participants) || participants.length !== 2) {
        return null;
      }
      const tuple = sortParticipantIds([participants[0] as string, participants[1] as string]);
      return {
        channelType: 'direct',
        participantIds: tuple,
      } satisfies ChannelDescriptor;
    }
    case 'game': {
      const gameId = summary.metadata?.gameId;
      if (typeof gameId !== 'string' || gameId.trim().length === 0) {
        return null;
      }
      return {
        channelType: 'game',
        gameId,
      } satisfies ChannelDescriptor;
    }
    default:
      return null;
  }
};

export const formatChannelLabel = (
  summary: ChatChannelSummary,
  currentUserId?: string
): string => {
  switch (summary.channelType) {
    case 'global': {
      const scope = typeof summary.metadata?.scope === 'string' ? summary.metadata.scope : undefined;
      return scope && scope !== DEFAULT_GLOBAL_SCOPE
        ? `Global (${scope})`
        : 'Global lobby';
    }
    case 'direct': {
      const participants = Array.isArray(summary.metadata?.participantIds)
        ? (summary.metadata?.participantIds as string[])
        : [];
      if (participants.length === 2) {
        const others = currentUserId ? participants.filter((id) => id !== currentUserId) : participants;
        return `Direct: ${others.join(', ')}`;
      }
      return 'Direct message';
    }
    case 'game': {
      const gameId = typeof summary.metadata?.gameId === 'string' ? summary.metadata.gameId : null;
      return gameId ? `Game: ${gameId}` : 'Game channel';
    }
    default:
      return summary.channelId;
  }
};
