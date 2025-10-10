import { Firestore } from '@google-cloud/firestore';
import { config } from '../config';

let firestoreClient: Firestore | null = null;

export const getFirestore = (): Firestore => {
  if (!firestoreClient) {
    firestoreClient = new Firestore({
      projectId: config.gcpProjectId,
    });
  }

  return firestoreClient;
};
