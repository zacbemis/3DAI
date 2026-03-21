#!/usr/bin/env npx tsx
// Generates agent-prod.md from agent.md
// Strips training-only sections, keeps techniques + OpenSCAD rules
// Usage: npx tsx training/build-prod.ts

import fs from 'fs';
import path from 'path';
import { parseTechniquesFromContent } from './lib/parse-techniques';

const scriptDir = path.dirname(decodeURIComponent(new URL(import.meta.url).pathname));
const appDir = path.resolve(scriptDir, '..');
const agentMdPath = path.join(appDir, 'agent.md');
const prodPath = path.join(appDir, 'agent-prod.md');

const agent = fs.readFileSync(agentMdPath, 'utf-8');
const techniques = parseTechniquesFromContent(agent);

// Extract OpenSCAD rules section
const rulesMatch = agent.match(/## (?:\d+\.\s*)?OpenSCAD Language Rules[\s\S]*?(?=\n## |$)/);
const rules = rulesMatch ? rulesMatch[0] : '';

// Extract limitations section
const limitsMatch = agent.match(/## (?:\d+\.\s*)?What This Agent Cannot Do Well[\s\S]*?(?=\n## |$)/);
const limits = limitsMatch ? limitsMatch[0] : '';

// Build prod file — just a technique index + full technique blocks
const lines: string[] = [
  '# 3D Model Generation — Technique Reference',
  '',
  `> Auto-generated from agent.md (${techniques.length} techniques). Do not edit directly.`,
  `> Regenerate with: npx tsx training/build-prod.ts`,
  '',
  '## Technique Index',
  '',
  '| # | Technique | Keywords (first 5) |',
  '|---|-----------|-------------------|',
];

for (let i = 0; i < techniques.length; i++) {
  const t = techniques[i];
  const kwPreview = t.keywords.slice(0, 5).join(', ') + (t.keywords.length > 5 ? '...' : '');
  lines.push(`| ${i + 1} | ${t.name} | ${kwPreview} |`);
}

lines.push('');
lines.push('## Techniques');
lines.push('');

for (const t of techniques) {
  lines.push(t.content);
  lines.push('');
  lines.push('---');
  lines.push('');
}

lines.push(rules);
lines.push('');
lines.push(limits);

const output = lines.join('\n');
fs.writeFileSync(prodPath, output);

const fullSize = agent.length;
const prodSize = output.length;
const techniqueCount = techniques.length;

console.log(`Generated agent-prod.md`);
console.log(`  Techniques: ${techniqueCount}`);
console.log(`  Full agent.md: ${Math.round(fullSize / 4)} tokens (~${(fullSize / 1024).toFixed(0)}KB)`);
console.log(`  agent-prod.md: ${Math.round(prodSize / 4)} tokens (~${(prodSize / 1024).toFixed(0)}KB)`);
console.log(`  Reduction: ${Math.round((1 - prodSize / fullSize) * 100)}%`);
console.log(`  Saved to: ${prodPath}`);
