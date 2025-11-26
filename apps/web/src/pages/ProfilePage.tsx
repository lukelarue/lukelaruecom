import { useEffect, useState, useMemo } from 'react';
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
    bestTimeMs: number | null;
  }[];
};

type LeaderboardEntry = {
  rank: number;
  user_id: string;
  user_name: string | null;
  time_ms: number;
  moves_count: number;
  completed_at: string;
};

type WinStatsEntry = {
  rank: number;
  user_id: string;
  user_name: string | null;
  wins: number;
  losses: number;
  played: number;
  win_pct: number;
};

type LeaderboardData = {
  mode: string;
  mode_name: string;
  board_width: number;
  board_height: number;
  num_mines: number;
  entries: LeaderboardEntry[];
};

type WinStatsData = {
  mode: string;
  mode_name: string;
  board_width: number;
  board_height: number;
  num_mines: number;
  entries: WinStatsEntry[];
};

const TRACKED_MODES = [
  { key: 'beginner', name: 'Beginner', width: 8, height: 8, mines: 10 },
  { key: 'intermediate', name: 'Intermediate', width: 16, height: 16, mines: 40 },
  { key: 'hard', name: 'Hard', width: 30, height: 16, mines: 99 },
  { key: 'extreme', name: 'Extreme', width: 30, height: 22, mines: 200 },
];

const isTrackedMode = (width: number, height: number, mines: number) =>
  TRACKED_MODES.some((m) => m.width === width && m.height === height && m.mines === mines);

type ProfileSection = 'stats' | 'leaderboards';
type GameToggle = 'minesweeper' | 'losiento';
type LeaderboardTab = 'wins' | 'fastest';

const GameToggleButton = ({
  game,
  selected,
  onClick,
}: {
  game: GameToggle;
  selected: boolean;
  onClick: () => void;
}) => {
  const isMinesweeper = game === 'minesweeper';
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        background: isMinesweeper
          ? `repeating-linear-gradient(45deg, #27272a, #27272a 4px, #18181b 4px, #18181b 8px)`
          : 'linear-gradient(to right, #006847 0%, #006847 33%, #ffffff 33%, #ffffff 66%, #ce1126 66%, #ce1126 100%)',
        boxShadow: selected ? '0 0 20px 4px rgba(103, 28, 28, 0.7)' : undefined,
      }}
      className={
        'flex h-10 w-24 shrink-0 items-center justify-center rounded-lg border text-xs transition-all duration-200 ' +
        (isMinesweeper
          ? selected
            ? 'border-zinc-700 text-zinc-200 font-semibold'
            : 'border-zinc-800 text-zinc-400 hover:border-zinc-700'
          : selected
            ? 'border-zinc-700 text-yellow-400 font-semibold'
            : 'border-zinc-800 text-yellow-600 hover:border-zinc-700')
      }
      aria-pressed={selected}
    >
      {isMinesweeper ? 'Minesweeper' : '¡Lo Siento!'}
    </button>
  );
};

const formatTime = (ms: number) => {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (minutes > 0) {
    return `${minutes}m ${secs}s`;
  }
  return `${secs}.${Math.floor((ms % 1000) / 100)}s`;
};

