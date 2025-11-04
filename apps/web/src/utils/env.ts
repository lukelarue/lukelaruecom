const loginApiBaseUrl = import.meta.env.VITE_LOGIN_API_BASE_URL ?? '/login-api';
const chatApiBaseUrl = import.meta.env.VITE_CHAT_API_BASE_URL ?? '/chat-api';
const googleClientId = (import.meta.env.VITE_GOOGLE_CLIENT_ID ?? '').trim();

const resolveAuthMode = (): 'frontend-mock' | 'backend' => {
  if (import.meta.env.VITEST) {
    return 'backend';
  }

  const modeHint = import.meta.env.MODE;
  if (modeHint === 'backend') {
    return 'backend';
  }
  if (modeHint === 'frontend-mock') {
    return 'frontend-mock';
  }

  const explicitMode = import.meta.env.VITE_AUTH_MODE;
  if (explicitMode === 'backend') {
    return 'backend';
  }
  if (explicitMode === 'frontend-mock') {
    return 'frontend-mock';
  }

  const legacyAuthMock = import.meta.env.VITE_AUTH_MOCK;
  if (legacyAuthMock === 'true') {
    return 'frontend-mock';
  }
  if (legacyAuthMock === 'false') {
    return 'backend';
  }

  return import.meta.env.DEV ? 'frontend-mock' : 'backend';
};

const authMode = resolveAuthMode();
const authMock = authMode === 'frontend-mock';

const googleLoginMockEnv = import.meta.env.VITE_GOOGLE_LOGIN_MOCK;
const googleLoginMock = googleLoginMockEnv ? googleLoginMockEnv === 'true' : import.meta.env.DEV;

const fakeGoogleCredential =
  import.meta.env.VITE_FAKE_GOOGLE_CREDENTIAL ?? '{"email":"dev-user@example.com","name":"Dev User"}';

export const env = {
  loginApiBaseUrl,
  chatApiBaseUrl,
  googleClientId,
  authMode,
  authMock,
  googleLoginMock,
  fakeGoogleCredential,
};
