import express, { type ErrorRequestHandler, type Response } from 'express';
import path from 'node:path';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import {
  generateText, modifyText, reviseText, fixText, evaluateModel,
  activeModel, activeProvider, getAvailableModels, resolveModelName,
  DEFAULT_EVAL_THRESHOLD, DEFAULT_MAX_EVAL_STEPS,
  type EvaluationResult,
} from './ai';
import { buildReviseWithFeedbackPrompt } from './ai/prompts';
import { lintScad, formatLintErrors } from './scadLint';
import { renderScadImages } from './scadRender';

console.log(`[AI Backend] Default: ${activeProvider} (${activeModel})`);
import {
  exportScadToStl,
  resolveOpenScadBinary,
  sanitizeScadSource,
} from './openscadExport';
import { getSupabase, isSupabaseConfigured } from './supabase';

/** Public table for `GET /users`. Override with `SUPABASE_USER_TABLE` — your project has `prompts`, not `profiles`. */
const USER_TABLE = process.env.SUPABASE_USER_TABLE?.trim() || 'users';
import { StlCache } from './stlCache';

/** `__dirname` is `.../src` — put `stlfile` next to `package.json`, not inside `src/`. */
const SERVICE_ROOT = path.resolve(__dirname, '..');
const OUTPUT_SCAD_PATH = path.join(SERVICE_ROOT, 'stlfile', 'output.scad');
const OUTPUT_STL_PATH = path.join(SERVICE_ROOT, 'stlfile', 'output.stl');

const stlCache = new StlCache();

/**
 * Default: **STL-only** — if OpenSCAD export fails, respond with **503 JSON** (no silent `.scad` fallback).
 * Set `MASTER_FALLBACK_TO_SCAD=true` to restore returning OpenSCAD source as `text/plain` when export fails.
 */
const ALLOW_SCAD_FALLBACK =
  process.env.MASTER_FALLBACK_TO_SCAD?.trim().toLowerCase() === 'true';

/** Strips markdown fences from model output, then writes `output.scad`. */
function writeOutputScad(contents: string): string {
  const clean = sanitizeScadSource(contents);
  mkdirSync(path.dirname(OUTPUT_SCAD_PATH), { recursive: true });
  writeFileSync(OUTPUT_SCAD_PATH, clean, 'utf8');
  return clean;
}

const MAX_FIX_RETRIES = 3;

/**
 * Compile SCAD → STL, using the local cache when possible.
 */
async function compileStl(
  scadText: string,
): Promise<{ path: string | null; exportError?: string }> {
  const cached = stlCache.lookup(scadText);
  if (cached) {
    console.log('[stl-cache] HIT — serving from cache');
    return { path: cached };
  }

  const result = await exportScadToStl(OUTPUT_SCAD_PATH, OUTPUT_STL_PATH);
  if (!result.ok) {
    console.warn('[STL export skipped]', result.message);
    return { path: null, exportError: result.message };
  }

  const cachedPath = stlCache.store(scadText, result.stlPath);
  console.log('[stl-cache] MISS — compiled and cached at', cachedPath);
  return { path: cachedPath };
}

/**
 * Lint → compile → if errors, ask AI to fix → retry. Returns final SCAD + compile result.
 */
