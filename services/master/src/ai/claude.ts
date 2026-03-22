import Anthropic from '@anthropic-ai/sdk';
import { getSkillsPrompt } from '../skills';
import { SCAD_SYSTEM_PROMPT, MODIFY_SYSTEM_PROMPT, stripCodeFences } from './prompts';

let client: Anthropic | null = null;

function getClient(): Anthropic {
  if (!client) {
    client = new Anthropic();
  }
  return client;
}

const MODEL = 'claude-sonnet-4-20250514';

export async function generateText(prompt: string): Promise<string> {
  const skills = getSkillsPrompt(prompt);
  const techniqueBlock = skills
    ? `\n\nTECHNIQUE GUIDANCE (proven patterns for this type of object):\n${skills}\n\nUse the code patterns above as your starting template.`
    : '';

  const response = await getClient().messages.create({
    model: MODEL,
    max_tokens: 4096,
    system: SCAD_SYSTEM_PROMPT,
    messages: [
      { role: 'user', content: `Create an OpenSCAD model of: ${prompt}${techniqueBlock}` },
    ],
  });

  const block = response.content.find((b) => b.type === 'text');
  if (!block || block.type !== 'text') throw new Error('No text in Claude response');
  return stripCodeFences(block.text);
}

export async function modifyText(original: string, prompt: string): Promise<string> {
  const skills = getSkillsPrompt(prompt);
  const techniqueBlock = skills ? `\n\nTECHNIQUE GUIDANCE:\n${skills}\n` : '';

  const response = await getClient().messages.create({
    model: MODEL,
    max_tokens: 4096,
    system: MODIFY_SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: `${techniqueBlock}\n\nOriginal file:\n${original}\n\nModification: ${prompt}`,
      },
    ],
  });

  const block = response.content.find((b) => b.type === 'text');
  if (!block || block.type !== 'text') throw new Error('No text in Claude response');
  return stripCodeFences(block.text);
}

export const modelName = MODEL;
