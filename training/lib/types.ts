export interface ParsedSummary {
  objectName: string;
  prompt: string;
  finalScore: number;
  techniqueName: string;
  keywords: string[];
  techniqueBlock: string;  // full ### Technique: ... block
  visualFailures: string | null;  // raw table rows
  decisionTreeUpdate: string | null;  // raw rows
  sourcePath: string;  // path to summary.md
}

export interface DuplicateResult {
  type: 'new' | 'duplicate';
  match?: string;  // name of the matching technique
  overlapPercent?: number;
}

export interface MergeAction {
  summary: ParsedSummary;
  action: 'auto-merge' | 'flag-review' | 'flag-low-score';
  duplicate?: DuplicateResult;
}
