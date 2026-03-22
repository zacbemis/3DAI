import { useCallback, useRef, useState } from 'react';
import type { ChatMessage } from './chat-types';
import { masterFetch, readMasterApiError } from '../../config/master-api';
import type { ActiveProject } from '../../context/ProjectContext';

export interface UseGenerationChatResult {
  messages: ChatMessage[];
  isBusy: boolean;
  autoEvaluate: boolean;
  setAutoEvaluate: (value: boolean) => void;
  maxSteps: number;
  setMaxSteps: (value: number) => void;
  sendPrompt: (text: string) => void;
  /** Latest STL from master `POST /generate` when `X-Generated-Format: stl` */
  stlBuffer: ArrayBuffer | null;
}

export function useGenerationChat(activeProject: ActiveProject | null): UseGenerationChatResult {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isBusy, setIsBusy] = useState(false);
  const [autoEvaluate, setAutoEvaluate] = useState(true);
  const [maxSteps, setMaxSteps] = useState(5);
  const [stlBuffer, setStlBuffer] = useState<ArrayBuffer | null>(null);
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
      // Keep previous STL on screen until the new request returns a replacement (or error)

      void (async () => {
        try {
          const body: Record<string, unknown> = {
            prompt: trimmed,
            max_steps: maxSteps,
            auto_evaluate: autoEvaluate,
          };

          if (activeProject?.userId) body.user_id = activeProject.userId;
          if (activeProject?.id) body.project_id = activeProject.id;
          const uidEnv = import.meta.env.VITE_MASTER_USER_ID?.trim();
          const pidEnv = import.meta.env.VITE_MASTER_PROJECT_ID?.trim();
          if (body.user_id == null && uidEnv) body.user_id = uidEnv;
          if (body.project_id == null && pidEnv) body.project_id = pidEnv;

          const res = await masterFetch('/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
            signal,
          });

          const format = res.headers.get('X-Generated-Format');

          if (!res.ok) {
            const errText = await readMasterApiError(res);
            setMessages((prev) => [
              ...prev,
              {
                id: crypto.randomUUID(),
                role: 'assistant',
                content: `Generation failed (${res.status}): ${errText}`,
                createdAt: Date.now(),
              },
            ]);
            return;
          }

          if (format === 'stl') {
            const buf = await res.arrayBuffer();
            setStlBuffer(buf);
            setMessages((prev) => [
              ...prev,
              {
                id: crypto.randomUUID(),
                role: 'assistant',
                content: 'STL ready — preview updated above.',
                createdAt: Date.now(),
              },
            ]);
            return;
          }

          const scadText = await res.text();
          setMessages((prev) => [
            ...prev,
            {
              id: crypto.randomUUID(),
              role: 'assistant',
              content: `OpenSCAD returned as text (no STL). First 500 chars:\n${scadText.slice(0, 500)}${scadText.length > 500 ? '…' : ''}`,
              createdAt: Date.now(),
            },
          ]);
        } catch (e) {
          if (e instanceof DOMException && e.name === 'AbortError') return;
          console.error('generation chat', e);
          setMessages((prev) => [
            ...prev,
            {
              id: crypto.randomUUID(),
              role: 'assistant',
              content: `Request failed: ${e instanceof Error ? e.message : String(e)}`,
              createdAt: Date.now(),
            },
          ]);
        } finally {
          if (abortRef.current === ac) abortRef.current = null;
          setIsBusy(false);
        }
      })();
    },
    [activeProject?.id, activeProject?.userId, autoEvaluate, isBusy, maxSteps],
  );

  return {
    messages,
    isBusy,
    autoEvaluate,
    setAutoEvaluate,
    maxSteps,
    setMaxSteps,
    sendPrompt,
    stlBuffer,
  };
}
