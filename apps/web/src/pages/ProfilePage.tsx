import { useEffect, useState } from 'react';
import { useAuthContext } from '@/hooks/useAuthContext';
import { env } from '@/utils/env';

type MinesweeperStats = {
  totals: {
    played: number;
    wins: number;
    losses: number;
    aborts: number;
    winPct: number;
  };
  byOption: {
    key: string;
    board_width: number;
    board_height: number;
    num_mines: number;
    played: number;
    wins: number;
    losses: number;
    aborts: number;
    winPct: number;
  }[];
};

/** Profile content component for embedding in LobbyPage */
export const ProfileContent = () => {
  const { session } = useAuthContext();
  const [stats, setStats] = useState<MinesweeperStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [statsError, setStatsError] = useState<string | null>(null);

  useEffect(() => {
    if (!session) {
      return;
    }
    if (!env.minesweeperUrl) {
      setStatsError('Minesweeper is not configured.');
      return;
    }
    const userEmail = session.user.email;
    const userId = session.user.id;
    const userKey = userEmail || userId;
    if (!userKey) {
      setStatsError('Missing user identifier for stats.');
      return;
    }
    let cancelled = false;
    const fetchStats = async () => {
      setStatsLoading(true);
      setStatsError(null);
      try {
        const base = env.minesweeperUrl.replace(/\/$/, '');
        const res = await fetch(`${base}/api/minesweeper/stats`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'X-User-Id': userKey,
          },
        });
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }
        const data = (await res.json()) as MinesweeperStats;
        if (!cancelled) {
          setStats(data);
        }
      } catch (_err) {
        if (!cancelled) {
          setStatsError('Unable to load Minesweeper stats.');
        }
      } finally {
        if (!cancelled) {
          setStatsLoading(false);
        }
      }
    };
    fetchStats();
    return () => {
      cancelled = true;
    };
  }, [session]);

  if (!session) {
    return null;
  }

  const firstInitial = session.user.name?.[0]?.toUpperCase() ?? session.user.email[0]?.toUpperCase() ?? '?';

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-10">
      <header className="flex flex-col gap-4">
        <h1 className="text-3xl font-semibold text-zinc-100">Your Profile</h1>
        <p className="text-sm text-zinc-400">Manage your personal information and gaming identity.</p>
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
            <h3 className="text-lg font-semibold text-zinc-200">Minesweeper stats</h3>
            {!env.minesweeperUrl ? (
              <p className="mt-2 text-sm text-zinc-400">Minesweeper is not configured for this environment.</p>
            ) : statsLoading ? (
              <p className="mt-2 text-sm text-zinc-400">Loading stats...</p>
            ) : statsError ? (
              <p className="mt-2 text-sm text-red-400">{statsError}</p>
            ) : !stats ? (
              <p className="mt-2 text-sm text-zinc-400">No stats available yet. Play a game to get started.</p>
            ) : (
              <div className="mt-3 flex flex-col gap-3 text-sm text-zinc-300">
                <div className="flex flex-wrap gap-4 text-xs sm:text-sm">
                  <div>
                    <span className="text-zinc-400">Games played: </span>
                    <span className="font-medium text-zinc-100">{stats.totals.played}</span>
                  </div>
                  <div>
                    <span className="text-zinc-400">Wins: </span>
                    <span className="font-medium text-emerald-400">{stats.totals.wins}</span>
                  </div>
                  <div>
                    <span className="text-zinc-400">Losses: </span>
                    <span className="font-medium text-rose-400">{stats.totals.losses}</span>
                  </div>
                  <div>
                    <span className="text-zinc-400">Aborts: </span>
                    <span className="font-medium text-amber-400">{stats.totals.aborts}</span>
                  </div>
                  <div>
                    <span className="text-zinc-400">Win rate: </span>
                    <span className="font-medium text-zinc-100">{(stats.totals.winPct * 100).toFixed(1)}%</span>
                  </div>
                </div>
                {stats.byOption.length > 0 && (
                  <div className="mt-2 space-y-1 text-xs text-zinc-400">
                    <p className="font-medium text-zinc-300">By board configuration</p>
                    <div className="max-h-40 space-y-1 overflow-auto pr-1">
                      {stats.byOption.map((opt) => (
                        <div key={opt.key} className="flex flex-wrap items-baseline justify-between gap-2 rounded-lg bg-zinc-900/70 px-2 py-1">
                          <div className="text-zinc-300">
                            {opt.board_width}×{opt.board_height}, {opt.num_mines} mines
                          </div>
                          <div className="flex flex-wrap gap-3 text-[11px]">
                            <span>Played {opt.played}</span>
                            <span className="text-emerald-400">W {opt.wins}</span>
                            <span className="text-rose-400">L {opt.losses}</span>
                            <span className="text-amber-400">A {opt.aborts}</span>
                            <span>{(opt.winPct * 100).toFixed(1)}%</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
};

/** Standalone page wrapper - kept for backwards compatibility */
export const ProfilePage = () => <ProfileContent />;
