import { Firestore } from '@google-cloud/firestore';

import { config } from '../config.js';

let firestoreClient: Firestore | null = null;

export const getFirestore = (): Firestore => {
  if (!firestoreClient) {
    if (config.dev.useFirestoreEmulator && !process.env.FIRESTORE_EMULATOR_HOST) {
      process.env.FIRESTORE_EMULATOR_HOST = config.dev.firestoreEmulatorHost;
    }

    firestoreClient = new Firestore({
      projectId: config.gcpProjectId,
    });

    firestoreClient.settings({
      ignoreUndefinedProperties: true,
    });
  }

  return firestoreClient;
};

export type GetFirestore = typeof getFirestore;
