import fs from 'fs';
import type { ParsedSummary } from './types';

export function parseSummary(filePath: string): ParsedSummary {
  const content = fs.readFileSync(filePath, 'utf-8');

  const nameMatch = content.match(/^# Training:\s*(.+)$/m);
  const objectName = nameMatch ? nameMatch[1].trim() : 'unknown';

  const promptMatch = content.match(/## Prompt\n([\s\S]*?)(?=\n## )/);
  const prompt = promptMatch ? promptMatch[1].trim() : '';

  const scoreMatches = [...content.matchAll(/Iteration \d+: Score (\d+)\/10/g)];
  const finalScore = scoreMatches.length > 0
    ? parseInt(scoreMatches[scoreMatches.length - 1][1], 10)
    : 0;

  const techniqueBlockMatch = content.match(
    /## Proposed agent\.md Addition\n([\s\S]*?)(?=\n## (?!#)|$)/
  );
  const techniqueBlock = techniqueBlockMatch ? techniqueBlockMatch[1].trim() : '';

  const techNameMatch = techniqueBlock.match(/^### Technique:\s*(.+)$/m);
  const techniqueName = techNameMatch ? techNameMatch[1].trim() : 'Unknown';

  const kwMatch = techniqueBlock.match(/^Keywords:\s*(.+)$/m);
  const keywords = kwMatch
    ? kwMatch[1].split(',').map(k => k.trim().toLowerCase()).filter(k => k.length > 0)
    : [];

  const vfMatch = content.match(/## New Visual Failures\n([\s\S]*?)(?=\n## |$)/);
  const visualFailures = vfMatch ? vfMatch[1].trim() || null : null;

  const dtMatch = content.match(/## Decision Tree Update\n([\s\S]*?)(?=\n## |$)/);
  const decisionTreeUpdate = dtMatch ? dtMatch[1].trim() || null : null;

  return {
    objectName, prompt, finalScore, techniqueName, keywords,
    techniqueBlock, visualFailures, decisionTreeUpdate, sourcePath: filePath,
  };
}
