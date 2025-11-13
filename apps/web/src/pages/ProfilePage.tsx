import { useAuthContext } from '@/hooks/useAuthContext';

export const ProfilePage = () => {
  const { session } = useAuthContext();

  if (!session) {
    return null;
  }

  const firstInitial = session.user.name?.[0]?.toUpperCase() ?? session.user.email[0]?.toUpperCase() ?? '?';

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-10">
        <header className="flex flex-col gap-4">
          <h1 className="text-3xl font-semibold text-zinc-100">Your Profile</h1>
          <p className="text-sm text-zinc-400">Manage your personal information and upcoming gaming identity.</p>
        </header>
        <section className="flex flex-col gap-6 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6 shadow-lg">
          <div className="flex items-center gap-6">
            {session.user.pictureUrl ? (
              <img
                src={session.user.pictureUrl}
                alt={session.user.name}
                className="h-20 w-20 rounded-full border border-zinc-700"
              />
            ) : (
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-brand text-3xl font-bold text-zinc-50">
                {firstInitial}
              </div>
            )}
            <div>
              <h2 className="text-2xl font-semibold text-zinc-100">{session.user.name}</h2>
              <p className="text-sm text-zinc-400">{session.user.email}</p>
              <p className="mt-2 text-xs text-zinc-500">
                Joined {session.user.createdAt ? new Date(session.user.createdAt).toLocaleDateString() : 'recently'}
              </p>
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
              <h3 className="text-lg font-semibold text-zinc-200">Account status</h3>
              <p className="mt-2 text-sm text-zinc-400">Last login: {session.user.lastLoginAt ? new Date(session.user.lastLoginAt).toLocaleString() : 'Unknown'}</p>
            </div>
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
              <h3 className="text-lg font-semibold text-zinc-200">Coming soon</h3>
              <p className="mt-2 text-sm text-zinc-400">Game stats, achievements, and profile customization tools.</p>
            </div>
          </div>
        </section>
      </div>
  );
};
