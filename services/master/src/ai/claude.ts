import Anthropic from '@anthropic-ai/sdk';
import { getSkillsPrompt } from '../skills';
import {
  buildGenerateSystemPrompt,
  buildModifySystemPrompt,
  formatTechniqueGuidance,
  stripCodeFences,
} from './prompts';

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
  const techniqueBlock = formatTechniqueGuidance(skills);

  const systemPrompt = buildGenerateSystemPrompt();

  const response = await getClient().messages.create({
    model: MODEL,
    max_tokens: 4096,
    system: [
      {
        type: 'text' as const,
        text: systemPrompt,
        cache_control: { type: 'ephemeral' as const },
      },
    ],
    messages: [
      {
        role: 'user',
        content: techniqueBlock
          ? `Create an OpenSCAD model of: ${prompt}\n${techniqueBlock}`
          : `Create an OpenSCAD model of: ${prompt}`,
      },
    ],
  });

  const block = response.content.find((b) => b.type === 'text');
  if (!block || block.type !== 'text') throw new Error('No text in Claude response');

  if (response.usage) {
    const u = response.usage as unknown as Record<string, number>;
    const cacheRead = u.cache_read_input_tokens ?? 0;
    const cacheCreate = u.cache_creation_input_tokens ?? 0;
    if (cacheRead > 0 || cacheCreate > 0) {
      console.log(`[Claude] Cache: ${cacheRead} read, ${cacheCreate} created, ${u.input_tokens} uncached`);
    }
  }

  return stripCodeFences(block.text);
}

export async function modifyText(original: string, prompt: string): Promise<string> {
  const skills = getSkillsPrompt(prompt);
  const techniqueBlock = formatTechniqueGuidance(skills);

  const systemPrompt = buildModifySystemPrompt();

  const userContent = techniqueBlock
    ? `${techniqueBlock}\n\nOriginal file:\n\`\`\`openscad\n${original}\n\`\`\`\n\nModification: ${prompt}`
    : `Original file:\n\`\`\`openscad\n${original}\n\`\`\`\n\nModification: ${prompt}`;

  const response = await getClient().messages.create({
    model: MODEL,
    max_tokens: 4096,
    system: [
      {
        type: 'text' as const,
        text: systemPrompt,
        cache_control: { type: 'ephemeral' as const },
      },
    ],
    messages: [{ role: 'user', content: userContent }],
  });

  const block = response.content.find((b) => b.type === 'text');
  if (!block || block.type !== 'text') throw new Error('No text in Claude response');
  return stripCodeFences(block.text);
}

export const modelName = MODEL;