async function compileWithRetry(
  initialScad: string,
  modelId?: string,
): Promise<{ scadText: string; stlPath: string | null; exportError?: string; retries: number }> {
  let scadText = initialScad;
  let retries = 0;

  for (let attempt = 0; attempt <= MAX_FIX_RETRIES; attempt++) {
    // Static lint check
    const lintErrors = formatLintErrors(lintScad(scadText));
    if (lintErrors && attempt < MAX_FIX_RETRIES) {
      console.log(`[lint] Errors found (attempt ${attempt + 1}), asking AI to fix:\n${lintErrors}`);
      try {
        const fixed = await fixText(scadText, `Static analysis errors:\n${lintErrors}`, modelId);
        scadText = sanitizeScadSource(fixed);
        writeFileSync(OUTPUT_SCAD_PATH, scadText, 'utf8');
        retries++;
        continue;
      } catch (e) {
        console.warn('[lint-fix] AI fix failed, proceeding with original:', e);
      }
    }

    // Compile
    const cached = stlCache.lookup(scadText);
    if (cached) {
      console.log('[stl-cache] HIT — serving from cache');
      return { scadText, stlPath: cached, retries };
    }

    mkdirSync(path.dirname(OUTPUT_SCAD_PATH), { recursive: true });
    writeFileSync(OUTPUT_SCAD_PATH, scadText, 'utf8');

    const result = await exportScadToStl(OUTPUT_SCAD_PATH, OUTPUT_STL_PATH);

    if (result.ok) {
      const cachedPath = stlCache.store(scadText, result.stlPath);
      console.log(`[stl-cache] MISS — compiled and cached at ${cachedPath}${retries > 0 ? ` (after ${retries} fix${retries > 1 ? 'es' : ''})` : ''}`);
      return { scadText, stlPath: cachedPath, retries };
    }

    // Compilation failed — ask AI to fix if retries remain
    if (attempt < MAX_FIX_RETRIES) {
      console.log(`[compile-retry] Attempt ${attempt + 1}/${MAX_FIX_RETRIES} failed, asking AI to fix:\n${result.message.slice(0, 500)}`);
      try {
        const fixed = await fixText(scadText, result.message, modelId);
        scadText = sanitizeScadSource(fixed);
        retries++;
      } catch (e) {
        console.warn('[compile-fix] AI fix call failed:', e);
        return { scadText, stlPath: null, exportError: result.message, retries };
      }
    } else {
      console.warn(`[compile-retry] All ${MAX_FIX_RETRIES} retries exhausted`);
      return { scadText, stlPath: null, exportError: result.message, retries };
    }
  }

  return { scadText, stlPath: null, exportError: 'Max retries exceeded', retries };
}

interface StlResponseMeta {
  retries?: number;
  evalScore?: number;
  evalIterations?: number;
}

/** POST response: binary STL when export succeeds; otherwise 503 (default) or `.scad` text if fallback enabled. */
function respondWithStlOrScad(
  res: Response,
  scadText: string,
  stlPath: string | null,
  exportError?: string,
  meta?: StlResponseMeta,
): void {
  if (stlPath && existsSync(stlPath)) {
    try {
      const stlData = readFileSync(path.resolve(stlPath));
      res.setHeader('Content-Type', 'model/stl');
      res.setHeader('Content-Disposition', 'attachment; filename="output.stl"');
      res.setHeader('X-Generated-Format', 'stl');
      res.setHeader('X-Scad-Base64', Buffer.from(scadText, 'utf8').toString('base64'));
      if (meta?.retries && meta.retries > 0) res.setHeader('X-Fix-Retries', String(meta.retries));
      if (meta?.evalScore != null) res.setHeader('X-Eval-Score', String(meta.evalScore));
      if (meta?.evalIterations != null) res.setHeader('X-Eval-Iterations', String(meta.evalIterations));
      res.send(stlData);
      return;
    } catch (err) {
      console.error('[STL read error]', err);
    }
  }
  if (!ALLOW_SCAD_FALLBACK) {
    res.status(503).json({
      error: 'STL export failed',
      details: exportError ?? 'OpenSCAD did not produce a file.',
      hint:
        'Check OpenSCAD stderr output, set OPENSCAD_PATH if needed, or set MASTER_FALLBACK_TO_SCAD=true to return .scad text on failure.',
    });
    return;
  }
  res.setHeader('X-Generated-Format', 'scad');
  res.type('text/plain').send(scadText);
}

const app = express();

// CORS: Vite/Electron renderer may call this API from another origin in dev
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Expose-Headers', 'X-Generated-Format, X-Scad-Base64, X-Fix-Retries, X-Eval-Score, X-Eval-Iterations');
  // Chromium “Private Network Access” preflight (public → local)
  if (req.headers['access-control-request-private-network'] === 'true') {
    res.setHeader('Access-Control-Allow-Private-Network', 'true');
  }
  if (req.method === 'OPTIONS') {
    res.sendStatus(204);
    return;
  }
  next();
});

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isUuidString(v: unknown): v is string {
  return typeof v === 'string' && UUID_RE.test(v.trim());
}

// Parse JSON bodies — limit raised for base64 image payloads (revise endpoint)
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true }));

app.get('/', (_req, res) => {
  res.send('Hello World');
});

