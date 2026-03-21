import { createHash } from 'node:crypto';
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
import path from 'node:path';

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
const CLEANUP_INTERVAL_MS = 60 * 60 * 1000; // hourly

function defaultCacheDir(): string {
  const appData =
    process.env.APPDATA ??
    (process.platform === 'darwin'
      ? path.join(process.env.HOME ?? '', 'Library', 'Application Support')
      : path.join(process.env.HOME ?? '', '.local', 'share'));
  return path.join(appData, '3DAI', 'stl-cache');
}

export interface StlCacheOptions {
  cacheDir?: string;
  maxAgeMs?: number;
}

export class StlCache {
  private readonly dir: string;
  private readonly maxAgeMs: number;
  private cleanupTimer: ReturnType<typeof setInterval> | null = null;

  constructor(options?: StlCacheOptions) {
    this.dir = options?.cacheDir ?? defaultCacheDir();
    this.maxAgeMs = options?.maxAgeMs ?? THIRTY_DAYS_MS;
    mkdirSync(this.dir, { recursive: true });
    this.purgeExpired();
    this.cleanupTimer = setInterval(() => this.purgeExpired(), CLEANUP_INTERVAL_MS);
    if (this.cleanupTimer.unref) this.cleanupTimer.unref();
  }

  /** SHA-256 hex digest of the sanitized SCAD source. */
  private keyFor(scadSource: string): string {
    return createHash('sha256').update(scadSource, 'utf8').digest('hex');
  }

  private stlPathFor(key: string): string {
    return path.join(this.dir, `${key}.stl`);
  }

  private metaPathFor(key: string): string {
    return path.join(this.dir, `${key}.meta.json`);
  }

  /** Return the cached STL path if it exists and hasn't expired, else `null`. */
  lookup(scadSource: string): string | null {
    const key = this.keyFor(scadSource);
    const stlPath = this.stlPathFor(key);
    const metaPath = this.metaPathFor(key);
    if (!existsSync(stlPath) || !existsSync(metaPath)) return null;

    try {
      const meta = JSON.parse(readFileSync(metaPath, 'utf8'));
      const createdAt = meta.createdAt as number;
      if (Date.now() - createdAt > this.maxAgeMs) {
        this.deleteEntry(key);
        return null;
      }
      return stlPath;
    } catch {
      this.deleteEntry(key);
      return null;
    }
  }

  /** Store a compiled STL under its SCAD-source hash. Returns the cached path. */
  store(scadSource: string, stlSourcePath: string): string {
    const key = this.keyFor(scadSource);
    const stlDest = this.stlPathFor(key);
    const metaPath = this.metaPathFor(key);

    const data = readFileSync(stlSourcePath);
    writeFileSync(stlDest, data);
    writeFileSync(metaPath, JSON.stringify({ createdAt: Date.now() }), 'utf8');
    return stlDest;
  }

  /** Remove expired entries from the cache directory. */
  purgeExpired(): number {
    let removed = 0;
    try {
      const files = readdirSync(this.dir);
      for (const file of files) {
        if (!file.endsWith('.meta.json')) continue;
        const key = file.replace('.meta.json', '');
        const metaPath = this.metaPathFor(key);
        try {
          const meta = JSON.parse(readFileSync(metaPath, 'utf8'));
          if (Date.now() - (meta.createdAt as number) > this.maxAgeMs) {
            this.deleteEntry(key);
            removed++;
          }
        } catch {
          this.deleteEntry(key);
          removed++;
        }
      }
    } catch {
      // cache dir may not exist yet on first run
    }
    if (removed > 0) console.log(`[stl-cache] purged ${removed} expired entries`);
    return removed;
  }

  /** Total number of cached STL files. */
  size(): number {
    try {
      return readdirSync(this.dir).filter((f) => f.endsWith('.stl')).length;
    } catch {
      return 0;
    }
  }

  dispose(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
  }

  private deleteEntry(key: string): void {
    try { unlinkSync(this.stlPathFor(key)); } catch { /* noop */ }
    try { unlinkSync(this.metaPathFor(key)); } catch { /* noop */ }
  }
}
