import dotenv from 'dotenv';
dotenv.config();

import Anthropic from '@anthropic-ai/sdk';

const MODEL = 'claude-haiku-4-5-20251001';

async function main() {
  const key = process.env.ANTHROPIC_API_KEY?.trim();
  if (!key) {
    console.error('✗ ANTHROPIC_API_KEY is not set in .env');
    process.exit(1);
  }

  console.log(`Using model: ${MODEL}`);
  console.log('Sending test request...\n');

  const client = new Anthropic({ apiKey: key });

  const res = await client.messages.create({
    model: MODEL,
    max_tokens: 64,
    messages: [{ role: 'user', content: 'Reply with only: "hello"' }],
  });

  const text = res.content.find((b) => b.type === 'text');
  if (!text || text.type !== 'text') {
    console.error('✗ No text block in response');
    process.exit(1);
  }

  console.log(`✓ Response: "${text.text}"`);
  console.log(`  Model:  ${res.model}`);
  console.log(`  Tokens: ${res.usage.input_tokens} in / ${res.usage.output_tokens} out`);
  console.log(`  Stop:   ${res.stop_reason}`);
  console.log('\n✓ Anthropic API key is working.');
}

main().catch((err) => {
  console.error('✗ Request failed:', err.message ?? err);
  process.exit(1);
});
