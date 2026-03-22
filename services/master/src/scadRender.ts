import { execFile } from 'node:child_process';
import { existsSync, readFileSync, mkdirSync } from 'node:fs';
import { unlink } from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';
import { resolveOpenScadBinary } from './openscadExport';

const execFileAsync = promisify(execFile);

const RENDER_DIR = path.resolve(__dirname, '..', 'stlfile', 'renders');

interface CameraAngle {
  name: string;
  rotX: number;
  rotY: number;
  rotZ: number;
}

const CAMERA_ANGLES: CameraAngle[] = [
  { name: 'front',       rotX: 90,  rotY: 0, rotZ: 0   },
  { name: 'right',       rotX: 90,  rotY: 0, rotZ: 90  },
  { name: 'top',         rotX: 0,   rotY: 0, rotZ: 0   },
  { name: 'perspective',  rotX: 55,  rotY: 0, rotZ: 25  },
];

/**
 * Try running OpenSCAD to render a PNG. Falls back to xvfb-run on headless Linux.
 */
async function execOpenScad(args: string[]): Promise<void> {
  const bin = resolveOpenScadBinary();
  try {
    await execFileAsync(bin, args, {
      timeout: 30_000,
      maxBuffer: 8 * 1024 * 1024,
      windowsHide: true,
    });
  } catch (err: unknown) {
    const e = err as NodeJS.ErrnoException & { stderr?: string | Buffer };
    const stderr = typeof e.stderr === 'string' ? e.stderr : e.stderr?.toString?.() ?? '';
    const isDisplayError = stderr.includes('cannot open display') || stderr.includes('GLX') || stderr.includes('DISPLAY');

    if (isDisplayError && process.platform === 'linux') {
      await execFileAsync('xvfb-run', ['-a', bin, ...args], {
        timeout: 30_000,
        maxBuffer: 8 * 1024 * 1024,
        windowsHide: true,
      });
      return;
    }
    throw err;
  }
}

/**
 * Render an OpenSCAD file to PNG images from 4 camera angles.
 * Returns base64 data-URL strings for each successfully rendered image.
 */
export async function renderScadImages(scadPath: string): Promise<string[]> {
  mkdirSync(RENDER_DIR, { recursive: true });
  const absScad = path.resolve(scadPath);
  const images: string[] = [];

  for (const angle of CAMERA_ANGLES) {
    const outPng = path.join(RENDER_DIR, `eval_${angle.name}_${Date.now()}.png`);
    const cameraArg = `0,0,0,${angle.rotX},${angle.rotY},${angle.rotZ},0`;

    try {
      await execOpenScad([
        '-o', outPng,
        `--camera=${cameraArg}`,
        '--imgsize=512,512',
        '--viewall',
        '--autocenter',
        absScad,
      ]);

      if (existsSync(outPng)) {
        const data = readFileSync(outPng);
        images.push(`data:image/png;base64,${data.toString('base64')}`);
        unlink(outPng).catch(() => {});
      }
    } catch (err) {
      console.warn(`[render] Failed to render ${angle.name} view:`, (err as Error).message);
    }
  }

  return images;
}
