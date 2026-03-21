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
        className="min-h-[4.5rem] w-full resize-y rounded-[10px] border border-zinc-700 bg-zinc-900/80 px-3 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-blue-500/60 focus:outline-none focus:ring-2 focus:ring-blue-500/25 disabled:opacity-60"
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
          className="rounded-lg bg-blue-400 px-4 py-2 text-sm font-semibold text-zinc-950 transition-colors hover:bg-blue-300 disabled:cursor-not-allowed disabled:opacity-55"
          disabled={disabled}
        >
          {disabled ? 'Running…' : 'Send'}
        </button>
      </div>
    </form>
  );
}
