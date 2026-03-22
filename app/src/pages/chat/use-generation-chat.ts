import { useCallback, useEffect, useRef, useState } from 'react';
import type { ChatMessage } from './chat-types';
import { masterFetch, readMasterApiError } from '../../config/master-api';
import { fetchLatestScadForProject } from '../../lib/supabase-projects';
import type { ActiveProject } from '../../context/ProjectContext';

export interface UseGenerationChatResult {
  messages: ChatMessage[];
  isBusy: boolean;
  /** Loading latest SCAD→STL for the selected project (e.g. after sidebar switch) */
  isPreviewLoading: boolean;
  autoEvaluate: boolean;
  setAutoEvaluate: (value: boolean) => void;
  maxSteps: number;
  setMaxSteps: (value: number) => void;
  sendPrompt: (text: string) => void;
  /** Latest STL from master `POST /generate` or `/compile-scad` when `X-Generated-Format: stl` */
  stlBuffer: ArrayBuffer | null;
}

export function useGenerationChat(activeProject: ActiveProject | null): UseGenerationChatResult {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isBusy, setIsBusy] = useState(false);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [autoEvaluate, setAutoEvaluate] = useState(true);
  const [maxSteps, setMaxSteps] = useState(5);
  const [stlBuffer, setStlBuffer] = useState<ArrayBuffer | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const previewAbortRef = useRef<AbortController | null>(null);

  // When the active project changes, load latest saved SCAD and compile to STL
  useEffect(() => {
    if (!activeProject?.id || !activeProject.userId) return;

    previewAbortRef.current?.abort();
    const ac = new AbortController();
    previewAbortRef.current = ac;
    const { signal } = ac;

    let cancelled = false;

    void (async () => {
      setIsPreviewLoading(true);
      try {
        const scad = await fetchLatestScadForProject(activeProject.id, activeProject.userId);
        if (cancelled || signal.aborted) return;
        if (!scad?.trim()) {
          setStlBuffer(null);
          return;
        }

        const res = await masterFetch('/compile-scad', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ scad }),
          signal,
        });

        if (cancelled || signal.aborted) return;

        if (!res.ok) {
          const errText = await readMasterApiError(res);
          console.warn('[compile-scad preview]', res.status, errText);
          return;
        }

        const format = res.headers.get('X-Generated-Format');
        if (format === 'stl') {
          const buf = await res.arrayBuffer();
          setStlBuffer(buf);
        }
      } catch (e) {
        if (e instanceof DOMException && e.name === 'AbortError') return;
        console.error('project preview load', e);
      } finally {
        if (!cancelled) setIsPreviewLoading(false);
        if (previewAbortRef.current === ac) previewAbortRef.current = null;
      }
    })();

    return () => {
      cancelled = true;
      ac.abort();
    };
  }, [activeProject?.id, activeProject?.userId]);

  // Abort in-flight /generate when switching projects so STL never applies to the wrong project
  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, [activeProject?.id]);

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
    isPreviewLoading,
    autoEvaluate,
    setAutoEvaluate,
    maxSteps,
    setMaxSteps,
    sendPrompt,
    stlBuffer,
  };
}
