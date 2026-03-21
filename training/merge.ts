import fs from 'fs';
import path from 'path';
import readline from 'readline';
import { parseSummary } from './lib/parse-summary';
import { parseTechniquesFromContent } from './lib/parse-techniques';
import { detectDuplicate } from './lib/deduplicate';
import {
  findInsertionPoint,
  insertTechnique,
  insertVisualFailure,
  backupAndWrite,
} from './lib/merge-agent-md';
import { archiveTraining } from './lib/archive';
import { runLevel1, type Baseline } from './lib/regression-runner';
import { execSync } from 'child_process';
import type { ParsedSummary, MergeAction } from './lib/types';

// --- Config ---
const SCORE_THRESHOLD = 7;
const AUTO_APPROVE_THRESHOLD = 7;  // auto-approve scores >= this in --auto mode
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const autoMode = args.includes('--auto');  // non-interactive: auto-approve >= 7, skip < 7
const scanPath = args.find(a => !a.startsWith('--') && !a.startsWith('/')) || '/tmp/training';
// Resolve app root from script location (training/merge.ts → project root)
const scriptDir = path.dirname(decodeURIComponent(new URL(import.meta.url).pathname));
const appDir = path.resolve(scriptDir, '..');
const agentMdPath = path.join(appDir, 'agent.md');
const archiveBase = path.join(appDir, 'training', 'archive');
const agentPrompt = path.join(scriptDir, 'train-object.md');
const retrainPids: number[] = [];

