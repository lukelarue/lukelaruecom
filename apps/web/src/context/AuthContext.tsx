import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { fetchCurrentSession, loginWithGoogleIdToken, signOut as signOutRequest } from '@/services/auth';
import type { AuthSession } from '@/types';
import { env } from '@/utils/env';
import { AuthContext, type AuthContextValue } from './AuthContext.shared';
const LOCAL_STORAGE_KEY = 'lukelarue.auth.session';

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [bootstrapped, setBootstrapped] = useState(false);

  const mockSession: AuthSession = useMemo(
    () => ({
      user: {
        id: 'mock-user',
        email: 'mock.user@example.com',
        name: 'Mock User',
      },
      token: 'mock-token',
    }),
    []
  );

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
    if (bootstrapped) {
      return;
    }

    let isActive = true;

    const bootstrap = async () => {
      if (env.authMock) {
        if (isActive) {
          setLoading(false);
          setBootstrapped(true);
        }
        return;
      }

      setLoading(true);

      try {
        const remoteSession = await fetchCurrentSession();

        if (!isActive) {
          return;
        }

        if (remoteSession) {
          setSession(remoteSession);
        } else {
          setSession(null);
          setError(null);
        }
      } catch (err) {
        if (!isActive) {
          return;
        }

        const message = err instanceof Error ? err.message : 'Failed to load session';
        setError(message);
        setSession(null);
      } finally {
        if (isActive) {
          setLoading(false);
          setBootstrapped(true);
        }
      }
    };

    void bootstrap();

    return () => {
      isActive = false;
    };
  }, [bootstrapped]);

  const loginWithCredential = useCallback(async (credential: string) => {
    setLoading(true);
    setError(null);
    try {
      if (env.authMock) {
        setSession(mockSession);
        setLoading(false);
        setBootstrapped(true);
        return;
      }
      const authSession = await loginWithGoogleIdToken(credential);
      setSession(authSession);
      setBootstrapped(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown authentication error';
      setError(message);
      setSession(null);
    } finally {
      setLoading(false);
      setBootstrapped(true);
    }
  }, [mockSession]);

  const signOut = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (!env.authMock) {
        await signOutRequest();
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to sign out';
      setError(message);
    } finally {
      setSession(null);
      setLoading(false);
      setBootstrapped(true);
    }
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ session, loading, bootstrapped, error, loginWithCredential, signOut }),
    [session, loading, bootstrapped, error, loginWithCredential, signOut]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export { AuthContext } from './AuthContext.shared';
export type { AuthContextValue } from './AuthContext.shared';
