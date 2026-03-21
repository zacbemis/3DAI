import { type FormEvent, useState } from 'react';

interface ChatComposerProps {
  onSend: (text: string) => void;
  disabled: boolean;
}

export function ChatComposer({ onSend, disabled }: ChatComposerProps) {
  const [value, setValue] = useState('');

  const trySend = () => {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setValue('');
  };

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    trySend();
  };

  return (
    <form
      className="flex shrink-0 flex-col gap-2"
      onSubmit={onSubmit}
    >
      <label className="sr-only" htmlFor="prompt">
        Generation prompt
      </label>
      <textarea
        id="prompt"
        className="min-h-[4.5rem] w-full resize-y rounded-lg border border-white/10 bg-white/5 px-3.5 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-indigo-500/60 focus:bg-white/[0.06] focus:outline-none focus:ring-1 focus:ring-indigo-500/25 disabled:opacity-60"
        rows={3}
        placeholder="e.g. M4 threaded standoff, 12 mm tall, 6 mm OD flange…"
        value={value}
        disabled={disabled}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            trySend();
          }
        }}
      />
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs text-zinc-500">
          Enter send · Shift+Enter newline
        </span>
        <button
          type="submit"
          className="rounded-lg bg-gradient-to-br from-violet-500 via-indigo-500 to-cyan-500 px-5 py-2 text-sm font-semibold text-white shadow-[0_6px_20px_rgba(99,102,241,0.25)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_10px_28px_rgba(99,102,241,0.35)] active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-55 disabled:hover:translate-y-0"
          disabled={disabled}
        >
          {disabled ? 'Running…' : 'Send'}
        </button>
      </div>
    </form>
  );
}
