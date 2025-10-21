import type { Firestore } from '@google-cloud/firestore';
import type { Express } from 'express';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import type { UserProfile } from '../types';

const USERS_COLLECTION = 'users';
const CHAT_MESSAGES_COLLECTION = 'chatMessages';
const TEST_USER_ID = 'contract-user-1';

let firestore: Firestore;
let loginApp: Express;
let chatApp: Express;

const loginCredential = JSON.stringify({
  sub: TEST_USER_ID,
  email: 'contract@example.com',
  name: 'Contract User',
  picture: 'https://example.com/contract-user.png',
});

const clearFirestore = async () => {
  const userDoc = firestore.collection(USERS_COLLECTION).doc(TEST_USER_ID);
  const userSnapshot = await userDoc.get();
  if (userSnapshot.exists) {
    await userDoc.delete();
  }

  const chatDocs = await firestore.collection(CHAT_MESSAGES_COLLECTION).listDocuments();
  await Promise.all(chatDocs.map((doc) => doc.delete()));
};

describe('cross-service contract', () => {
  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    process.env.PORT = '0';
    process.env.SESSION_JWT_SECRET = 'cross-service-secret';
    process.env.GOOGLE_CLIENT_ID = 'fake-google-client-id';
    process.env.USE_FAKE_GOOGLE_AUTH = 'true';
    process.env.USE_FIRESTORE_EMULATOR = 'true';
    process.env.FIRESTORE_EMULATOR_HOST = process.env.FIRESTORE_EMULATOR_HOST ?? 'localhost:8080';
    process.env.GCP_PROJECT_ID = 'demo-firestore';

    const { getFirestore } = await import('../lib/firestore');
    const { createApp: createLoginApp } = await import('../app');

    firestore = getFirestore();
    loginApp = createLoginApp();

    const messageStoreModule = await import(new URL('../../../chat-api/src/services/messageStore.ts', import.meta.url).href);
    const chatAppModule = await import(new URL('../../../chat-api/src/app.ts', import.meta.url).href);

    const MessageStoreClass = messageStoreModule.MessageStore as new (deps: { firestore: Firestore }) => {
      saveMessage: (...args: unknown[]) => Promise<unknown>;
    };
    const createChatApp = chatAppModule.createApp as (deps: { messageStore: unknown }) => Express;

    const messageStore = new MessageStoreClass({ firestore });
    chatApp = createChatApp({ messageStore });
  });

  beforeEach(async () => {
    await clearFirestore();
  });

  afterAll(async () => {
    await clearFirestore();
  });

  it('maintains session cookies and provides headers for chat api access', async () => {
    const loginAgent = request.agent(loginApp);

    const loginResponse = await loginAgent
      .post('/auth/google')
      .set('Content-Type', 'application/json')
      .send({ credential: loginCredential })
      .expect(200);

    const profile = loginResponse.body.user as UserProfile;
    expect(profile.id).toBe(TEST_USER_ID);

    const sessionResponse = await loginAgent.get('/auth/session').expect(200);
    expect(sessionResponse.body.user.id).toBe(TEST_USER_ID);

    const chatAgent = request(chatApp);

    const createResponse = await chatAgent
      .post('/chat/messages')
      .set('x-user-id', profile.id)
      .set('x-user-name', profile.name)
      .send({
        channelType: 'global',
        body: 'Cross-service hello world',
      })
      .expect(201);

    const createdMessage = createResponse.body.message;
    expect(createdMessage.channelId).toBe('global:default');
    expect(createdMessage.body).toBe('Cross-service hello world');

    const historyResponse = await chatAgent
      .get('/chat/messages')
      .set('x-user-id', profile.id)
      .set('x-user-name', profile.name)
      .query({
        channelType: 'global',
        limit: 5,
      })
      .expect(200);

    expect(historyResponse.body.messages).toHaveLength(1);
    expect(historyResponse.body.messages[0]?.body).toBe('Cross-service hello world');
  });
});
