import { useEffect, useRef } from 'react';
import type { ChatMessage, ChatRole } from './chat-types';

interface ChatMessageListProps {
  messages: ChatMessage[];
  emptyMessage?: string;
}

const bubbleStyles: Record<ChatRole, string> = {
  user: 'self-end border-indigo-500/20 bg-indigo-950/60 text-zinc-100',
  assistant: 'self-start border-white/10 bg-white/[0.04] text-zinc-100',
  system:
    'self-start border-dashed border-white/[0.06] bg-white/[0.02] text-sm text-zinc-400',
};

export function ChatMessageList({ messages, emptyMessage }: ChatMessageListProps) {
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages]);

  return (
    <div
      className="flex min-h-0 flex-1 flex-col gap-2.5 overflow-y-auto py-4"
      role="log"
      aria-live="polite"
    >
      {messages.length === 0 ? (
        <p className="mx-auto my-auto max-w-md px-4 text-center text-sm leading-relaxed text-zinc-500">
          {emptyMessage ?? (
            <>
              Describe a part or assembly in natural language. Progress stages
              will appear here (SSE-shaped) once the worker is connected.
            </>
          )}
        </p>
      ) : (
        messages.map((m) => (
          <article
            key={m.id}
            className={`max-w-[85%] rounded-xl border px-3.5 py-2.5 ${bubbleStyles[m.role]}`}
            data-stage={m.stage ?? undefined}
          >
            <span className="mb-1.5 block text-[0.6875rem] font-medium uppercase tracking-wider text-zinc-500">
              {m.role === 'user'
                ? 'You'
                : m.role === 'assistant'
                  ? 'Assistant'
                  : 'Status'}
            </span>
            <p className="m-0 whitespace-pre-wrap break-words">{m.content}</p>
          </article>
        ))
      )}
      <div ref={bottomRef} />
    </div>
  );
}
