import { useState } from 'react';
import { ChatComposer } from './ChatComposer';
import { ChatMessageList } from './ChatMessageList';
import { useGenerationChat } from './use-generation-chat';
import { StlImportViewer } from '../../components/3js_view/StlImportViewer';

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

  const [showStages, setShowStages] = useState(false);
  const stageMessages = messages.filter((m) => m.role === 'system');
  const chatMessages = messages.filter((m) => m.role !== 'system');

  return (
    <div className="relative flex h-full min-h-0 flex-col overflow-hidden bg-zinc-950 text-zinc-100">
      <main className="relative flex min-h-0 flex-1 flex-col">
        <section className="min-h-0 flex-1 overflow-hidden">
          <StlImportViewer />
        </section>

        <section className="shrink-0 border-t border-zinc-800 bg-zinc-900/20">
          {chatMessages.length > 0 ? (
            <div className="max-h-24 min-h-0 overflow-y-auto border-b border-zinc-800 px-3">
              <ChatMessageList messages={chatMessages} emptyMessage="No messages yet." />
            </div>
          ) : null}

          <section
            className="flex shrink-0 flex-wrap items-center gap-x-4 gap-y-1 border-b border-zinc-800 px-3 py-1.5 text-xs text-zinc-400"
            aria-label="Generation defaults"
          >
            <button
              type="button"
              className="rounded-md border border-zinc-700 bg-zinc-950/20 px-2 py-0.5 text-xs text-zinc-300 transition-colors hover:bg-zinc-950/35"
              onClick={() => setShowStages((v) => !v)}
              aria-pressed={showStages}
            >
              {showStages ? 'Hide stages' : 'Show stages'}
            </button>
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
                className="w-14 rounded-md border border-zinc-700 bg-zinc-950 px-2 py-0.5 text-zinc-100 tabular-nums focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500/40 disabled:opacity-50"
                value={maxSteps}
                disabled={isBusy}
                onChange={(e) => {
                  const n = Number.parseInt(e.target.value, 10);
                  if (!Number.isNaN(n))
                    setMaxSteps(Math.min(20, Math.max(1, n)));
                }}
              />
            </label>
          </section>

          <div className="shrink-0 px-3 py-1.5">
            <ChatComposer onSend={sendPrompt} disabled={isBusy} />
          </div>
        </section>

        {showStages && (
          <section
            className="absolute inset-x-0 top-1/2 z-30 mx-3 flex h-[45%] -translate-y-1/2 flex-col overflow-hidden rounded-lg border border-zinc-800 bg-zinc-950/95 backdrop-blur"
            aria-label="Generation progress stages"
          >
            <div className="shrink-0 flex items-center justify-between gap-3 border-b border-zinc-800 px-4 py-3">
              <div>
                <div className="text-sm font-semibold text-zinc-100">
                  Progress stages
                </div>
                <div className="text-xs text-zinc-400">
                  Toggle this panel any time.
                </div>
              </div>
              <button
                type="button"
                className="rounded-md border border-zinc-700 bg-zinc-950/30 px-3 py-2 text-xs font-semibold text-zinc-200 hover:bg-zinc-950/45"
                onClick={() => setShowStages(false)}
              >
                Close
              </button>
            </div>
            <ChatMessageList
              messages={stageMessages}
              emptyMessage="No progress stages yet. Send a prompt to start."
            />
          </section>
        )}
      </main>
    </div>
  );
}
