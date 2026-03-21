import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { parseTechniquesFromContent, matchTechniques } from './parse-techniques';
import type { Baseline } from './regression-runner';
import { SYSTEM_PROMPT, buildEvalPrompt } from './shared-prompts';
import { createGridHtml } from './grid-html';

// Level 2: Generation regression — re-generate objects and check scores haven't dropped
// 1 run per baseline, scored with all 4 views, auto-opens regressions in browser

const OPENSCAD_PATHS = [
  '/opt/homebrew/bin/openscad',
  '/usr/local/bin/openscad',
  '/Applications/OpenSCAD.app/Contents/MacOS/OpenSCAD',
];

const VIEWS = [
  { name: 'iso', camera: '0,0,0,55,0,25,0', projection: '' },
  { name: 'front', camera: '0,0,0,90,0,0,0', projection: '--projection=ortho' },
  { name: 'right', camera: '0,0,0,90,0,90,0', projection: '--projection=ortho' },
  { name: 'top', camera: '0,0,0,0,0,0,0', projection: '--projection=ortho' },
];

const REGRESSION_THRESHOLD = 2;  // flag if score drops by 2+

export interface Level2Result {
  objectName: string;
  prompt: string;
  status: 'pass' | 'regression' | 'skipped' | 'error';
  score?: number;
  baselineScore: number | null;
  feedback?: string;
  renderDir?: string;
  error?: string;
}

function findOpenSCAD(): string {
  for (const p of OPENSCAD_PATHS) {
    if (fs.existsSync(p)) return p;
  }
  throw new Error('OpenSCAD not found');
}

function buildPrompts(agentContent: string, description: string): { system: string; generation: string } {
  const techniques = parseTechniquesFromContent(agentContent);
  const matched = matchTechniques(description, techniques);

  let skillsBlock = '';
  if (matched.length > 0) {
    skillsBlock = matched.map(t => t.content).join('\n\n---\n\n');
  }

  const generation = `Create an OpenSCAD model of: ${description}

${skillsBlock ? `TECHNIQUE GUIDANCE:\n${skillsBlock}\n\nUse the proven code patterns above as your starting template.` : ''}`;

  return { system: SYSTEM_PROMPT, generation };
}



async function generateAndScore(
  agentContent: string,
  prompt: string,
  renderDir: string,
  generateFn: (system: string, prompt: string) => Promise<string>,
  evaluateFn: (prompt: string, imagePath: string) => Promise<{ score: number; feedback: string }>
): Promise<{ score: number; feedback: string }> {
  fs.mkdirSync(renderDir, { recursive: true });

  const openscad = findOpenSCAD();
  const { system, generation } = buildPrompts(agentContent, prompt);

  // Generate code
  const code = await generateFn(system, generation);
  const scadPath = path.join(renderDir, 'model.scad');
  fs.writeFileSync(scadPath, code);

  // Compile
  const stlPath = path.join(renderDir, 'model.stl');
  try {
    execSync(`"${openscad}" -o "${stlPath}" "${scadPath}"`, { timeout: 180000, stdio: 'pipe' });
  } catch (e: any) {
    throw new Error(`Compile failed: ${e.stderr?.toString().slice(0, 200) || e.message}`);
  }

  if (!fs.existsSync(stlPath)) throw new Error('No STL produced');

  // Render 4 views
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

  // Create grid HTML
  createGridHtml(renderDir);

  // Check renders exist
  const isoPng = path.join(renderDir, 'iso.png');
  if (!fs.existsSync(isoPng)) throw new Error('No render produced');

  // Evaluate with all 4 views (scorer reads all PNGs)
  const evalPrompt = buildEvalPrompt(prompt, {
    iso: path.join(renderDir, 'iso.png'),
    front: path.join(renderDir, 'front.png'),
    right: path.join(renderDir, 'right.png'),
    top: path.join(renderDir, 'top.png'),
  });
  const result = await evaluateFn(evalPrompt, isoPng);
  return result;
}

export async function runLevel2(
  agentContent: string,
  baselines: Baseline[],
  workDir: string,
  generateFn: (system: string, prompt: string) => Promise<string>,
  evaluateFn: (prompt: string, imagePath: string) => Promise<{ score: number; feedback: string }>
): Promise<Level2Result[]> {
  const results: Level2Result[] = [];

  for (const baseline of baselines) {
    if (baseline.minScore === null) {
      results.push({
        objectName: baseline.objectName,
        prompt: baseline.prompt,
        status: 'skipped',
        baselineScore: null,
      });
      continue;
    }

    const renderDir = path.join(workDir, baseline.objectName.replace(/\s+/g, '_'));

    try {
      console.log(`  Testing: ${baseline.objectName}...`);
      const { score, feedback } = await generateAndScore(
        agentContent, baseline.prompt, renderDir, generateFn, evaluateFn
      );
      console.log(`    Score: ${score}/10 (baseline: ${baseline.minScore}) — ${feedback}`);

      const drop = baseline.minScore - score;
      const status = drop >= REGRESSION_THRESHOLD ? 'regression' : 'pass';

      if (status === 'regression') {
        // Auto-open regression renders so you can see what went wrong
        const gridPath = path.join(renderDir, 'grid.html');
        if (fs.existsSync(gridPath)) {
          try { execSync(`open "${gridPath}"`, { stdio: 'ignore' }); } catch {}
        }
      }

      results.push({
        objectName: baseline.objectName,
        prompt: baseline.prompt,
        status,
        score,
        baselineScore: baseline.minScore,
        feedback,
        renderDir,
      });
    } catch (e: any) {
      results.push({
        objectName: baseline.objectName,
        prompt: baseline.prompt,
        status: 'error',
        baselineScore: baseline.minScore,
        error: e.message,
      });
    }
  }

  return results;
}
