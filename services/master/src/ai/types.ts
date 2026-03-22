export interface EvaluationResult {
  overall: number;
  accuracy: number;
  completeness: number;
  geometry: number;
  proportions: number;
  printability: number;
  critique: string;
  suggestions: string[];
}

export const DEFAULT_EVAL_THRESHOLD = 7;
export const DEFAULT_MAX_EVAL_STEPS = 3;
