import { getTechniqueIndex, getRulesAndLimitations } from '../skills';

const BASE_IDENTITY = `You are an expert OpenSCAD programmer that generates production-ready, printable 3D models.`;

const STRUCTURE_RULES = `STRUCTURE:
- One module per component, assembly at the end
- Descriptive variable names for all dimensions
- Keep models 20-120mm and watertight/manifold
- Never assign CSG to variables. Nest operators directly.`;

const OUTPUT_RULES = `OUTPUT: Only valid OpenSCAD code. No explanation, no markdown fences.`;

/**
 * Build the full system prompt for generation requests.
 * Includes identity, OpenSCAD rules from agent-prod.md (sections 5-6),
 * structure rules, the technique index, and output format.
 */
export function buildGenerateSystemPrompt(): string {
  const rules = getRulesAndLimitations();
  const index = getTechniqueIndex();

  const parts = [BASE_IDENTITY];

  if (rules) parts.push(rules);
  else {
    // Fallback if agent-prod.md is missing
    parts.push(`OPENSCAD RULES:
- Variables are constants — you CANNOT reassign them
- fillet(), chamfer(), round_edges(), thread() DO NOT EXIST
- for() loops create implicit unions — NOT imperative loops
- Set $fn = 120 for smooth curves
- All dimensions in millimeters
- First child in difference() is the base; rest are subtracted`);
  }

  parts.push(STRUCTURE_RULES);

  if (index) {
    parts.push(`AVAILABLE TECHNIQUES (reference — use the matching technique's patterns when relevant):\n${index}`);
  }

  parts.push(OUTPUT_RULES);

  return parts.join('\n\n');
}

/**
 * Build the system prompt for modification requests.
 */
export function buildModifySystemPrompt(): string {
  const rules = getRulesAndLimitations();

  const parts = [
    `You are an expert OpenSCAD programmer.

The user will provide an existing OpenSCAD file and a modification request.
Respond with ONLY the complete modified .scad file — no explanation, no markdown fences.

Rules:
1. Preserve all parts of the original that the modification doesn't affect.
2. Apply the requested change precisely and minimally.
3. Keep $fn = 120 and all existing modules/variables unless asked to change them.
4. The output must be the full file, not a diff or partial snippet.
5. Do not add comments explaining what changed.`,
  ];

  if (rules) parts.push(rules);

  return parts.join('\n\n');
}

/**
 * Format matched techniques as a user-message block.
 */
export function formatTechniqueGuidance(skills: string): string {
  if (!skills) return '';
  return `\nTECHNIQUE GUIDANCE (proven patterns — use these code templates as your starting point):\n${skills}`;
}

export function stripCodeFences(text: string): string {
  return text
    .replace(/^```(?:openscad|scad)?\n?/m, '')
    .replace(/\n?```$/m, '')
    .trim();
}
