import dotenv from 'dotenv';

dotenv.config();

type RequiredEnvKey = 'GOOGLE_CLIENT_ID' | 'GCP_PROJECT_ID';

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
  dev: {
    useFirestoreEmulator: boolean;
    firestoreEmulatorHost: string;
    useFakeGoogleAuth: boolean;
  };
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

const parseBoolean = (rawValue: string | undefined, defaultValue = false): boolean => {
  if (rawValue === undefined) {
    return defaultValue;
  }

  return ['1', 'true', 'yes', 'on'].includes(rawValue.toLowerCase());
};

const devFlags = {
  useFirestoreEmulator: parseBoolean(process.env.USE_FIRESTORE_EMULATOR),
  firestoreEmulatorHost: process.env.FIRESTORE_EMULATOR_HOST ?? 'localhost:8080',
  useFakeGoogleAuth: parseBoolean(process.env.USE_FAKE_GOOGLE_AUTH),
} as const;

const sessionJwtSecret = process.env.SESSION_JWT_SECRET ?? (devFlags.useFakeGoogleAuth ? 'dev-session-secret' : undefined);

if (!sessionJwtSecret) {
  throw new Error('Missing required environment variable: SESSION_JWT_SECRET');
}

export const config: Config = {
  port: Number.parseInt(process.env.PORT ?? '4000', 10),
  googleClientId: devFlags.useFakeGoogleAuth
    ? process.env.GOOGLE_CLIENT_ID ?? 'fake-google-client-id'
    : ensureEnv('GOOGLE_CLIENT_ID'),
  gcpProjectId: devFlags.useFirestoreEmulator ? process.env.GCP_PROJECT_ID ?? 'demo-firestore' : ensureEnv('GCP_PROJECT_ID'),
  session: {
    cookieName: process.env.SESSION_COOKIE_NAME ?? 'session_token',
    jwtSecret: sessionJwtSecret,
    expiresInSeconds: Number.parseInt(process.env.SESSION_EXPIRES_IN ?? `${60 * 60 * 24 * 7}`, 10),
  },
  cors: {
    origins: parseOrigins(process.env.WEB_APP_ORIGINS),
  },
  environment: process.env.NODE_ENV ?? 'development',
  isProduction: (process.env.NODE_ENV ?? 'development') === 'production',
  dev: devFlags,
};
