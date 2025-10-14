import { NavLink } from 'react-router-dom';
import { clsx } from 'clsx';
import { useAuthContext } from '@/context/AuthContext';

export const Sidebar = () => {
  const { session } = useAuthContext();

  return (
    <div className="flex h-full flex-col">
      <header className="border-b border-slate-800 px-4 py-4">
        <h2 className="text-lg font-semibold">Chat</h2>
        <p className="text-xs text-slate-400">Real-time lobby coming soon</p>
      </header>
      <div className="flex-1 overflow-y-auto px-4 py-6">
        <nav className="flex flex-col gap-2">
          <SidebarLink to="/" label="Home" />
          <SidebarLink to="/lobby" label="Lobby" disabled={!session} />
          <SidebarLink to="/profile" label="Profile" disabled={!session} />
          <SidebarLink to="/chat" label="Chat" disabled />
        </nav>
        <div className="mt-6 rounded-lg border border-dashed border-slate-800 bg-slate-900/60 p-4 text-sm text-slate-400">
          Chat messages will appear here once the realtime backend is implemented.
        </div>
      </div>
      <footer className="border-t border-slate-800 px-4 py-4 text-sm text-slate-300">
        <div className="flex items-center gap-3">
          {session?.user.pictureUrl ? (
            <img
              src={session.user.pictureUrl}
              alt={session.user.name}
              className="h-10 w-10 rounded-full border border-slate-700"
            />
          ) : (
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-800 text-base font-semibold uppercase text-slate-200">
              {session?.user.name?.[0] ?? '?'}
            </div>
          )}
          <div className="leading-tight">
            <p className="font-medium">{session?.user.name ?? 'Guest'}</p>
            <p className="text-xs text-slate-400">{session?.user.email ?? 'Not signed in'}</p>
          </div>
        </div>
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
      <span className="cursor-not-allowed rounded-lg border border-dashed border-slate-800 bg-slate-900/40 px-3 py-2 text-sm text-slate-600">
        {label}
      </span>
    );
  }

  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        clsx('rounded-lg px-3 py-2 text-sm transition',
          isActive ? 'bg-brand text-slate-950 font-semibold' : 'text-slate-400 hover:bg-slate-900/80 hover:text-slate-100'
        )
      }
    >
      {label}
    </NavLink>
  );
};
