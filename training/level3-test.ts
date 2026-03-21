#!/usr/bin/env npx tsx
// Level 3: Generalization test — random objects, 1 shot, no iterations
// Tests whether agent.md knowledge transfers to untrained objects
// Usage: npx tsx training/level3-test.ts

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { parseTechniquesFromContent, matchTechniques } from './lib/parse-techniques';
import { SYSTEM_PROMPT, buildEvalPrompt } from './lib/shared-prompts';
import { createGridHtml } from './lib/grid-html';

const scriptDir = path.dirname(decodeURIComponent(new URL(import.meta.url).pathname));
const appDir = path.resolve(scriptDir, '..');
const agentMdPath = path.join(appDir, 'agent-prod.md') || path.join(appDir, 'agent.md');

const OPENSCAD_PATHS = [
  '/opt/homebrew/bin/openscad',
  '/usr/local/bin/openscad',
  '/Applications/OpenSCAD.app/Contents/MacOS/OpenSCAD',
  '/Applications/OpenSCAD-2021.01.app/Contents/MacOS/OpenSCAD',
];

const VIEWS = [
  { name: 'iso', camera: '0,0,0,55,0,25,0', projection: '' },
  { name: 'front', camera: '0,0,0,90,0,0,0', projection: '--projection=ortho' },
  { name: 'right', camera: '0,0,0,90,0,90,0', projection: '--projection=ortho' },
  { name: 'top', camera: '0,0,0,0,0,0,0', projection: '--projection=ortho' },
];

interface PoolObject {
  prompt: string;
  category: string;
  tested: number;
}

interface Pool {
  description: string;
  objects: PoolObject[];
}

const poolPath = path.join(scriptDir, 'level3-pool.json');

function loadPool(): Pool {
  if (!fs.existsSync(poolPath)) {
    console.error('No level3-pool.json found. Create it first.');
    process.exit(1);
  }
  return JSON.parse(fs.readFileSync(poolPath, 'utf-8'));
}

function selectObjects(pool: Pool, count: number, regressionJsonPath: string): PoolObject[] {
  // Exclude objects already in regression.json (they're trained)
  const trained = new Set<string>();
  if (fs.existsSync(regressionJsonPath)) {
    const reg = JSON.parse(fs.readFileSync(regressionJsonPath, 'utf-8'));
    for (const b of reg.baselines || []) {
      trained.add(b.prompt.toLowerCase());
    }
  }

  const available = pool.objects.filter(o => !trained.has(o.prompt.toLowerCase()));

  // Weight selection toward least-tested objects and undersampled categories
  // Sort by: tested count (ascending), then shuffle within same count
  available.sort((a, b) => {
    if (a.tested !== b.tested) return a.tested - b.tested;
    return Math.random() - 0.5;
  });

  // Also ensure category diversity — pick at most 4 per category
  const selected: PoolObject[] = [];
  const categoryCount: Record<string, number> = {};
  const MAX_PER_CATEGORY = 4;

  for (const obj of available) {
    if (selected.length >= count) break;
    const catCount = categoryCount[obj.category] || 0;
    if (catCount >= MAX_PER_CATEGORY) continue;
    selected.push(obj);
    categoryCount[obj.category] = catCount + 1;
  }

  // If we still need more (all categories hit max), fill from remaining
  if (selected.length < count) {
    for (const obj of available) {
      if (selected.length >= count) break;
      if (!selected.includes(obj)) selected.push(obj);
    }
  }

  return selected;
}

function savePool(pool: Pool): void {
  fs.writeFileSync(poolPath, JSON.stringify(pool, null, 2) + '\n');
}

function checkPoolDepletion(pool: Pool): void {
  const categoryUntested: Record<string, number> = {};
  for (const obj of pool.objects) {
    if (obj.tested === 0) {
      categoryUntested[obj.category] = (categoryUntested[obj.category] || 0) + 1;
    }
  }
  for (const [cat, count] of Object.entries(categoryUntested)) {
    if (count < 10) {
      console.log(`WARNING: ${cat} pool nearly depleted (${count} untested objects remaining). Add more to level3-pool.json.`);
    }
  }
  // Also warn for categories with 0 untested
  const allCategories = ['revolution', 'mechanical', 'organic', 'enclosure', 'pattern', 'extrusion', 'assembly', 'uncategorized'];
  for (const cat of allCategories) {
    if (!categoryUntested[cat]) {
      console.log(`WARNING: ${cat} pool EMPTY. No untested objects remaining.`);
    }
  }
}

function findOpenSCAD(): string {
  for (const p of OPENSCAD_PATHS) {
    if (fs.existsSync(p)) return p;
  }
  throw new Error('OpenSCAD not found');
}

