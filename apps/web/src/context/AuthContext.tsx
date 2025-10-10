import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { fetchCurrentSession, loginWithGoogleIdToken, signOut as signOutRequest } from '@/services/auth';
import type { AuthSession } from '@/types';

export type AuthContextValue = {
  session: AuthSession | null;
  loading: boolean;
  error: string | null;
  loginWithCredential: (credential: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);
const LOCAL_STORAGE_KEY = 'lukelarue.auth.session';

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const cached = window.localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!cached) {
      return;
    }

    try {
      const parsed = JSON.parse(cached) as AuthSession;
      setSession(parsed);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn('Failed to parse stored auth session', err);
      window.localStorage.removeItem(LOCAL_STORAGE_KEY);
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    if (session) {
      window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(session));
    } else {
      window.localStorage.removeItem(LOCAL_STORAGE_KEY);
    }
  }, [session]);

  useEffect(() => {
    if (session) {
      return;
    }

    let cancelled = false;

    const bootstrap = async () => {
      setLoading(true);
      try {
        const remoteSession = await fetchCurrentSession();
        if (!cancelled && remoteSession) {
          setSession(remoteSession);
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load session';
        if (!cancelled) {
          setError(message);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void bootstrap();

    return () => {
      cancelled = true;
    };
  }, [session]);

  const loginWithCredential = useCallback(async (credential: string) => {
    setLoading(true);
    setError(null);
    try {
      const authSession = await loginWithGoogleIdToken(credential);
      setSession(authSession);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown authentication error';
      setError(message);
      setSession(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const signOut = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await signOutRequest();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to sign out';
      setError(message);
    } finally {
      setSession(null);
      setLoading(false);
    }
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ session, loading, error, loginWithCredential, signOut }),
    [session, loading, error, loginWithCredential, signOut]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuthContext = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return context;
};
