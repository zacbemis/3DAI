import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import { getSkillsPrompt } from '../skills';
import { SCAD_SYSTEM_PROMPT, MODIFY_SYSTEM_PROMPT, stripCodeFences } from './prompts';

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
  const techniqueBlock = skills
    ? `\n\nTECHNIQUE GUIDANCE (proven patterns for this type of object):\n${skills}\n\nUse the code patterns above as your starting template.`
    : '';

  const result = await gemini.models.generateContent({
    model: MODEL,
    contents: `${SCAD_SYSTEM_PROMPT}${techniqueBlock}\n\nCreate an OpenSCAD model of: ${prompt}`,
  });

  return stripCodeFences(result.text ?? '');
}

export async function modifyText(original: string, prompt: string): Promise<string> {
  await rateLimit();
  const skills = getSkillsPrompt(prompt);
  const techniqueBlock = skills ? `\n\nTECHNIQUE GUIDANCE:\n${skills}\n` : '';

  const result = await gemini.models.generateContent({
    model: MODEL,
    contents: `${MODIFY_SYSTEM_PROMPT}${techniqueBlock}\n\nOriginal file:\n${original}\n\nModification: ${prompt}`,
  });

  return stripCodeFences(result.text ?? '');
}

export const modelName = MODEL;
