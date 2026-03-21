import { describe, it, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { StlCache } from '../stlCache';

function makeTempDir(): string {
  return mkdtempSync(path.join(tmpdir(), 'stlcache-test-'));
}

function writeDummyStl(dir: string, content = 'solid dummy\nendsolid dummy\n'): string {
  mkdirSync(dir, { recursive: true });
  const p = path.join(dir, 'dummy.stl');
  writeFileSync(p, content, 'utf8');
  return p;
}

function hashOf(source: string): string {
  return createHash('sha256').update(source, 'utf8').digest('hex');
}

let cacheDir: string;
let cache: StlCache | null = null;

afterEach(() => {
  cache?.dispose();
  cache = null;
  if (cacheDir) {
    try { rmSync(cacheDir, { recursive: true, force: true }); } catch { /* ok */ }
  }
});

describe('StlCache', () => {
  it('store + lookup returns cached STL path with matching contents', () => {
    cacheDir = makeTempDir();
    cache = new StlCache({ cacheDir });

    const scad = 'cube([10,10,10]);';
    const stlContent = 'solid cube\nendsolid cube\n';
    const srcStl = writeDummyStl(path.join(cacheDir, '_src'), stlContent);

    const storedPath = cache.store(scad, srcStl);
    assert.ok(storedPath.endsWith('.stl'));

    const hit = cache.lookup(scad);
    assert.notEqual(hit, null);
    assert.equal(readFileSync(hit!, 'utf8'), stlContent);
  });

  it('lookup returns null for SCAD source never stored', () => {
    cacheDir = makeTempDir();
    cache = new StlCache({ cacheDir });

    assert.equal(cache.lookup('sphere(r=5);'), null);
  });

  it('lookup returns null for different SCAD source', () => {
    cacheDir = makeTempDir();
    cache = new StlCache({ cacheDir });

    const srcStl = writeDummyStl(path.join(cacheDir, '_src'));
    cache.store('cube([1,1,1]);', srcStl);

    assert.equal(cache.lookup('sphere(r=99);'), null);
  });

  it('expired entries return null on lookup', async () => {
    cacheDir = makeTempDir();
    cache = new StlCache({ cacheDir, maxAgeMs: 1 });

    const srcStl = writeDummyStl(path.join(cacheDir, '_src'));
    cache.store('cube([5,5,5]);', srcStl);

    await new Promise((r) => setTimeout(r, 20));

    assert.equal(cache.lookup('cube([5,5,5]);'), null);
  });

  it('purgeExpired removes stale entries but keeps fresh ones', () => {
    cacheDir = makeTempDir();
    cache = new StlCache({ cacheDir, maxAgeMs: 30 * 24 * 60 * 60 * 1000 });

    const srcStl = writeDummyStl(path.join(cacheDir, '_src'));
    const freshScad = 'cylinder(r=3, h=10);';
    const staleScad = 'cube([2,2,2]);';
    cache.store(freshScad, srcStl);
    cache.store(staleScad, srcStl);

    const staleKey = hashOf(staleScad);
    const staleMeta = path.join(cacheDir, `${staleKey}.meta.json`);
    writeFileSync(staleMeta, JSON.stringify({ createdAt: 0 }), 'utf8');

    const removed = cache.purgeExpired();
    assert.equal(removed, 1);
    assert.equal(cache.lookup(staleScad), null);
    assert.notEqual(cache.lookup(freshScad), null);
  });

  it('size() reflects the number of cached entries', () => {
    cacheDir = makeTempDir();
    cache = new StlCache({ cacheDir });

    assert.equal(cache.size(), 0);

    const srcStl = writeDummyStl(path.join(cacheDir, '_src'));
    cache.store('a();', srcStl);
    assert.equal(cache.size(), 1);

    cache.store('b();', srcStl);
    assert.equal(cache.size(), 2);
  });

  it('dispose() stops the cleanup timer without throwing', () => {
    cacheDir = makeTempDir();
    cache = new StlCache({ cacheDir });
    cache.dispose();
    cache.dispose(); // idempotent — should not throw
  });

  it('corrupt meta.json causes lookup to return null and cleans up', () => {
    cacheDir = makeTempDir();
    cache = new StlCache({ cacheDir });

    const scad = 'translate([1,0,0]) cube(5);';
    const srcStl = writeDummyStl(path.join(cacheDir, '_src'));
    cache.store(scad, srcStl);

    const key = hashOf(scad);
    const metaPath = path.join(cacheDir, `${key}.meta.json`);
    writeFileSync(metaPath, '<<<not json>>>', 'utf8');

    assert.equal(cache.lookup(scad), null);
    assert.equal(cache.size(), 0);
  });
});
