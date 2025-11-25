import { useEffect, useLayoutEffect, useRef, useState, type FormEvent } from 'react';
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

const isSameDay = (aIso: string | undefined, bIso: string | undefined) => {
  if (!aIso || !bIso) return false;
  const a = new Date(aIso);
  const b = new Date(bIso);
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
};

const formatDateSeparator = (iso: string) => {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(date);
};

export const ChatSidebar = () => {
  const { session } = useAuthContext();
  const {
    activeChannelId,
    messages,
    loading,
    disabled,
    error,
    sendMessage,
  } = useChatContext();

  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [stickyDateLabel, setStickyDateLabel] = useState<string | null>(null);
  const messagesContainerRef = useRef<HTMLDivElement | null>(null);
  const formRef = useRef<HTMLFormElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useLayoutEffect(() => {
    const el = messagesContainerRef.current;
    if (el) {
      // Jump to bottom instantly without visible scrolling
      // Use requestAnimationFrame to ensure DOM has fully updated
      requestAnimationFrame(() => {
        el.scrollTop = el.scrollHeight;
      });
    }
  }, [activeChannelId, messages.length]);

  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) {
      setStickyDateLabel(null);
      return;
    }

    const computeStickyDate = () => {
      const headers = Array.from(
        container.querySelectorAll<HTMLDivElement>('[data-date-header="true"]')
      );

      if (headers.length === 0) {
        setStickyDateLabel(null);
        return;
      }

      const containerRect = container.getBoundingClientRect();
      const containerTop = containerRect.top;

      let currentHeader = headers[0];

      for (const header of headers) {
        const rect = header.getBoundingClientRect();
        const offsetTop = rect.top - containerTop;
        if (offsetTop <= 16) {
          currentHeader = header;
        } else {
          break;
        }
      }

      const label = currentHeader.textContent?.trim() ?? null;
      setStickyDateLabel(label && label.length > 0 ? label : null);
    };

    computeStickyDate();

    container.addEventListener('scroll', computeStickyDate);
    window.addEventListener('resize', computeStickyDate);

    return () => {
      container.removeEventListener('scroll', computeStickyDate);
      window.removeEventListener('resize', computeStickyDate);
    };
  }, [messages, activeChannelId]);

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
      setTimeout(() => {
        textareaRef.current?.focus();
      }, 0);
    }
  };

  if (!session) {
    return (
      <div className="rounded-lg border border-dashed border-zinc-800 bg-zinc-900/60 p-4 text-sm text-zinc-400">
        Sign in to start chatting with other players.
      </div>
    );
  }

  if (disabled) {
    return (
      <div className="rounded-lg border border-dashed border-zinc-800 bg-zinc-900/60 p-4 text-sm text-zinc-400">
        Chat Disabled
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/60">
        <div className="border-b border-zinc-800 px-4 py-3">
          <div className="text-sm font-medium text-zinc-200">Chat</div>
          <div className="text-xs text-zinc-500">
            {loading ? 'Loading messages…' : error ?? 'Connected'}
          </div>
        </div>
        {stickyDateLabel ? (
          <div className="border-b border-zinc-800 px-4 py-2">
            <div className="flex items-center gap-3 text-[10px] uppercase tracking-wide text-zinc-500">
              <div className="h-px flex-1 bg-zinc-800" />
              <div className="shrink-0">{stickyDateLabel}</div>
              <div className="h-px flex-1 bg-zinc-800" />
            </div>
          </div>
        ) : null}
        <div ref={messagesContainerRef} className="flex-1 overflow-y-auto px-4 py-4">
          {messages.length === 0 ? (
            <div className="text-center text-xs text-zinc-500">Send the first message to get things started.</div>
          ) : (
            <div className="flex flex-col gap-3">
              {messages.map((message, idx) => {
                const isSelf = message.senderId === session.user.id;
                const prev = idx > 0 ? messages[idx - 1] : undefined;
                const showDate = idx === 0 || !isSameDay(prev?.createdAt, message.createdAt);
                return (
                  <div key={message.id} className="flex flex-col gap-2">
                    {showDate ? (
                      <div
                        data-date-header="true"
                        className="my-2 flex items-center gap-3 text-[10px] uppercase tracking-wide text-zinc-500"
                      >
                        <div className="h-px flex-1 bg-zinc-800" />
                        <div className="shrink-0">{formatDateSeparator(message.createdAt)}</div>
                        <div className="h-px flex-1 bg-zinc-800" />
                      </div>
                    ) : null}
                    <div className={clsx('flex flex-col gap-1 text-xs', isSelf ? 'items-end' : 'items-start')}>
                      <div className="flex items-center gap-2 text-zinc-400">
                        <span className="font-medium text-zinc-200">{message.senderDisplayName ?? message.senderId}</span>
                        <span>{formatTimestamp(message.createdAt)}</span>
                      </div>
                      <div
                        className={clsx(
                          'max-w-full rounded-2xl px-3 py-2 text-sm',
                          isSelf ? 'bg-brand text-white' : 'bg-zinc-800/80 text-zinc-100'
                        )}
                      >
                        {message.body}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        <form ref={formRef} onSubmit={onSubmit} className="border-t border-zinc-800 p-3">
          <div className="flex items-center gap-2">
            <textarea
              ref={textareaRef}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault();
                  if (!sending && activeChannelId && draft.trim()) {
                    formRef.current?.requestSubmit();
                  }
                }
              }}
              className="h-16 w-full resize-none rounded-xl border border-zinc-800 bg-zinc-900/80 px-3 py-2 text-sm text-zinc-100 focus:border-brand focus:outline-none"
              placeholder="Say something nice…"
              disabled={sending || !activeChannelId}
            />
            <button
              type="submit"
              disabled={sending || !draft.trim() || !activeChannelId}
              className="rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand/90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {sending ? 'Sending…' : 'Send'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
