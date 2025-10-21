import type { Firestore } from '@google-cloud/firestore';
import type { Express } from 'express';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import type { CreateApp } from '../app';
import type { Config } from '../config';
import type { GetFirestore } from '../lib/firestore';
import type { UserProfile } from '../types';

const TEST_USER_ID = 'integration-user-123';
const USERS_COLLECTION = 'users';

let app: Express;
let firestore: Firestore;
let config: Config;
let getFirestore: GetFirestore;
let createApp: CreateApp;

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

    const cookieValues = Array.isArray(setCookieHeader) ? setCookieHeader : [setCookieHeader];
    expect(cookieValues.join(';')).toContain(`${config.session.cookieName}=`);

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

  it('rejects malformed credentials and requires session cookies', async () => {
    const malformedResponse = await request(app)
      .post('/auth/google')
      .set('Content-Type', 'application/json')
      .send({ credential: 'invalid' })
      .expect(400);

    expect(malformedResponse.body.message).toBe('Invalid request');

    const sessionResponse = await request(app).get('/auth/session').expect(401);
    expect(sessionResponse.body.message).toBe('Not authenticated');
  });

  it('refreshes lastLoginAt on stale profiles and invalidates sessions when user is deleted', async () => {
    const agent = request.agent(app);

    const firstLogin = await agent
      .post('/auth/google')
      .set('Content-Type', 'application/json')
      .send({ credential: loginCredential })
      .expect(200);

    const firstProfile = firstLogin.body.user as UserProfile;

    const userDocRef = firestore.collection(USERS_COLLECTION).doc(TEST_USER_ID);
    const staleTimestamp = new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString();
    await userDocRef.update({ lastLoginAt: staleTimestamp });

    const secondLogin = await agent
      .post('/auth/google')
      .set('Content-Type', 'application/json')
      .send({ credential: loginCredential })
      .expect(200);

    const refreshedProfile = secondLogin.body.user as UserProfile;
    expect(new Date(refreshedProfile.lastLoginAt).getTime()).toBeGreaterThan(new Date(staleTimestamp).getTime());
    expect(refreshedProfile.createdAt).toBe(firstProfile.createdAt);

    await userDocRef.delete();

    const invalidSessionResponse = await agent.get('/auth/session').expect(401);
    const invalidCookies = invalidSessionResponse.headers['set-cookie'];
    const cookieHeader = Array.isArray(invalidCookies) ? invalidCookies.join(';') : invalidCookies;
    expect(cookieHeader ?? '').toContain(`${config.session.cookieName}=`);
    expect(invalidSessionResponse.body.message).toBe('Session no longer valid');
  });
});
