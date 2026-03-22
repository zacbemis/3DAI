import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import { getSkillsPrompt } from '../skills';
import {
  buildGenerateSystemPrompt,
  buildModifySystemPrompt,
  buildFixSystemPrompt,
  buildReviseSystemPrompt,
  formatTechniqueGuidance,
  stripCodeFences,
} from './prompts';

dotenv.config();

const gemini = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || '',
});

const MODEL = 'gemini-2.5-flash';

const MIN_DELAY_MS = 4500;
let lastCallTime = 0;

async function rateLimit(): Promise<void> {
  const now = Date.now();
  const elapsed = now - lastCallTime;
  if (elapsed < MIN_DELAY_MS) {
    const wait = MIN_DELAY_MS - elapsed;
    console.log(`[Gemini] Rate limiting: waiting ${wait}ms...`);
    await new Promise(resolve => setTimeout(resolve, wait));
  }
  lastCallTime = Date.now();
}

export async function generateText(prompt: string): Promise<string> {
  await rateLimit();
  const skills = getSkillsPrompt(prompt);
  const techniqueBlock = formatTechniqueGuidance(skills);

  const systemPrompt = buildGenerateSystemPrompt();

  const result = await gemini.models.generateContent({
    model: MODEL,
    contents: techniqueBlock
      ? `${systemPrompt}\n\nCreate an OpenSCAD model of: ${prompt}\n${techniqueBlock}`
      : `${systemPrompt}\n\nCreate an OpenSCAD model of: ${prompt}`,
  });

  return stripCodeFences(result.text ?? '');
}

export async function modifyText(original: string, prompt: string): Promise<string> {
  await rateLimit();
  const skills = getSkillsPrompt(prompt);
  const techniqueBlock = formatTechniqueGuidance(skills);

  const systemPrompt = buildModifySystemPrompt();

  const userContent = techniqueBlock
    ? `${techniqueBlock}\n\nOriginal file:\n${original}\n\nModification: ${prompt}`
    : `Original file:\n${original}\n\nModification: ${prompt}`;

  const result = await gemini.models.generateContent({
    model: MODEL,
    contents: `${systemPrompt}\n\n${userContent}`,
  });

  return stripCodeFences(result.text ?? '');
}

export async function fixText(brokenScad: string, errorOutput: string): Promise<string> {
  await rateLimit();
  const systemPrompt = buildFixSystemPrompt();

  const result = await gemini.models.generateContent({
    model: MODEL,
    contents: `${systemPrompt}\n\nOpenSCAD code that failed:\n${brokenScad}\n\nCompiler error output:\n${errorOutput}`,
  });

  return stripCodeFences(result.text ?? '');
}

export async function reviseText(
  original: string,
  prompt: string,
  imageDataUrls: string[],
): Promise<string> {
  await rateLimit();
  const systemPrompt = buildReviseSystemPrompt();

  const parts: Array<{ inlineData: { mimeType: string; data: string } } | string> = [];

  for (const dataUrl of imageDataUrls) {
    const match = dataUrl.match(/^data:(image\/\w+);base64,(.+)$/);
    if (!match) continue;
    parts.push({ inlineData: { mimeType: match[1], data: match[2] } });
  }

  parts.push(
    `${systemPrompt}\n\nOriginal prompt: ${prompt}\n\nCurrent OpenSCAD code:\n${original}\n\nPlease examine the screenshots above. Fix any issues with the model so it better matches the original prompt.`,
  );

  const result = await gemini.models.generateContent({
    model: MODEL,
    contents: parts,
  });

  return stripCodeFences(result.text ?? '');
}

export const modelName = MODEL;
