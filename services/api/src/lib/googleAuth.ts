import { OAuth2Client } from 'google-auth-library';
import { config } from '../config';

export type GoogleProfile = {
  id: string;
  email: string;
  name: string;
  pictureUrl?: string;
};

const oauthClient = new OAuth2Client();

export const verifyGoogleIdToken = async (idToken: string): Promise<GoogleProfile> => {
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
