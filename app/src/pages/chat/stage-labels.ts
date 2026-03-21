import type { GenerationStage } from './chat-types';

export const STAGE_LABELS: Record<GenerationStage, string> = {
  queued: 'Queued',
  generating_scad: 'Generating OpenSCAD',
  compiling: 'Compiling geometry',
  rendering: 'Rendering views',
  compositing: 'Compositing preview',
  evaluating: 'Vision evaluation',
  revising: 'Revising model',
  awaiting_review: 'Awaiting your review',
};
