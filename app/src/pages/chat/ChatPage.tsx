import { useState } from 'react';
import { ChatComposer } from './ChatComposer';
import { ChatMessageList } from './ChatMessageList';
import { useGenerationChat } from './use-generation-chat';
import { StlImportViewer } from '../../components/3js_view/StlImportViewer';
import { useActiveProject } from '../../context/ProjectContext';

export function ChatPage() {
  const { project, isProjectLoading, error: projectError, startNewProject } = useActiveProject();
  const {
    messages,
    isBusy,
    autoEvaluate,
    setAutoEvaluate,
    maxSteps,
    setMaxSteps,
    sendPrompt,
    stlBuffer,
  } = useGenerationChat(project);

  const [showStages, setShowStages] = useState(false);
  const stageMessages = messages.filter((m) => m.role === 'system');
  const chatMessages = messages.filter((m) => m.role !== 'system');

  const composerDisabled = isBusy || isProjectLoading || !project;

  return (
    <div className="relative flex h-full min-h-0 flex-col overflow-hidden bg-[#0a0a0c] text-zinc-100">
      <main className="relative flex min-h-0 flex-1 flex-col">
        <section className="min-h-0 flex-1 overflow-hidden">
          <StlImportViewer
            stlBuffer={stlBuffer}
            isGenerating={isBusy}
            project={project}
            projectLoading={isProjectLoading}
            projectError={projectError}
            onNewProject={startNewProject}
          />
        </section>

        <section className="shrink-0 border-t border-white/10 bg-white/2">
          {chatMessages.length > 0 ? (
            <div className="max-h-24 min-h-0 overflow-y-auto border-b border-white/10 px-3">
              <ChatMessageList messages={chatMessages} emptyMessage="No messages yet." />
            </div>
          ) : null}

          <section
            className="flex shrink-0 flex-wrap items-center gap-x-4 gap-y-1 border-b border-white/10 px-3 py-1.5 text-xs text-zinc-400"
            aria-label="Generation defaults"
          >
            <button
              type="button"
              className="rounded-md border border-white/10 bg-white/5 px-2 py-0.5 text-xs text-zinc-300 transition-colors hover:bg-white/10"
              onClick={() => setShowStages((v) => !v)}
              aria-pressed={showStages}
            >
              {showStages ? 'Hide stages' : 'Show stages'}
            </button>
            <label className="inline-flex cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                className="size-3.5 rounded border-white/20 bg-white/5 text-indigo-500 focus:ring-2 focus:ring-indigo-500/30 focus:ring-offset-0"
                checked={autoEvaluate}
                onChange={(e) => setAutoEvaluate(e.target.checked)}
                disabled={composerDisabled}
              />
              <span>Auto-evaluate (vision loop)</span>
            </label>
            <label className="inline-flex cursor-pointer items-center gap-2">
              <span className="text-zinc-500">Max steps</span>
              <input
                type="number"
                min={1}
                max={20}
                className="w-14 rounded-md border border-white/10 bg-white/5 px-2 py-0.5 text-zinc-100 tabular-nums focus:border-indigo-500/60 focus:outline-none focus:ring-1 focus:ring-indigo-500/30 disabled:opacity-50"
                value={maxSteps}
                disabled={composerDisabled}
                onChange={(e) => {
                  const n = Number.parseInt(e.target.value, 10);
                  if (!Number.isNaN(n))
                    setMaxSteps(Math.min(20, Math.max(1, n)));
                }}
              />
            </label>
          </section>

          <div className="shrink-0 px-3 py-1.5">
            <ChatComposer onSend={sendPrompt} disabled={composerDisabled} />
          </div>
        </section>

        {showStages && (
          <section
            className="absolute inset-x-0 top-1/2 z-30 mx-3 flex h-[45%] -translate-y-1/2 flex-col overflow-hidden rounded-xl border border-white/10 bg-[#0a0a0c]/95 backdrop-blur-lg"
            aria-label="Generation progress stages"
          >
            <div className="flex shrink-0 items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
              <div>
                <div className="text-sm font-semibold text-zinc-100">
                  Progress stages
                </div>
                <div className="text-xs text-zinc-500">
                  Toggle this panel any time.
                </div>
              </div>
              <button
                type="button"
                className="rounded-md border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-zinc-200 transition-colors hover:bg-white/10"
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
