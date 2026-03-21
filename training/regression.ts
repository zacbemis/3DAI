import fs from 'fs';
import path from 'path';
import { runLevel1, type Baseline } from './lib/regression-runner';
import { runLevel2 } from './lib/level2-runner';

const scriptDir = path.dirname(decodeURIComponent(new URL(import.meta.url).pathname));
const appDir = path.resolve(scriptDir, '..');
const agentMdPath = path.join(appDir, 'agent.md');
const regressionJsonPath = path.join(scriptDir, 'regression.json');

const args = process.argv.slice(2);
const fullMode = args.includes('--full');

async function main() {
  if (!fs.existsSync(agentMdPath)) {
    console.log('ERROR: agent.md not found at ' + agentMdPath);
    process.exit(1);
  }

  if (!fs.existsSync(regressionJsonPath)) {
    console.log('No regression baselines found. Create training/regression.json first.');
    process.exit(0);
  }

  const agentContent = fs.readFileSync(agentMdPath, 'utf-8');
  const data = JSON.parse(fs.readFileSync(regressionJsonPath, 'utf-8'));
  const baselines: Baseline[] = data.baselines;

  if (baselines.length === 0) {
    console.log('No baselines in regression.json.');
    process.exit(0);
  }

  // Level 1: Routing regression (always runs)
  console.log('=== Routing Regression (Level 1) ===\n');

  const results = runLevel1(agentContent, baselines);
  let l1Passed = 0;
  let l1Failed = 0;

  for (const r of results) {
    if (r.status === 'pass') {
      l1Passed++;
      console.log(`  PASS  ${r.objectName} -> [${r.matched.join(', ')}]`);
    } else {
      l1Failed++;
      console.log(`  FAIL  ${r.objectName} -> expected [${r.expected.join(', ')}]`);
      console.log(`        matched [${r.matched.join(', ')}]`);
      console.log(`        missing [${r.missing!.join(', ')}]`);
    }
  }

  console.log(`\n${l1Passed}/${results.length} passed, ${l1Failed} FAILED\n`);

  // Level 2: Generation regression (only with --full)
  if (!fullMode) {
    if (l1Failed > 0) process.exit(1);
    return;
  }

  const withMinScore = baselines.filter(b => b.minScore !== null);
  if (withMinScore.length === 0) {
    console.log('No baselines have minScore set. Set minScore on approved baselines to enable Level 2.\n');
    if (l1Failed > 0) process.exit(1);
    return;
  }

  console.log('=== Generation Regression (Level 2) ===');
  console.log(`Testing ${withMinScore.length} baselines with minScore (3 runs each)`);
  console.log('Backend: Claude Code (claude --print)\n');

  const { execSync } = await import('child_process');

  const generateFn = async (system: string, prompt: string): Promise<string> => {
    const fullPrompt = `${system}\n\n${prompt}\n\nOutput ONLY valid OpenSCAD code. No explanation, no markdown fences.`;
    try {
      const output = execSync(
        `cat <<'GENPROMPT' | claude --print --allowedTools 'Read'\n${fullPrompt}\nGENPROMPT`,
        { timeout: 120000, stdio: ['pipe', 'pipe', 'pipe'], shell: '/bin/bash' }
      ).toString().trim();
      return output.replace(/^```(?:openscad)?\n?/m, '').replace(/\n?```$/m, '').trim();
    } catch (e: any) {
      throw new Error(`Generation failed: ${e.message?.slice(0, 200)}`);
    }
  };

  const workDir = path.join('/tmp', 'regression_level2', new Date().toISOString().slice(0, 10));
  fs.mkdirSync(workDir, { recursive: true });

  const evaluateFn = async (prompt: string, _imagePath: string): Promise<{ score: number; feedback: string }> => {
    // prompt already contains paths to all 4 PNGs (built by level2-runner)
    try {
      const output = execSync(
        `cat <<'EVALPROMPT' | claude --print --allowedTools 'Read'\n${prompt}\nEVALPROMPT`,
        { timeout: 120000, stdio: ['pipe', 'pipe', 'pipe'], shell: '/bin/bash' }
      ).toString().trim();
      const scoreMatch = output.match(/SCORE:\s*(\d+)/i);
      const feedbackMatch = output.match(/FEEDBACK:\s*(.+)/i);
      if (!scoreMatch) {
        const failLog = path.join(workDir, 'scorer-failures.log');
        fs.appendFileSync(failLog, `[${new Date().toISOString()}] Failed to parse score from:\n${output.slice(0, 200)}\n\n`);
      }
      return {
        score: scoreMatch ? parseInt(scoreMatch[1], 10) : 5,
        feedback: feedbackMatch ? feedbackMatch[1].trim() : 'no feedback',
      };
    } catch {
      return { score: 5, feedback: 'scorer failed' };
    }
  };

  const l2Results = await runLevel2(agentContent, baselines, workDir, generateFn, evaluateFn);

  let l2Passed = 0;
  let l2Failed = 0;
  let l2Skipped = 0;
  let l2Errors = 0;

  console.log('');
  for (const r of l2Results) {
    switch (r.status) {
      case 'pass':
        l2Passed++;
        console.log(`  PASS  ${r.objectName}: ${r.score}/10 (baseline ${r.baselineScore}) — ${r.feedback || ''}`);
        break;
      case 'regression':
        l2Failed++;
        console.log(`  REGR  ${r.objectName}: ${r.score}/10 (baseline ${r.baselineScore}) — ${r.feedback || ''} (opened in browser)`);
        break;
      case 'skipped':
        l2Skipped++;
        console.log(`  SKIP  ${r.objectName}: no minScore set`);
        break;
      case 'error':
        l2Errors++;
        console.log(`  ERR   ${r.objectName}: ${r.error}`);
        break;
    }
  }

  console.log(`\nLevel 2: ${l2Passed} passed, ${l2Failed} regression, ${l2Skipped} skipped, ${l2Errors} errors`);
  console.log(`Renders saved to: ${workDir}`);

  // Save results to a report file
  const reportLines: string[] = [
    `# Level 2 Regression Report — ${new Date().toISOString().slice(0, 10)}`,
    '',
    `Total: ${l2Results.length} | Passed: ${l2Passed} | Regression: ${l2Failed} | Skipped: ${l2Skipped} | Errors: ${l2Errors}`,
    '',
    '## Results',
    '',
    '| Object | Score | Baseline | Status | Feedback |',
    '|--------|-------|----------|--------|----------|',
  ];
  for (const r of l2Results) {
    switch (r.status) {
      case 'pass':
        reportLines.push(`| ${r.objectName} | ${r.score} | ${r.baselineScore} | PASS | ${r.feedback || ''} |`);
        break;
      case 'regression':
        reportLines.push(`| ${r.objectName} | ${r.score} | ${r.baselineScore} | **REGRESSION** | ${r.feedback || ''} |`);
        break;
      case 'skipped':
        reportLines.push(`| ${r.objectName} | - | - | skipped | |`);
        break;
      case 'error':
        reportLines.push(`| ${r.objectName} | - | ${r.baselineScore} | ERROR | ${r.error?.slice(0, 80)} |`);
        break;
    }
  }

  // Recommendations section
  const regressions = l2Results.filter(r => r.status === 'regression');
  const lowScores = l2Results.filter(r => r.status === 'pass' && r.score !== undefined && r.score < 7);
  const errors = l2Results.filter(r => r.status === 'error');

  reportLines.push('');
  reportLines.push('## Recommendations');
  reportLines.push('');

  if (regressions.length > 0) {
    reportLines.push('### Retrain (regression detected)');
    for (const r of regressions) {
      reportLines.push(`- **${r.objectName}**: dropped from ${r.baselineScore} to ${r.score}. ${r.feedback || ''}`);
      reportLines.push(`  Render: \`open ${r.renderDir}/grid.html\``);
    }
    reportLines.push('');
  }

  if (lowScores.length > 0) {
    reportLines.push('### Improve (passing but low quality)');
    for (const r of lowScores) {
      reportLines.push(`- **${r.objectName}**: scored ${r.score} (baseline ${r.baselineScore}). ${r.feedback || ''}`);
    }
    reportLines.push('');
  }

  if (errors.length > 0) {
    reportLines.push('### Fix (errors during generation)');
    for (const r of errors) {
      reportLines.push(`- **${r.objectName}**: ${r.error}`);
    }
    reportLines.push('');
  }

  if (regressions.length === 0 && lowScores.length === 0 && errors.length === 0) {
    reportLines.push('All baselines passing at or above baseline scores. No action needed.');
    reportLines.push('');
  }

  reportLines.push(`Renders saved to: ${workDir}`);

  const reportPath = path.join(workDir, 'report.md');
  fs.writeFileSync(reportPath, reportLines.join('\n') + '\n');
  console.log(`Report saved to: ${reportPath}`);

  if (l1Failed > 0 || l2Failed > 0) process.exit(1);
}

main().catch(err => {
  console.error('ERROR:', err.message);
  process.exit(1);
});
