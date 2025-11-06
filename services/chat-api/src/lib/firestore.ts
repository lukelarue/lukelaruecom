import { Firestore } from '@google-cloud/firestore';

import { config } from '../config.js';

let firestoreClient: Firestore | null = null;

export const getFirestore = (): Firestore => {
  if (!firestoreClient) {
    if (config.dev.useFirestoreEmulator && !process.env.FIRESTORE_EMULATOR_HOST) {
      process.env.FIRESTORE_EMULATOR_HOST = config.dev.firestoreEmulatorHost;
    }

    // Use the latest env value to avoid cached project IDs across test files
    const projectId = process.env.GCP_PROJECT_ID ?? config.gcpProjectId;
    firestoreClient = new Firestore({ projectId });

    firestoreClient.settings({
      ignoreUndefinedProperties: true,
    });
  }

  return firestoreClient;
};

// Test-only utility to reset the cached client between test files
export const resetFirestoreForTests = (): void => {
  firestoreClient = null;
};

export type GetFirestore = typeof getFirestore;
