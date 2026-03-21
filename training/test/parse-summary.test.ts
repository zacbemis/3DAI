import { test, assertEqual, assert, summary } from './run';
import { parseSummary } from '../lib/parse-summary';
import path from 'path';

console.log('parse-summary tests:');

test('parses object name from heading', () => {
  const result = parseSummary(path.join(__dirname, 'fixtures/sample-summary.md'));
  assertEqual(result.objectName, 'hex nut');
});

test('parses prompt', () => {
  const result = parseSummary(path.join(__dirname, 'fixtures/sample-summary.md'));
  assertEqual(result.prompt, 'a hex nut with chamfered edges');
});

test('parses final score from last iteration', () => {
  const result = parseSummary(path.join(__dirname, 'fixtures/sample-summary.md'));
  assertEqual(result.finalScore, 8);
});

test('parses technique name', () => {
  const result = parseSummary(path.join(__dirname, 'fixtures/sample-summary.md'));
  assertEqual(result.techniqueName, 'Profile Extrusion');
});

test('parses keywords', () => {
  const result = parseSummary(path.join(__dirname, 'fixtures/sample-summary.md'));
  assert(result.keywords.includes('hex'));
  assert(result.keywords.includes('profile'));
  assert(result.keywords.length === 10);
});

test('parses technique block', () => {
  const result = parseSummary(path.join(__dirname, 'fixtures/sample-summary.md'));
  assert(result.techniqueBlock.startsWith('### Technique: Profile Extrusion'));
  assert(result.techniqueBlock.includes('Keywords:'));
  assert(result.techniqueBlock.includes('Pitfalls'));
});

test('parses visual failures', () => {
  const result = parseSummary(path.join(__dirname, 'fixtures/sample-summary.md'));
  assert(result.visualFailures !== null);
  assert(result.visualFailures!.includes('Chamfer too deep'));
});

test('parses decision tree update', () => {
  const result = parseSummary(path.join(__dirname, 'fixtures/sample-summary.md'));
  assert(result.decisionTreeUpdate !== null);
  assert(result.decisionTreeUpdate!.includes('Profile Extrusion'));
});

summary();
