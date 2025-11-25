import { useEffect } from 'react';
import { GoogleLogin } from '@react-oauth/google';
import { useNavigate } from 'react-router-dom';
import { LoadingScreen } from '@/components/LoadingScreen';
import { useAuthContext } from '@/hooks/useAuthContext';
import { env } from '@/utils/env';

export const HomePage = () => {
  const navigate = useNavigate();
  const { session, loading, error, loginWithCredential } = useAuthContext();

  useEffect(() => {
    if (session) {
      navigate('/lobby', { replace: true });
    }
  }, [session, navigate]);

  // Only show Google sign-in before login
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-950">
      <div className="flex flex-col items-center gap-4">
        {/* Logo above sign in button */}
        <img
          src="/favicon.png"
          alt="Logo"
          className="h-24 w-24"
        />
        {env.authMock ? (
          <button
            type="button"
            onClick={() => {
              void loginWithCredential('mock-credential');
            }}
            className="flex items-center justify-center rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand/90"
          >
            Sign in (mock)
          </button>
        ) : env.googleLoginMock ? (
          <button
            type="button"
            onClick={() => {
              void loginWithCredential(env.fakeGoogleCredential);
            }}
            className="flex items-center justify-center rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand/90"
          >
            Sign in (emulator)
          </button>
        ) : (
          <GoogleLogin
            onSuccess={(response) => {
              if (!response.credential) {
                return;
              }
              void loginWithCredential(response.credential);
            }}
            onError={() => {
              // eslint-disable-next-line no-console
              console.error('Google Sign-In failed');
            }}
          />
        )}
        {loading ? <LoadingScreen message="Authenticating" className="h-24 rounded-xl" /> : null}
        {error ? <p className="text-sm text-rose-400">{error}</p> : null}
      </div>
    </div>
  );
};
