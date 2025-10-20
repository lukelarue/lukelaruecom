import type { Firestore } from '@google-cloud/firestore';
import type { Express } from 'express';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import type { ChatMessageRecord } from '../types/chat';

const CHAT_MESSAGES_COLLECTION = 'chatMessages';

let firestore: Firestore;
let app: Express;

const withAuthHeaders = (agent: request.SuperTest<request.Test>, userId = 'integration-user', userName = 'Integration User') => {
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

describe('chat api integration (offline)', () => {
  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    process.env.PORT = '0';
    process.env.GCP_PROJECT_ID = 'demo-firestore';
    process.env.USE_FIRESTORE_EMULATOR = 'true';
    process.env.FIRESTORE_EMULATOR_HOST = process.env.FIRESTORE_EMULATOR_HOST ?? 'localhost:8080';

    const firestoreModule = await import('../lib/firestore');
    firestore = firestoreModule.getFirestore();

    const { MessageStore } = await import('../services/messageStore');
    const { createApp } = await import('../app');

    const messageStore = new MessageStore({ firestore });
    app = createApp({ messageStore });
  });

  beforeEach(async () => {
    await clearChatCollection();
  });

  afterAll(async () => {
    await clearChatCollection();
  });

  it('stores and retrieves global channel messages via Firestore emulator', async () => {
    const agent = withAuthHeaders(request(app));

    const createResponse = await agent
      .post('/chat/messages')
      .send({
        channelType: 'global',
        body: 'Offline hello world',
      })
      .expect(201);

    const createdMessage = (createResponse.body.message ?? {}) as ChatMessageRecord;
    expect(createdMessage.channelId).toBe('global:default');
    expect(createdMessage.body).toBe('Offline hello world');

    const storedDoc = await firestore.collection(CHAT_MESSAGES_COLLECTION).doc(createdMessage.id).get();
    expect(storedDoc.exists).toBe(true);

    const historyResponse = await agent
      .get('/chat/messages')
      .query({
        channelType: 'global',
        limit: 10,
      })
      .expect(200);

    expect(Array.isArray(historyResponse.body.messages)).toBe(true);
    expect(historyResponse.body.messages).toHaveLength(1);
    expect(historyResponse.body.messages[0]?.body).toBe('Offline hello world');
  });

  it('enforces access rules for direct channels', async () => {
    const sender = withAuthHeaders(request(app), 'user-1', 'User One');

    await sender
      .post('/chat/messages')
      .send({
        channelType: 'direct',
        participantIds: ['user-2'],
        body: 'Private hello',
      })
      .expect(201);

    const ownerHistory = await sender
      .get('/chat/messages')
      .query({
        channelId: 'direct:user-1--user-2',
      })
      .expect(200);

    expect(ownerHistory.body.messages).toHaveLength(1);
    expect(ownerHistory.body.messages[0]?.body).toBe('Private hello');

    const intruder = withAuthHeaders(request(app), 'user-3', 'User Three');

    await intruder
      .get('/chat/messages')
      .query({
        channelId: 'direct:user-1--user-2',
      })
      .expect(400);
  });
});
