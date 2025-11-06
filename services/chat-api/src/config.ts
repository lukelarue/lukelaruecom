import dotenv from 'dotenv';

dotenv.config();

type RequiredEnvKey = 'GCP_PROJECT_ID';

export type Config = {
  port: number;
  gcpProjectId: string;
  cors: {
    origins: string[];
  };
  environment: string;
  isProduction: boolean;
  defaultHistoryLimit: number;
  dev: {
    useFirestoreEmulator: boolean;
    firestoreEmulatorHost: string;
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

const parseNumber = (rawValue: string | undefined, defaultValue: number): number => {
  if (!rawValue) {
    return defaultValue;
  }

  const parsed = Number.parseInt(rawValue, 10);
  return Number.isFinite(parsed) ? parsed : defaultValue;
};

const defaultEmulator = (process.env.NODE_ENV ?? 'development') !== 'production';
const devFlags = {
  // In production, default to NOT using the emulator unless explicitly enabled
  useFirestoreEmulator: parseBoolean(process.env.USE_FIRESTORE_EMULATOR, defaultEmulator),
  firestoreEmulatorHost: process.env.FIRESTORE_EMULATOR_HOST ?? '127.0.0.1:8080',
} as const;

export const config: Config = {
  port: parseNumber(process.env.PORT, 4100),
  gcpProjectId: devFlags.useFirestoreEmulator
    ? process.env.GCP_PROJECT_ID ?? 'demo-firestore'
    : ensureEnv('GCP_PROJECT_ID'),
  cors: {
    origins: parseOrigins(process.env.WEB_APP_ORIGINS),
  },
  environment: process.env.NODE_ENV ?? 'development',
  isProduction: (process.env.NODE_ENV ?? 'development') === 'production',
  defaultHistoryLimit: parseNumber(process.env.DEFAULT_CHANNEL_HISTORY_LIMIT, 50),
  dev: devFlags,
};
