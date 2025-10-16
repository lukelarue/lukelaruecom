const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? '/api';
const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID ?? '';

const resolveAuthMode = (): 'frontend-mock' | 'backend' => {
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
  apiBaseUrl,
  googleClientId,
  authMode,
  authMock,
  googleLoginMock,
  fakeGoogleCredential,
};
