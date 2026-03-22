import React, { useState, useEffect, useRef } from 'react';
import { masterFetch, masterUrl, readMasterApiError } from '../../config/master-api';
import { useActiveProject } from '../../context/ProjectContext';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'bot';
}

export interface ChatAreaProps {
  /** When master returns binary STL (`X-Generated-Format: stl`), pass buffer to parent (e.g. Three.js viewer). */
  onStlBuffer?: (buffer: ArrayBuffer | null) => void;
  maxSteps?: number;
  autoEvaluate?: boolean;
}

export function ChatArea({
  onStlBuffer,
  maxSteps = 5,
  autoEvaluate = true,
}: ChatAreaProps) {
  const { project, isProjectLoading, error: projectError } = useActiveProject();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      text: "Hello! I'm your 3DAI assistant. Send a prompt to generate via the master API (port 3000).",
      sender: 'bot',
    },
  ]);
  const [input, setInput] = useState('');
  const [isBusy, setIsBusy] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: 'smooth',
    });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed || isBusy) return;

    if (!project) {
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          text:
            projectError?.trim() ||
            'Sign in and wait for a project to load before generating (needed to save prompts).',
          sender: 'bot',
        },
      ]);
      return;
    }

    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;

    const userMsg: Message = {
      id: crypto.randomUUID(),
      text: trimmed,
      sender: 'user',
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsBusy(true);
    // Keep previous STL in the parent viewer until a new STL arrives

    try {
      const body: Record<string, unknown> = {
        prompt: trimmed,
        max_steps: maxSteps,
        auto_evaluate: autoEvaluate,
        user_id: project.userId,
        project_id: project.id,
      };
      const uidEnv = import.meta.env.VITE_MASTER_USER_ID?.trim();
      const pidEnv = import.meta.env.VITE_MASTER_PROJECT_ID?.trim();
      if (body.user_id == null && uidEnv) body.user_id = uidEnv;
      if (body.project_id == null && pidEnv) body.project_id = pidEnv;

      const res = await masterFetch('/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: ac.signal,
      });

      const format = res.headers.get('X-Generated-Format');

      if (!res.ok) {
        const errText = await readMasterApiError(res);
        setMessages((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            text: `Generation failed (${res.status}): ${errText}`,
            sender: 'bot',
          },
        ]);
        return;
      }

      if (format === 'stl') {
        const buf = await res.arrayBuffer();
        onStlBuffer?.(buf);
        setMessages((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            text: 'STL received from master — check the 3D preview if connected.',
            sender: 'bot',
          },
        ]);
        return;
      }

      const scadText = await res.text();
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          text: `OpenSCAD text (no STL). First 400 chars:\n${scadText.slice(0, 400)}${scadText.length > 400 ? '…' : ''}`,
          sender: 'bot',
        },
      ]);
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return;
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          text: `Request failed: ${e instanceof Error ? e.message : String(e)}`,
          sender: 'bot',
        },
      ]);
    } finally {
      if (abortRef.current === ac) abortRef.current = null;
      setIsBusy(false);
    }
  };

  const disabled =
    isBusy || isProjectLoading || !project || !input.trim();

  return (
    <div className="flex h-screen w-full flex-col bg-[#0f0f12] font-sans">
      <div
        ref={scrollRef}
        className="flex flex-1 flex-col gap-4 overflow-y-auto p-8"
      >
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex w-full ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[70%] whitespace-pre-wrap rounded-[18px] px-[18px] py-3 text-[0.95rem] leading-relaxed ${
                msg.sender === 'user'
                  ? 'rounded-br-sm bg-indigo-600 text-white'
                  : 'rounded-bl-sm bg-zinc-800 text-zinc-200'
              }`}
            >
              {msg.text}
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-2 border-t border-zinc-800 bg-zinc-900 px-8 py-4">
        <div className="text-xs text-zinc-500">
          Master: <code className="text-zinc-400">{masterUrl('')}</code>
          {isProjectLoading && ' · Loading project…'}
          {!isProjectLoading && project && (
            <span className="text-zinc-400"> · {project.name}</span>
          )}
        </div>
        <div className="flex gap-4">
          <input
            type="text"
            placeholder={
              project
                ? 'Describe what to generate…'
                : 'Sign in and open chat to load a project…'
            }
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !disabled && void handleSend()}
            disabled={isBusy || isProjectLoading}
            className="flex-1 rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-3 text-white outline-none transition-colors placeholder:text-zinc-500 focus:border-indigo-600 disabled:opacity-50"
          />
          <button
            type="button"
            onClick={() => void handleSend()}
            disabled={disabled}
            className="rounded-[10px] border-0 bg-indigo-600 px-5 font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isBusy ? '…' : 'Send'}
          </button>
        </div>
      </div>
    </div>
  );
}
