import { OAuth2Client } from 'google-auth-library';

import { config } from '../config.js';

export type GoogleProfile = {
  id: string;
  email: string;
  name: string;
  pictureUrl?: string;
};

const oauthClient = new OAuth2Client();

export const verifyGoogleIdToken = async (idToken: string): Promise<GoogleProfile> => {
  if (config.dev.useFakeGoogleAuth) {
    try {
      const parsed = JSON.parse(idToken);
      return {
        id: parsed.sub ?? parsed.id ?? 'dev-user',
        email: parsed.email ?? 'dev-user@example.com',
        name: parsed.name ?? 'Dev User',
        pictureUrl: parsed.pictureUrl ?? parsed.picture ?? undefined,
      };
    } catch (_err) {
      return {
        id: 'dev-user',
        email: 'dev-user@example.com',
        name: 'Dev User',
      };
    }
  }

  const ticket = await oauthClient.verifyIdToken({
    idToken,
    audience: config.googleClientId,
  });

  const payload = ticket.getPayload();

  if (!payload || !payload.sub || !payload.email || !payload.name) {
    throw new Error('Invalid Google credential payload.');
  }

  return {
    id: payload.sub,
    email: payload.email,
    name: payload.name,
    pictureUrl: payload.picture ?? undefined,
  };
};
