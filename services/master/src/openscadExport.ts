import { execFile } from 'node:child_process';
import { existsSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

/** Generic app name from openscad.org; versioned installs use e.g. OpenSCAD-2021.01.app */
const MACOS_OPENSCAD = '/Applications/OpenSCAD.app/Contents/MacOS/OpenSCAD';

function findDarwinOpenScadInApplications(): string | undefined {
  try {
    const apps = readdirSync('/Applications');
    const bundle = apps.find((name) => /^OpenSCAD.*\.app$/i.test(name));
    if (!bundle) return undefined;
    const bin = path.join('/Applications', bundle, 'Contents/MacOS/OpenSCAD');
    return existsSync(bin) ? bin : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Resolve the OpenSCAD executable.
 * - Set `OPENSCAD_PATH` in `.env` to the real binary if needed (must exist on disk).
 * - On macOS, any `OpenSCAD*.app` under /Applications is detected automatically.
 */
export function resolveOpenScadBinary(): string {
  const fromEnv = process.env.OPENSCAD_PATH?.trim();
  if (fromEnv && existsSync(fromEnv)) {
    return fromEnv;
  }
  if (process.platform === 'darwin') {
    const discovered = findDarwinOpenScadInApplications();
    if (discovered) return discovered;
    if (existsSync(MACOS_OPENSCAD)) return MACOS_OPENSCAD;
  }
  return 'openscad';
}

export type ScadToStlResult =
  | { ok: true; stlPath: string }
  | { ok: false; message: string };

/**
 * LLMs often wrap code in markdown fences; OpenSCAD will choke on trailing ```.
 */
export function sanitizeScadSource(raw: string): string {
  let s = raw.trim();
  s = s.replace(/^```(?:openscad|scad)?\s*\r?\n?/i, '');
  s = s.replace(/\r?\n```\s*$/i, '');
  return s.trim();
}

/**
 * Export a `.scad` file to STL using the OpenSCAD CLI:
 *   openscad -o out.stl in.scad
 *
 * Install: https://openscad.org/downloads.html
 * Homebrew (Mac): `brew install --cask openscad`
 */
export async function exportScadToStl(
  scadPath: string,
  stlPath: string,
  options?: { timeoutMs?: number },
): Promise<ScadToStlResult> {
  const bin = resolveOpenScadBinary();
  const timeoutMs = options?.timeoutMs ?? 120_000;
  const absScad = path.resolve(scadPath);
  const absStl = path.resolve(stlPath);

  try {
    await execFileAsync(
      bin,
      ['-o', absStl, absScad],
      {
        timeout: timeoutMs,
        maxBuffer: 16 * 1024 * 1024,
        windowsHide: true,
      },
    );
    if (!existsSync(absStl)) {
      return { ok: false, message: 'OpenSCAD finished but STL file was not created.' };
    }
    return { ok: true, stlPath: absStl };
  } catch (err: unknown) {
    const e = err as NodeJS.ErrnoException & { stderr?: Buffer; stdout?: Buffer };
    const stderr = e.stderr?.toString?.().trim() ?? '';
    const stdout = e.stdout?.toString?.().trim() ?? '';
    const hint =
      e.code === 'ENOENT'
        ? 'OpenSCAD not found. Install it or set OPENSCAD_PATH to the executable.'
        : '';
    // OpenSCAD often prints parse errors on stdout
    const detail = [stderr, stdout].filter(Boolean).join('\n') || e.message;
    const msg = [detail, hint].filter(Boolean).join('\n');
    return { ok: false, message: msg || 'OpenSCAD export failed.' };
  }
}