interface TestResult {
  prompt: string;
  category: string;
  techniquesMatched: string[];
  score: number;
  feedback: string;
  status: 'pass' | 'fail' | 'error';
  error?: string;
  renderDir: string;
}

async function testObject(
  obj: PoolObject,
  agentContent: string,
  workDir: string,
): Promise<TestResult> {
  const { prompt, category } = obj;
  const renderDir = path.join(workDir, prompt.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 40));
  fs.mkdirSync(renderDir, { recursive: true });

  const openscad = findOpenSCAD();
  const techniques = parseTechniquesFromContent(agentContent);
  const matched = matchTechniques(prompt, techniques);
  const matchedNames = matched.map(t => t.name);

  // Build generation prompt
  let skillsBlock = '';
  if (matched.length > 0) {
    const top4 = matched.slice(0, 4);
    skillsBlock = `\n\nTECHNIQUE GUIDANCE:\n${top4.map(t => t.content).join('\n\n---\n\n')}\n\nUse the code patterns above as your starting template.`;
  }

  const genPrompt = `${SYSTEM_PROMPT}${skillsBlock}\n\nCreate an OpenSCAD model of: ${prompt}\n\nOutput ONLY valid OpenSCAD code. No explanation, no markdown fences.`;

  try {
    // Generate code
    console.log(`  Generating...`);
    const code = execSync(
      `cat <<'GENPROMPT' | claude --print --allowedTools 'Read'\n${genPrompt}\nGENPROMPT`,
      { timeout: 120000, stdio: ['pipe', 'pipe', 'pipe'], shell: '/bin/bash' }
    ).toString().trim().replace(/^```(?:openscad)?\n?/m, '').replace(/\n?```$/m, '').trim();

    const scadPath = path.join(renderDir, 'model.scad');
    fs.writeFileSync(scadPath, code);

    // Compile
    console.log(`  Compiling...`);
    execSync(`"${openscad}" -o "${path.join(renderDir, 'model.stl')}" "${scadPath}"`, { timeout: 180000, stdio: 'pipe' });

    // Render 4 views
    console.log(`  Rendering...`);
    for (const view of VIEWS) {
      const outPath = path.join(renderDir, `${view.name}.png`);
      const projFlag = view.projection ? ` ${view.projection}` : '';
      try {
        execSync(
          `"${openscad}" -o "${outPath}" --camera=${view.camera} --autocenter --viewall --imgsize=800,600 --colorscheme=Tomorrow${projFlag} "${scadPath}"`,
          { timeout: 90000, stdio: 'pipe' }
        );
      } catch {}
    }

    createGridHtml(renderDir);

    // Score with external scorer
    console.log(`  Scoring...`);
    const evalPrompt = buildEvalPrompt(prompt, {
      iso: path.join(renderDir, 'iso.png'),
      front: path.join(renderDir, 'front.png'),
      right: path.join(renderDir, 'right.png'),
      top: path.join(renderDir, 'top.png'),
    });

    const scorerOutput = execSync(
      `cat <<'EVALPROMPT' | claude --print --allowedTools 'Read'\n${evalPrompt}\nEVALPROMPT`,
      { timeout: 120000, stdio: ['pipe', 'pipe', 'pipe'], shell: '/bin/bash' }
    ).toString().trim();

    const scoreMatch = scorerOutput.match(/SCORE:\s*(\d+)/i);
    const feedbackMatch = scorerOutput.match(/FEEDBACK:\s*(.+)/i);
    const score = scoreMatch ? parseInt(scoreMatch[1], 10) : 5;
    const feedback = feedbackMatch ? feedbackMatch[1].trim() : 'no feedback';

    return {
      prompt,
      category,
      techniquesMatched: matchedNames,
      score,
      feedback,
      status: score >= 6 ? 'pass' : 'fail',
      renderDir,
    };
  } catch (e: any) {
    return {
      prompt,
      category,
      techniquesMatched: matchedNames,
      score: 0,
      feedback: '',
      status: 'error',
      error: e.message?.slice(0, 100),
      renderDir,
    };
  }
}

