import axios from 'axios';
import { env } from '@/utils/env';
import type { AuthSession } from '@/types';

const client = axios.create({
  baseURL: env.loginApiBaseUrl,
  withCredentials: true,
});

export const loginWithGoogleIdToken = async (credential: string): Promise<AuthSession> => {
  const response = await client.post<AuthSession>('/auth/google', { credential });
  return response.data;
};

export const fetchCurrentSession = async (): Promise<AuthSession | null> => {
  try {
    const response = await client.get<AuthSession>('/auth/session');
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
