import type { Request, Response } from 'express';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import type { Config } from '../../config';
import type { GetFirestore } from '../../lib/firestore';

vi.mock('../../lib/googleAuth', () => ({
  verifyGoogleIdToken: vi.fn(),
}));

vi.mock('../../lib/firestore', () => ({
  getFirestore: vi.fn(),
}));

vi.mock('jsonwebtoken', () => ({
  default: {
    sign: vi.fn(),
    verify: vi.fn(),
  },
}));

const { verifyGoogleIdToken } = await import('../../lib/googleAuth');
const { getFirestore } = await import('../../lib/firestore');
const jwt = (await import('jsonwebtoken')).default as { sign: ReturnType<typeof vi.fn> };

const createMockResponse = () => {
  const res: Partial<Response> & { statusCode?: number } = {};
  res.status = vi.fn().mockImplementation((code: number) => {
    res.statusCode = code;
    return res as Response;
  });
  res.json = vi.fn().mockImplementation(() => res as Response);
  res.cookie = vi.fn().mockImplementation(() => res as Response);
  return res as Response & { statusCode?: number };
};

describe('loginWithGoogle', () => {
  let loginWithGoogle: (req: Request, res: Response) => Promise<Response | undefined>;
  let config: Config;

  beforeAll(async () => {
    process.env.USE_FAKE_GOOGLE_AUTH = 'true';
    process.env.SESSION_JWT_SECRET = 'test-secret';
    process.env.GCP_PROJECT_ID = 'demo-firestore';
    process.env.GOOGLE_CLIENT_ID = 'fake-google-client-id';

    ({ loginWithGoogle } = await import('../authController'));
    ({ config } = await import('../../config'));
  });

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-01T00:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns 400 for an invalid request body', async () => {
    const req = { body: {} } as Request;
    const res = createMockResponse();

    await loginWithGoogle(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Invalid request' })
    );
    expect(verifyGoogleIdToken).not.toHaveBeenCalled();
  });

  it('logins successfully and sets the session cookie', async () => {
    const req = {
      body: {
        credential: 'valid-credential-token',
      },
    } as Request;
    const res = createMockResponse();

    const mockedVerifyGoogleIdToken = vi.mocked(verifyGoogleIdToken);
    const mockedGetFirestore = vi.mocked(getFirestore as GetFirestore);
    const signMock = jwt.sign as ReturnType<typeof vi.fn>;

    mockedVerifyGoogleIdToken.mockResolvedValueOnce({
      id: 'user-123',
      email: 'user@example.com',
      name: 'User Example',
      pictureUrl: 'https://example.com/pic.png',
    });

    const userDocRef = {
      get: vi.fn().mockResolvedValue({ exists: false }),
      set: vi.fn().mockResolvedValue(undefined),
    };

    const docSpy = vi.fn().mockReturnValue(userDocRef);
    const collectionSpy = vi.fn().mockReturnValue({ doc: docSpy });

    mockedGetFirestore.mockReturnValue({
      collection: collectionSpy,
    } as never);

    signMock.mockReturnValue('mock-session-token');

    const response = await loginWithGoogle(req, res);

    const isoNow = new Date().toISOString();

    expect(response?.statusCode).toBe(200);
    expect(res.json).toHaveBeenCalledWith({
      user: {
        id: 'user-123',
        email: 'user@example.com',
        name: 'User Example',
        pictureUrl: 'https://example.com/pic.png',
        createdAt: isoNow,
        lastLoginAt: isoNow,
      },
    });
    expect(res.cookie).toHaveBeenCalledWith(
      config.session.cookieName,
      'mock-session-token',
      expect.objectContaining({
        httpOnly: true,
        secure: config.isProduction,
        sameSite: 'lax',
        maxAge: config.session.expiresInSeconds * 1000,
        path: '/',
      })
    );
    expect(mockedVerifyGoogleIdToken).toHaveBeenCalledWith('valid-credential-token');
    expect(docSpy).toHaveBeenCalledWith('user-123');
    expect(signMock).toHaveBeenCalledWith(
      { userId: 'user-123' },
      config.session.jwtSecret,
      expect.objectContaining({ expiresIn: config.session.expiresInSeconds })
    );
  });

  it('returns 401 when Google verification fails', async () => {
    const req = {
      body: {
        credential: 'bad-credential',
      },
    } as Request;
    const res = createMockResponse();

    const mockedVerifyGoogleIdToken = vi.mocked(verifyGoogleIdToken);
    mockedVerifyGoogleIdToken.mockRejectedValueOnce(new Error('bad credential'));

    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    await loginWithGoogle(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Authentication failed' })
    );
    expect(res.cookie).not.toHaveBeenCalled();

    consoleErrorSpy.mockRestore();
  });
});