async function main() {
  console.log('=== Training Merge Pipeline ===');
  console.log(`Scan path: ${scanPath}`);
  console.log(`Dry run: ${dryRun}`);
  console.log('');

  // 1. Scan
  if (!fs.existsSync(scanPath)) {
    console.log(`No training directory found at ${scanPath}`);
    process.exit(1);
  }

  const dirs = fs.readdirSync(scanPath, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => path.join(scanPath, d.name))
    .filter(d => fs.existsSync(path.join(d, 'summary.md')));

  if (dirs.length === 0) {
    console.log('No training summaries found.');
    process.exit(0);
  }
  console.log(`Found ${dirs.length} training summaries.\n`);

  // 2. Parse
  const summaries: ParsedSummary[] = [];
  for (const dir of dirs) {
    try {
      const s = parseSummary(path.join(dir, 'summary.md'));
      s.sourcePath = dir;
      summaries.push(s);
      console.log(`  Parsed: ${s.objectName} (score ${s.finalScore}, technique: ${s.techniqueName})`);
    } catch (e: any) {
      console.log(`  WARN: Skipping ${dir} — ${e.message}`);
    }
  }
  console.log('');

  // 3. Read existing agent.md
  if (!fs.existsSync(agentMdPath)) {
    console.log('ERROR: agent.md not found at ' + agentMdPath);
    process.exit(1);
  }
  let agentContent = fs.readFileSync(agentMdPath, 'utf-8');

  // Parse existing techniques for dedup
  const parsedTechs = parseTechniquesFromContent(agentContent);
  const existingTechs = parsedTechs.map(t => ({ name: t.name, keywords: t.keywords }));
  const existingCount = existingTechs.length;
  console.log(`Existing techniques in agent.md: ${existingCount}\n`);

  // 4. Classify each summary
  const actions: MergeAction[] = [];
  const allRefs = [...existingTechs];

  for (const s of summaries) {
    if (s.finalScore < SCORE_THRESHOLD) {
      actions.push({ summary: s, action: 'flag-low-score' });
      continue;
    }

    const dup = detectDuplicate(
      { name: s.techniqueName, keywords: s.keywords },
      allRefs
    );

    if (dup.type === 'duplicate') {
      actions.push({ summary: s, action: 'flag-review', duplicate: dup });
    } else {
      actions.push({ summary: s, action: 'auto-merge' });
      allRefs.push({ name: s.techniqueName, keywords: s.keywords });
    }
  }

  // 5. Process actions
  let merged = 0;
  let flagged = 0;
  let skipped = 0;
  let visualFailuresAdded = 0;
  const decisionTreeUpdates: string[] = [];
  const processedDirs: string[] = [];

  // Auto-merges — show render for approval
  for (const a of actions.filter(a => a.action === 'auto-merge')) {
    console.log(`\nAuto-merge candidate: ${a.summary.techniqueName} (score ${a.summary.finalScore}, from ${a.summary.objectName})`);
    if (dryRun) {
      console.log('  (dry run — would auto-merge)');
      merged++;
    } else if (autoMode) {
      if (a.summary.finalScore >= AUTO_APPROVE_THRESHOLD) {
        console.log(`  AUTO-APPROVED (score ${a.summary.finalScore} >= ${AUTO_APPROVE_THRESHOLD})`);
        agentContent = insertTechnique(agentContent, a.summary.techniqueBlock);
        merged++;
        processedDirs.push(a.summary.sourcePath);
        addOrUpdateBaseline(a.summary);
      } else {
        console.log(`  AUTO-SKIPPED (score ${a.summary.finalScore} < ${AUTO_APPROVE_THRESHOLD})`);
        skipped++;
      }
    } else {
      openRender(a.summary.sourcePath);
      const choice = await ask('  [a]pprove / [r]etrain / [s]kip? ');
      if (choice === 'a') {
        agentContent = insertTechnique(agentContent, a.summary.techniqueBlock);
        merged++;
        processedDirs.push(a.summary.sourcePath);
        addOrUpdateBaseline(a.summary);
      } else if (choice === 'r') {
        await retrain(a.summary);
      } else {
        skipped++;
      }
    }
  }

  // Low-score flags
  for (const a of actions.filter(a => a.action === 'flag-low-score')) {
    console.log(`\nLow score (${a.summary.finalScore}/10): ${a.summary.techniqueName} from ${a.summary.objectName}`);
    if (dryRun) {
      flagged++;
    } else if (autoMode) {
      if (a.summary.finalScore >= AUTO_APPROVE_THRESHOLD) {
        console.log(`  AUTO-APPROVED (score ${a.summary.finalScore} >= ${AUTO_APPROVE_THRESHOLD})`);
        agentContent = insertTechnique(agentContent, a.summary.techniqueBlock);
        merged++;
        processedDirs.push(a.summary.sourcePath);
        addOrUpdateBaseline(a.summary);
      } else {
        console.log(`  AUTO-SKIPPED (score ${a.summary.finalScore} < ${AUTO_APPROVE_THRESHOLD})`);
        skipped++;
        processedDirs.push(a.summary.sourcePath);
      }
    } else {
      flagged++;
    }
  }

  // Duplicate flags
  for (const a of actions.filter(a => a.action === 'flag-review')) {
    console.log(`\nConflict: "${a.summary.techniqueName}" overlaps with "${a.duplicate!.match}" (${a.duplicate!.overlapPercent}%)`);
    console.log(`  From: ${a.summary.objectName} (score ${a.summary.finalScore})`);

    if (dryRun) {
      flagged++;
      continue;
    }

    if (autoMode) {
      // Auto mode: keep existing for conflicts (safer than auto-merging duplicates)
      console.log('  AUTO-SKIPPED (conflicts need human review)');
      skipped++;
      continue;
    }

    {
      openRender(a.summary.sourcePath);
      const choice = await ask('  [1] use this version / [2] keep existing / [m]anual merge / [s]kip? ');
      if (choice === '1') {
        const existingBlock = extractExistingTechnique(agentContent, a.duplicate!.match!);
        const mergedBlock = mergeKeywordsAndPitfalls(a.summary.techniqueBlock, existingBlock);
        agentContent = insertTechnique(agentContent, mergedBlock);
        // Validate merged keywords still match original prompt
        const mergedKwMatch = mergedBlock.match(/^Keywords:\s*(.+)$/m);
        if (mergedKwMatch) {
          console.log(`  Merged keywords: ${mergedKwMatch[1]}`);
        }
        merged++;
        addOrUpdateBaseline(a.summary);
      } else if (choice === '2') {
        // Keep existing — still archive so it doesn't re-appear
        processedDirs.push(a.summary.sourcePath);
      } else if (choice === 'm') {
        const tmpFile = '/tmp/merge-edit.md';
        const existingBlock = extractExistingTechnique(agentContent, a.duplicate!.match!);
        fs.writeFileSync(tmpFile, `<!-- EXISTING -->\n${existingBlock}\n\n<!-- NEW -->\n${a.summary.techniqueBlock}\n`);
        const editor = process.env.EDITOR || 'nano';
        const { execSync } = await import('child_process');
        execSync(`${editor} ${tmpFile}`, { stdio: 'inherit' });
        const edited = fs.readFileSync(tmpFile, 'utf-8').trim();
        agentContent = insertTechnique(agentContent, edited);
        merged++;
        addOrUpdateBaseline(a.summary);
      } else {
        skipped++;
        // Don't archive skipped — leave in /tmp/training for next run
      }
      // Only archive if we actually did something with it
      if (choice === '1' || choice === '2' || choice === 'm') {
        processedDirs.push(a.summary.sourcePath);
      }
    }
  }

  // Visual failures
  for (const s of summaries) {
    if (s.visualFailures) {
      console.log(`Adding visual failure(s) from ${s.objectName}`);
      if (!dryRun) {
        agentContent = insertVisualFailure(agentContent, s.visualFailures);
      }
      visualFailuresAdded++;
    }
  }

  // Decision tree updates (print only, don't auto-insert)
  for (const s of summaries) {
    if (s.decisionTreeUpdate) {
      decisionTreeUpdates.push(`From ${s.objectName}:\n${s.decisionTreeUpdate}`);
    }
  }

  // 6. Write
  if (!dryRun && merged > 0) {
    backupAndWrite(agentMdPath, agentContent);
  }

  // 6b. Run Level 1 regression
  if (!dryRun && merged > 0) {
    const regressionJsonPath = path.join(appDir, 'training', 'regression.json');
    if (fs.existsSync(regressionJsonPath)) {
      const data = JSON.parse(fs.readFileSync(regressionJsonPath, 'utf-8'));
      const baselines: Baseline[] = data.baselines;
      if (baselines.length > 0) {
        console.log('\n--- Routing Regression Check ---');
        const results = runLevel1(agentContent, baselines);
        const failures = results.filter(r => r.status === 'fail');
        if (failures.length > 0) {
          console.log(`WARNING: ${failures.length} routing regression(s) detected:`);
          for (const f of failures) {
            console.log(`  FAIL  ${f.objectName}: missing [${f.missing!.join(', ')}]`);
          }
          const choice = await ask('\n  [p]roceed anyway / [r]ollback? ');
          if (choice === 'r') {
            const bakPath = agentMdPath + '.bak';
            if (fs.existsSync(bakPath)) {
              fs.copyFileSync(bakPath, agentMdPath);
              console.log('Rolled back to agent.md.bak');
              agentContent = fs.readFileSync(agentMdPath, 'utf-8');
              merged = 0;
              processedDirs.length = 0;  // Don't archive rolled-back merges
            }
          }
        } else {
          console.log(`Routing regression: ${results.length}/${results.length} passed`);
        }
      }
    }
  }

  // 7. Validate
  const newTechRegex = /### Technique: (.+)\n\s*Keywords:/g;
  let newCount = 0;
  while (newTechRegex.exec(agentContent) !== null) newCount++;
  console.log(`\nValidation: ${newCount} techniques found (was ${existingCount}, added ${merged})`);
  if (newCount !== existingCount + merged) {
    console.log('WARNING: Expected ' + (existingCount + merged) + ' techniques but found ' + newCount);
  }

  // 8. Archive
  if (!dryRun && processedDirs.length > 0) {
    const archived = archiveTraining(processedDirs, archiveBase);
    console.log(`Archived to: ${archived[0] ? path.dirname(archived[0]) : archiveBase}`);
  }

  // 9. Report
  console.log('\n=== Merge Report ===');
  console.log(`Scanned: ${dirs.length} summaries`);
  console.log(`Auto-merged: ${merged} techniques`);
  console.log(`Flagged: ${flagged}`);
  console.log(`Skipped: ${skipped}`);
  console.log(`Visual failures added: ${visualFailuresAdded}`);
  if (decisionTreeUpdates.length > 0) {
    console.log(`\nDecision tree updates to review (${decisionTreeUpdates.length}):`);
    decisionTreeUpdates.forEach(u => console.log(u));
  }
  if (!dryRun && !autoMode && decisionTreeUpdates.length > 0) {
    const dtChoice = await ask('  Apply decision tree updates to agent.md? [y]es / [n]o: ');
    if (dtChoice === 'y') {
      // Find the decision tree table in agent.md (section 1)
      const tableEndMatch = agentContent.match(/\| .+ \| → .+ \| .+ \|[^\n]*\n(?=\n)/);
      if (tableEndMatch && tableEndMatch.index !== undefined) {
        const insertAt = tableEndMatch.index + tableEndMatch[0].length;
        let newRows = '';
        for (const update of decisionTreeUpdates) {
          const rows = update.match(/\| .+ \| .+ \| .+ \|/g);
          if (rows) newRows += rows.join('\n') + '\n';
        }
        if (newRows) {
          agentContent = agentContent.slice(0, insertAt) + newRows + agentContent.slice(insertAt);
          backupAndWrite(agentMdPath, agentContent);
          console.log('  Decision tree updated.');
        }
      }
    }
  }
  if (dryRun) console.log('\n(dry run — no files modified)');
}

