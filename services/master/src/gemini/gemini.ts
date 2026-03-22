import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import { getSkillsPrompt } from '../skills';

dotenv.config();

const gemini = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY || '',
});

// Rate limiting for Gemini free tier (15 RPM = 4s between calls)
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

const SCAD_SYSTEM_INSTRUCTIONS = `You are an expert OpenSCAD programmer.

RULES:
- Variables are constants — you CANNOT reassign them
- fillet(), chamfer(), round_edges(), thread() DO NOT EXIST
- for() loops create implicit unions — NOT imperative loops
- Set $fn = 120 for smooth curves
- All dimensions in millimeters
- First child in difference() is the base; rest are subtracted
- Never assign CSG to variables. Nest operators directly.

STRUCTURE:
- One module per component, assembly at the end
- Descriptive variable names for all dimensions
- Keep models 20-120mm and watertight/manifold

OUTPUT: Only valid OpenSCAD code. No explanation, no markdown fences.`;

const MODIFY_SYSTEM_PROMPT = `You are an expert OpenSCAD programmer.

The user will provide an existing OpenSCAD file and a modification request.
Respond with ONLY the complete modified .scad file — no explanation, no markdown fences.

Rules:
1. Preserve all parts of the original that the modification doesn't affect.
2. Apply the requested change precisely and minimally.
3. Keep $fn = 120 and all existing modules/variables unless asked to change them.
4. The output must be the full file, not a diff or partial snippet.
5. Do not add comments explaining what changed.`;

async function generateText(prompt: string) {
    await rateLimit();
    const skills = getSkillsPrompt(prompt);
    const techniqueBlock = skills
        ? `\n\nTECHNIQUE GUIDANCE (proven patterns for this type of object):\n${skills}\n\nUse the code patterns above as your starting template.`
        : '';

    const result = await gemini.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `${SCAD_SYSTEM_INSTRUCTIONS}${techniqueBlock}\n\nCreate an OpenSCAD model of: ${prompt}`,
    });
    return result.text ?? '';
}

async function modifyText(original: string, prompt: string) {
    await rateLimit();
    const skills = getSkillsPrompt(prompt);
    const techniqueBlock = skills
        ? `\n\nTECHNIQUE GUIDANCE:\n${skills}\n`
        : '';

    const result = await gemini.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `${MODIFY_SYSTEM_PROMPT}${techniqueBlock}\n\nOriginal file:\n${original}\n\nModification: ${prompt}`,
    });
    return result.text ?? '';
}

export default gemini;
export { generateText, modifyText };
