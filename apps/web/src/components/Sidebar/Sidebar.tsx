import { useAuthContext } from '@/hooks/useAuthContext';
import { ChatSidebar } from '@/components/Chat/ChatSidebar';

export const Sidebar = () => {
  const { session, signOut, loading } = useAuthContext();

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 overflow-hidden px-4 py-4">
        <ChatSidebar />
      </div>
      <footer className="border-t border-zinc-800 px-4 py-3 text-sm text-zinc-300">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            {session?.user.pictureUrl ? (
              <img
                src={session.user.pictureUrl}
                alt={session.user.name}
                className="h-8 w-8 rounded-full border border-zinc-700"
              />
            ) : (
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-800 text-sm font-semibold uppercase text-zinc-200">
                {session?.user.name?.[0] ?? '?'}
              </div>
            )}
            <div className="leading-tight">
              <p className="text-sm font-medium">{session?.user.name ?? 'Guest'}</p>
              <p className="text-xs text-zinc-500">{session?.user.email ?? 'Not signed in'}</p>
            </div>
          </div>
          {session ? (
            <button
              type="button"
              onClick={() => {
                void signOut();
              }}
              disabled={loading}
              className="rounded-full bg-zinc-800 px-3 py-1 text-xs font-medium text-zinc-200 transition hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? '…' : 'Sign out'}
            </button>
          ) : null}
        </div>
      </footer>
    </div>
  );
};
