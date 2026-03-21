import express, { type ErrorRequestHandler, type Response } from 'express';
import path from 'node:path';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { generateText, modifyText } from './gemini/gemini';
import {
  exportScadToStl,
  resolveOpenScadBinary,
  sanitizeScadSource,
} from './openscadExport';
import { StlCache } from './stlCache';

/** `__dirname` is `.../src` — put `stlfile` next to `package.json`, not inside `src/`. */
const SERVICE_ROOT = path.resolve(__dirname, '..');
const OUTPUT_SCAD_PATH = path.join(SERVICE_ROOT, 'stlfile', 'output.scad');
const OUTPUT_STL_PATH = path.join(SERVICE_ROOT, 'stlfile', 'output.stl');

const stlCache = new StlCache();

/** Strips markdown fences from model output, then writes `output.scad`. */
function writeOutputScad(contents: string): string {
  const clean = sanitizeScadSource(contents);
  mkdirSync(path.dirname(OUTPUT_SCAD_PATH), { recursive: true });
  writeFileSync(OUTPUT_SCAD_PATH, clean, 'utf8');
  return clean;
}

/**
 * Compile SCAD → STL, using the local cache when possible.
 * Returns the absolute path to the STL on success, or `null` on failure.
 */
async function compileStl(scadText: string): Promise<string | null> {
  const cached = stlCache.lookup(scadText);
  if (cached) {
    console.log('[stl-cache] HIT — serving from cache');
    return cached;
  }

  const result = await exportScadToStl(OUTPUT_SCAD_PATH, OUTPUT_STL_PATH);
  if (!result.ok) {
    console.warn('[STL export skipped]', result.message);
    return null;
  }

  const cachedPath = stlCache.store(scadText, result.stlPath);
  console.log('[stl-cache] MISS — compiled and cached at', cachedPath);
  return cachedPath;
}

/** POST response: binary STL when export succeeds, otherwise `.scad` source as text. */
function respondWithStlOrScad(res: Response, scadText: string, stlPath: string | null): void {
  if (stlPath && existsSync(stlPath)) {
    res.setHeader('Content-Type', 'model/stl');
    res.setHeader('Content-Disposition', 'attachment; filename="output.stl"');
    res.setHeader('X-Generated-Format', 'stl');
    res.sendFile(path.resolve(stlPath), (err) => {
      if (err && !res.headersSent) {
        res.removeHeader('X-Generated-Format');
        res.type('text/plain').send(scadText);
      }
    });
    return;
  }
  res.setHeader('X-Generated-Format', 'scad');
  res.type('text/plain').send(scadText);
}

const app = express();

// Parse JSON bodies (application/json) — required for req.body on POST
app.use(express.json());
// Optional: parse HTML forms (application/x-www-form-urlencoded)
app.use(express.urlencoded({ extended: true }));

app.get('/', (_req, res) => {
  res.send('Hello World');
});

app.post('/generate', async (req, res, next) => {
  try {
    const prompt = req.body?.prompt;
    if (typeof prompt !== 'string' || !prompt.trim()) {
      res.status(400).json({
        error: 'Missing or invalid "prompt" in JSON body',
        hint: 'Send Content-Type: application/json and a JSON object: {"prompt":"your idea here"}',
      });
      return;
    }
    const raw = await generateText(prompt);
    const text = writeOutputScad(raw);
    const stlPath = await compileStl(text);
    respondWithStlOrScad(res, text, stlPath);
  } catch (err) {
    next(err);
  }
});
app.post('/modify', async (req, res, next) => {
    try {
      const prompt = req.body?.prompt;
      const original = req.body?.original;
      if (typeof original !== 'string' || !original.trim()) {
        res.status(400).json({
          error: 'Missing or invalid "original" in JSON body',
          hint: 'Send JSON: {"original":"<existing .scad>","prompt":"what to change"}',
        });
        return;
      }
      if (typeof prompt !== 'string' || !prompt.trim()) {
        res.status(400).json({
          error: 'Missing or invalid "prompt" in JSON body',
          hint: 'Send Content-Type: application/json and a JSON object: {"prompt":"your idea here"}',
        });
        return;
      }
      const raw = await modifyText(original, prompt);
      const text = writeOutputScad(raw);
      const stlPath = await compileStl(text);
      respondWithStlOrScad(res, text, stlPath);
    } catch (err) {
      next(err);
    }
  });

// Invalid JSON (e.g. unquoted keys like {prompt: "x"}) fails in express.json() before the route runs
const jsonBodyErrorHandler: ErrorRequestHandler = (err, _req, res, next) => {
  if (err instanceof SyntaxError && 'body' in err) {
    res.status(400).json({
      error: 'Invalid JSON body',
      hint: 'Keys must be double-quoted. Valid: {"prompt":"a cube"} — not: {prompt: "a cube"}',
    });
    return;
  }
  next(err);
};

app.use(jsonBodyErrorHandler);

app.listen(3000, () => {
  console.log('Server is running on port 3000');
  console.log('Writes .scad to:', path.resolve(OUTPUT_SCAD_PATH));
  console.log('Writes .stl to:', path.resolve(OUTPUT_STL_PATH));
  console.log(
    'OpenSCAD binary (set OPENSCAD_PATH in .env if not found):',
    resolveOpenScadBinary(),
  );
  console.log(`STL cache: ${stlCache.size()} entries (30-day TTL, hourly cleanup)`);
  console.log('POST /generate & /modify return STL when export succeeds (see X-Generated-Format).');
});