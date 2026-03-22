import { useCallback, useEffect, useRef, useState } from 'react';
import type { ChatMessage } from './chat-types';
import { masterFetch, readMasterApiError } from '../../config/master-api';
import {
  fetchChatMessagesForProject,
  fetchLatestScadForProject,
} from '../../lib/supabase-projects';
import type { ActiveProject } from '../../context/ProjectContext';
import type { StlViewerHandle } from '../../components/3js_view/StlImportViewer';

export interface ModelInfo {
  id: string;
  name: string;
  provider: 'claude' | 'gemini';
}

export interface UseGenerationChatResult {
  messages: ChatMessage[];
  isBusy: boolean;
  isPreviewLoading: boolean;
  maxSteps: number;
  setMaxSteps: (n: number) => void;
  selectedModel: string;
  setSelectedModel: (id: string) => void;
  availableModels: ModelInfo[];
  sendPrompt: (text: string) => void;
  rerun: () => void;
  canRerun: boolean;
  stlBuffer: ArrayBuffer | null;
}

export function useGenerationChat(
  activeProject: ActiveProject | null,
  viewerRef?: React.RefObject<StlViewerHandle | null>,
): UseGenerationChatResult {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isBusy, setIsBusy] = useState(false);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [autoEvaluate] = useState(true);
  const [maxSteps, setMaxSteps] = useState(5);
  const [selectedModel, setSelectedModel] = useState('');
  const [availableModels, setAvailableModels] = useState<ModelInfo[]>([]);
  const [stlBuffer, setStlBuffer] = useState<ArrayBuffer | null>(null);
  const lastScadRef = useRef<string | null>(null);
  const lastPromptRef = useRef<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const previewAbortRef = useRef<AbortController | null>(null);

  // Replace chat with this project's prompt history from Supabase
  useEffect(() => {
    if (!activeProject?.id || !activeProject.userId) {
      setMessages([]);
      return;
    }

    let cancelled = false;
    void (async () => {
      const msgs = await fetchChatMessagesForProject(
        activeProject.id,
        activeProject.userId,
      );
      if (!cancelled) setMessages(msgs);
    })();

    return () => {
      cancelled = true;
    };
  }, [activeProject?.id, activeProject?.userId]);
  useEffect(() => {
    let cancelled = false;
    masterFetch('/models')
      .then((res) => res.json())
      .then((data: { default: string; models: ModelInfo[] }) => {
        if (cancelled) return;
        setAvailableModels(data.models);
        setSelectedModel((prev) => prev || data.default);
      })
      .catch((err) => console.warn('[models] Failed to fetch:', err));
    return () => { cancelled = true; };
  }, []);

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

          if (selectedModel) body.model = selectedModel;

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
            const scadB64 = res.headers.get('X-Scad-Base64');
            if (scadB64) {
              try { lastScadRef.current = atob(scadB64); } catch { /* ignore decode errors */ }
            }
            lastPromptRef.current = trimmed;

            const fixRetries = parseInt(res.headers.get('X-Fix-Retries') ?? '0', 10);
            const evalScore = res.headers.get('X-Eval-Score');
            const evalIters = res.headers.get('X-Eval-Iterations');
            const buf = await res.arrayBuffer();
            setStlBuffer(buf);

            const parts: string[] = ['STL ready — preview updated above.'];
            if (evalScore) parts.push(`Quality score: ${evalScore}/10`);
            if (evalIters) parts.push(`(${evalIters} eval round${evalIters === '1' ? '' : 's'})`);
            if (fixRetries > 0) parts.push(`Auto-fixed ${fixRetries} compilation error${fixRetries > 1 ? 's' : ''}.`);

            setMessages((prev) => [
              ...prev,
              {
                id: crypto.randomUUID(),
                role: 'assistant',
                content: parts.join(' '),
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
    [activeProject?.id, activeProject?.userId, autoEvaluate, isBusy, maxSteps, selectedModel],
  );

  const rerun = useCallback(() => {
    const scad = lastScadRef.current;
    const prompt = lastPromptRef.current;
    if (!scad || !prompt || isBusy) return;

    const screenshots = viewerRef?.current?.captureScreenshots() ?? [];
    if (screenshots.length === 0) {
      console.warn('[rerun] No screenshots captured — viewer may not be ready');
    }

    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;
    const { signal } = ac;

    const rerunMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: `Rerun: improving model with ${screenshots.length} reference screenshots`,
      createdAt: Date.now(),
    };
    setMessages((prev) => [...prev, rerunMsg]);
    setIsBusy(true);

    void (async () => {
      try {
        const body: Record<string, unknown> = {
          scad_code: scad,
          prompt,
          images: screenshots,
        };
        if (selectedModel) body.model = selectedModel;

        const res = await masterFetch('/revise', {
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
              content: `Revision failed (${res.status}): ${errText}`,
              createdAt: Date.now(),
            },
          ]);
          return;
        }

        if (format === 'stl') {
          const scadB64 = res.headers.get('X-Scad-Base64');
          if (scadB64) {
            try { lastScadRef.current = atob(scadB64); } catch { /* ignore */ }
          }

          const fixRetries = parseInt(res.headers.get('X-Fix-Retries') ?? '0', 10);
          const buf = await res.arrayBuffer();
          setStlBuffer(buf);
          setMessages((prev) => [
            ...prev,
            {
              id: crypto.randomUUID(),
              role: 'assistant',
              content: fixRetries > 0
                ? `Revised STL ready — preview updated above. (auto-fixed ${fixRetries} compilation error${fixRetries > 1 ? 's' : ''})`
                : 'Revised STL ready — preview updated above.',
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
            content: `Revision returned text (no STL). First 500 chars:\n${scadText.slice(0, 500)}${scadText.length > 500 ? '…' : ''}`,
            createdAt: Date.now(),
          },
        ]);
      } catch (e) {
        if (e instanceof DOMException && e.name === 'AbortError') return;
        console.error('rerun', e);
        setMessages((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            role: 'assistant',
            content: `Rerun failed: ${e instanceof Error ? e.message : String(e)}`,
            createdAt: Date.now(),
          },
        ]);
      } finally {
        if (abortRef.current === ac) abortRef.current = null;
        setIsBusy(false);
      }
    })();
  }, [isBusy, selectedModel, viewerRef]);

  const canRerun = !!lastScadRef.current && !!lastPromptRef.current && !isBusy;

  return {
    messages,
    isBusy,
    isPreviewLoading,
    maxSteps,
    setMaxSteps,
    selectedModel,
    setSelectedModel,
    availableModels,
    sendPrompt,
    rerun,
    canRerun,
    stlBuffer,
  };
}