/** Available AI models (based on configured API keys). */
app.get('/models', (_req, res) => {
  const models = getAvailableModels();
  res.json({
    default: activeModel,
    models,
  });
});

/** Health: Supabase connector configured (does not validate network). */
app.get('/health/supabase', (_req, res) => {
  res.json({
    configured: isSupabaseConfigured(),
    hint: isSupabaseConfigured()
      ? 'Supabase client is ready (use getSupabase() in routes).'
      : 'Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY or SUPABASE_ANON_KEY in .env',
  });
});

/**
 * Test: read rows from a public table (default `prompts`, or `SUPABASE_USER_TABLE`, or `?table=`).
 */
app.get('/users', async (req, res) => {
  const db = getSupabase();
  if (!db) {
    res.status(503).json({
      error: 'Supabase not configured',
      hint: 'Set SUPABASE_URL and a key in .env',
    });
    return;
  }

  const tableParam = typeof req.query.table === 'string' ? req.query.table.trim() : '';
  const table = tableParam || USER_TABLE;

  const { data, error, count } = await db
    .from(table)
    .select('*', { count: 'exact' })
    .limit(50);

  if (error) {
    res.status(500).json({
      error: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
      table: `users`,
    });
    return;
  }

  const rows = Array.isArray(data) ? data : [];
  const empty = rows.length === 0;

  res.json({
    schema: 'public',
    table,
    rowCountReturned: rows.length,
    totalMatchingCount: count ?? null,
    rows,
    ...(empty && {
      diagnostics: {
        message:
          'Query succeeded but zero rows are visible to this API key (count is 0 for your filters).',
        checkInSupabaseDashboard:
          'Table Editor → public.prompts: if you see rows there but 0 here, Row Level Security is hiding them from the anon key.',
        fixes: [
          'Use SUPABASE_SERVICE_ROLE_KEY in this server .env (server-only) to bypass RLS for debugging.',
          'Or keep the anon key and add an RLS policy: e.g. allow SELECT on public.prompts for anon / authenticated as needed.',
          'If the table is empty in the dashboard, insert rows or seed data first.',
        ],
      },
    }),
  });
});

/**
 * Create a row in `public.projects`.
 * Body: { "user_id": "<uuid>", "name": "...", "description"?: "...", "config"?: { ... } }
 */
app.post('/projects', async (req, res) => {
  const db = getSupabase();
  if (!db) {
    res.status(503).json({
      error: 'Supabase not configured',
      hint: 'Set SUPABASE_URL and a key in .env',
    });
    return;
  }

  const { user_id: userId, name, description, config } = req.body ?? {};

  if (typeof userId !== 'string' || !userId.trim()) {
    res.status(400).json({
      error: 'Missing or invalid user_id',
      hint: 'Send JSON: {"user_id":"<uuid from public.users>","name":"My project"}',
    });
    return;
  }
  if (typeof name !== 'string' || !name.trim()) {
    res.status(400).json({
      error: 'Missing or invalid name',
      hint: 'name must be a non-empty string',
    });
    return;
  }

  const row: Record<string, unknown> = {
    user_id: userId.trim(),
    name: name.trim(),
  };

  if (description != null) {
    row.description = typeof description === 'string' ? description : null;
  }

  if (config !== undefined) {
    if (config !== null && (typeof config !== 'object' || Array.isArray(config))) {
      res.status(400).json({
        error: 'Invalid config',
        hint: 'config must be a JSON object or null',
      });
      return;
    }
    if (config !== null) {
      row.config = config;
    }
  }

  const { data, error } = await db.from('projects').insert(row).select().single();

  if (error) {
    const fkHint =
      error.code === '23503'
        ? 'user_id must reference an existing row in public.users (FK projects_user_id_fkey).'
        : error.hint;
    res.status(500).json({
      error: 'Failed to create project',
      details: error.message,
      code: error.code,
      hint: fkHint,
    });
    return;
  }

  res.status(201).json(data);
});

/**
 * List all prompts for a project (`prompts.project_id` = `:projectId`).
 * Example: GET /projects/a1b2c3d4-.../prompts
 */
