import { test, assertEqual, assert, summary } from './run';
import { insertTechnique, findInsertionPoint, insertVisualFailure } from '../lib/merge-agent-md';
import fs from 'fs';
import path from 'path';

const fixturePath = path.join(__dirname, 'fixtures/sample-agent.md');
const fixture = fs.readFileSync(fixturePath, 'utf-8');

console.log('merge-agent-md tests:');

test('finds insertion point before section 5', () => {
  const idx = findInsertionPoint(fixture);
  assert(idx > 0);
  const afterIdx = fixture.substring(idx);
  assert(afterIdx.startsWith('## 5.') || afterIdx.startsWith('## ') && afterIdx.includes('OpenSCAD'));
});

test('inserts technique before section 5', () => {
  const block = '### Technique: New Thing\nKeywords: foo, bar\n\nContent here.';
  const result = insertTechnique(fixture, block);
  assert(result.includes('### Technique: New Thing'));
  assert(result.includes('### Technique: Bezier Profile Revolution'));
  const newIdx = result.indexOf('### Technique: New Thing');
  const sec5Idx = result.indexOf('## 5.');
  assert(newIdx < sec5Idx, 'New technique should be before section 5');
});

test('adds separator between techniques', () => {
  const block = '### Technique: New Thing\nKeywords: foo, bar\n\nContent here.';
  const result = insertTechnique(fixture, block);
  const bezierIdx = result.indexOf('### Technique: Bezier Profile Revolution');
  const newIdx = result.indexOf('### Technique: New Thing');
  const between = result.substring(bezierIdx, newIdx);
  assert(between.includes('---'), 'Should have --- separator');
});

test('throws if section 5 heading not found', () => {
  const bad = '# Agent\n\n## 4. Techniques\n\nStuff\n';
  let threw = false;
  try {
    findInsertionPoint(bad);
  } catch {
    threw = true;
  }
  assert(threw, 'Should throw when section 5 not found');
});

test('appends visual failure row after last table row', () => {
  const row = '| New failure | Cause | Fix it |';
  const result = insertVisualFailure(fixture, row);
  assert(result.includes('| New failure | Cause | Fix it |'));
  const rowIdx = result.indexOf('| New failure |');
  const sec3Idx = result.indexOf('## 3.');
  assert(rowIdx < sec3Idx, 'Visual failure should be in section 2');
  // Should be after the existing table row
  const existingRowIdx = result.indexOf('| Flat disc at bottom |');
  assert(rowIdx > existingRowIdx, 'New row should be after existing rows');
});

summary();
