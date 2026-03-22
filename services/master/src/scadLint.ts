/**
 * Static lint checks for OpenSCAD source before sending to the compiler.
 * Catches common LLM mistakes that would always fail compilation.
 */

export interface LintWarning {
  line: number;
  message: string;
  severity: 'error' | 'warning';
}

const NONEXISTENT_FUNCTIONS = [
  'fillet', 'chamfer', 'round_edges', 'round_edge', 'smooth',
  'thread', 'threads', 'bevel', 'blend', 'loft',
  'extrude_along_path', 'sweep', 'pipe',
  'array', 'boolean', 'trim', 'extend',
];

const NONEXISTENT_RE = new RegExp(
  `\\b(${NONEXISTENT_FUNCTIONS.join('|')})\\s*\\(`,
  'g',
);

/**
 * Detect variable reassignment: same `name = ...;` at module scope appears more than once.
 * OpenSCAD variables are constants — reassignment silently uses only the last value,
 * which is almost never what LLMs intend.
 */
function checkReassignment(lines: string[]): LintWarning[] {
  const warnings: LintWarning[] = [];
  const seen = new Map<string, number>();
  let braceDepth = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    for (const ch of line) {
      if (ch === '{') braceDepth++;
      if (ch === '}') braceDepth = Math.max(0, braceDepth - 1);
    }

    if (braceDepth > 0) continue;

    const match = line.match(/^(\w+)\s*=\s*.+;/);
    if (!match) continue;
    const name = match[1];

    if (name === '$fn' || name === '$fa' || name === '$fs') continue;

    if (seen.has(name)) {
      warnings.push({
        line: i + 1,
        message: `Variable "${name}" reassigned (first at line ${seen.get(name)}). OpenSCAD vars are constants — only the last value is used.`,
        severity: 'warning',
      });
    } else {
      seen.set(name, i + 1);
    }
  }

  return warnings;
}

function checkNonexistentFunctions(lines: string[]): LintWarning[] {
  const warnings: LintWarning[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.trimStart().startsWith('//')) continue;

    NONEXISTENT_RE.lastIndex = 0;
    let match;
    while ((match = NONEXISTENT_RE.exec(line)) !== null) {
      warnings.push({
        line: i + 1,
        message: `"${match[1]}()" does not exist in OpenSCAD. Use CSG primitives, minkowski, or offset instead.`,
        severity: 'error',
      });
    }
  }

  return warnings;
}

function checkMissingFn(source: string): LintWarning[] {
  if (/\$fn\s*=/.test(source)) return [];
  if (/cylinder|sphere|circle|rotate_extrude/.test(source)) {
    return [{
      line: 1,
      message: 'No $fn set — curved surfaces will be low-poly. Add $fn = 120; at the top.',
      severity: 'warning',
    }];
  }
  return [];
}

export function lintScad(source: string): LintWarning[] {
  const lines = source.split('\n');
  return [
    ...checkNonexistentFunctions(lines),
    ...checkReassignment(lines),
    ...checkMissingFn(source),
  ];
}

/**
 * Format lint warnings as a string suitable for sending to the AI for auto-fix.
 * Includes both errors and warnings — variable reassignment is a 'warning' but
 * causes real bugs in OpenSCAD (silently uses only the last assignment).
 */
export function formatLintErrors(warnings: LintWarning[]): string {
  const actionable = warnings.filter((w) => w.severity === 'error' || w.severity === 'warning');
  if (actionable.length === 0) return '';
  return actionable
    .map((w) => `Line ${w.line} [${w.severity}]: ${w.message}`)
    .join('\n');
}
