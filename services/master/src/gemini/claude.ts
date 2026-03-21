import Anthropic from '@anthropic-ai/sdk';
import { getSkillsPrompt } from '../skills';

let client: Anthropic | null = null;

function getClient(): Anthropic {
  if (!client) {
    client = new Anthropic();  // reads ANTHROPIC_API_KEY from env
  }
  return client;
}

const MODEL = 'claude-sonnet-4-6';

const SYSTEM_PROMPT = `You are an expert OpenSCAD programmer.

RULES:
- Variables are constants — you CANNOT reassign them
- fillet(), chamfer(), round_edges(), thread() DO NOT EXIST
- for() loops create implicit unions — NOT imperative loops
- Set $fn = 120 for smooth curves
- All dimensions in millimeters
- First child in difference() is the base; rest are subtracted

STRUCTURE:
- One module per component, assembly at the end
- Descriptive variable names for all dimensions

OUTPUT: Only valid OpenSCAD code. No explanation, no markdown fences.`;

const MODIFY_SYSTEM_PROMPT = `You are an expert OpenSCAD programmer.

The user will provide an existing OpenSCAD file and a modification request.
Respond with ONLY the complete modified .scad file — no explanation, no markdown fences.

Rules:
1. Preserve all parts of the original that the modification doesn't affect.
2. Apply the requested change precisely and minimally.
3. Keep $fn = 120 and all existing modules/variables unless asked to change them.
4. The output must be the full file, not a diff or partial snippet.`;

export async function generateText(prompt: string): Promise<string> {
  const skills = getSkillsPrompt(prompt);
  const techniqueBlock = skills
    ? `\n\nTECHNIQUE GUIDANCE (proven patterns for this type of object):\n${skills}\n\nUse the code patterns above as your starting template.`
    : '';

  const response = await getClient().messages.create({
    model: MODEL,
    max_tokens: 4096,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: `Create an OpenSCAD model of: ${prompt}${techniqueBlock}` }],
  });

  const block = response.content.find(b => b.type === 'text');
  if (!block || block.type !== 'text') throw new Error('No text in response');
  return block.text.replace(/^```(?:openscad)?\n?/m, '').replace(/\n?```$/m, '').trim();
}

export async function modifyText(original: string, prompt: string): Promise<string> {
  const skills = getSkillsPrompt(prompt);
  const techniqueBlock = skills ? `\n\nTECHNIQUE GUIDANCE:\n${skills}\n` : '';

  const response = await getClient().messages.create({
    model: MODEL,
    max_tokens: 4096,
    system: MODIFY_SYSTEM_PROMPT,
    messages: [{ role: 'user', content: `${techniqueBlock}\n\nOriginal file:\n${original}\n\nModification: ${prompt}` }],
  });

  const block = response.content.find(b => b.type === 'text');
  if (!block || block.type !== 'text') throw new Error('No text in response');
  return block.text.replace(/^```(?:openscad)?\n?/m, '').replace(/\n?```$/m, '').trim();
}
