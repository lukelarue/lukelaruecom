import { Router, type NextFunction, type Request, type RequestHandler, type Response } from 'express';
import { z } from 'zod';

import { requireUser } from '../middleware/auth';
import type { MessageStoreContract } from '../services/messageStore';
import type { ChannelDescriptor } from '../types/chat';
import { buildChannelMetadata, descriptorFromParsedChannel, ensureChannelAccessibility, parseChannelId, sortParticipantIds } from '../utils/channel';

const MAX_HISTORY_LIMIT = 200;

const sendMessageSchema = z.object({
  channelType: z.enum(['global', 'direct', 'game']),
  body: z.string().min(1).max(2000),
  metadata: z.record(z.unknown()).optional(),
  senderDisplayName: z.string().min(1).max(120).optional(),
  scope: z.string().min(1).max(100).optional(),
  participantIds: z.array(z.string().min(1)).max(2).optional(),
  gameId: z.string().min(1).max(100).optional(),
});

const parseLimit = (rawLimit: unknown, defaultLimit: number) => {
  if (rawLimit === undefined) {
    return defaultLimit;
  }

  const limit = Number.parseInt(String(rawLimit), 10);
  if (!Number.isFinite(limit) || limit <= 0) {
    throw new Error('limit must be a positive integer');
  }

  return Math.min(limit, MAX_HISTORY_LIMIT);
};

const participantsToTuple = (userId: string, participants: string[] | undefined): [string, string] => {
  const normalized = new Set<string>();
  normalized.add(userId);

  if (participants) {
    for (const participant of participants) {
      if (participant.trim().length > 0) {
        normalized.add(participant.trim());
      }
    }
  }

  if (normalized.size !== 2) {
    throw new Error('Direct messages require exactly two distinct participants including the sender');
  }

  const [a, b] = [...normalized] as [string, string];
  return sortParticipantIds([a, b]);
};

const buildDescriptorFromPayload = (userId: string, payload: z.infer<typeof sendMessageSchema>): ChannelDescriptor => {
  switch (payload.channelType) {
    case 'global':
      return {
        channelType: 'global',
        scope: payload.scope,
      };
    case 'direct':
      return {
        channelType: 'direct',
        participantIds: participantsToTuple(userId, payload.participantIds),
      };
    case 'game':
      if (!payload.gameId) {
        throw new Error('gameId is required for game channels');
      }
      return {
        channelType: 'game',
        gameId: payload.gameId,
      };
    default:
      throw new Error(`Unsupported channel type: ${payload.channelType satisfies never}`);
  }
};

const parseGetMessagesQuery = (userId: string, query: Record<string, unknown>, defaultLimit: number) => {
  const { channelId, channelType, scope, gameId } = query;
  const limit = parseLimit(query.limit, defaultLimit);

  if (channelId) {
    const parsed = parseChannelId(String(channelId));
    if (!ensureChannelAccessibility(parsed, userId)) {
      throw new Error('You do not have access to this channel');
    }

    return {
      type: 'byId' as const,
      channelId: parsed.channelId,
      limit,
      descriptor: descriptorFromParsedChannel(parsed),
    };
  }

  if (!channelType) {
    throw new Error('channelType or channelId is required');
  }

  const parsedChannelType = String(channelType);
  if (parsedChannelType === 'global') {
    return {
      type: 'byDescriptor' as const,
      descriptor: {
        channelType: 'global',
        scope: scope ? String(scope) : undefined,
      } satisfies ChannelDescriptor,
      limit,
    };
  }

  if (parsedChannelType === 'game') {
    if (!gameId) {
      throw new Error('gameId is required for game channels');
    }

    return {
      type: 'byDescriptor' as const,
      descriptor: {
        channelType: 'game',
        gameId: String(gameId),
      } satisfies ChannelDescriptor,
      limit,
    };
  }

  if (parsedChannelType === 'direct') {
    const participantsValue = query.participantIds;
    const participantIds = (() => {
      if (Array.isArray(participantsValue)) {
        return participantsValue.map((value) => String(value));
      }
      if (typeof participantsValue === 'string') {
        return participantsValue.split(',').map((value) => value.trim());
      }
      throw new Error('participantIds is required for direct channels');
    })();

    const tuple = participantsToTuple(userId, participantIds);
    return {
      type: 'byDescriptor' as const,
      descriptor: {
        channelType: 'direct',
        participantIds: tuple,
      } satisfies ChannelDescriptor,
      limit,
    };
  }

  throw new Error(`Unsupported channel type: ${parsedChannelType}`);
};

type AsyncOrSyncHandler = (
  req: Request,
  res: Response,
  next: NextFunction
) => void | Promise<unknown>;

const wrapAsync = (handler: AsyncOrSyncHandler): RequestHandler => {
  return (req, res, next) => {
    try {
      const result = handler(req, res, next);
      if (result && typeof (result as Promise<unknown>).then === 'function') {
        void (result as Promise<unknown>).catch(next);
      }
    } catch (error) {
      next(error);
    }
  };
};

export type CreateChatRouterDeps = {
  messageStore: MessageStoreContract;
  defaultHistoryLimit: number;
};

export const createChatRouter = ({ messageStore, defaultHistoryLimit }: CreateChatRouterDeps) => {
  const router = Router();

  router.use(requireUser);

  router.post(
    '/messages',
    wrapAsync(async (req, res) => {
      if (!req.user) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const parsed = sendMessageSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: 'Invalid request', issues: parsed.error.issues });
      }

      const descriptor = buildDescriptorFromPayload(req.user.id, parsed.data);
      const record = await messageStore.saveMessage(descriptor, {
        senderId: req.user.id,
        senderDisplayName: parsed.data.senderDisplayName ?? req.user.name,
        body: parsed.data.body,
        metadata: parsed.data.metadata,
      });

      return res.status(201).json({
        message: record,
      });
    })
  );

  router.get(
    '/messages',
    wrapAsync(async (req, res) => {
      if (!req.user) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      let queryResult;
      try {
        queryResult = parseGetMessagesQuery(req.user.id, req.query, defaultHistoryLimit);
      } catch (error) {
        return res.status(400).json({
          message: error instanceof Error ? error.message : 'Invalid query parameters',
        });
      }

      const messages =
        queryResult.type === 'byId'
          ? await messageStore.fetchRecentByChannelId(queryResult.channelId, queryResult.limit)
          : await messageStore.fetchRecentMessages(queryResult.descriptor, queryResult.limit);

      return res.json({
        messages,
      });
    })
  );

  router.get(
    '/channels',
    wrapAsync(async (req, res) => {
      if (!req.user) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const channelIds = await messageStore.listChannels();
      const channels = channelIds
        .map((channelId) => {
          try {
            const parsed = parseChannelId(channelId);
            if (!ensureChannelAccessibility(parsed, req.user!.id)) {
              return null;
            }

            const metadata = buildChannelMetadata(descriptorFromParsedChannel(parsed));
            return {
              channelId,
              channelType: parsed.channelType,
              metadata,
            };
          } catch (error) {
            // eslint-disable-next-line no-console
            console.warn('Skipping invalid channel id', channelId, error);
            return null;
          }
        })
        .filter(Boolean);

      return res.json({ channels });
    })
  );

  router.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    void _next;
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ message: 'Chat router error', details: message });
  });

  return router;
};
