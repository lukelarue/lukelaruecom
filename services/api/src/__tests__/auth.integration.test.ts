import type { Express } from 'express';
import request from 'supertest';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Firestore } from '@google-cloud/firestore';
import type { UserProfile } from '../types';

const TEST_USER_ID = 'integration-user-123';
const USERS_COLLECTION = 'users';

let app: Express;
let firestore: Firestore;
let config: typeof import('../config').config;
let getFirestore: typeof import('../lib/firestore').getFirestore;
let createApp: typeof import('../app').createApp;

const loginCredential = JSON.stringify({
  sub: TEST_USER_ID,
  email: 'integration-user@example.com',
  name: 'Integration User',
  picture: 'https://example.com/integration-user.png',
});

const deleteUserDoc = async () => {
  const docRef = firestore.collection(USERS_COLLECTION).doc(TEST_USER_ID);
  const doc = await docRef.get();
  if (doc.exists) {
    await docRef.delete();
  }
};

beforeAll(async () => {
  process.env.NODE_ENV = 'test';
  process.env.PORT = '0';
  process.env.SESSION_JWT_SECRET = 'test-secret';
  process.env.GCP_PROJECT_ID = 'demo-firestore';
  process.env.GOOGLE_CLIENT_ID = 'fake-google-client-id';
  process.env.USE_FAKE_GOOGLE_AUTH = 'true';
  process.env.USE_FIRESTORE_EMULATOR = 'true';
  process.env.FIRESTORE_EMULATOR_HOST = process.env.FIRESTORE_EMULATOR_HOST ?? 'localhost:8080';

  ({ getFirestore } = await import('../lib/firestore'));
  ({ config } = await import('../config'));
  ({ createApp } = await import('../app'));

  firestore = getFirestore();
  app = createApp();
});

beforeEach(async () => {
  await deleteUserDoc();
});

afterAll(async () => {
  await deleteUserDoc();
});

describe('auth integration (offline)', () => {
  it('logs in with fake Google credential and persists user profile', async () => {
    const agent = request.agent(app);

    const loginResponse = await agent
      .post('/auth/google')
      .set('Content-Type', 'application/json')
      .send({ credential: loginCredential })
      .expect(200);

    const setCookieHeader = loginResponse.headers['set-cookie'];
    expect(setCookieHeader).toBeDefined();
    expect(setCookieHeader?.join(';')).toContain(`${config.session.cookieName}=`);

    const body = loginResponse.body as { user: UserProfile };
    expect(body.user).toMatchObject({
      id: TEST_USER_ID,
      email: 'integration-user@example.com',
      name: 'Integration User',
      pictureUrl: 'https://example.com/integration-user.png',
    });
    expect(body.user.createdAt).toBeDefined();
    expect(body.user.lastLoginAt).toBeDefined();
    expect(body.user.lastLoginAt).toBe(body.user.createdAt);
    expect(new Date(body.user.createdAt).toISOString()).toBe(body.user.createdAt);

    const storedDoc = await firestore.collection(USERS_COLLECTION).doc(TEST_USER_ID).get();
    expect(storedDoc.exists).toBe(true);
    expect(storedDoc.data()).toMatchObject({
      email: 'integration-user@example.com',
      name: 'Integration User',
      pictureUrl: 'https://example.com/integration-user.png',
      createdAt: body.user.createdAt,
      lastLoginAt: body.user.lastLoginAt,
    });

    const sessionResponse = await agent.get('/auth/session').expect(200);
    expect(sessionResponse.body).toMatchObject({
      user: {
        id: TEST_USER_ID,
        email: 'integration-user@example.com',
        name: 'Integration User',
        pictureUrl: 'https://example.com/integration-user.png',
      },
    });
  });

  it('updates user lastLoginAt on subsequent logins', async () => {
    const agent = request.agent(app);

    const firstLogin = await agent
      .post('/auth/google')
      .set('Content-Type', 'application/json')
      .send({ credential: loginCredential })
      .expect(200);

    const firstProfile = firstLogin.body.user as UserProfile;
    await new Promise((resolve) => setTimeout(resolve, 5));

    const secondLogin = await agent
      .post('/auth/google')
      .set('Content-Type', 'application/json')
      .send({ credential: loginCredential })
      .expect(200);

    const profile = secondLogin.body.user as UserProfile;
    expect(profile.createdAt).toBe(firstProfile.createdAt);
    expect(profile.lastLoginAt).not.toBe(firstProfile.lastLoginAt);

    const storedDoc = await firestore.collection(USERS_COLLECTION).doc(TEST_USER_ID).get();
    expect(storedDoc.data()).toMatchObject({
      createdAt: firstProfile.createdAt,
      lastLoginAt: profile.lastLoginAt,
    });
  });
});
