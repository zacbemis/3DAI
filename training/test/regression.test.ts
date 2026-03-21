import { test, assertEqual, assert, summary } from './run';
import { runLevel1 } from '../lib/regression-runner';

console.log('regression tests:');

const sampleAgent = `
## 4. Learned Techniques

### Technique: Bezier Profile Revolution
Keywords: vase, cup, bowl, goblet

**When to use:** Symmetric objects.

---

### Technique: CSG Detail Cutting
Keywords: gear, teeth, crenellation, rook

**When to use:** Repeating cuts.

---

## 5. OpenSCAD Language Rules
`;

const baselines = [
  {
    prompt: 'a decorative vase',
    expectedTechniques: ['Bezier Profile Revolution'],
    minScore: null,
    approvedDate: '2026-03-20',
    objectName: 'vase',
  },
  {
    prompt: 'a chess rook',
    expectedTechniques: ['CSG Detail Cutting', 'Bezier Profile Revolution'],
    minScore: null,
    approvedDate: '2026-03-20',
    objectName: 'chess rook',
  },
  {
    prompt: 'a wooden table',
    expectedTechniques: ['CSG Furniture Assembly'],
    minScore: null,
    approvedDate: '2026-03-20',
    objectName: 'table',
  },
];

test('passing baseline returns pass', () => {
  const results = runLevel1(sampleAgent, [baselines[0]]);
  assertEqual(results[0].status, 'pass');
});

test('partial match returns fail with details', () => {
  const results = runLevel1(sampleAgent, [baselines[1]]);
  assertEqual(results[0].status, 'fail');
  assert(results[0].missing!.includes('Bezier Profile Revolution'));
});

test('completely unmatched baseline returns fail', () => {
  const results = runLevel1(sampleAgent, [baselines[2]]);
  assertEqual(results[0].status, 'fail');
  assert(results[0].missing!.includes('CSG Furniture Assembly'));
});

test('returns summary counts', () => {
  const results = runLevel1(sampleAgent, baselines);
  const passed = results.filter(r => r.status === 'pass').length;
  const failed = results.filter(r => r.status === 'fail').length;
  assertEqual(passed, 1);
  assertEqual(failed, 2);
});

summary();
