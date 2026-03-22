import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import { getSkillsPrompt } from '../skills';
import {
  buildGenerateSystemPrompt,
  buildModifySystemPrompt,
  buildFixSystemPrompt,
  buildReviseSystemPrompt,
  buildEvaluateSystemPrompt,
  formatTechniqueGuidance,
  stripCodeFences,
} from './prompts';
import type { EvaluationResult } from './types';

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
    config: {
      systemInstruction: systemPrompt,
      temperature: 0.4,
      maxOutputTokens: 16384,
    },
    contents: techniqueBlock
      ? `Create an OpenSCAD model of: ${prompt}\n${techniqueBlock}`
      : `Create an OpenSCAD model of: ${prompt}`,
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
    config: {
      systemInstruction: systemPrompt,
      temperature: 0.3,
      maxOutputTokens: 16384,
    },
    contents: userContent,
  });

  return stripCodeFences(result.text ?? '');
}

export async function fixText(brokenScad: string, errorOutput: string): Promise<string> {
  await rateLimit();
  const systemPrompt = buildFixSystemPrompt();

  const result = await gemini.models.generateContent({
    model: MODEL,
    config: {
      systemInstruction: systemPrompt,
      temperature: 0.2,
      maxOutputTokens: 16384,
    },
    contents: `OpenSCAD code that failed:\n\`\`\`openscad\n${brokenScad}\n\`\`\`\n\nCompiler error output:\n${errorOutput}`,
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
    `Original prompt: ${prompt}\n\nCurrent OpenSCAD code:\n\`\`\`openscad\n${original}\n\`\`\`\n\nPlease examine the screenshots above. Fix any issues with the model so it better matches the original prompt.`,
  );

  const result = await gemini.models.generateContent({
    model: MODEL,
    config: {
      systemInstruction: systemPrompt,
      temperature: 0.4,
      maxOutputTokens: 16384,
    },
    contents: parts,
  });

  return stripCodeFences(result.text ?? '');
}

export async function evaluateModel(
  scadCode: string,
  prompt: string,
  imageDataUrls: string[],
): Promise<EvaluationResult> {
  await rateLimit();
  const systemPrompt = buildEvaluateSystemPrompt();

  const parts: Array<{ inlineData: { mimeType: string; data: string } } | string> = [];

  for (const dataUrl of imageDataUrls) {
    const match = dataUrl.match(/^data:(image\/\w+);base64,(.+)$/);
    if (!match) continue;
    parts.push({ inlineData: { mimeType: match[1], data: match[2] } });
  }

  parts.push(`Original prompt: ${prompt}\n\nOpenSCAD source code:\n\`\`\`openscad\n${scadCode}\n\`\`\``);

  const result = await gemini.models.generateContent({
    model: MODEL,
    config: {
      systemInstruction: systemPrompt,
      temperature: 0.3,
      maxOutputTokens: 1024,
      responseMimeType: 'application/json',
    },
    contents: parts,
  });

  const jsonStr = (result.text ?? '').replace(/^```json?\n?/m, '').replace(/\n?```$/m, '').trim();
  return JSON.parse(jsonStr) as EvaluationResult;
}

export const modelName = MODEL;
