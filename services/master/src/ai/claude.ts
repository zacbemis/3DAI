import Anthropic from '@anthropic-ai/sdk';
import { getSkillsPrompt } from '../skills';
import {
  buildGenerateSystemPrompt,
  buildModifySystemPrompt,
  buildFixSystemPrompt,
  buildReviseSystemPrompt,
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

export async function fixText(brokenScad: string, errorOutput: string): Promise<string> {
  const systemPrompt = buildFixSystemPrompt();

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
        content: `OpenSCAD code that failed:\n\`\`\`openscad\n${brokenScad}\n\`\`\`\n\nCompiler error output:\n${errorOutput}`,
      },
    ],
  });

  const block = response.content.find((b) => b.type === 'text');
  if (!block || block.type !== 'text') throw new Error('No text in Claude response');

  if (response.usage) {
    const u = response.usage as unknown as Record<string, number>;
    console.log(`[Claude fix] ${u.input_tokens} in / ${u.output_tokens} out`);
  }

  return stripCodeFences(block.text);
}

export async function reviseText(
  original: string,
  prompt: string,
  imageDataUrls: string[],
): Promise<string> {
  const systemPrompt = buildReviseSystemPrompt();

  const contentBlocks: Anthropic.Messages.ContentBlockParam[] = [];

  for (let i = 0; i < imageDataUrls.length; i++) {
    const dataUrl = imageDataUrls[i];
    const match = dataUrl.match(/^data:(image\/\w+);base64,(.+)$/);
    if (!match) continue;
    contentBlocks.push({
      type: 'image',
      source: {
        type: 'base64',
        media_type: match[1] as 'image/png' | 'image/jpeg' | 'image/gif' | 'image/webp',
        data: match[2],
      },
    });
  }

  contentBlocks.push({
    type: 'text',
    text: `Original prompt: ${prompt}\n\nCurrent OpenSCAD code:\n\`\`\`openscad\n${original}\n\`\`\`\n\nPlease examine the screenshots above. Fix any issues with the model so it better matches the original prompt.`,
  });

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
    messages: [{ role: 'user', content: contentBlocks }],
  });

  const block = response.content.find((b) => b.type === 'text');
  if (!block || block.type !== 'text') throw new Error('No text in Claude response');

  if (response.usage) {
    const u = response.usage as unknown as Record<string, number>;
    console.log(`[Claude revise] ${u.input_tokens} in / ${u.output_tokens} out`);
  }

  return stripCodeFences(block.text);
}

export const modelName = MODEL;
