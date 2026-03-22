import { useCallback, useEffect, useRef, useState } from 'react';
import { ChatComposer } from './ChatComposer';
import { ChatMessageList } from './ChatMessageList';
import { useGenerationChat } from './use-generation-chat';
import { StlImportViewer } from '../../components/3js_view/StlImportViewer';
import { ProjectsSidebar } from '../../components/projects/ProjectsSidebar';
import { useActiveProject } from '../../context/ProjectContext';

const CHAT_MIN_PX = 80;
const CHAT_MIN_VIEWER_PX = 100;

function getChatMaxPx(): number {
  if (typeof window === 'undefined') return 400;
  return Math.max(400, window.innerHeight - CHAT_MIN_VIEWER_PX);
}

export function ChatPage() {
  const { project, isProjectLoading, error: projectError, startNewProject } = useActiveProject();
  const {
    messages,
    isBusy,
    isPreviewLoading,
    maxSteps,
    setMaxSteps,
    sendPrompt,
    stlBuffer,
  } = useGenerationChat(project);

  const [showStages, setShowStages] = useState(false);
  const [chatHeightPx, setChatHeightPx] = useState(96);
  const [isDragging, setIsDragging] = useState(false);
  const draggingRef = useRef(false);

  const stageMessages = messages.filter((m) => m.role === 'system');
  const chatMessages = messages.filter((m) => m.role !== 'system');

  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    draggingRef.current = true;
    setIsDragging(true);
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!draggingRef.current) return;
      const height = window.innerHeight - e.clientY;
      const max = getChatMaxPx();
      setChatHeightPx(Math.min(max, Math.max(CHAT_MIN_PX, height)));
    };
    const handleMouseUp = () => {
      draggingRef.current = false;
      setIsDragging(false);
    };
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  const viewerBusy = isBusy || isPreviewLoading;
  const composerDisabled =
    isBusy || isPreviewLoading || isProjectLoading || project == null;
  const generatingMessage = isPreviewLoading
    ? 'Loading last saved model for this project…'
    : isBusy
      ? 'Generating… previous model stays until the new STL is ready.'
      : undefined;

  return (
    <div className="relative flex h-full min-h-0 flex-row overflow-hidden bg-[#0a0a0c] text-zinc-100">
      <ProjectsSidebar />
      <main className="relative flex min-h-0 min-w-0 flex-1 flex-col">
        <section className="min-h-0 flex-1 overflow-hidden">
          <StlImportViewer
            stlBuffer={stlBuffer}
            isGenerating={viewerBusy}
            generatingMessage={generatingMessage}
            project={project}
            projectLoading={isProjectLoading}
            projectError={projectError}
            onNewProject={startNewProject}
          />
        </section>

        <button
          type="button"
          className={`flex h-1.5 shrink-0 cursor-ns-resize items-center justify-center border-t border-white/10 bg-white/[0.02] transition-colors hover:bg-white/5 active:bg-white/10 ${isDragging ? 'bg-white/10' : ''}`}
          onMouseDown={handleResizeStart}
          aria-label="Resize chat history"
        >
          <span className="h-1 w-8 rounded-full bg-white/20" aria-hidden />
        </button>

        <section
          className="flex shrink-0 flex-col border-t border-white/10 bg-white/[0.02]"
          style={{ height: chatHeightPx }}
        >
          <div className="min-h-0 flex-1 overflow-y-auto border-b border-white/10 px-3">
            <ChatMessageList messages={chatMessages} emptyMessage="No messages yet." />
          </div>

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
