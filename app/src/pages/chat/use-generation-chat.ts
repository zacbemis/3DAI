import { useCallback, useRef, useState } from 'react';
import type { ChatMessage, GenerationStage } from './chat-types';
import { STAGE_LABELS } from './stage-labels';

const DEMO_SEQUENCE: GenerationStage[] = [
  'queued',
  'generating_scad',
  'compiling',
  'rendering',
  'compositing',
  'evaluating',
  'awaiting_review',
];

function delay(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) {
      reject(new DOMException('Aborted', 'AbortError'));
      return;
    }
    const t = window.setTimeout(() => {
      signal.removeEventListener('abort', onAbort);
      resolve();
    }, ms);
    const onAbort = () => {
      window.clearTimeout(t);
      reject(new DOMException('Aborted', 'AbortError'));
    };
    signal.addEventListener('abort', onAbort, { once: true });
  });
}

export interface UseGenerationChatResult {
  messages: ChatMessage[];
  isBusy: boolean;
  autoEvaluate: boolean;
  setAutoEvaluate: (value: boolean) => void;
  maxSteps: number;
  setMaxSteps: (value: number) => void;
  sendPrompt: (text: string) => void;
}

export function useGenerationChat(): UseGenerationChatResult {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isBusy, setIsBusy] = useState(false);
  const [autoEvaluate, setAutoEvaluate] = useState(true);
  const [maxSteps, setMaxSteps] = useState(5);
  const abortRef = useRef<AbortController | null>(null);

  const sendPrompt = useCallback(
    (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || isBusy) return;

      abortRef.current?.abort();
      const ac = new AbortController();
      abortRef.current = ac;
      const { signal } = ac;

      const userMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'user',
        content: trimmed,
        createdAt: Date.now(),
      };

      setMessages((prev) => [...prev, userMessage]);
      setIsBusy(true);

      void (async () => {
        try {
          const pipelineNote = autoEvaluate
            ? `Auto-evaluate on · max steps ${maxSteps}`
            : `Pause for review after each step · max steps ${maxSteps}`;

          setMessages((prev) => [
            ...prev,
            {
              id: crypto.randomUUID(),
              role: 'assistant',
              content: `Starting generation (${pipelineNote}). Live updates will stream here via SSE once the API is wired.`,
              createdAt: Date.now(),
            },
          ]);

          for (const stage of DEMO_SEQUENCE) {
            await delay(stage === 'awaiting_review' ? 400 : 550, signal);
            setMessages((prev) => [
              ...prev,
              {
                id: crypto.randomUUID(),
                role: 'system',
                content: STAGE_LABELS[stage],
                createdAt: Date.now(),
                stage,
              },
            ]);
          }

          await delay(300, signal);
          setMessages((prev) => [
            ...prev,
            {
              id: crypto.randomUUID(),
              role: 'assistant',
              content:
                'Preview only: hook `GET /api/generations/:id/stream` to replace this with real step + asset events.',
              createdAt: Date.now(),
            },
          ]);
        } catch (e) {
          if (e instanceof DOMException && e.name === 'AbortError') return;
          console.error('generation chat pipeline', e);
          setMessages((prev) => [
            ...prev,
            {
              id: crypto.randomUUID(),
              role: 'assistant',
              content: 'Something went wrong running the local preview.',
              createdAt: Date.now(),
            },
          ]);
        } finally {
          if (abortRef.current === ac) abortRef.current = null;
          setIsBusy(false);
        }
      })();
    },
    [autoEvaluate, isBusy, maxSteps],
  );

  return {
    messages,
    isBusy,
    autoEvaluate,
    setAutoEvaluate,
    maxSteps,
    setMaxSteps,
    sendPrompt,
  };
}
