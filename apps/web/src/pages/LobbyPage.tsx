import { MainLayout } from '@/components/Layout/MainLayout';
import { useAuthContext } from '@/hooks/useAuthContext';

export const LobbyPage = () => {
  const { session } = useAuthContext();

  return (
    <MainLayout>
      <div className="flex flex-col gap-8">
        <header className="flex flex-col gap-2">
          <h1 className="text-3xl font-semibold text-zinc-100">Main Lobby</h1>
          <p className="text-sm text-zinc-400">
            Matchmaking, leaderboards, and featured games will be available here soon.
          </p>
        </header>
        <section className="grid gap-6 md:grid-cols-2">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6 shadow-lg">
            <h2 className="text-xl font-semibold">Your status</h2>
            <p className="mt-2 text-sm text-zinc-400">
              Signed in as <span className="font-medium text-zinc-200">{session?.user.email}</span>.
            </p>
            <p className="mt-2 text-sm text-zinc-500">
              Last login: {session?.user.lastLoginAt ? new Date(session.user.lastLoginAt).toLocaleString() : 'Unknown'}
            </p>
          </div>
          <div className="rounded-2xl border border-dashed border-zinc-800 bg-zinc-900/30 p-6">
            <h2 className="text-lg font-semibold text-zinc-200">Next tasks</h2>
            <ul className="mt-3 flex flex-col gap-2 text-sm text-zinc-400">
              <li>Invite friends to your lobby.</li>
              <li>Join upcoming tournaments.</li>
              <li>Customize your profile badge.</li>
            </ul>
          </div>
        </section>
      </div>
    </MainLayout>
  );
};
