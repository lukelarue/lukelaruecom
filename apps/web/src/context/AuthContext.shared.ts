import { createContext } from 'react';
import type { AuthSession } from '@/types';

export type AuthContextValue = {
  session: AuthSession | null;
  loading: boolean;
  error: string | null;
  loginWithCredential: (credential: string) => Promise<void>;
  signOut: () => Promise<void>;
};

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);
