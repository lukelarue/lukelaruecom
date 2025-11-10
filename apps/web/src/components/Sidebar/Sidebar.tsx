import { NavLink } from 'react-router-dom';
import { clsx } from 'clsx';
import { useAuthContext } from '@/hooks/useAuthContext';
import { ChatSidebar } from '@/components/Chat/ChatSidebar';

export const Sidebar = () => {
  const { session, signOut, loading } = useAuthContext();

  return (
    <div className="flex h-full flex-col">
      <header className="border-b border-zinc-800 px-4 py-4">
        <div className="flex items-center gap-2">
          <img src="/favicon.png" alt="LukeLaRue" className="h-6 w-6 rounded-sm" />
          <h2 className="text-lg font-semibold">Chat</h2>
        </div>
        <p className="text-xs text-zinc-400">Real-time lobby coming soon</p>
      </header>
      <div className="flex-1 overflow-y-auto px-4 py-6">
        <nav className="flex flex-col gap-2">
          {!session ? <SidebarLink to="/" label="Home" /> : null}
          <SidebarLink to="/lobby" label="Lobby" disabled={!session} />
          <SidebarLink to="/profile" label="Profile" disabled={!session} />
        </nav>
        <div className="mt-6">
          <ChatSidebar />
        </div>
      </div>
      <footer className="border-t border-zinc-800 px-4 py-4 text-sm text-zinc-300">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            {session?.user.pictureUrl ? (
              <img
                src={session.user.pictureUrl}
                alt={session.user.name}
                className="h-10 w-10 rounded-full border border-zinc-700"
              />
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-800 text-base font-semibold uppercase text-zinc-200">
                {session?.user.name?.[0] ?? '?'}
              </div>
            )}
            <div className="leading-tight">
              <p className="font-medium">{session?.user.name ?? 'Guest'}</p>
              <p className="text-xs text-zinc-400">{session?.user.email ?? 'Not signed in'}</p>
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
              {loading ? 'Signing out…' : 'Sign out'}
            </button>
          ) : null}
        </div>
        {session ? (
          <div className="mt-3 text-xs text-zinc-400">
            <div>
              Signed in as <span className="text-zinc-300">{session.user.email}</span>
            </div>
            {session.user.lastLoginAt ? (
              <div>Last login: {new Date(session.user.lastLoginAt).toLocaleString()}</div>
            ) : null}
          </div>
        ) : null}
      </footer>
    </div>
  );
};

type SidebarLinkProps = {
  to: string;
  label: string;
  disabled?: boolean;
};

const SidebarLink = ({ to, label, disabled = false }: SidebarLinkProps) => {
  if (disabled) {
    return (
      <span className="cursor-not-allowed rounded-lg border border-dashed border-zinc-800 bg-zinc-900/40 px-3 py-2 text-sm text-zinc-600">
        {label}
      </span>
    );
  }

  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        clsx('rounded-lg px-3 py-2 text-sm transition',
          isActive ? 'bg-brand text-zinc-950 font-semibold' : 'text-zinc-400 hover:bg-zinc-900/80 hover:text-zinc-100'
        )
      }
    >
      {label}
    </NavLink>
  );
};