app.get('/projects/:projectId/prompts', async (req, res) => {
  const db = getSupabase();
  if (!db) {
    res.status(503).json({
      error: 'Supabase not configured',
      hint: 'Set SUPABASE_URL and a key in .env',
    });
    return;
  }

  const projectId =
    typeof req.params.projectId === 'string' ? req.params.projectId.trim() : '';
  if (!projectId) {
    res.status(400).json({ error: 'Missing project id in path' });
    return;
  }

  const { data, error } = await db
    .from('prompts')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false });

  if (error) {
    res.status(500).json({
      error: 'Failed to fetch prompts',
      details: error.message,
      code: error.code,
      hint: error.hint,
    });
    return;
  }

  const prompts = Array.isArray(data) ? data : [];
  res.json({
    project_id: projectId,
    count: prompts.length,
    prompts,
  });
});

/**
 * Fetch one prompt by id, scoped to a project (both in JSON body).
 * Body: { "id": "<prompt uuid>", "project_id": "<project uuid>" } — or use "prompt_id" instead of "id".
 */
app.post('/prompts/by-id', async (req, res) => {
  const db = getSupabase();
  if (!db) {
    res.status(503).json({
      error: 'Supabase not configured',
      hint: 'Set SUPABASE_URL and a key in .env',
    });
    return;
  }

  const projectId =
    typeof req.body?.project_id === 'string' ? req.body.project_id.trim() : '';
  const promptIdRaw =
    typeof req.body?.id === 'string'
      ? req.body.id.trim()
      : typeof req.body?.prompt_id === 'string'
        ? req.body.prompt_id.trim()
        : '';

  if (!projectId) {
    res.status(400).json({
      error: 'Missing or invalid project_id',
      hint: 'Send JSON: {"id":"<prompt uuid>","project_id":"<project uuid>"}',
    });
    return;
  }
  if (!promptIdRaw) {
    res.status(400).json({
      error: 'Missing or invalid id',
      hint: 'Include prompt primary key as "id" or "prompt_id"',
    });
    return;
  }

  const { data, error } = await db
    .from('prompts')
    .select('*')
    .eq('id', promptIdRaw)
    .eq('project_id', projectId)
    .maybeSingle();

  if (error) {
    res.status(500).json({
      error: 'Failed to fetch prompt',
      details: error.message,
      code: error.code,
      hint: error.hint,
    });
    return;
  }

  if (data == null) {
    res.status(404).json({
      error: 'Prompt not found',
      hint: 'No row with this id for the given project_id (id and project_id must match the same row).',
    });
    return;
  }

  res.json(data);
});

/**
 * Compile existing OpenSCAD to STL (no LLM). Used when switching projects in the app.
 * Body: { "scad": "..." }
 */
app.post('/compile-scad', async (req, res, next) => {
  try {
    const scad = req.body?.scad;
    if (typeof scad !== 'string' || !scad.trim()) {
      res.status(400).json({
        error: 'Missing or invalid "scad" in JSON body',
        hint: 'Send JSON: {"scad":"// your openscad ..."}',
      });
      return;
    }
    const text = writeOutputScad(scad);
    const { path: stlPath, exportError } = await compileStl(text);
    respondWithStlOrScad(res, text, stlPath, exportError);
  } catch (err) {
    next(err);
  }
});

