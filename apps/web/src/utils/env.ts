const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? '/api';
const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID ?? '';
const authMock = import.meta.env.VITE_AUTH_MOCK
  ? import.meta.env.VITE_AUTH_MOCK === 'true'
  : import.meta.env.DEV;

export const env = {
  apiBaseUrl,
  googleClientId,
  authMock,
};
