import type { Firestore } from '@google-cloud/firestore';
import type { Express } from 'express';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import type { MessageStoreContract } from '../../services/messageStore';
import type { ChatMessageRecord } from '../../types/chat';

const CHAT_MESSAGES_COLLECTION = 'chatMessages';

let firestore: Firestore;
let app: Express;
let messageStore: MessageStoreContract;

const withAuthHeaders = (
  agent: request.SuperTest<request.Test>,
  userId = 'integration-user',
  userName = 'Integration User'
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

describe('chat api integration (offline)', () => {
  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    process.env.PORT = '0';
    process.env.GCP_PROJECT_ID = 'demo-firestore';
    process.env.USE_FIRESTORE_EMULATOR = 'true';
    process.env.FIRESTORE_EMULATOR_HOST = process.env.FIRESTORE_EMULATOR_HOST ?? 'localhost:8080';

    const firestoreModule = await import('../../lib/firestore');
    firestore = firestoreModule.getFirestore();

    const { MessageStore } = await import('../../services/messageStore');
    const { createApp } = await import('../../app');

    messageStore = new MessageStore({ firestore });
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

  it('paginates global history using limit and before cursor ordering', async () => {
    const agent = withAuthHeaders(request(app), 'paginator', 'Paginator User');

    const createdMessages: ChatMessageRecord[] = [];
    for (let index = 0; index < 5; index += 1) {
      const messageBody = `Message ${index}`;
      const response = await agent
        .post('/chat/messages')
        .send({
          channelType: 'global',
          body: messageBody,
        })
        .expect(201);

      createdMessages.push(response.body.message as ChatMessageRecord);
      await new Promise((resolve) => setTimeout(resolve, 5));
    }

    const firstPage = await agent
      .get('/chat/messages')
      .query({ channelType: 'global', limit: 2 })
      .expect(200);

    const firstMessages = firstPage.body.messages as ChatMessageRecord[];
    expect(firstMessages).toHaveLength(2);
    const expectedLastTwo = createdMessages.slice(-2).map((message) => message.body).sort();
    const actualFirstTwo = firstMessages.map((message) => message.body).sort();
    expect(actualFirstTwo).toEqual(expectedLastTwo);

    const fullHistory = await agent
      .get('/chat/messages')
      .query({ channelType: 'global', limit: 10 })
      .expect(200);

    const allMessages = fullHistory.body.messages as ChatMessageRecord[];
    expect(allMessages).toHaveLength(5);
    expect(allMessages.map((message) => message.body)).toEqual(
      createdMessages.map((message) => message.body)
    );
  });

  it('validates channel payloads and enforces limits', async () => {
    const agent = withAuthHeaders(request(app), 'validator', 'Validator User');

    const missingChannelType = await agent
      .post('/chat/messages')
      .send({ body: 'Missing channelType' })
      .expect(400);
    expect(missingChannelType.body.message).toBe('Invalid request');

    const oversizeBody = 'x'.repeat(2001);
    const oversizeResponse = await agent
      .post('/chat/messages')
      .send({ channelType: 'global', body: oversizeBody })
      .expect(400);
    expect(oversizeResponse.body.message).toBe('Invalid request');

    const unsupportedChannelType = await agent
      .post('/chat/messages')
      .send({ channelType: 'arena', body: 'Hello arena' })
      .expect(400);
    expect(unsupportedChannelType.body.message).toBe('Invalid request');
  });

  it('handles multi-user broadcast and metadata round-trip', async () => {
    const sender = withAuthHeaders(request(app), 'broadcaster', 'Broadcaster');
    const receiver = withAuthHeaders(request(app), 'listener', 'Listener');

    const broadcast = await sender
      .post('/chat/messages')
      .send({
        channelType: 'global',
        body: 'Hello everyone',
        metadata: { mood: 'excited' },
        senderDisplayName: 'Castor',
      })
      .expect(201);

    const createdMessage = broadcast.body.message as ChatMessageRecord;
    expect(createdMessage.metadata?.scope).toBe('default');
    expect(createdMessage.senderDisplayName).toBe('Castor');

    const receiverHistory = await receiver
      .get('/chat/messages')
      .query({ channelType: 'global', limit: 10 })
      .expect(200);

    const receiverMessages = receiverHistory.body.messages as ChatMessageRecord[];
    expect(receiverMessages).toHaveLength(1);
    expect(receiverMessages[0]!.senderDisplayName).toBe('Castor');
    expect(receiverMessages[0]!.metadata?.mood).toBe('excited');

    const partner = withAuthHeaders(request(app), 'partner', 'Partner');
    await sender
      .post('/chat/messages')
      .send({
        channelType: 'direct',
        participantIds: ['partner'],
        body: 'Direct hello',
      })
      .expect(201);

    const partnerHistory = await partner
      .get('/chat/messages')
      .query({ channelType: 'direct', participantIds: 'broadcaster' })
      .expect(200);

    expect(partnerHistory.body.messages).toHaveLength(1);
    expect(partnerHistory.body.messages[0]?.body).toBe('Direct hello');

    await partner
      .post('/chat/messages')
      .send({
        channelType: 'direct',
        participantIds: ['broadcaster'],
        body: 'Reply hello',
      })
      .expect(201);

    const crossCheck = await sender
      .get('/chat/messages')
      .query({ channelType: 'direct', participantIds: 'partner' })
      .expect(200);
    expect(crossCheck.body.messages).toHaveLength(2);
  });

  it('returns server errors when Firestore is unavailable', async () => {
    const agent = withAuthHeaders(request(app), 'outage-user', 'Outage User');

    const saveSpy = vi
      .spyOn(messageStore, 'saveMessage')
      .mockRejectedValueOnce(new Error('Firestore offline'));

    const errorResponse = await agent
      .post('/chat/messages')
      .send({ channelType: 'global', body: 'Will fail' })
      .expect(500);
    expect(errorResponse.body.message).toBe('Chat router error');

    saveSpy.mockRestore();
  });
});
