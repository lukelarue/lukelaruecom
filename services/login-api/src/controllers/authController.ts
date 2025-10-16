import type { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { z } from 'zod';

import { config } from '../config';
import { getFirestore } from '../lib/firestore';
import { verifyGoogleIdToken } from '../lib/googleAuth';
import type { SessionTokenPayload, UserProfile } from '../types';

const googleLoginBodySchema = z.object({
  credential: z.string().min(10),
});

const USERS_COLLECTION = 'users';

const mapFirestoreDocToUserProfile = (doc: FirebaseFirestore.DocumentSnapshot): UserProfile => {
  const data = doc.data();
  if (!data) {
    throw new Error('User document has no data');
  }

  return {
    id: doc.id,
    email: data.email,
    name: data.name,
    pictureUrl: data.pictureUrl,
    createdAt: data.createdAt,
    lastLoginAt: data.lastLoginAt,
  };
};

const upsertUserProfile = async (profile: Omit<UserProfile, 'createdAt' | 'lastLoginAt'>) => {
  const firestore = getFirestore();
  const usersCollection = firestore.collection(USERS_COLLECTION);
  const userDocRef = usersCollection.doc(profile.id);
  const now = new Date().toISOString();

  const existingDoc = await userDocRef.get();

  if (!existingDoc.exists) {
    await userDocRef.set({
      email: profile.email,
      name: profile.name,
      pictureUrl: profile.pictureUrl ?? null,
      createdAt: now,
      lastLoginAt: now,
    });

    return {
      id: profile.id,
      email: profile.email,
      name: profile.name,
      pictureUrl: profile.pictureUrl,
      createdAt: now,
      lastLoginAt: now,
    } satisfies UserProfile;
  }

  await userDocRef.update({
    email: profile.email,
    name: profile.name,
    pictureUrl: profile.pictureUrl ?? null,
    lastLoginAt: now,
  });

  const updatedDoc = await userDocRef.get();
  return mapFirestoreDocToUserProfile(updatedDoc);
};

const createSessionToken = (payload: SessionTokenPayload) => {
  return jwt.sign(payload, config.session.jwtSecret, {
    expiresIn: config.session.expiresInSeconds,
  });
};

const setSessionCookie = (res: Response, token: string) => {
  res.cookie(config.session.cookieName, token, {
    httpOnly: true,
    secure: config.isProduction,
    sameSite: 'lax',
    maxAge: config.session.expiresInSeconds * 1000,
    path: '/',
  });
};

const clearSessionCookie = (res: Response) => {
  res.clearCookie(config.session.cookieName, {
    httpOnly: true,
    secure: config.isProduction,
    sameSite: 'lax',
    path: '/',
  });
};

const getSessionFromRequest = (req: Request): SessionTokenPayload | null => {
  const token = req.cookies?.[config.session.cookieName];
  if (!token) {
    return null;
  }

  try {
    return jwt.verify(token, config.session.jwtSecret) as SessionTokenPayload;
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('Invalid session token', err);
    return null;
  }
};

export const loginWithGoogle = async (req: Request, res: Response) => {
  const parseResult = googleLoginBodySchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({ message: 'Invalid request', issues: parseResult.error.issues });
  }

  try {
    const profile = await verifyGoogleIdToken(parseResult.data.credential);

    const userProfile = await upsertUserProfile({
      id: profile.id,
      email: profile.email,
      name: profile.name,
      pictureUrl: profile.pictureUrl,
    });

    const token = createSessionToken({ userId: userProfile.id });
    setSessionCookie(res, token);

    return res.status(200).json({
      user: userProfile,
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Failed to login with Google', err);
    return res.status(401).json({ message: 'Authentication failed' });
  }
};

export const getSession = async (req: Request, res: Response) => {
  const session = getSessionFromRequest(req);
  if (!session) {
    return res.status(401).json({ message: 'Not authenticated' });
  }

  try {
    const firestore = getFirestore();
    const userDoc = await firestore.collection(USERS_COLLECTION).doc(session.userId).get();
    if (!userDoc.exists) {
      clearSessionCookie(res);
      return res.status(401).json({ message: 'Session no longer valid' });
    }

    const userProfile = mapFirestoreDocToUserProfile(userDoc);
    return res.json({
      user: userProfile,
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Failed to fetch session', err);
    return res.status(500).json({ message: 'Failed to fetch session' });
  }
};

export const signOut = async (_req: Request, res: Response) => {
  clearSessionCookie(res);
  return res.status(204).end();
};
