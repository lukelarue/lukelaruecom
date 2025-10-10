import dotenv from 'dotenv';

dotenv.config();

type RequiredEnvKey =
  | 'GOOGLE_CLIENT_ID'
  | 'GCP_PROJECT_ID'
  | 'SESSION_JWT_SECRET';

type Config = {
  port: number;
  googleClientId: string;
  gcpProjectId: string;
  session: {
    cookieName: string;
    jwtSecret: string;
    expiresInSeconds: number;
  };
  cors: {
    origins: string[];
  };
  environment: string;
  isProduction: boolean;
};

const ensureEnv = (key: RequiredEnvKey): string => {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
};

const parseOrigins = (rawOrigins?: string): string[] => {
  if (!rawOrigins) {
    return ['http://localhost:5173'];
  }
  return rawOrigins
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
};

export const config: Config = {
  port: Number.parseInt(process.env.PORT ?? '4000', 10),
  googleClientId: ensureEnv('GOOGLE_CLIENT_ID'),
  gcpProjectId: ensureEnv('GCP_PROJECT_ID'),
  session: {
    cookieName: process.env.SESSION_COOKIE_NAME ?? 'session_token',
    jwtSecret: ensureEnv('SESSION_JWT_SECRET'),
    expiresInSeconds: Number.parseInt(process.env.SESSION_EXPIRES_IN ?? `${60 * 60 * 24 * 7}`, 10),
  },
  cors: {
    origins: parseOrigins(process.env.WEB_APP_ORIGINS),
  },
  environment: process.env.NODE_ENV ?? 'development',
  isProduction: (process.env.NODE_ENV ?? 'development') === 'production',
};
