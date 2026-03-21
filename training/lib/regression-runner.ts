import { parseTechniquesFromContent, matchTechniques } from './parse-techniques';

export interface Baseline {
  prompt: string;
  expectedTechniques: string[];
  minScore: number | null;
  approvedDate: string;
  objectName: string;
}

export interface RegressionResult {
  objectName: string;
  prompt: string;
  status: 'pass' | 'fail';
  matched: string[];
  expected: string[];
  missing?: string[];
}

export function runLevel1(agentContent: string, baselines: Baseline[]): RegressionResult[] {
  const techniques = parseTechniquesFromContent(agentContent);
  const results: RegressionResult[] = [];

  for (const baseline of baselines) {
    const matched = matchTechniques(baseline.prompt, techniques);
    const matchedNames = matched.map(t => t.name);
    const missing = baseline.expectedTechniques.filter(e => !matchedNames.includes(e));

    results.push({
      objectName: baseline.objectName,
      prompt: baseline.prompt,
      status: missing.length === 0 ? 'pass' : 'fail',
      matched: matchedNames,
      expected: baseline.expectedTechniques,
      missing: missing.length > 0 ? missing : undefined,
    });
  }

  return results;
}
