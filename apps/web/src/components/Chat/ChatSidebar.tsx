import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { clsx } from 'clsx';

import { useAuthContext } from '@/hooks/useAuthContext';
import { useChatContext } from '@/hooks/useChatContext';

const formatTimestamp = (iso: string) => {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return iso;
  }
  return new Intl.DateTimeFormat(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
};

export const ChatSidebar = () => {
  const { session } = useAuthContext();
  const {
    channels,
    activeChannelId,
    setActiveChannel,
    messages,
    loading,
    error,
    sendMessage,
    formatChannel,
  } = useChatContext();

  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const activeChannel = useMemo(() => channels.find((channel) => channel.channelId === activeChannelId), [
    channels,
    activeChannelId,
  ]);

  useEffect(() => {
    const element = messagesEndRef.current;
    if (element && typeof element.scrollIntoView === 'function') {
      element.scrollIntoView({ block: 'end', behavior: 'smooth' });
    }
  }, [messages]);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!draft.trim()) {
      return;
    }
    setSending(true);
    try {
      await sendMessage(draft.trim());
      setDraft('');
    } finally {
      setSending(false);
    }
  };

  if (!session) {
    return (
      <div className="rounded-lg border border-dashed border-slate-800 bg-slate-900/60 p-4 text-sm text-slate-400">
        Sign in to start chatting with other players.
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col gap-4">
      <div>
        <h3 className="text-sm font-semibold text-slate-300">Channels</h3>
        <div className="mt-3 flex flex-wrap gap-2">
          {channels.length === 0 ? (
            <span className="text-xs text-slate-500">No channels available yet.</span>
          ) : (
            channels.map((channel) => (
              <button
                key={channel.channelId}
                type="button"
                className={clsx(
                  'rounded-full border border-slate-800 px-3 py-1 text-xs transition',
                  channel.channelId === activeChannelId
                    ? 'bg-brand text-slate-950 font-semibold'
                    : 'bg-slate-900/70 text-slate-300 hover:bg-slate-800 hover:text-white'
                )}
                onClick={() => setActiveChannel({ channelId: channel.channelId })}
              >
                {formatChannel(channel)}
              </button>
            ))
          )}
        </div>
      </div>

      <div className="flex flex-1 flex-col overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/60">
        <div className="border-b border-slate-800 px-4 py-3">
          <div className="text-sm font-medium text-slate-200">
            {activeChannel ? formatChannel(activeChannel) : 'No channel selected'}
          </div>
          <div className="text-xs text-slate-500">
            {loading ? 'Loading messages…' : error ?? 'Connected'}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-4">
          {messages.length === 0 ? (
            <div className="text-center text-xs text-slate-500">Send the first message to get things started.</div>
          ) : (
            <div className="flex flex-col gap-3">
              {messages.map((message) => {
                const isSelf = message.senderId === session.user.id;
                return (
                  <div key={message.id} className={clsx('flex flex-col gap-1 text-xs', isSelf ? 'items-end' : 'items-start')}>
                    <div className="flex items-center gap-2 text-slate-400">
                      <span className="font-medium text-slate-200">{message.senderDisplayName ?? message.senderId}</span>
                      <span>{formatTimestamp(message.createdAt)}</span>
                    </div>
                    <div
                      className={clsx(
                        'max-w-full rounded-2xl px-3 py-2 text-sm',
                        isSelf ? 'bg-brand text-slate-950' : 'bg-slate-800/80 text-slate-100'
                      )}
                    >
                      {message.body}
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>
        <form onSubmit={onSubmit} className="border-t border-slate-800 p-3">
          <div className="flex items-center gap-2">
            <textarea
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              className="h-16 w-full resize-none rounded-xl border border-slate-800 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 focus:border-brand focus:outline-none"
              placeholder="Say something nice…"
              disabled={sending || !activeChannel}
            />
            <button
              type="submit"
              disabled={sending || !draft.trim() || !activeChannel}
              className="rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-brand/90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {sending ? 'Sending…' : 'Send'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
