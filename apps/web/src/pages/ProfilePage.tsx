import { MainLayout } from '@/components/Layout/MainLayout';
import { useAuthContext } from '@/hooks/useAuthContext';

export const ProfilePage = () => {
  const { session } = useAuthContext();

  if (!session) {
    return null;
  }

  const firstInitial = session.user.name?.[0]?.toUpperCase() ?? session.user.email[0]?.toUpperCase() ?? '?';

  return (
    <MainLayout>
      <div className="mx-auto flex max-w-3xl flex-col gap-10">
        <header className="flex flex-col gap-4">
          <h1 className="text-3xl font-semibold text-white">Your Profile</h1>
          <p className="text-sm text-slate-400">Manage your personal information and upcoming gaming identity.</p>
        </header>
        <section className="flex flex-col gap-6 rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-lg">
          <div className="flex items-center gap-6">
            {session.user.pictureUrl ? (
              <img
                src={session.user.pictureUrl}
                alt={session.user.name}
                className="h-20 w-20 rounded-full border border-slate-700"
              />
            ) : (
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-brand text-3xl font-bold text-slate-50">
                {firstInitial}
              </div>
            )}
            <div>
              <h2 className="text-2xl font-semibold text-slate-100">{session.user.name}</h2>
              <p className="text-sm text-slate-400">{session.user.email}</p>
              <p className="mt-2 text-xs text-slate-500">
                Joined {session.user.createdAt ? new Date(session.user.createdAt).toLocaleDateString() : 'recently'}
              </p>
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
              <h3 className="text-lg font-semibold text-slate-200">Account status</h3>
              <p className="mt-2 text-sm text-slate-400">Last login: {session.user.lastLoginAt ? new Date(session.user.lastLoginAt).toLocaleString() : 'Unknown'}</p>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
              <h3 className="text-lg font-semibold text-slate-200">Coming soon</h3>
              <p className="mt-2 text-sm text-slate-400">Game stats, achievements, and profile customization tools.</p>
            </div>
          </div>
        </section>
      </div>
    </MainLayout>
  );
};
