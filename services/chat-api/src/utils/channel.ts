import type { ChannelDescriptor } from '../types/chat';

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

const parseRawChannelParts = (channelId: string) => {
  const [channelType, ...rest] = channelId.split(CHANNEL_PREFIX_DELIMITER);
  if (!channelType || rest.length === 0) {
    throw new Error(`Invalid channel id: ${channelId}`);
  }

  return { channelType, key: rest.join(CHANNEL_PREFIX_DELIMITER) };
};

export const parseChannelId = (channelId: string): ParsedChannelId => {
  const { channelType, key } = parseRawChannelParts(channelId);

  switch (channelType) {
    case 'global': {
      const scope = key.trim() || DEFAULT_GLOBAL_SCOPE;
      return {
        channelId,
        channelType: 'global',
        scope: scope.toLowerCase(),
      } satisfies ParsedChannelId;
    }
    case 'direct': {
      const participants = key.split(DIRECT_PARTICIPANT_DELIMITER).map((participant) => participant.trim());
      if (participants.length !== 2 || participants.some((participant) => participant.length === 0)) {
        throw new Error(`Invalid direct channel key: ${key}`);
      }

      const sorted = sortParticipantIds(participants as [string, string]);
      return {
        channelId,
        channelType: 'direct',
        participantIds: sorted,
      } satisfies ParsedChannelId;
    }
    case 'game': {
      const gameId = key.trim();
      if (!gameId) {
        throw new Error(`Invalid game channel key: ${key}`);
      }

      return {
        channelId,
        channelType: 'game',
        gameId,
      } satisfies ParsedChannelId;
    }
    default:
      throw new Error(`Unsupported channel type: ${channelType}`);
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
      // Exhaustiveness check
      const _never: never = descriptor;
      return _never;
    }
  }
};

export const descriptorFromParsedChannel = (parsed: ParsedChannelId): ChannelDescriptor => {
  switch (parsed.channelType) {
    case 'global': {
      return {
        channelType: 'global',
        scope: parsed.scope,
      } satisfies ChannelDescriptor;
    }
    case 'direct': {
      return {
        channelType: 'direct',
        participantIds: parsed.participantIds,
      } satisfies ChannelDescriptor;
    }
    case 'game': {
      return {
        channelType: 'game',
        gameId: parsed.gameId,
      } satisfies ChannelDescriptor;
    }
    default: {
      const _never: never = parsed;
      return _never;
    }
  }
};

export const ensureChannelAccessibility = (parsed: ParsedChannelId, userId: string): boolean => {
  if (parsed.channelType !== 'direct') {
    return true;
  }

  return parsed.participantIds.includes(userId);
};

export const resolveChannelId = (descriptor: ChannelDescriptor): string => {
  const key = resolveChannelKey(descriptor);
  return `${descriptor.channelType}${CHANNEL_PREFIX_DELIMITER}${key}`;
};

type ChannelMetadata = Record<string, unknown>;

export const buildChannelMetadata = (descriptor: ChannelDescriptor): ChannelMetadata => {
  switch (descriptor.channelType) {
    case 'global': {
      return {
        scope: descriptor.scope?.trim() || DEFAULT_GLOBAL_SCOPE,
      } satisfies ChannelMetadata;
    }
    case 'direct': {
      return {
        participantIds: sortParticipantIds(descriptor.participantIds),
      } satisfies ChannelMetadata;
    }
    case 'game': {
      return {
        gameId: descriptor.gameId.trim(),
      } satisfies ChannelMetadata;
    }
    default: {
      const _never: never = descriptor;
      return _never;
    }
  }
};
