// Pre-filters agent.md to only include relevant techniques for a given prompt.
// Usage: npx tsx training/filter-context.ts "prompt text" [output-dir]

import fs from 'fs';
import path from 'path';
import { parseTechniquesFromContent, matchTechniques } from './lib/parse-techniques';

const scriptDir = path.dirname(decodeURIComponent(new URL(import.meta.url).pathname));
const appDir = path.resolve(scriptDir, '..');
const agentMdPath = path.join(appDir, 'agent.md');

const prompt = process.argv[2];
const outputDir = process.argv[3];

if (!prompt) {
  console.error('Usage: npx tsx training/filter-context.ts "prompt" [output-dir]');
  process.exit(1);
}

const agentContent = fs.readFileSync(agentMdPath, 'utf-8');
const allTechniques = parseTechniquesFromContent(agentContent);
const matched = matchTechniques(prompt, allTechniques);

const sections: string[] = [];

// Section 1: Decision tree
const sec1 = agentContent.match(/## (?:\d+\.\s*)?How to Think About a Request[\s\S]*?(?=\n## )/);
if (sec1) sections.push(sec1[0]);

// Section 2: Evaluation
const sec2 = agentContent.match(/## (?:\d+\.\s*)?How to Evaluate Your Output[\s\S]*?(?=\n## )/);
if (sec2) sections.push(sec2[0]);

// Section 3: Iteration strategy
const sec3 = agentContent.match(/## (?:\d+\.\s*)?How to Iterate[\s\S]*?(?=\n## )/);
if (sec3) sections.push(sec3[0]);

// Matched techniques only
if (matched.length > 0) {
  sections.push('## Relevant Techniques\n');
  for (const t of matched) {
    sections.push(t.content);
    sections.push('\n---\n');
  }
}

// Section 5: OpenSCAD rules
const sec5 = agentContent.match(/## (?:\d+\.\s*)?OpenSCAD Language Rules[\s\S]*?(?=\n## )/);
if (sec5) sections.push(sec5[0]);

// Section 6: Limitations
const sec6 = agentContent.match(/## (?:\d+\.\s*)?What This Agent Cannot Do Well[\s\S]*?(?=\n## |$)/);
if (sec6) sections.push(sec6[0]);

const output = `# 3D Model Generation Agent (Filtered)\n\n${sections.join('\n\n')}`;
process.stdout.write(output);

// Write filter log
if (outputDir) {
  fs.mkdirSync(outputDir, { recursive: true });
  const logPath = path.join(outputDir, 'filter-log.txt');
  const logContent = matched.length > 0
    ? `Prompt: ${prompt}\nMatched ${matched.length}/${allTechniques.length} techniques:\n${matched.map(t => `  - ${t.name}`).join('\n')}\n`
    : `Prompt: ${prompt}\nMatched 0/${allTechniques.length} techniques. Agent will use general sections only.\n`;
  fs.writeFileSync(logPath, logContent);
}
