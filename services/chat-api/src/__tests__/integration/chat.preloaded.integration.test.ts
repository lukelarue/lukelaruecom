import type { Firestore } from '@google-cloud/firestore';
import type { Express } from 'express';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { getFirestore } from '../../lib/firestore';
import { MessageStore } from '../../services/messageStore';
import { createApp } from '../../app';

const CHAT_MESSAGES_COLLECTION = 'chatMessages';

let firestore: Firestore;
let app: Express;

const withAuthHeaders = (
  agent: request.SuperTest<request.Test>,
  userId = 'reader-user',
  userName = 'Reader User'
) => {
  const applyAuth = (test: request.Test) => test.set('x-user-id', userId).set('x-user-name', userName);
  return {
    post: (path: string) => applyAuth(agent.post(path)),
    get: (path: string) => applyAuth(agent.get(path)),
  };
};

const clearChatCollection = async () => {
  const docs = await firestore.collection(CHAT_MESSAGES_COLLECTION).listDocuments();
  await Promise.all(docs.map((doc) => doc.delete()));
};

const seedMessages = async (
  messages: Array<{
    id: string;
    channelId: string;
    channelType: 'global' | 'direct' | 'game';
    senderId: string;
    senderDisplayName?: string;
    body: string;
    createdAt: string;
    updatedAt: string;
    metadata?: Record<string, unknown>;
  }>
) => {
  const col = firestore.collection(CHAT_MESSAGES_COLLECTION);
  await Promise.all(messages.map((m) => col.doc(m.id).set(m)));
};

describe('chat api integration (preloaded history)', () => {
  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    process.env.PORT = '0';
    process.env.GCP_PROJECT_ID = 'demo-firestore-preloaded';
    process.env.USE_FIRESTORE_EMULATOR = 'true';
    process.env.FIRESTORE_EMULATOR_HOST = process.env.FIRESTORE_EMULATOR_HOST ?? 'localhost:8080';

    firestore = getFirestore();
    const messageStore = new MessageStore({ firestore });
    app = createApp({ messageStore });
  });

  beforeEach(async () => {
    await clearChatCollection();
  });

  afterAll(async () => {
    await clearChatCollection();
  });

  it('returns messages that were pre-seeded directly in Firestore (global channel)', async () => {
    const now = Date.now();
    const mkTime = (ms: number) => new Date(ms).toISOString();

    await seedMessages([
      {
        id: 'seed-1',
        channelId: 'global:default',
        channelType: 'global',
        senderId: 'seed-user',
        senderDisplayName: 'Seeder',
        body: 'Hello from seed 1',
        metadata: { scope: 'default' },
        createdAt: mkTime(now - 3000),
        updatedAt: mkTime(now - 3000),
      },
      {
        id: 'seed-2',
        channelId: 'global:default',
        channelType: 'global',
        senderId: 'seed-user',
        senderDisplayName: 'Seeder',
        body: 'Hello from seed 2',
        metadata: { scope: 'default' },
        createdAt: mkTime(now - 2000),
        updatedAt: mkTime(now - 2000),
      },
      {
        id: 'seed-3',
        channelId: 'global:default',
        channelType: 'global',
        senderId: 'seed-user',
        senderDisplayName: 'Seeder',
        body: 'Hello from seed 3',
        metadata: { scope: 'default' },
        createdAt: mkTime(now - 1000),
        updatedAt: mkTime(now - 1000),
      },
    ]);

    const agent = withAuthHeaders(request(app), 'reader', 'Reader');

    const res = await agent
      .get('/chat/messages')
      .query({ channelId: 'global:default', limit: 50 })
      .expect(200);

    const bodies = (res.body.messages as Array<{ body: string }>).map((m) => m.body);
    expect(bodies).toEqual(['Hello from seed 1', 'Hello from seed 2', 'Hello from seed 3']);
  });
});