app.post('/generate', async (req, res, next) => {
  const db = getSupabase();
  try {
    const prompt = req.body?.prompt;
    if (typeof prompt !== 'string' || !prompt.trim()) {
      res.status(400).json({
        error: 'Missing or invalid "prompt" in JSON body',
        hint: 'Send Content-Type: application/json and a JSON object: {"prompt":"your idea here"}',
      });
      return;
    }
    const requestedModel = typeof req.body?.model === 'string' ? req.body.model.trim() : undefined;
    const modelUsed = resolveModelName(requestedModel);

    const autoEval = req.body?.auto_evaluate === true;
    const maxEvalSteps = typeof req.body?.max_steps === 'number'
      ? Math.min(Math.max(req.body.max_steps, 1), 10)
      : DEFAULT_MAX_EVAL_STEPS;
    const scoreThreshold = typeof req.body?.score_threshold === 'number'
      ? req.body.score_threshold
      : DEFAULT_EVAL_THRESHOLD;

    const raw = await generateText(prompt, requestedModel);
    const initialScad = writeOutputScad(raw);

    let { scadText, stlPath, exportError, retries } = await compileWithRetry(initialScad, requestedModel);
    if (retries > 0) console.log(`[generate] Needed ${retries} auto-fix retries`);

    let totalRetries = retries;
    let evalScore: number | undefined;
    let evalIterations = 0;

    // Self-evaluation loop: render → score → revise → recompile until quality threshold is met
    if (autoEval && stlPath) {
      interface ScoredVersion {
        scadText: string;
        stlPath: string;
        score: number;
        retries: number;
      }
      let bestVersion: ScoredVersion | null = null;

      for (let step = 0; step < maxEvalSteps; step++) {
        console.log(`[eval] Step ${step + 1}/${maxEvalSteps}: rendering images...`);

        const images = await renderScadImages(OUTPUT_SCAD_PATH);
        if (images.length === 0) {
          console.warn('[eval] No images rendered — skipping evaluation (headless display issue?)');
          break;
        }

        console.log(`[eval] Step ${step + 1}/${maxEvalSteps}: evaluating with ${images.length} images...`);
        let evalResult: EvaluationResult;
        try {
          evalResult = await evaluateModel(scadText, prompt, images, requestedModel);
        } catch (e) {
          console.warn('[eval] Evaluation call failed:', e);
          break;
        }

        evalIterations = step + 1;
        evalScore = evalResult.overall;
        console.log(
          `[eval] Step ${step + 1}: score=${evalResult.overall}/10 ` +
          `(acc=${evalResult.accuracy} comp=${evalResult.completeness} geo=${evalResult.geometry} ` +
          `prop=${evalResult.proportions} print=${evalResult.printability})`,
        );
        console.log(`[eval] Critique: ${evalResult.critique}`);

        if (stlPath && (!bestVersion || evalResult.overall > bestVersion.score)) {
          bestVersion = { scadText, stlPath, score: evalResult.overall, retries: totalRetries };
        }

        if (evalResult.overall >= scoreThreshold) {
          console.log(`[eval] Score ${evalResult.overall} >= threshold ${scoreThreshold} — accepting.`);
          break;
        }

        if (step >= maxEvalSteps - 1) {
          console.log(`[eval] Max steps reached. Using best version (score=${bestVersion?.score ?? 'none'}).`);
          break;
        }

        console.log(`[eval] Score ${evalResult.overall} < ${scoreThreshold} — revising (suggestions: ${evalResult.suggestions.join('; ')})`);

        try {
          const revisePromptText = buildReviseWithFeedbackPrompt(
            prompt, scadText, evalResult.critique, evalResult.suggestions,
          );
          const revised = await reviseText(scadText, revisePromptText, images, requestedModel);
          const revisedScad = writeOutputScad(revised);

          const compiled = await compileWithRetry(revisedScad, requestedModel);
          if (compiled.retries > 0) console.log(`[eval-revise] Needed ${compiled.retries} auto-fix retries`);
          totalRetries += compiled.retries;

          if (compiled.stlPath) {
            scadText = compiled.scadText;
            stlPath = compiled.stlPath;
          } else {
            console.warn('[eval-revise] Revision failed to compile — keeping previous version');
            break;
          }
        } catch (e) {
          console.warn('[eval-revise] Revision failed:', e);
          break;
        }
      }

      // Use the highest-scoring version if the last iteration scored lower
      if (bestVersion && evalScore != null && evalScore < bestVersion.score) {
        console.log(`[eval] Last score ${evalScore} < best ${bestVersion.score} — reverting to best version`);
        scadText = bestVersion.scadText;
        stlPath = bestVersion.stlPath;
        evalScore = bestVersion.score;
        totalRetries = bestVersion.retries;
        writeOutputScad(scadText);
      }
    }

    if (db) {
      const uid = req.body?.user_id;
      const pid = req.body?.project_id;
      if (!isUuidString(uid) || !isUuidString(pid)) {
        console.warn(
          '[prompts insert skipped] send JSON with valid user_id and project_id (UUIDs) to persist rows —',
          { hasUserId: isUuidString(uid), hasProjectId: isUuidString(pid) },
        );
      } else {
        const now = new Date().toISOString();
        const row: Record<string, unknown> = {
          prompt,
          scad_code: scadText,
          model: modelUsed,
          status: stlPath ? 'completed' : 'failed',
          user_id: uid.trim(),
          project_id: pid.trim(),
          created_at: now,
          completed_at: now,
        };
        if (req.body.max_steps != null) row.max_steps = req.body.max_steps;
        if (req.body.auto_evaluate != null) row.auto_evaluate = req.body.auto_evaluate;
        if (evalScore != null) row.eval_score = evalScore;

        const { error: insertError } = await db.from('prompts').insert(row);
        if (insertError) {
          console.error('[prompts insert]', insertError);
        } else {
          console.log('[prompts insert] ok', pid.trim());
        }
      }
    }

    respondWithStlOrScad(res, scadText, stlPath, exportError, {
      retries: totalRetries,
      evalScore,
      evalIterations: evalIterations > 0 ? evalIterations : undefined,
    });
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
      const requestedModel = typeof req.body?.model === 'string' ? req.body.model.trim() : undefined;
      const raw = await modifyText(original, prompt, requestedModel);
      const initialScad = writeOutputScad(raw);
      const { scadText: text, stlPath, exportError, retries } = await compileWithRetry(initialScad, requestedModel);
      if (retries > 0) console.log(`[modify] Needed ${retries} auto-fix retries`);
      respondWithStlOrScad(res, text, stlPath, exportError, { retries });
    } catch (err) {
      next(err);
    }
  });