/** Profile content component for embedding in LobbyPage */
export const ProfileContent = () => {
  const { session } = useAuthContext();
  const [stats, setStats] = useState<MinesweeperStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [statsError, setStatsError] = useState<string | null>(null);
  const [section, setSection] = useState<ProfileSection>('stats');
  const [statsGame, setStatsGame] = useState<GameToggle>('minesweeper');
  const [leaderboardGame, setLeaderboardGame] = useState<GameToggle>('minesweeper');
  const [leaderboards, setLeaderboards] = useState<Record<string, LeaderboardData>>({});
  const [winStats, setWinStats] = useState<Record<string, WinStatsData>>({});
  const [leaderboardsLoading, setLeaderboardsLoading] = useState(false);
  const [leaderboardTab, setLeaderboardTab] = useState<LeaderboardTab>('wins');

  const userKey = useMemo(() => {
    if (!session) return null;
    return session.user.email || session.user.id;
  }, [session]);

  // Fetch minesweeper stats
  useEffect(() => {
    if (!session || !userKey) return;
    if (!env.minesweeperUrl) {
      setStatsError('Minesweeper is not configured.');
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
          headers: { 'Content-Type': 'application/json', 'X-User-Id': userKey },
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = (await res.json()) as MinesweeperStats;
        if (!cancelled) setStats(data);
      } catch {
        if (!cancelled) setStatsError('Unable to load Minesweeper stats.');
      } finally {
        if (!cancelled) setStatsLoading(false);
      }
    };
    fetchStats();
    return () => { cancelled = true; };
  }, [session, userKey]);

  // Fetch leaderboards and win stats when leaderboards section is active
  useEffect(() => {
    if (section !== 'leaderboards' || leaderboardGame !== 'minesweeper') return;
    if (!env.minesweeperUrl) return;
    let cancelled = false;
    const fetchLeaderboards = async () => {
      setLeaderboardsLoading(true);
      const base = env.minesweeperUrl.replace(/\/$/, '');
      const fastestResults: Record<string, LeaderboardData> = {};
      const winsResults: Record<string, WinStatsData> = {};
      for (const mode of TRACKED_MODES) {
        try {
          const [fastestRes, winsRes] = await Promise.all([
            fetch(`${base}/api/minesweeper/leaderboard?mode=${mode.key}&limit=10`),
            fetch(`${base}/api/minesweeper/leaderboard/wins?mode=${mode.key}&limit=10`),
          ]);
          if (fastestRes.ok) {
            fastestResults[mode.key] = await fastestRes.json();
          }
          if (winsRes.ok) {
            winsResults[mode.key] = await winsRes.json();
          }
        } catch {
          // Skip failed fetches
        }
      }
      if (!cancelled) {
        setLeaderboards(fastestResults);
        setWinStats(winsResults);
        setLeaderboardsLoading(false);
      }
    };
    fetchLeaderboards();
    return () => { cancelled = true; };
  }, [section, leaderboardGame]);

  // Sort byOption by played descending (must be before early return)
  const sortedByOption = useMemo(() => {
    if (!stats?.byOption) return [];
    return [...stats.byOption].sort((a, b) => b.played - a.played);
  }, [stats?.byOption]);

  const visibleConfigs = 7;

  if (!session) return null;

  const firstInitial = session.user.name?.[0]?.toUpperCase() ?? session.user.email[0]?.toUpperCase() ?? '?';

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      {/* User Info Section */}
      <section className="flex flex-col gap-4 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 shadow-lg">
        <div className="flex items-center gap-5">
          {session.user.pictureUrl ? (
            <img
              src={session.user.pictureUrl}
              alt={session.user.name}
              className="h-16 w-16 rounded-full border border-zinc-700"
            />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-brand text-2xl font-bold text-zinc-50">
              {firstInitial}
            </div>
          )}
          <div className="flex-1">
            <h2 className="text-xl font-semibold text-zinc-100">{session.user.name}</h2>
            <p className="text-sm text-zinc-400">{session.user.email}</p>
            <div className="mt-1 flex flex-wrap gap-x-4 text-xs text-zinc-500">
              <span>Joined {session.user.createdAt ? new Date(session.user.createdAt).toLocaleDateString() : 'recently'}</span>
              <span>Last login: {session.user.lastLoginAt ? new Date(session.user.lastLoginAt).toLocaleString() : 'Unknown'}</span>
            </div>
          </div>
        </div>
      </section>

      {/* Section Tabs */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setSection('stats')}
          className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
            section === 'stats'
              ? 'bg-zinc-700 text-zinc-100'
              : 'bg-zinc-900 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-300'
          }`}
        >
          Personal Stats
        </button>
        <button
          type="button"
          onClick={() => setSection('leaderboards')}
          className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
            section === 'leaderboards'
              ? 'bg-zinc-700 text-zinc-100'
              : 'bg-zinc-900 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-300'
          }`}
        >
          Leaderboards
        </button>
      </div>

      {/* Personal Stats Section */}
      {section === 'stats' && (
        <section className="flex flex-col gap-4 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 shadow-lg">
          <div className="flex items-center gap-3">
            <GameToggleButton game="minesweeper" selected={statsGame === 'minesweeper'} onClick={() => setStatsGame('minesweeper')} />
            <GameToggleButton game="losiento" selected={statsGame === 'losiento'} onClick={() => setStatsGame('losiento')} />
          </div>

          {statsGame === 'minesweeper' ? (
            <div className="flex flex-col gap-4">
              {!env.minesweeperUrl ? (
                <p className="text-sm text-zinc-400">Minesweeper is not configured.</p>
              ) : statsLoading ? (
                <p className="text-sm text-zinc-400">Loading stats...</p>
              ) : statsError ? (
                <p className="text-sm text-red-400">{statsError}</p>
              ) : !stats ? (
                <p className="text-sm text-zinc-400">No stats available yet. Play a game to get started.</p>
              ) : (
                <>
                  {/* Totals */}
                  <div className="flex flex-wrap gap-4 text-sm">
                    <div className="rounded-lg bg-zinc-800/50 px-3 py-2">
                      <span className="text-zinc-400">Games Played: </span>
                      <span className="font-medium text-zinc-100">{stats.totals.played}</span>
                    </div>
                    <div className="rounded-lg bg-zinc-800/50 px-3 py-2">
                      <span className="text-zinc-400">Wins: </span>
                      <span className="font-medium text-emerald-400">{stats.totals.wins}</span>
                    </div>
                    <div className="rounded-lg bg-zinc-800/50 px-3 py-2">
                      <span className="text-zinc-400">Losses: </span>
                      <span className="font-medium text-rose-400">{stats.totals.losses}</span>
                    </div>
                    <div className="rounded-lg bg-zinc-800/50 px-3 py-2">
                      <span className="text-zinc-400">Aborts: </span>
                      <span className="font-medium text-amber-400">{stats.totals.aborts}</span>
                    </div>
                    <div className="rounded-lg bg-zinc-800/50 px-3 py-2">
                      <span className="text-zinc-400">Win rate: </span>
                      <span className="font-medium text-zinc-100">{(stats.totals.winPct * 100).toFixed(1)}%</span>
                    </div>
                  </div>

                  {/* By Configuration */}
                  {sortedByOption.length > 0 && (
                    <div className="flex flex-col gap-2">
                      <h4 className="text-sm font-medium text-zinc-300">By board configuration</h4>
                      <div className={`space-y-1 ${sortedByOption.length > visibleConfigs ? 'max-h-[210px] overflow-y-auto pr-1' : ''}`}>
                        {sortedByOption.map((opt) => (
                          <div key={opt.key} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-zinc-800/40 px-3 py-1.5 text-xs">
                            <div className="flex items-center gap-1.5 font-medium text-zinc-200">
                              <span>{opt.board_width}×{opt.board_height}, {opt.num_mines} mines</span>
                              {isTrackedMode(opt.board_width, opt.board_height, opt.num_mines) && (
                                <span className="relative group">
                                  <span className="text-yellow-500 cursor-help text-xs">🏆</span>
                                  <span className="absolute left-1/2 -translate-x-1/2 bottom-full mb-1 px-2 py-1 text-xs text-zinc-100 bg-zinc-700 rounded shadow-lg whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none z-10">
                                    Tracked in leaderboards
                                  </span>
                                </span>
                              )}
                            </div>
                            <div className="flex flex-wrap gap-3 text-zinc-400">
                              <span>{opt.played} Games</span>
                              <span className="text-emerald-400">W {opt.wins}</span>
                              <span className="text-rose-400">L {opt.losses}</span>
                              <span className="text-amber-400">A {opt.aborts}</span>
                              <span className="text-zinc-300">{(opt.winPct * 100).toFixed(1)}%</span>
                                              {opt.bestTimeMs != null && (
                                                <span className="text-sky-400">Best: {formatTime(opt.bestTimeMs)}</span>
                                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          ) : (
            <div className="py-8 text-center text-sm text-zinc-500">
              ¡Lo Siento! stats coming soon
            </div>
          )}
        </section>
      )}

      {/* Leaderboards Section */}
      {section === 'leaderboards' && (
        <section className="flex flex-col gap-4 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 shadow-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <GameToggleButton game="minesweeper" selected={leaderboardGame === 'minesweeper'} onClick={() => setLeaderboardGame('minesweeper')} />
              <GameToggleButton game="losiento" selected={leaderboardGame === 'losiento'} onClick={() => setLeaderboardGame('losiento')} />
            </div>
            {leaderboardGame === 'minesweeper' && (
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => setLeaderboardTab('wins')}
                  className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                    leaderboardTab === 'wins'
                      ? 'bg-zinc-700 text-zinc-100'
                      : 'bg-zinc-800/50 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-300'
                  }`}
                >
                  Wins
                </button>
                <button
                  type="button"
                  onClick={() => setLeaderboardTab('fastest')}
                  className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                    leaderboardTab === 'fastest'
                      ? 'bg-zinc-700 text-zinc-100'
                      : 'bg-zinc-800/50 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-300'
                  }`}
                >
                  Fastest Times
                </button>
              </div>
            )}
          </div>

          {leaderboardGame === 'minesweeper' ? (
            <div className="flex flex-col gap-4">
              {!env.minesweeperUrl ? (
                <p className="text-sm text-zinc-400">Minesweeper is not configured.</p>
              ) : leaderboardsLoading ? (
                <p className="text-sm text-zinc-400">Loading leaderboards...</p>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  {TRACKED_MODES.map((mode) => {
                    const lb = leaderboards[mode.key];
                    const ws = winStats[mode.key];
                    return (
                      <div key={mode.key} className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-3">
                        <h4 className="mb-2 text-sm font-semibold text-zinc-200">
                          {mode.name}
                          <span className="ml-2 font-normal text-zinc-500">
                            {mode.width}×{mode.height}, {mode.mines} mines
                          </span>
                        </h4>
                        {leaderboardTab === 'wins' ? (
                          !ws || ws.entries.length === 0 ? (
                            <p className="py-4 text-center text-xs text-zinc-500">No entries yet</p>
                          ) : (
                            <div className="space-y-1">
                              {ws.entries.slice(0, 5).map((entry) => (
                                <div
                                  key={`${entry.user_id}-${entry.rank}`}
                                  className={`flex items-center justify-between rounded px-2 py-1 text-xs ${
                                    entry.user_id === userKey ? 'bg-emerald-900/30 text-emerald-300' : 'bg-zinc-800/30 text-zinc-300'
                                  }`}
                                >
                                  <div className="flex items-center gap-2">
                                    <span className="w-4 text-right font-medium text-zinc-500">#{entry.rank}</span>
                                    <span className="truncate max-w-[100px]">{entry.user_name || entry.user_id.split('@')[0]}</span>
                                  </div>
                                  <div className="flex items-center gap-2 text-[10px]">
                                    <span className="text-emerald-400">{entry.wins}W</span>
                                    <span className="text-zinc-500">{entry.played}G</span>
                                    <span className="text-zinc-400">{(entry.win_pct * 100).toFixed(0)}%</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )
                        ) : (
                          !lb || lb.entries.length === 0 ? (
                            <p className="py-4 text-center text-xs text-zinc-500">No entries yet</p>
                          ) : (
                            <div className="space-y-1">
                              {lb.entries.slice(0, 5).map((entry) => (
                                <div
                                  key={`${entry.user_id}-${entry.rank}`}
                                  className={`flex items-center justify-between rounded px-2 py-1 text-xs ${
                                    entry.user_id === userKey ? 'bg-emerald-900/30 text-emerald-300' : 'bg-zinc-800/30 text-zinc-300'
                                  }`}
                                >
                                  <div className="flex items-center gap-2">
                                    <span className="w-4 text-right font-medium text-zinc-500">#{entry.rank}</span>
                                    <span className="truncate max-w-[120px]">{entry.user_name || entry.user_id.split('@')[0]}</span>
                                  </div>
                                  <span className="font-mono">{formatTime(entry.time_ms)}</span>
                                </div>
                              ))}
                            </div>
                          )
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            <div className="py-8 text-center text-sm text-zinc-500">
              ¡Lo Siento! leaderboards coming soon
            </div>
          )}
        </section>
      )}
    </div>
  );
};

/** Standalone page wrapper - kept for backwards compatibility */
export const ProfilePage = () => <ProfileContent />;
