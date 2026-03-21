#!/usr/bin/env npx tsx
// Auto-queue: reads scorecard + Level 2/3 reports, generates a training queue
// Picks objects that need retraining + new objects for weak categories
// Usage: npx tsx training/auto-queue.ts

import fs from 'fs';
import path from 'path';
import { parseTechniquesFromContent, categorizeObject } from './lib/parse-techniques';

const scriptDir = path.dirname(decodeURIComponent(new URL(import.meta.url).pathname));
const appDir = path.resolve(scriptDir, '..');
const queuePath = path.join(scriptDir, 'next-batch.txt');

const CATEGORY_EXPANSION: Record<string, string[]> = {
  revolution: [
    "a goblet with a stem", "a bell shape", "a chalice", "a wine decanter", "a birdbath bowl",
    "a mortar bowl", "a shot glass", "an hourglass shape", "a candle holder cylinder",
    "a flower pot with rim", "a baptismal font", "a pedestal trophy", "a tall vase with narrow neck",
  ],
  mechanical: [
    "a wing nut", "a cam lever", "a shaft collar", "a clevis pin", "a rivet with dome head",
    "a hand wheel", "a ratchet pawl", "a timing belt pulley", "a thrust bearing washer",
    "a set screw with allen socket", "a hex standoff 10mm", "a shoulder bolt",
  ],
  organic: [
    "a ladle with long handle", "an ergonomic mouse shape", "a shoe horn", "a butter knife",
    "a gardening trowel", "a soup ladle", "a boomerang", "a pipe with curved bowl",
    "an ice cream scoop", "a saddle shape", "a whale tail fin", "a pebble shape",
  ],
  enclosure: [
    "a pill box with 7 compartments", "a ring box", "a soap travel case", "a mint tin",
    "an AirPods case", "a dice box", "a sewing kit box", "a first aid box",
    "a waterproof match container", "a jewelry box with slots", "a toolbox with handle",
  ],
  pattern: [
    "a trivet for hot pots", "a drain grate 100mm", "a speaker grille", "an air vent with louvers",
    "a perforated screen", "a floor drain with cross bars", "a decorative lattice panel",
    "a manhole cover with diamond pattern", "a heat sink with fins", "a waffle pattern plate",
  ],
  extrusion: [
    "a curtain rail section", "a cable tray section", "a door sweep seal", "a baseboard molding",
    "an I-beam section", "a C-channel strut", "a T-bar ceiling rail", "a sliding door track",
    "a weatherstrip gasket", "a window frame cross section", "an L-angle bar",
  ],
  assembly: [
    "a bookend pair", "a monitor arm mount", "a shelf peg", "a cabinet hinge",
    "a TV wall mount bracket", "a bike phone mount", "a tripod base",
    "a guitar wall hanger", "a coat rack with hooks", "a shoe rack tier",
  ],
  uncategorized: [
    "a chess pawn", "a paperweight dome", "a mushroom shape", "a crown",
    "a pyramid", "a lighthouse miniature", "a castle turret", "a rocket ship",
    "a snowflake ornament", "a tree ornament", "a DNA helix model",
  ],
};

interface QueueItem {
  prompt: string;
  reason: string;
  category: string;
}