app.post('/revise', async (req, res, next) => {
  try {
    const prompt = req.body?.prompt;
    const scadCode = req.body?.scad_code;
    const images = req.body?.images;

    if (typeof scadCode !== 'string' || !scadCode.trim()) {
      res.status(400).json({
        error: 'Missing or invalid "scad_code"',
        hint: 'Send the current OpenSCAD source in scad_code',
      });
      return;
    }
    if (typeof prompt !== 'string' || !prompt.trim()) {
      res.status(400).json({
        error: 'Missing or invalid "prompt"',
        hint: 'Send the original generation prompt',
      });
      return;
    }
    if (!Array.isArray(images) || images.length === 0) {
      res.status(400).json({
        error: 'Missing or empty "images" array',
        hint: 'Send base64 data-URL screenshots: ["data:image/png;base64,..."]',
      });
      return;
    }

    const requestedModel = typeof req.body?.model === 'string' ? req.body.model.trim() : undefined;
    const raw = await reviseText(scadCode, prompt, images, requestedModel);
    const initialScad = writeOutputScad(raw);
    const { scadText: text, stlPath, exportError, retries } = await compileWithRetry(initialScad, requestedModel);
    if (retries > 0) console.log(`[revise] Needed ${retries} auto-fix retries`);
    respondWithStlOrScad(res, text, stlPath, exportError, { retries });
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

// Log Supabase status at startup (client is lazy-created on first getSupabase())
if (isSupabaseConfigured()) {
  console.log('Supabase: connected (URL + key configured)');
} else {
  console.log('Supabase: not configured (optional). Set SUPABASE_URL + key in .env');
}

app.listen(3000, () => {
  console.log('Server is running on port 3000');
  console.log('Writes .scad to:', path.resolve(OUTPUT_SCAD_PATH));
  console.log('Writes .stl to:', path.resolve(OUTPUT_STL_PATH));
  console.log(
    ALLOW_SCAD_FALLBACK
      ? 'STL policy: OpenSCAD failure → .scad text (MASTER_FALLBACK_TO_SCAD=true)'
      : 'STL policy: OpenSCAD failure → 503 JSON (set MASTER_FALLBACK_TO_SCAD=true to allow .scad fallback)',
  );
  console.log(
    'OpenSCAD binary (set OPENSCAD_PATH in .env if not found):',
    resolveOpenScadBinary(),
  );
  console.log(`STL cache: ${stlCache.size()} entries (30-day TTL, hourly cleanup)`);
  console.log('POST /compile-scad — compile saved SCAD to STL (no LLM)');
  console.log('POST /revise — vision-assisted rerun with screenshots');
  console.log('POST /generate & /modify return STL when export succeeds (see X-Generated-Format).');
  console.log('POST /projects — create project (user_id, name, …)');
  console.log('GET /projects/:projectId/prompts — list prompts for a project');
  console.log('POST /prompts/by-id — body: id, project_id');
});