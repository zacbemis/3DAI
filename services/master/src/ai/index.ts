import {
  generateText as geminiGenerate,
  modifyText as geminiModify,
  modelName as geminiModel,
} from './gemini';

const CLAUDE_MODEL = 'claude-sonnet-4-20250514';

const hasClaudeKey = !!process.env.ANTHROPIC_API_KEY?.trim();
const hasGeminiKey = !!process.env.GEMINI_API_KEY?.trim();

type ClaudeModule = typeof import('./claude');
let claudeLoad: Promise<ClaudeModule> | null = null;

function loadClaude(): Promise<ClaudeModule> {
  if (!claudeLoad) claudeLoad = import('./claude');
  return claudeLoad;
}

export interface ModelInfo {
  id: string;
  name: string;
  provider: 'claude' | 'gemini';
}

const ALL_MODELS: ModelInfo[] = [
  { id: CLAUDE_MODEL, name: 'Claude Sonnet 4', provider: 'claude' },
  { id: geminiModel, name: 'Gemini 2.5 Flash', provider: 'gemini' },
];

export function getAvailableModels(): ModelInfo[] {
  return ALL_MODELS.filter((m) => {
    if (m.provider === 'claude') return hasClaudeKey;
    if (m.provider === 'gemini') return hasGeminiKey;
    return false;
  });
}

export function getDefaultModel(): string {
  if (hasClaudeKey) return CLAUDE_MODEL;
  return geminiModel;
}

function resolveProvider(modelId?: string): 'claude' | 'gemini' {
  if (!modelId) return hasClaudeKey ? 'claude' : 'gemini';
  const info = ALL_MODELS.find((m) => m.id === modelId);
  if (info) return info.provider;
  if (modelId.startsWith('claude')) return 'claude';
  return 'gemini';
}

export async function generateText(prompt: string, modelId?: string): Promise<string> {
  const provider = resolveProvider(modelId);
  if (provider === 'claude') {
    const m = await loadClaude();
    return m.generateText(prompt);
  }
  return geminiGenerate(prompt);
}

export async function modifyText(original: string, prompt: string, modelId?: string): Promise<string> {
  const provider = resolveProvider(modelId);
  if (provider === 'claude') {
    const m = await loadClaude();
    return m.modifyText(original, prompt);
  }
  return geminiModify(original, prompt);
}

export async function fixText(brokenScad: string, errorOutput: string, modelId?: string): Promise<string> {
  const provider = resolveProvider(modelId);
  if (provider === 'claude') {
    const m = await loadClaude();
    return m.fixText(brokenScad, errorOutput);
  }
  const { fixText: geminiFix } = await import('./gemini');
  return geminiFix(brokenScad, errorOutput);
}

export async function reviseText(
  original: string,
  prompt: string,
  imageDataUrls: string[],
  modelId?: string,
): Promise<string> {
  const provider = resolveProvider(modelId);
  if (provider === 'claude') {
    const m = await loadClaude();
    return m.reviseText(original, prompt, imageDataUrls);
  }
  const { reviseText: geminiRevise } = await import('./gemini');
  return geminiRevise(original, prompt, imageDataUrls);
}

export async function evaluateModel(
  scadCode: string,
  prompt: string,
  imageDataUrls: string[],
  modelId?: string,
): Promise<import('./types').EvaluationResult> {
  const provider = resolveProvider(modelId);
  if (provider === 'claude') {
    const m = await loadClaude();
    return m.evaluateModel(scadCode, prompt, imageDataUrls);
  }
  const { evaluateModel: geminiEval } = await import('./gemini');
  return geminiEval(scadCode, prompt, imageDataUrls);
}

export function resolveModelName(modelId?: string): string {
  if (!modelId) return getDefaultModel();
  const info = ALL_MODELS.find((m) => m.id === modelId);
  return info?.id ?? modelId;
}

export type { EvaluationResult } from './types';
export { DEFAULT_EVAL_THRESHOLD, DEFAULT_MAX_EVAL_STEPS } from './types';

export const activeModel = getDefaultModel();
export const activeProvider = hasClaudeKey ? 'Claude' : 'Gemini';
