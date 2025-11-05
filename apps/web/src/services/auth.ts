import axios from 'axios';
import { env } from '@/utils/env';
import type { AuthSession } from '@/types';

const client = axios.create({
  baseURL: env.loginApiBaseUrl,
  withCredentials: true,
});

const isAuthSession = (data: unknown): data is AuthSession => {
  if (!data || typeof data !== 'object') {
    return false;
  }
  const anyData = data as Record<string, unknown>;
  const user = anyData.user as Record<string, unknown> | undefined;
  return !!user && typeof user === 'object' && typeof user.id === 'string';
};

export const loginWithGoogleIdToken = async (credential: string): Promise<AuthSession> => {
  const response = await client.post<AuthSession>('/auth/google', { credential });
  if (!isAuthSession(response.data)) {
    throw new Error('Invalid authentication response');
  }
  return response.data;
};

export const fetchCurrentSession = async (): Promise<AuthSession | null> => {
  try {
    const response = await client.get<AuthSession>('/auth/session');
    const contentType = (response.headers?.['content-type'] ?? '').toString().toLowerCase();
    if (!contentType.includes('application/json')) {
      return null;
    }
    if (!isAuthSession(response.data)) {
      return null;
    }
    return response.data;
  } catch (error: unknown) {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      return null;
    }
    throw error;
  }
};

export const signOut = async (): Promise<void> => {
  try {
    await client.post('/auth/signout');
  } catch (error: unknown) {
    if (axios.isAxiosError(error) && error.response?.status === 404) {
      // Endpoint not yet implemented on backend; ignore.
      return;
    }
    throw error;
  }
};