function main() {
  const queue: QueueItem[] = [];

  const agentPath = fs.existsSync(path.join(appDir, 'agent-prod.md'))
    ? path.join(appDir, 'agent-prod.md')
    : path.join(appDir, 'agent.md');
  const agentContent = fs.readFileSync(agentPath, 'utf-8');
  const techniques = parseTechniquesFromContent(agentContent);

  // 1. Read Level 2 report for regressions and errors
  const l2Dir = '/tmp/regression_level2';
  if (fs.existsSync(l2Dir)) {
    const dates = fs.readdirSync(l2Dir).sort().reverse();
    for (const date of dates) {
      const reportPath = path.join(l2Dir, date, 'report.md');
      if (!fs.existsSync(reportPath)) continue;
      const content = fs.readFileSync(reportPath, 'utf-8');

      // Find regressions
      const regressions = content.match(/\| (.+?) \| \d+ \| \d+ \| \*\*REGRESSION\*\* \| (.+?) \|/g) || [];
      for (const row of regressions) {
        const parts = row.split('|').map(s => s.trim()).filter(s => s);
        if (parts.length >= 4) {
          const { primary } = categorizeObject(parts[0], techniques);
          queue.push({
            prompt: parts[0],
            reason: `L2 regression: ${parts[4] || 'score dropped'}`,
            category: primary,
          });
        }
      }

      // Find errors
      const errors = content.match(/\| (.+?) \| - \| \d+ \| ERROR \| (.+?) \|/g) || [];
      for (const row of errors) {
        const parts = row.split('|').map(s => s.trim()).filter(s => s);
        if (parts.length >= 4) {
          const { primary } = categorizeObject(parts[0], techniques);
          queue.push({
            prompt: parts[0],
            reason: `L2 error: ${parts[4] || 'compile failed'}`,
            category: primary,
          });
        }
      }

      break; // Only use latest report
    }
  }

  // 2. Read Level 3 report for failures
  const l3Dir = '/tmp/level3_test';
  if (fs.existsSync(l3Dir)) {
    const dates = fs.readdirSync(l3Dir).sort().reverse();
    for (const date of dates) {
      const reportPath = path.join(l3Dir, date, 'report.md');
      if (!fs.existsSync(reportPath)) continue;
      const content = fs.readFileSync(reportPath, 'utf-8');

      const rows = content.match(/\| \d+ \| (.+?) \| (.+?) \| (\d+) \(FAIL\) \|/g) || [];
      for (const row of rows) {
        const parts = row.split('|').map(s => s.trim()).filter(s => s);
        if (parts.length >= 4) {
          queue.push({
            prompt: parts[1],
            reason: `L3 fail: scored ${parts[3]}`,
            category: parts[2],
          });
        }
      }

      break;
    }
  }

  // 3. Read scorecard for weak categories
  const scorecardPath = path.join(scriptDir, 'scorecard.json');
  const weakCategories: string[] = [];
  if (fs.existsSync(scorecardPath)) {
    const scorecard = JSON.parse(fs.readFileSync(scorecardPath, 'utf-8'));
    // Check category scores from latest entry
    const latest = scorecard.history?.[scorecard.history.length - 1];
    if (latest) {
      const catScores: Record<string, number[]> = {};
      for (const s of latest.scores || []) {
        if (s.score <= 0) continue;
        const { primary } = categorizeObject(s.object, techniques);
        if (!catScores[primary]) catScores[primary] = [];
        catScores[primary].push(s.score);
      }
      for (const [cat, scores] of Object.entries(catScores)) {
        if (scores.length >= 5) {
          const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
          if (avg < 6.5) weakCategories.push(cat);
        }
      }
    }
  }

  // 4. For weak categories, add expansion objects (not already queued or trained)
  const alreadyQueued = new Set(queue.map(q => q.prompt.toLowerCase()));
  const regressionPath = path.join(scriptDir, 'regression.json');
  const trained = new Set<string>();
  if (fs.existsSync(regressionPath)) {
    const reg = JSON.parse(fs.readFileSync(regressionPath, 'utf-8'));
    for (const b of reg.baselines || []) {
      trained.add(b.prompt.toLowerCase());
    }
  }

  for (const cat of weakCategories) {
    const expansion = CATEGORY_EXPANSION[cat] || [];
    let added = 0;
    for (const prompt of expansion) {
      if (added >= 5) break;
      if (alreadyQueued.has(prompt.toLowerCase()) || trained.has(prompt.toLowerCase())) continue;
      queue.push({
        prompt,
        reason: `expand weak category: ${cat}`,
        category: cat,
      });
      alreadyQueued.add(prompt.toLowerCase());
      added++;
    }
  }

  // Output
  if (queue.length === 0) {
    console.log('No training needed! All levels passing, no weak categories.');
    return;
  }

  console.log(`=== Auto-Queue: ${queue.length} objects to train ===\n`);

  // Group by reason type
  const retrains = queue.filter(q => q.reason.startsWith('L2 regression') || q.reason.startsWith('L2 error'));
  const l3Fails = queue.filter(q => q.reason.startsWith('L3 fail'));
  const expansions = queue.filter(q => q.reason.startsWith('expand'));

  if (retrains.length > 0) {
    console.log(`RETRAIN (${retrains.length} from Level 2 regressions/errors):`);
    for (const q of retrains) console.log(`  ${q.prompt} [${q.category}] — ${q.reason}`);
    console.log('');
  }

  if (l3Fails.length > 0) {
    console.log(`NEW TRAINING (${l3Fails.length} from Level 3 failures):`);
    for (const q of l3Fails) console.log(`  ${q.prompt} [${q.category}] — ${q.reason}`);
    console.log('');
  }

  if (expansions.length > 0) {
    console.log(`EXPAND WEAK CATEGORIES (${expansions.length}):`);
    for (const q of expansions) console.log(`  ${q.prompt} [${q.category}]`);
    console.log('');
  }

  // Write queue file
  const lines = [
    `# Next Training Batch (auto-generated ${new Date().toISOString().slice(0, 10)})`,
    `# ${queue.length} objects: ${retrains.length} retrains, ${l3Fails.length} L3 fails, ${expansions.length} expansions`,
    '#',
    '# Copy these into launch-training.sh OBJECTS array, or run:',
    '#   ./training/launch-training.sh  (if OBJECTS is updated)',
    '',
    ...queue.map(q => `"${q.prompt}"  # ${q.reason}`),
  ];

  fs.writeFileSync(queuePath, lines.join('\n') + '\n');
  console.log(`Queue saved to: ${queuePath}`);
  console.log(`Copy the prompts into launch-training.sh OBJECTS array to train.`);
}

main();
