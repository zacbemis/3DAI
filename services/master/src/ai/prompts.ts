import { getTechniqueIndex, getRulesAndLimitations } from '../skills';

const BASE_IDENTITY = `You are an expert OpenSCAD programmer that generates production-ready, printable 3D models.`;

const STRUCTURE_RULES = `STRUCTURE:
- One module per component, assembly at the end
- Descriptive variable names for all dimensions
- Keep models 20-120mm and watertight/manifold
- Never assign CSG to variables. Nest operators directly.`;

const FEW_SHOT_EXAMPLES = `EXAMPLES:

User: "a simple coffee mug"
Output:
$fn = 120;

body_d = 70;
body_h = 90;
wall = 3;

module mug_body() {
    difference() {
        cylinder(d = body_d, h = body_h);
        translate([0, 0, wall])
            cylinder(d = body_d - wall * 2, h = body_h);
    }
}

module handle() {
    translate([body_d / 2, 0, body_h * 0.55])
    rotate([0, 90, 0])
    difference() {
        scale([1.4, 1, 1])
            rotate_extrude(angle = 180)
                translate([12, 0, 0])
                    circle(d = 8);
        translate([-30, -20, -5])
            cube([60, 20, 10]);
    }
}

mug_body();
handle();

User: "a hex bolt M8x30"
Output:
$fn = 120;

bolt_d = 8;
bolt_l = 30;
head_d = 14.38;
head_h = 5.3;
thread_pitch = 1.25;
hex_af = 13;

module hex_head() {
    intersection() {
        cylinder(d = head_d, h = head_h, $fn = 6);
        translate([0, 0, head_h])
            rotate_extrude()
                translate([0, -head_h, 0])
                    polygon([[0, 0], [head_d, 0], [head_d, head_h], [head_d / 2 - 0.5, head_h]]);
    }
}

module shaft() {
    translate([0, 0, -bolt_l])
        cylinder(d = bolt_d, h = bolt_l);
}

module thread_helix() {
    translate([0, 0, -bolt_l])
    for (i = [0 : thread_pitch : bolt_l - 2]) {
        translate([0, 0, i])
            rotate_extrude()
                translate([bolt_d / 2 - 0.3, 0, 0])
                    polygon([[0, 0], [0.8, thread_pitch / 2], [0, thread_pitch]]);
    }
}

hex_head();
shaft();
thread_helix();`;

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

  parts.push(FEW_SHOT_EXAMPLES);
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

/**
 * Build the system prompt for error-fix retries.
 */
export function buildFixSystemPrompt(): string {
  const rules = getRulesAndLimitations();

  const parts = [
    `You are an expert OpenSCAD programmer fixing a broken .scad file.

The user will provide:
1. The OpenSCAD source code that failed to compile
2. The exact error/warning output from the OpenSCAD compiler

Your job: fix ONLY the errors. Do not redesign or simplify the model. Preserve the user's intent.

Common fixes:
- Variables in OpenSCAD are constants. You CANNOT reassign them. Use let() inside expressions or separate variable names.
- fillet(), chamfer(), round_edges(), thread() DO NOT EXIST. Use minkowski, offset, or CSG equivalents.
- for() produces implicit unions. It is NOT an imperative loop.
- The first child of difference() is the base. Everything after is subtracted.
- Missing semicolons after module calls or variable declarations.
- Mismatched braces or parentheses.

Output ONLY the complete fixed .scad file — no explanation, no markdown fences.`,
  ];

  if (rules) parts.push(rules);

  return parts.join('\n\n');
}

/**
 * Build the system prompt for vision-assisted revision.
 */
export function buildReviseSystemPrompt(): string {
  const rules = getRulesAndLimitations();

  const parts = [
    `You are an expert OpenSCAD programmer improving a 3D model.

The user will provide:
1. The current OpenSCAD source code
2. Screenshots of the compiled STL from multiple angles (front, right, top, perspective)
3. The original prompt describing what the model should look like

Your job: look at the screenshots, compare them to the original intent, identify what is wrong or could be improved, and output a COMPLETE revised .scad file.

Rules:
1. Fix geometry issues visible in the screenshots (wrong proportions, missing features, artifacts).
2. Keep working parts intact — only change what needs fixing.
3. Keep $fn = 120 and maintain clean module structure.
4. Output ONLY the full .scad file — no explanation, no markdown fences.
5. Do not add comments explaining what changed.`,
  ];

  if (rules) parts.push(rules);

  return parts.join('\n\n');
}

export function stripCodeFences(text: string): string {
  return text
    .replace(/^```(?:openscad|scad)?\n?/m, '')
    .replace(/\n?```$/m, '')
    .trim();
}
