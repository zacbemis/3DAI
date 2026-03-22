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
    selectedModel,
    setSelectedModel,
    availableModels,
    sendPrompt,
    stlBuffer,
  } = useGenerationChat(project);

  const [showStages, setShowStages] = useState(false);
  const [showModelMenu, setShowModelMenu] = useState(false);
  const [chatHeightPx, setChatHeightPx] = useState(96);
  const [isDragging, setIsDragging] = useState(false);
  const draggingRef = useRef(false);
  const modelBtnRef = useRef<HTMLButtonElement>(null);
  const modelMenuRef = useRef<HTMLDivElement>(null);

  const stageMessages = messages.filter((m) => m.role === 'system');
  const chatMessages = messages.filter((m) => m.role !== 'system');

  const composerDisabled = isBusy || isProjectLoading || !project;
  const currentModel = availableModels.find((m) => m.id === selectedModel);

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

  useEffect(() => {
    if (!showModelMenu) return;
    function handleClick(e: MouseEvent) {
      if (
        modelMenuRef.current && !modelMenuRef.current.contains(e.target as Node) &&
        modelBtnRef.current && !modelBtnRef.current.contains(e.target as Node)
      ) {
        setShowModelMenu(false);
      }
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setShowModelMenu(false);
    }
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, [showModelMenu]);

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
            aria-label="Generation controls"
          >
            <div className="relative">
              <button
                ref={modelBtnRef}
                type="button"
                className="inline-flex items-center gap-1.5 rounded-md border border-white/10 bg-white/5 px-2 py-0.5 text-xs text-zinc-300 transition-colors hover:bg-white/10"
                onClick={() => setShowModelMenu((v) => !v)}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="size-3 text-zinc-500" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
                </svg>
                {currentModel?.name ?? 'Select model'}
                <svg xmlns="http://www.w3.org/2000/svg" className="size-3 text-zinc-500" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
                </svg>
              </button>

              {showModelMenu && (
                <div
                  ref={modelMenuRef}
                  className="absolute bottom-full left-0 z-50 mb-1 max-h-48 w-52 overflow-y-auto rounded-lg border border-white/10 bg-[#161618] py-1 shadow-xl"
                >
                  {availableModels.length === 0 && (
                    <div className="px-3 py-2 text-xs text-zinc-500">
                      No models — is the backend running?
                    </div>
                  )}
                  {availableModels.map((m) => {
                    const isActive = m.id === selectedModel;
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => { setSelectedModel(m.id); setShowModelMenu(false); }}
                        className={`flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs transition-colors ${
                          isActive
                            ? 'bg-indigo-500/15 text-indigo-300'
                            : 'text-zinc-300 hover:bg-white/10'
                        }`}
                      >
                        {isActive && (
                          <span className="size-1.5 rounded-full bg-indigo-400" />
                        )}
                        <span className={isActive ? '' : 'ml-3.5'}>{m.name}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <button
              type="button"
              className="rounded-md border border-white/10 bg-white/5 px-2 py-0.5 text-xs text-zinc-300 transition-colors hover:bg-white/10"
              onClick={() => setShowStages((v) => !v)}
              aria-pressed={showStages}
            >
              {showStages ? 'Hide stages' : 'Show stages'}
            </button>
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
