import { useEffect } from 'react';
import { GoogleLogin } from '@react-oauth/google';
import { useNavigate } from 'react-router-dom';
import { MainLayout } from '@/components/Layout/MainLayout';
import { LoadingScreen } from '@/components/LoadingScreen';
import { useAuthContext } from '@/hooks/useAuthContext';
import { env } from '@/utils/env';

export const HomePage = () => {
  const navigate = useNavigate();
  const { session, loading, error, loginWithCredential, signOut } = useAuthContext();

  useEffect(() => {
    if (session) {
      navigate('/lobby', { replace: true });
    }
  }, [session, navigate]);

  const firstName = session?.user.name?.split(' ')[0] ?? 'Player';

  return (
    <MainLayout>
      <div className="flex flex-col gap-12">
        <section className="flex flex-col gap-6">
          <div>
            <h1 className="text-3xl font-semibold text-white">LukeLaRue Gaming Lobby</h1>
            <p className="text-sm text-slate-400">
              Sign in with Google to save progress, chat with friends, and compete in upcoming games.
            </p>
          </div>
          {!session ? (
            <div className="max-w-md rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-lg">
              <h2 className="text-xl font-semibold">Join the lobby</h2>
              <p className="mt-2 text-sm text-slate-400">
                Use your Google account to access early features and get notified as new games launch.
              </p>
              <div className="mt-6 flex flex-col gap-3">
                {env.authMock ? (
                  <button
                    type="button"
                    onClick={() => {
                      void loginWithCredential('mock-credential');
                    }}
                    className="flex items-center justify-center rounded-md bg-brand px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-brand/90"
                  >
                    Sign in (mock)
                  </button>
                ) : env.googleLoginMock ? (
                  <button
                    type="button"
                    onClick={() => {
                      void loginWithCredential(env.fakeGoogleCredential);
                    }}
                    className="flex items-center justify-center rounded-md bg-brand px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-brand/90"
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
                {!loading ? (
                  <p className="text-xs text-slate-500">
                    Your Google profile will be stored securely in Firestore upon sign-in.
                  </p>
                ) : null}
                {error ? <p className="text-sm text-rose-400">{error}</p> : null}
              </div>
            </div>
          ) : (
            <div className="flex gap-6">
              <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-lg">
                <h2 className="text-xl font-semibold">Welcome back, {firstName}</h2>
                <p className="mt-2 text-sm text-slate-400">
                  Your profile is synced. Chat, multiplayer lobbies, and game stats will appear here soon.
                </p>
                <div className="mt-6 flex flex-wrap items-center gap-4">
                  <button
                    type="button"
                    onClick={() => {
                      void signOut();
                    }}
                    className="rounded-full bg-slate-800 px-4 py-2 text-sm font-medium text-slate-200 transition hover:bg-slate-700"
                  >
                    Sign out
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      navigate('/lobby');
                    }}
                    className="rounded-full border border-brand px-4 py-2 text-sm font-medium text-brand transition hover:bg-brand hover:text-slate-950"
                  >
                    Enter lobby
                  </button>
                  <div className="text-xs text-slate-500">
                    Signed in as
                    <div className="font-medium text-slate-300">{session.user.email}</div>
                  </div>
                </div>
              </div>
              <div className="flex flex-1 flex-col gap-4 rounded-2xl border border-dashed border-slate-800 bg-slate-900/30 p-6">
                <h3 className="text-lg font-medium text-slate-200">Upcoming features</h3>
                <ul className="flex flex-col gap-2 text-sm text-slate-400">
                  <li className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-brand" aria-hidden />
                    Multiplayer chat rooms powered by WebSockets.
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-brand" aria-hidden />
                    Game launcher with Minesweeper, chess, poker, and more.
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-brand" aria-hidden />
                    AI-powered coaching to help you improve your strategy.
                  </li>
                </ul>
              </div>
            </div>
          )}
        </section>
      </div>
    </MainLayout>
  );
};
