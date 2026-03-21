import { test, assertEqual, assert, summary } from './run';
import { detectDuplicate, keywordOverlap } from '../lib/deduplicate';

console.log('deduplicate tests:');

test('exact name match is duplicate', () => {
  const result = detectDuplicate(
    { name: 'Profile Extrusion', keywords: ['hex', 'nut'] },
    [{ name: 'Profile Extrusion', keywords: ['bolt', 'washer'] }]
  );
  assertEqual(result.type, 'duplicate');
  assertEqual(result.match, 'Profile Extrusion');
});

test('case-insensitive name match', () => {
  const result = detectDuplicate(
    { name: 'profile extrusion', keywords: ['hex'] },
    [{ name: 'Profile Extrusion', keywords: ['bolt'] }]
  );
  assertEqual(result.type, 'duplicate');
});

test('keyword overlap >50% is duplicate', () => {
  const result = detectDuplicate(
    { name: 'Technique A', keywords: ['hex', 'nut', 'bolt', 'washer'] },
    [{ name: 'Technique B', keywords: ['hex', 'nut', 'bolt', 'screw', 'rivet'] }]
  );
  assertEqual(result.type, 'duplicate');
  assert(result.overlapPercent! > 50);
});

test('keyword overlap <=50% is new', () => {
  const result = detectDuplicate(
    { name: 'Technique A', keywords: ['hex', 'nut', 'bolt', 'washer'] },
    [{ name: 'Technique B', keywords: ['vase', 'cup', 'hex', 'bowl'] }]
  );
  assertEqual(result.type, 'new');
});

test('no existing techniques is always new', () => {
  const result = detectDuplicate(
    { name: 'Technique A', keywords: ['hex', 'nut'] },
    []
  );
  assertEqual(result.type, 'new');
});

test('keywordOverlap calculates correctly', () => {
  const pct = keywordOverlap(['a', 'b', 'c'], ['a', 'b', 'd', 'e']);
  assertEqual(pct, Math.round(2 / 3 * 100));
});

summary();
