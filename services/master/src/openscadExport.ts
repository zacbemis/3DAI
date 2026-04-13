import { spawn } from 'node:child_process';
import { existsSync, readdirSync } from 'node:fs';
import path from 'node:path';

/**
 * Run OpenSCAD CLI and always capture stdout/stderr (execFile often omits them on non‑zero exit).
 */
function runOpenScadCli(
  bin: string,
  args: string[],
  timeoutMs: number,
): Promise<{ code: number | null; signal: NodeJS.Signals | null; stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const child = spawn(bin, args, {
      windowsHide: true,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stdout = '';
    let stderr = '';
    let settled = false;
    child.stdout?.setEncoding('utf8');
    child.stderr?.setEncoding('utf8');
    child.stdout?.on('data', (chunk: string) => {
      stdout += chunk;
    });
    child.stderr?.on('data', (chunk: string) => {
      stderr += chunk;
    });
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      child.kill('SIGTERM');
      reject(new Error(`OpenSCAD timed out after ${timeoutMs}ms`));
    }, timeoutMs);
    child.on('error', (err) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      reject(err);
    });
    child.on('close', (code, signal) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve({
        code,
        signal,
        stdout: stdout.trim(),
        stderr: stderr.trim(),
      });
    });
  });
}

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
/** Default 10 minutes — CGAL/STL export can be slow; override with OPENSCAD_TIMEOUT_MS in .env */
function resolveOpenScadTimeoutMs(override?: number): number {
  if (override != null && override > 0) return override;
  const raw = process.env.OPENSCAD_TIMEOUT_MS?.trim();
  if (raw) {
    const n = parseInt(raw, 10);
    if (!Number.isNaN(n) && n > 0) return n;
  }
  return 600_000;
}

export async function exportScadToStl(
  scadPath: string,
  stlPath: string,
  options?: { timeoutMs?: number },
): Promise<ScadToStlResult> {
  const bin = resolveOpenScadBinary();
  const timeoutMs = resolveOpenScadTimeoutMs(options?.timeoutMs);
  const absScad = path.resolve(scadPath);
  const absStl = path.resolve(stlPath);

  try {
    const { code, signal, stdout, stderr } = await runOpenScadCli(
      bin,
      ['-o', absStl, absScad],
      timeoutMs,
    );

    if (code === 0 && existsSync(absStl)) {
      return { ok: true, stlPath: absStl };
    }

    const killHint =
      signal === 'SIGKILL' || signal === 'SIGTERM'
        ? [
            'Process was killed (' + (signal ?? '?') + '). Common causes:',
            '- macOS ran out of memory while meshing (try a simpler prompt, close other apps, or upgrade OpenSCAD).',
            '- Export took longer than OPENSCAD_TIMEOUT_MS (default 600000 ms). Raise it in services/master/.env.',
            '- Very old OpenSCAD (e.g. 2021.01): try `brew upgrade --cask openscad`.',
          ].join('\n')
        : '';

    const parts = [
      `OpenSCAD exit ${code ?? '?'}` + (signal ? ` (signal ${signal})` : ''),
      !existsSync(absStl) && 'STL file was not written.',
      killHint,
      stderr && `stderr:\n${stderr}`,
      stdout && `stdout:\n${stdout}`,
    ].filter(Boolean) as string[];

    return {
      ok: false,
      message:
        parts.join('\n\n') ||
        'OpenSCAD export failed.',
    };
  } catch (err: unknown) {
    const e = err as NodeJS.ErrnoException;
    const hint =
      e.code === 'ENOENT'
        ? 'OpenSCAD not found. Install it or set OPENSCAD_PATH to the executable.'
        : '';
    const detail = err instanceof Error ? err.message : String(err);
    return { ok: false, message: [detail, hint].filter(Boolean).join('\n') };
  }
}
