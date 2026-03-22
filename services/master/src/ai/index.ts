import {
  generateText as geminiGenerate,
  modifyText as geminiModify,
  modelName as geminiModel,
} from './gemini';
import {
  generateText as claudeGenerate,
  modifyText as claudeModify,
  modelName as claudeModel,
} from './claude';

const useClaude = !!process.env.ANTHROPIC_API_KEY;

export const generateText = useClaude ? claudeGenerate : geminiGenerate;
export const modifyText = useClaude ? claudeModify : geminiModify;
export const activeModel = useClaude ? claudeModel : geminiModel;
export const activeProvider = useClaude ? 'Claude' : 'Gemini';
