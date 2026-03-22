import {
  generateText as geminiGenerate,
  modifyText as geminiModify,
  modelName as geminiModel,
} from './gemini';

/** Must match `MODEL` in `./claude` — used without loading that module when Claude is off. */
const CLAUDE_MODEL_NAME = 'claude-sonnet-4-20250514';

const useClaude = !!process.env.ANTHROPIC_API_KEY?.trim();

type ClaudeModule = typeof import('./claude');
let claudeLoad: Promise<ClaudeModule> | null = null;

function loadClaude(): Promise<ClaudeModule> {
  if (!claudeLoad) {
    claudeLoad = import('./claude');
  }
  return claudeLoad;
}

export const activeModel = useClaude ? CLAUDE_MODEL_NAME : geminiModel;
export const activeProvider = useClaude ? 'Claude' : 'Gemini';

export async function generateText(prompt: string): Promise<string> {
  if (useClaude) {
    const m = await loadClaude();
    return m.generateText(prompt);
  }
  return geminiGenerate(prompt);
}

export async function modifyText(original: string, prompt: string): Promise<string> {
  if (useClaude) {
    const m = await loadClaude();
    return m.modifyText(original, prompt);
  }
  return geminiModify(original, prompt);
}
