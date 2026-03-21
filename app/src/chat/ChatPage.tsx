import { ChatComposer } from './ChatComposer';
import { ChatMessageList } from './ChatMessageList';
import { useGenerationChat } from './use-generation-chat';

export function ChatPage() {
  const {
    messages,
    isBusy,
    autoEvaluate,
    setAutoEvaluate,
    maxSteps,
    setMaxSteps,
    sendPrompt,
  } = useGenerationChat();

  return (
    <div className="flex h-full min-h-0 flex-col bg-zinc-950 text-zinc-100">
      <header className="shrink-0 border-b border-zinc-800/80 bg-zinc-900/90 px-5 py-4 backdrop-blur-sm">
        <h1 className="text-xl font-semibold tracking-tight text-zinc-50">3DAI</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Prompt · live steps · review (MVP shell)
        </p>
      </header>

      <main className="flex min-h-0 flex-1 flex-col gap-3 px-5 pb-5">
        <ChatMessageList messages={messages} />
        <section
          className="flex shrink-0 flex-wrap gap-x-6 gap-y-2 border-t border-zinc-800 py-2 text-xs text-zinc-400"
          aria-label="Generation defaults"
        >
          <label className="inline-flex cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              className="size-3.5 rounded border-zinc-600 bg-zinc-900 text-blue-500 focus:ring-2 focus:ring-blue-500/30 focus:ring-offset-0"
              checked={autoEvaluate}
              onChange={(e) => setAutoEvaluate(e.target.checked)}
              disabled={isBusy}
            />
            <span>Auto-evaluate (vision loop)</span>
          </label>
          <label className="inline-flex cursor-pointer items-center gap-2">
            <span className="text-zinc-500">Max steps</span>
            <input
              type="number"
              min={1}
              max={20}
              className="w-14 rounded-md border border-zinc-700 bg-zinc-950 px-2 py-1 text-zinc-100 tabular-nums focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500/40 disabled:opacity-50"
              value={maxSteps}
              disabled={isBusy}
              onChange={(e) => {
                const n = Number.parseInt(e.target.value, 10);
                if (!Number.isNaN(n)) setMaxSteps(Math.min(20, Math.max(1, n)));
              }}
            />
          </label>
        </section>
        <ChatComposer onSend={sendPrompt} disabled={isBusy} />
      </main>
    </div>
  );
}
