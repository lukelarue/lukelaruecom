import { useEffect, useMemo, useState } from 'react';
import { env } from '@/utils/env';

export const LobbyPage = () => {
  const games = useMemo(
    () => [
      { id: 'minesweeper', name: 'Minesweeper', url: env.minesweeperUrl, emoji: '💣' as const, logo: undefined as string | undefined },
      { id: 'chess', name: 'Chess', url: env.chessUrl, emoji: '♟️' as const, logo: undefined as string | undefined },
      { id: 'poker', name: 'Poker', url: env.pokerUrl, emoji: '♠️' as const, logo: undefined as string | undefined },
    ],
    []
  );
  const defaultGame = games.find((g) => g.url) ?? games[0];
  const [selectedId, setSelectedId] = useState(defaultGame.id);
  const selected = games.find((g) => g.id === selectedId) ?? defaultGame;

  const [iframeLoading, setIframeLoading] = useState(!!defaultGame.url);

  useEffect(() => {
    setIframeLoading(!!selected.url);
  }, [selected.url]);

  return (
    <div className="flex flex-col gap-6">
        <header className="flex flex-col gap-2">
          <h1 className="text-3xl font-semibold text-zinc-100">Main Lobby</h1>
          <p className="text-sm text-zinc-400">Choose a game to play.</p>
        </header>
        <section className="flex flex-col gap-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-3 overflow-x-auto md:flex-1 md:min-w-0">
              {games.map((g) => (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => setSelectedId(g.id)}
                  className={
                    'flex h-20 w-20 shrink-0 flex-col items-center justify-center rounded-xl border text-sm transition ' +
                    (selectedId === g.id
                      ? 'border-brand bg-brand/20 text-brand'
                      : 'border-zinc-800 bg-zinc-900/50 text-zinc-300 hover:border-zinc-700 hover:bg-zinc-900/80')
                  }
                  aria-pressed={selectedId === g.id}
                >
                  {g.logo ? (
                    <img src={g.logo} alt={g.name} className="h-10 w-10 rounded-sm object-cover" />
                  ) : (
                    <div className="text-2xl" aria-hidden>
                      {g.emoji}
                    </div>
                  )}
                  <div className="mt-1 truncate px-2 text-xs">{g.name}</div>
                </button>
              ))}
            </div>
          </div>
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-2 shadow-lg">
            <div className="relative h-[75vh] w-full overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950">
              {selected.url ? (
                <>
                  {iframeLoading && (
                    <div className="absolute inset-0 z-10 flex items-center justify-center bg-zinc-950">
                      <div className="flex flex-col items-center gap-2 text-sm text-zinc-300">
                        <div className="h-6 w-6 animate-spin rounded-full border-2 border-zinc-600 border-t-transparent" />
                        <div>Loading {selected.name}...</div>
                      </div>
                    </div>
                  )}
                  <iframe
                    key={selected.id + selected.url}
                    title={selected.name}
                    src={selected.url}
                    className="h-full w-full"
                    allowFullScreen
                    onLoad={() => setIframeLoading(false)}
                  />
                </>
              ) : (
                <div className="flex h-full w-full items-center justify-center text-sm text-zinc-400">
                  {selected.name} is coming soon
                </div>
              )}
            </div>
          </div>
        </section>
      </div>
  );
};
