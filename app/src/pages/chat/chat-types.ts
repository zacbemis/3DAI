export type ChatRole = 'user' | 'assistant' | 'system';

/** Aligns with planned SSE `status` stages (ts_express_compose_mvp). */
export type GenerationStage =
  | 'queued'
  | 'generating_scad'
  | 'compiling'
  | 'rendering'
  | 'compositing'
  | 'evaluating'
  | 'revising'
  | 'awaiting_review';

export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  createdAt: number;
  stage?: GenerationStage;
}
