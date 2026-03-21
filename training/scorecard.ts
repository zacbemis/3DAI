#!/usr/bin/env npx tsx
// Scorecard: Tracks model quality over time from Level 2 and Level 3 reports
// Reads all reports, builds a historical scorecard, identifies weak areas
// Usage: npx tsx training/scorecard.ts

import fs from 'fs';
import path from 'path';
import { parseTechniquesFromContent, categorizeObject } from './lib/parse-techniques';

const scriptDir = path.dirname(decodeURIComponent(new URL(import.meta.url).pathname));
const appDir = path.resolve(scriptDir, '..');
const scorecardPath = path.join(scriptDir, 'scorecard.json');

interface ScoreEntry {
  date: string;
  level: 2 | 3;
  totalObjects: number;
  passed: number;
  failed: number;
  errors: number;
  avgScore: number;
  withTechniqueAvg: number | null;
  withoutTechniqueAvg: number | null;
  techniqueCount: number;
  scores: { object: string; score: number; feedback: string }[];
}

interface Scorecard {
  history: ScoreEntry[];
}

function parseLevel2Report(reportPath: string, date: string): ScoreEntry | null {
  try {
    const content = fs.readFileSync(reportPath, 'utf-8');
    const rows = content.match(/\| .+ \| \d+ \| \d+ \| (PASS|.*REGRESSION.*) \| .+ \|/g) || [];
    const errorRows = content.match(/\| .+ \| - \| \d+ \| ERROR \| .+ \|/g) || [];

    const scores: { object: string; score: number; feedback: string }[] = [];
    let passed = 0, failed = 0, errors = errorRows.length;

    for (const row of rows) {
      const parts = row.split('|').map(s => s.trim()).filter(s => s);
      if (parts.length >= 4) {
        const object = parts[0];
        const score = parseInt(parts[1]) || 0;
        const feedback = parts[4] || '';
        scores.push({ object, score, feedback });
        if (parts[3].includes('REGRESSION')) failed++;
        else passed++;
      }
    }

    const allScores = scores.map(s => s.score);
    const avg = allScores.length > 0 ? allScores.reduce((a, b) => a + b, 0) / allScores.length : 0;

    // Count techniques from agent.md
    const agentPath = fs.existsSync(path.join(appDir, 'agent-prod.md'))
      ? path.join(appDir, 'agent-prod.md')
      : path.join(appDir, 'agent.md');
    const agent = fs.readFileSync(agentPath, 'utf-8');
    const techniqueCount = (agent.match(/### Technique:/g) || []).length;

    return {
      date,
      level: 2,
      totalObjects: passed + failed + errors,
      passed,
      failed,
      errors,
      avgScore: Math.round(avg * 10) / 10,
      withTechniqueAvg: null,
      withoutTechniqueAvg: null,
      techniqueCount,
      scores,
    };
  } catch {
    return null;
  }
}

function parseLevel3Report(reportPath: string, date: string): ScoreEntry | null {
  try {
    const content = fs.readFileSync(reportPath, 'utf-8');

    // Parse the summary line
    const avgMatch = content.match(/Average: ([\d.]+)\/10/);
    const passedMatch = content.match(/Passed \(6\+\): (\d+)/);
    const failedMatch = content.match(/Failed \(<6\): (\d+)/);
    const errorsMatch = content.match(/Errors: (\d+)/);

    // Parse individual scores from table
    const scores: { object: string; score: number; feedback: string }[] = [];
    const tableRows = content.match(/\| \d+ \| .+ \| \d+ \(.+\) \| .+ \| .+ \|/g) || [];

    for (const row of tableRows) {
      const parts = row.split('|').map(s => s.trim()).filter(s => s);
      if (parts.length >= 5) {
        const object = parts[1];
        const scoreStr = parts[2].match(/(\d+)/);
        const score = scoreStr ? parseInt(scoreStr[1]) : 0;
        const feedback = parts[4] || '';
        scores.push({ object, score, feedback });
      }
    }

    // Parse technique comparison
    const withTechMatch = content.match(/Objects with matching techniques scored: ([\d.]+)/);
    const withoutTechMatch = content.match(/Objects without matching techniques scored: ([\d.]+)/);

    const agentPath = fs.existsSync(path.join(appDir, 'agent-prod.md'))
      ? path.join(appDir, 'agent-prod.md')
      : path.join(appDir, 'agent.md');
    const agent = fs.readFileSync(agentPath, 'utf-8');
    const techniqueCount = (agent.match(/### Technique:/g) || []).length;

    return {
      date,
      level: 3,
      totalObjects: parseInt(passedMatch?.[1] || '0') + parseInt(failedMatch?.[1] || '0') + parseInt(errorsMatch?.[1] || '0'),
      passed: parseInt(passedMatch?.[1] || '0'),
      failed: parseInt(failedMatch?.[1] || '0'),
      errors: parseInt(errorsMatch?.[1] || '0'),
      avgScore: parseFloat(avgMatch?.[1] || '0'),
      withTechniqueAvg: withTechMatch ? parseFloat(withTechMatch[1]) : null,
      withoutTechniqueAvg: withoutTechMatch ? parseFloat(withoutTechMatch[1]) : null,
      techniqueCount,
      scores,
    };
  } catch {
    return null;
  }
}

function findReports(): { path: string; date: string; level: 2 | 3 }[] {
  const reports: { path: string; date: string; level: 2 | 3 }[] = [];

  // Level 2 reports
  const l2Dir = '/tmp/regression_level2';
  if (fs.existsSync(l2Dir)) {
    for (const dateDir of fs.readdirSync(l2Dir)) {
      const reportPath = path.join(l2Dir, dateDir, 'report.md');
      if (fs.existsSync(reportPath)) {
        reports.push({ path: reportPath, date: dateDir, level: 2 });
      }
    }
  }

  // Level 3 reports
  const l3Dir = '/tmp/level3_test';
  if (fs.existsSync(l3Dir)) {
    for (const dateDir of fs.readdirSync(l3Dir)) {
      const reportPath = path.join(l3Dir, dateDir, 'report.md');
      if (fs.existsSync(reportPath)) {
        reports.push({ path: reportPath, date: dateDir, level: 3 });
      }
    }
  }

  return reports.sort((a, b) => a.date.localeCompare(b.date));
}

function identifyWeakAreas(entries: ScoreEntry[]): string[] {
  const weakAreas: string[] = [];

  // Collect all scores across all entries
  const objectScores = new Map<string, number[]>();
  for (const entry of entries) {
    for (const s of entry.scores) {
      if (!objectScores.has(s.object)) objectScores.set(s.object, []);
      objectScores.get(s.object)!.push(s.score);
    }
  }

  // Find consistently low-scoring objects
  for (const [object, scores] of objectScores) {
    const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
    if (avg < 6) {
      weakAreas.push(`${object}: avg ${avg.toFixed(1)} across ${scores.length} tests`);
    }
  }

  // Find categories that struggle (objects with similar keywords)
  const latest = entries[entries.length - 1];
  if (latest) {
    const lowScores = latest.scores.filter(s => s.score < 6);
    if (lowScores.length > 0) {
      weakAreas.push(`Latest run: ${lowScores.length} objects scored below 6`);
    }
  }

  return weakAreas;
}

function main() {
  console.log('=== Model Scorecard ===\n');

  const reports = findReports();
  if (reports.length === 0) {
    console.log('No Level 2 or Level 3 reports found.');
    console.log('Run: npm run regression -- --full  (Level 2)');
    console.log('Run: npm run level3                (Level 3)');
    return;
  }

  const entries: ScoreEntry[] = [];
  for (const r of reports) {
    const entry = r.level === 2
      ? parseLevel2Report(r.path, r.date)
      : parseLevel3Report(r.path, r.date);
    if (entry) entries.push(entry);
  }

  // Display history
  console.log('HISTORY:');
  console.log('  Date         Level  Objects  Passed  Failed  Errors  Avg Score  Techniques');
  console.log('  ----------   -----  -------  ------  ------  ------  ---------  ----------');
  for (const e of entries) {
    console.log(`  ${e.date}   L${e.level}     ${String(e.totalObjects).padStart(3)}     ${String(e.passed).padStart(3)}     ${String(e.failed).padStart(3)}     ${String(e.errors).padStart(3)}      ${String(e.avgScore).padStart(4)}/10     ${e.techniqueCount}`);
  }

  // Latest scores summary
  const latestL2 = [...entries].reverse().find(e => e.level === 2);
  const latestL3 = [...entries].reverse().find(e => e.level === 3);

  console.log('\nLATEST SCORES:');
  if (latestL2) {
    console.log(`  Level 2 (trained objects):   ${latestL2.avgScore}/10 avg, ${latestL2.passed}/${latestL2.totalObjects} passed`);
  }
  if (latestL3) {
    console.log(`  Level 3 (untrained objects): ${latestL3.avgScore}/10 avg, ${latestL3.passed}/${latestL3.totalObjects} passed`);
    if (latestL3.withTechniqueAvg !== null) {
      console.log(`    With technique match:    ${latestL3.withTechniqueAvg}/10`);
      console.log(`    Without technique match: ${latestL3.withoutTechniqueAvg}/10`);
      const techBoost = (latestL3.withTechniqueAvg || 0) - (latestL3.withoutTechniqueAvg || 0);
      console.log(`    Technique boost:         ${techBoost > 0 ? '+' : ''}${techBoost.toFixed(1)} points`);
    }
  }

  // Category scoring
  const agentPath = fs.existsSync(path.join(appDir, 'agent-prod.md'))
    ? path.join(appDir, 'agent-prod.md')
    : path.join(appDir, 'agent.md');
  const agentContent = fs.readFileSync(agentPath, 'utf-8');
  const techniques = parseTechniquesFromContent(agentContent);

  // Collect all scores by category from latest entries
  const categoryScores: Record<string, number[]> = {};
  const latestEntries = [latestL2, latestL3].filter(Boolean) as ScoreEntry[];
  for (const entry of latestEntries) {
    for (const s of entry.scores) {
      if (s.score <= 0) continue;
      const { primary } = categorizeObject(s.object, techniques);
      if (!categoryScores[primary]) categoryScores[primary] = [];
      categoryScores[primary].push(s.score);
    }
  }

  const MIN_N = 5;
  console.log('\nCATEGORY SCORES:');
  const categoryOrder = ['revolution', 'mechanical', 'organic', 'enclosure', 'pattern', 'extrusion', 'assembly', 'uncategorized'];
  for (const cat of categoryOrder) {
    const scores = categoryScores[cat];
    if (!scores || scores.length === 0) continue;
    const avg = (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1);
    const flag = scores.length >= MIN_N && parseFloat(avg) < 6.5 ? '  ← WEAK' : '';
    const sample = scores.length < MIN_N ? '  (low sample)' : '';
    console.log(`  ${cat.padEnd(16)} ${avg}/10 avg (${scores.length} objects)${flag}${sample}`);
  }

  // Generate training recommendations for weak categories
  const weakCategories = categoryOrder.filter(cat => {
    const scores = categoryScores[cat];
    return scores && scores.length >= MIN_N && (scores.reduce((a, b) => a + b, 0) / scores.length) < 6.5;
  });

  if (weakCategories.length > 0) {
    const recLines: string[] = [
      `# Training Recommendations (auto-generated from scorecard)`,
      `Generated: ${new Date().toISOString().slice(0, 10)}`,
      '',
    ];

    for (const cat of weakCategories) {
      const scores = categoryScores[cat]!;
      const avg = (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1);
      recLines.push(`## ${cat.toUpperCase()} (avg ${avg}, ${scores.length} objects) — NEEDS TRAINING`);
      recLines.push('');

      // Find low-scoring objects in this category
      recLines.push('### Retrain (scored below 6):');
      for (const entry of latestEntries) {
        for (const s of entry.scores) {
          if (s.score > 0 && s.score < 6) {
            const { primary } = categorizeObject(s.object, techniques);
            if (primary === cat) {
              recLines.push(`- ${s.object}: scored ${s.score} — "${s.feedback}"`);
            }
          }
        }
      }
      recLines.push('');
    }

    const recPath = path.join(scriptDir, 'recommendations.md');
    fs.writeFileSync(recPath, recLines.join('\n') + '\n');
    console.log(`\nRecommendations saved to: ${recPath}`);
  }

  // Trend
  if (entries.length >= 2) {
    const first = entries[0];
    const last = entries[entries.length - 1];
    const scoreDiff = last.avgScore - first.avgScore;
    const techDiff = last.techniqueCount - first.techniqueCount;
    console.log('\nTREND:');
    console.log(`  Score change: ${scoreDiff > 0 ? '+' : ''}${scoreDiff.toFixed(1)} (${first.avgScore} → ${last.avgScore})`);
    console.log(`  Techniques:   ${techDiff > 0 ? '+' : ''}${techDiff} (${first.techniqueCount} → ${last.techniqueCount})`);
  }

  // Weak areas
  const weakAreas = identifyWeakAreas(entries);
  if (weakAreas.length > 0) {
    console.log('\nWEAK AREAS (focus training here):');
    for (const area of weakAreas) {
      console.log(`  - ${area}`);
    }
  }

  // Training recommendations
  console.log('\nRECOMMENDATIONS:');
  if (latestL3 && latestL3.withTechniqueAvg !== null && latestL3.withoutTechniqueAvg !== null) {
    if ((latestL3.withoutTechniqueAvg || 0) < 5) {
      console.log('  - Low untrained score — agent.md knowledge is not generalizing well');
      console.log('    Action: Train more diverse objects to broaden technique coverage');
    }
    if ((latestL3.withTechniqueAvg || 0) < 7) {
      console.log('  - Trained objects scoring low — techniques need better code templates');
      console.log('    Action: Retrain weak objects with specific feedback');
    }
    if ((latestL3.withTechniqueAvg || 0) - (latestL3.withoutTechniqueAvg || 0) < 1) {
      console.log('  - Technique boost is minimal — agent.md may not be adding value');
      console.log('    Action: Check if techniques are being matched correctly (keyword gaps)');
    }
  }
  if (latestL2 && latestL2.failed > 0) {
    console.log(`  - ${latestL2.failed} Level 2 regressions — some trained objects got worse`);
    console.log('    Action: Check Level 2 report for specific objects to retrain');
  }
  if (latestL2 && latestL2.errors > 0) {
    console.log(`  - ${latestL2.errors} Level 2 errors — compile failures or invalid code`);
    console.log('    Action: Simplify techniques that produce complex geometry');
  }
  if (weakCategories.length > 0) {
    console.log(`  - ${weakCategories.length} weak categories detected: ${weakCategories.join(', ')}`);
    console.log('    Action: See training/recommendations.md for specific objects to retrain');
  }

  // Save scorecard
  const scorecard: Scorecard = { history: entries };
  fs.writeFileSync(scorecardPath, JSON.stringify(scorecard, null, 2) + '\n');
  console.log(`\nScorecard saved to: ${scorecardPath}`);
}

main();
