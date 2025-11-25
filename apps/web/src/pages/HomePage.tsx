import { useEffect } from 'react';
import { useGoogleLogin } from '@react-oauth/google';
import { useNavigate } from 'react-router-dom';
import { LoadingScreen } from '@/components/LoadingScreen';
import { useAuthContext } from '@/hooks/useAuthContext';
import { env } from '@/utils/env';

// Google "G" logo SVG
const GoogleLogo = () => (
  <svg className="h-5 w-5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      fill="#4285F4"
    />
    <path
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      fill="#34A853"
    />
    <path
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      fill="#FBBC05"
    />
    <path
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      fill="#EA4335"
    />
  </svg>
);

// Separate component for real Google login (requires GoogleOAuthProvider)
const RealGoogleLoginButton = ({ onLogin }: { onLogin: (credential: string) => void }) => {
  const googleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      try {
        const res = await fetch(
          `https://www.googleapis.com/oauth2/v3/userinfo?access_token=${tokenResponse.access_token}`
        );
        const userInfo = await res.json();
        onLogin(JSON.stringify(userInfo));
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('Failed to get user info:', err);
      }
    },
    onError: () => {
      // eslint-disable-next-line no-console
      console.error('Google Sign-In failed');
    },
  });

  return (
    <button
      type="button"
      onClick={() => googleLogin()}
      className="flex items-center justify-center gap-3 rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-zinc-800 transition hover:bg-zinc-100"
    >
      <GoogleLogo />
      Sign in with Google
    </button>
  );
};

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
            className="flex items-center justify-center gap-3 rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-zinc-800 transition hover:bg-zinc-100"
          >
            <GoogleLogo />
            Sign in with Google
          </button>
        ) : env.googleLoginMock ? (
          <button
            type="button"
            onClick={() => {
              void loginWithCredential(env.fakeGoogleCredential);
            }}
            className="flex items-center justify-center gap-3 rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-zinc-800 transition hover:bg-zinc-100"
          >
            <GoogleLogo />
            Sign in with Google
          </button>
        ) : (
          <RealGoogleLoginButton onLogin={(credential) => void loginWithCredential(credential)} />
        )}
        {loading ? <LoadingScreen message="Authenticating" className="h-24 rounded-xl" /> : null}
        {error ? <p className="text-sm text-rose-400">{error}</p> : null}
      </div>
    </div>
  );
};