function mergeKeywordsAndPitfalls(newBlock: string, existingBlock: string): string {
  const newKw = newBlock.match(/^Keywords:\s*(.+)$/m);
  const exKw = existingBlock.match(/^Keywords:\s*(.+)$/m);
  if (newKw && exKw) {
    const allKw = [...new Set([
      ...newKw[1].split(',').map(k => k.trim().toLowerCase()),
      ...exKw[1].split(',').map(k => k.trim().toLowerCase()),
    ])].filter(k => k.length > 0);
    newBlock = newBlock.replace(/^Keywords:\s*.+$/m, `Keywords: ${allKw.join(', ')}`);
  }

  const exPitfalls = existingBlock.match(/\*\*Pitfalls:\*\*\n([\s\S]*?)(?=\n\*\*|\n###|\n---|$)/);
  const newPitfalls = newBlock.match(/\*\*Pitfalls:\*\*\n([\s\S]*?)(?=\n\*\*|\n###|\n---|$)/);
  if (exPitfalls && newPitfalls) {
    const exLines = exPitfalls[1].trim().split('\n').map(l => l.trim());
    const newLines = newPitfalls[1].trim().split('\n').map(l => l.trim());
    const merged = [...new Set([...newLines, ...exLines])];
    newBlock = newBlock.replace(
      /\*\*Pitfalls:\*\*\n[\s\S]*?(?=\n\*\*|\n###|\n---|$)/,
      `**Pitfalls:**\n${merged.join('\n')}`
    );
  }

  return newBlock;
}

function extractExistingTechnique(content: string, name: string): string {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`### Technique: ${escaped}[\\s\\S]*?(?=\\n### Technique:|\\n## [\\w\\d]|$)`);
  const match = content.match(regex);
  return match ? match[0] : '';
}

function openRender(sourcePath: string): void {
  // Find the best render to show — check for grid.html, then grid.png, then iso.png
  // Look in final/ first, then iterate backwards through iter_N/
  const dirs = ['final'];
  try {
    const entries = fs.readdirSync(sourcePath, { withFileTypes: true })
      .filter(e => e.isDirectory() && e.name.startsWith('iter_'))
      .map(e => e.name)
      .sort((a, b) => {
        const numA = parseInt(a.replace('iter_', ''));
        const numB = parseInt(b.replace('iter_', ''));
        return numB - numA;  // highest iteration first
      });
    dirs.push(...entries);
  } catch {}

  for (const dir of dirs) {
    const dirPath = path.join(sourcePath, dir);
    if (!fs.existsSync(dirPath)) continue;

    // If 4 PNGs exist but no grid.html, create it
    const isoPng = path.join(dirPath, 'iso.png');
    const frontPng = path.join(dirPath, 'front.png');
    const rightPng = path.join(dirPath, 'right.png');
    const topPng = path.join(dirPath, 'top.png');
    const gridHtml = path.join(dirPath, 'grid.html');

    if (!fs.existsSync(gridHtml) && fs.existsSync(isoPng) && fs.existsSync(frontPng) && fs.existsSync(rightPng) && fs.existsSync(topPng)) {
      fs.writeFileSync(gridHtml, `<html><body style="margin:0;padding:0;background:#fff;display:grid;grid-template-columns:1fr 1fr;gap:2px">
<div><div style="background:rgba(0,0,0,0.6);color:#fff;padding:4px 8px;font-family:sans-serif;font-size:14px">Isometric</div><img src="iso.png" style="width:100%"></div>
<div><div style="background:rgba(0,0,0,0.6);color:#fff;padding:4px 8px;font-family:sans-serif;font-size:14px">Front</div><img src="front.png" style="width:100%"></div>
<div><div style="background:rgba(0,0,0,0.6);color:#fff;padding:4px 8px;font-family:sans-serif;font-size:14px">Right</div><img src="right.png" style="width:100%"></div>
<div><div style="background:rgba(0,0,0,0.6);color:#fff;padding:4px 8px;font-family:sans-serif;font-size:14px">Top</div><img src="top.png" style="width:100%"></div>
</body></html>`);
    }

    // Prefer grid.html (shows all 4 views labeled)
    if (fs.existsSync(gridHtml)) {
      console.log(`  Opening render: ${gridHtml}`);
      try { execSync(`open "${gridHtml}"`, { stdio: 'ignore' }); } catch {}
      return;
    }

    // Fall back to grid.png
    const gridPng = path.join(dirPath, 'grid.png');
    if (fs.existsSync(gridPng)) {
      console.log(`  Opening render: ${gridPng}`);
      try { execSync(`open "${gridPng}"`, { stdio: 'ignore' }); } catch {}
      return;
    }

    // Fall back to iso.png (at least show something)
    if (fs.existsSync(isoPng)) {
      console.log(`  Opening render: ${isoPng}`);
      try { execSync(`open "${isoPng}"`, { stdio: 'ignore' }); } catch {}
      return;
    }
  }

  console.log('  (no render found to display)');
}

function addOrUpdateBaseline(summary: ParsedSummary): void {
  const regressionJsonPath = path.join(scriptDir, 'regression.json');
  let data: { baselines: any[] } = { baselines: [] };

  if (fs.existsSync(regressionJsonPath)) {
    data = JSON.parse(fs.readFileSync(regressionJsonPath, 'utf-8'));
  }

  // Check if baseline already exists for this object
  const existing = data.baselines.find(
    (b: any) => b.objectName === summary.objectName || b.prompt === summary.prompt
  );

  if (existing) {
    // Update minScore if the new score is higher
    if (existing.minScore === null || summary.finalScore > existing.minScore) {
      existing.minScore = summary.finalScore;
      existing.approvedDate = new Date().toISOString().slice(0, 10);
      console.log(`  Updated baseline: ${summary.objectName} minScore → ${summary.finalScore}`);
    }
  } else {
    // Add new baseline
    const entry = {
      prompt: summary.prompt,
      expectedTechniques: summary.keywords.length > 0 ? [summary.techniqueName] : [],
      minScore: summary.finalScore,
      approvedDate: new Date().toISOString().slice(0, 10),
      objectName: summary.objectName,
    };
    data.baselines.push(entry);
    console.log(`  Added baseline: ${summary.objectName} (minScore ${summary.finalScore})`);
  }

  fs.writeFileSync(regressionJsonPath, JSON.stringify(data, null, 2) + '\n');
}

async function retrain(summary: ParsedSummary): Promise<void> {
  const feedback = await ask('  What should it fix? (or Enter to skip): ');
  const feedbackNote = feedback
    ? `\n\nHuman feedback on previous attempt: "${feedback}"\nFix this specific issue first.`
    : '';

  // Read previous best code
  let previousCode = '// no previous code found';
  const finalScad = path.join(summary.sourcePath, 'final', 'model.scad');
  if (fs.existsSync(finalScad)) {
    previousCode = fs.readFileSync(finalScad, 'utf-8');
  } else {
    // Try to find the highest iteration's .scad
    try {
      const iters = fs.readdirSync(summary.sourcePath, { withFileTypes: true })
        .filter(e => e.isDirectory() && e.name.startsWith('iter_'))
        .map(e => e.name)
        .sort((a, b) => parseInt(b.replace('iter_', '')) - parseInt(a.replace('iter_', '')));
      for (const iter of iters) {
        const scadPath = path.join(summary.sourcePath, iter, 'model.scad');
        if (fs.existsSync(scadPath)) {
          previousCode = fs.readFileSync(scadPath, 'utf-8');
          break;
        }
      }
    } catch {}
  }

  const objName = summary.objectName.replace(/\s+/g, '_').toLowerCase();
  const workDir = `/tmp/training/${objName}_retrain_${Date.now()}`;
  fs.mkdirSync(workDir, { recursive: true });

  console.log(`  Launching retrain agent for "${summary.prompt}"...`);
  console.log(`  Work dir: ${workDir}`);

  const { spawn } = require('child_process');
  const child = spawn('bash', ['-c', `cat <<'PROMPT' | claude --print --allowedTools 'Bash,Read,Write,Glob,Grep' > "${workDir}/agent-output.log" 2>&1
Read ${agentPrompt} for your instructions. Then read ${appDir}/agent.md for current techniques.

Your object prompt is: "${summary.prompt}"
Your work directory is: ${workDir}
The OpenSCAD binary is at /opt/homebrew/bin/openscad

The previous training attempt scored ${summary.finalScore}/10.${feedbackNote}

Here is the previous best OpenSCAD code — start from this and fix the issues instead of starting from scratch:
\`\`\`openscad
${previousCode}
\`\`\`

Use the external scorer as described in the instructions. Do NOT score yourself. Do NOT open a browser.
PROMPT`], { detached: true, stdio: 'ignore' });

  child.unref();
  retrainPids.push(child.pid);
  console.log(`  Retrain agent launched (PID ${child.pid}). Will appear in next merge run.`);

  // Archive the old attempt so it doesn't show up again
  const archiveDir = path.join(archiveBase, 'retrained');
  fs.mkdirSync(archiveDir, { recursive: true });
  const destDir = path.join(archiveDir, path.basename(summary.sourcePath));
  if (!fs.existsSync(destDir)) {
    try {
      fs.cpSync(summary.sourcePath, destDir, { recursive: true });
      fs.rmSync(summary.sourcePath, { recursive: true });
    } catch {}
  }
}

function ask(prompt: string): Promise<string> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve => {
    rl.question(prompt, answer => {
      rl.close();
      resolve(answer.trim().toLowerCase());
    });
  });
}

main().catch(err => {
  console.error('ERROR:', err.message);
  process.exit(1);
});
