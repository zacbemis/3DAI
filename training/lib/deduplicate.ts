import type { DuplicateResult } from './types';

interface TechniqueRef {
  name: string;
  keywords: string[];
}

export function keywordOverlap(a: string[], b: string[]): number {
  const shorter = a.length <= b.length ? a : b;
  const longer = new Set(a.length > b.length ? a : b);
  if (shorter.length === 0) return 0;
  const overlap = shorter.filter(k => longer.has(k)).length;
  return Math.round(overlap / shorter.length * 100);
}

export function detectDuplicate(
  candidate: TechniqueRef,
  existing: TechniqueRef[]
): DuplicateResult {
  for (const ex of existing) {
    if (candidate.name.toLowerCase() === ex.name.toLowerCase()) {
      return {
        type: 'duplicate',
        match: ex.name,
        overlapPercent: keywordOverlap(candidate.keywords, ex.keywords),
      };
    }

    const overlap = keywordOverlap(candidate.keywords, ex.keywords);
    if (overlap > 50) {
      return { type: 'duplicate', match: ex.name, overlapPercent: overlap };
    }
  }

  return { type: 'new' };
}
