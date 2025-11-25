import { useEffect, useMemo, useState } from 'react';
import { env } from '@/utils/env';
import { useAuthContext } from '@/hooks/useAuthContext';
import { ProfileContent } from '@/pages/ProfilePage';

export const LobbyPage = () => {
  const { session } = useAuthContext();
  const userEmail = session?.user.email;
  const userId = session?.user.id;
  const userKey = userEmail || userId;
  const userName = session?.user.name;
  const games = useMemo(
    () => [
      {
        id: 'minesweeper',
        name: 'Minesweeper',
        url: env.minesweeperUrl,
        emoji: '💣' as const,
        logo: '/assets/minesweeper_icon.png',
      },
      {
        id: 'lo-siento',
        name: '¡Lo Siento!',
        url: env.losientoUrl,
        emoji: '' as const,
        logo: '/assets/losiento_icon.png',
      },
      {
        id: 'larves-block-party',
        name: "Larve's Block Party",
        url: env.larvesBlockPartyUrl,
        emoji: '' as const,
        logo: undefined as string | undefined,
      },
    ],
    []
  );

  // Default to profile (logo tile) on load
  const [selectedId, setSelectedId] = useState('profile');
  const selected = games.find((g) => g.id === selectedId);

  const [iframeLoading, setIframeLoading] = useState(false);

  useEffect(() => {
    if (selected?.url) {
      setIframeLoading(true);
    }
  }, [selected?.url]);

  const selectedSrc = useMemo(() => {
    if (!selected?.url) return undefined;
    if ((selected.id === 'minesweeper' || selected.id === 'lo-siento') && userKey) {
      const sep = selected.url.includes('?') ? '&' : '?';
      const encodedId = encodeURIComponent(userKey);
      const base = `${selected.url}${sep}x-user-id=${encodedId}`;
      if (userName) {
        const encodedName = encodeURIComponent(userName);
        return `${base}&x-user-name=${encodedName}`;
      }
      return base;
    }
    return selected.url;
  }, [selected?.id, selected?.url, userKey, userName]);

  const isProfile = selectedId === 'profile';

  // Custom tile backgrounds
  const tileBackgrounds: Record<string, React.CSSProperties> = {
    minesweeper: {
      background: `repeating-linear-gradient(
        45deg,
        #27272a,
        #27272a 4px,
        #18181b 4px,
        #18181b 8px
      )`,
    },
    'lo-siento': {
      background: 'linear-gradient(to right, #006847 0%, #006847 33%, #ffffff 33%, #ffffff 66%, #ce1126 66%, #ce1126 100%)',
    },
  };

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-4 -mt-4">
        <div className="flex items-center gap-3">
          {/* Game tiles - slightly wider rectangles */}
          {games.map((g) => (
            <button
              key={g.id}
              type="button"
              onClick={() => setSelectedId(g.id)}
              style={{
                ...tileBackgrounds[g.id],
                boxShadow: selectedId === g.id ? '0 0 35px 8px rgba(103, 28, 28, 0.8)' : undefined,
              }}
              className={
                'flex h-16 w-28 shrink-0 flex-col items-center justify-center rounded-xl border text-xs transition-all duration-200 ' +
                (g.id === 'lo-siento'
                  ? selectedId === g.id
                    ? 'border-zinc-950 text-amber-600 font-bold'
                    : 'border-zinc-950 text-amber-600 hover:border-zinc-800'
                  : selectedId === g.id
                    ? 'border-zinc-950 text-zinc-300 font-bold'
                    : 'border-zinc-950 text-zinc-300 hover:border-zinc-800')
              }
              aria-pressed={selectedId === g.id}
            >
              {g.logo ? (
                <img src={g.logo} alt={g.name} className="h-8 w-8 rounded-sm object-cover" />
              ) : g.emoji ? (
                <div className="text-2xl" aria-hidden>
                  {g.emoji}
                </div>
              ) : null}
              <div className="mt-1 truncate px-2 text-xs font-medium drop-shadow-sm">{g.name}</div>
            </button>
          ))}

          {/* Spacer to push logo tile to the right */}
          <div className="flex-1" />

          {/* Logo tile on the far right - shows Profile (uses favicon) */}
          <button
            type="button"
            onClick={() => setSelectedId('profile')}
            style={{
              boxShadow: isProfile ? '0 0 35px 8px rgba(103, 28, 28, 0.8)' : undefined,
            }}
            className={
              'flex h-16 w-16 shrink-0 items-center justify-center rounded-xl border transition-all duration-200 ' +
              (isProfile
                ? 'border-zinc-950 bg-zinc-900/50'
                : 'border-zinc-950 bg-zinc-900/50 hover:border-zinc-800 hover:bg-zinc-900/80')
            }
            aria-pressed={isProfile}
            aria-label="Profile"
          >
            <img src="/favicon.png" alt="Profile" className="h-12 w-12 rounded-sm object-contain" />
          </button>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-2 shadow-lg">
          <div className="relative h-[88vh] w-full overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950">
            {isProfile ? (
              <div className="h-full w-full overflow-y-auto p-6">
                <ProfileContent />
              </div>
            ) : selected?.url ? (
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
                  key={selected.id + (selectedSrc ?? selected.url ?? '')}
                  title={selected.name}
                  src={selectedSrc ?? selected.url}
                  className="h-full w-full"
                  allowFullScreen
                  onLoad={() => setIframeLoading(false)}
                />
              </>
            ) : selected ? (
              <div className="flex h-full w-full items-center justify-center text-sm text-zinc-400">
                {selected.name} is coming soon
              </div>
            ) : null}
          </div>
        </div>
      </section>
    </div>
  );
};