async function main() {
  const agentPath = fs.existsSync(path.join(appDir, 'agent-prod.md'))
    ? path.join(appDir, 'agent-prod.md')
    : path.join(appDir, 'agent.md');
  const agentContent = fs.readFileSync(agentPath, 'utf-8');
  const techniques = parseTechniquesFromContent(agentContent);

  const workDir = path.join('/tmp', 'level3_test', new Date().toISOString().slice(0, 10));
  fs.mkdirSync(workDir, { recursive: true });

  const pool = loadPool();
  const regressionJsonPath = path.join(scriptDir, 'regression.json');
  const selected = selectObjects(pool, 20, regressionJsonPath);

  console.log(`Pool: ${pool.objects.length} objects, selected ${selected.length}`);
  const catCounts: Record<string, number> = {};
  selected.forEach(o => { catCounts[o.category] = (catCounts[o.category] || 0) + 1; });
  console.log(`Categories: ${Object.entries(catCounts).map(([k,v]) => `${k}:${v}`).join(', ')}\n`);

  console.log('=== Level 3: Generalization Test ===');
  console.log(`Agent: ${agentPath} (${techniques.length} techniques)`);
  console.log(`Testing ${selected.length} objects from rotating pool`);
  console.log(`Work dir: ${workDir}\n`);

  const results: TestResult[] = [];

  for (let i = 0; i < selected.length; i++) {
    const obj = selected[i];
    console.log(`[${i + 1}/${selected.length}] "${obj.prompt}" [${obj.category}] (${matchTechniques(obj.prompt, techniques).length} techniques matched)`);
    const result = await testObject(obj, agentContent, workDir);
    results.push(result);
    console.log(`  → Score: ${result.score}/10 ${result.status === 'error' ? '(ERROR: ' + result.error + ')' : '— ' + result.feedback}\n`);
  }

  // Update pool tested counts
  for (const obj of selected) {
    const poolObj = pool.objects.find(o => o.prompt === obj.prompt);
    if (poolObj) poolObj.tested++;
  }
  savePool(pool);
  checkPoolDepletion(pool);

  // Summary
  const passed = results.filter(r => r.status === 'pass');
  const failed = results.filter(r => r.status === 'fail');
  const errors = results.filter(r => r.status === 'error');
  const scores = results.filter(r => r.score > 0).map(r => r.score);
  const avg = scores.length > 0 ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1) : 'N/A';

  console.log('=== Results ===');
  console.log(`Passed (6+): ${passed.length} | Failed (<6): ${failed.length} | Errors: ${errors.length}`);
  console.log(`Average score: ${avg}/10`);
  console.log(`Techniques helped: ${results.filter(r => r.techniquesMatched.length > 0).length}/${results.length} had matching techniques`);

  // Report
  const reportLines = [
    `# Level 3 Generalization Report — ${new Date().toISOString().slice(0, 10)}`,
    '',
    `**${selected.length} objects from rotating pool, 1 shot each, no iterations**`,
    '',
    `Passed (6+): ${passed.length} | Failed (<6): ${failed.length} | Errors: ${errors.length} | Average: ${avg}/10`,
    '',
    '| # | Object | Category | Score | Techniques | Feedback |',
    '|---|--------|----------|-------|------------|----------|',
  ];

  for (let i = 0; i < results.length; i++) {
    const r = results[i];
    const techStr = r.techniquesMatched.length > 0 ? r.techniquesMatched.slice(0, 2).join(', ') : 'none';
    const status = r.status === 'error' ? 'ERROR' : r.score >= 6 ? 'PASS' : 'FAIL';
    reportLines.push(`| ${i + 1} | ${r.prompt} | ${r.category} | ${r.score} (${status}) | ${techStr} | ${r.feedback || r.error || ''} |`);
  }

  reportLines.push('');
  reportLines.push('## Key Insights');
  reportLines.push('');
  reportLines.push(`- Objects with matching techniques scored: ${(scores.filter((s, i) => results[i].techniquesMatched.length > 0).reduce((a, b) => a + b, 0) / Math.max(1, results.filter(r => r.techniquesMatched.length > 0 && r.score > 0).length)).toFixed(1)} avg`);
  reportLines.push(`- Objects without matching techniques scored: ${(scores.filter((s, i) => results[i].techniquesMatched.length === 0).reduce((a, b) => a + b, 0) / Math.max(1, results.filter(r => r.techniquesMatched.length === 0 && r.score > 0).length)).toFixed(1)} avg`);
  reportLines.push('');
  reportLines.push(`Renders: ${workDir}`);

  const reportPath = path.join(workDir, 'report.md');
  fs.writeFileSync(reportPath, reportLines.join('\n') + '\n');
  console.log(`\nReport: ${reportPath}`);

  // Open any fails in browser
  for (const r of failed) {
    const grid = path.join(r.renderDir, 'grid.html');
    if (fs.existsSync(grid)) {
      try { execSync(`open "${grid}"`, { stdio: 'ignore' }); } catch {}
    }
  }
}

main().catch(err => {
  console.error('ERROR:', err.message);
  process.exit(1);
});
