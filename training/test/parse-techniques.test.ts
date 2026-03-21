import { test, assertEqual, assert, summary } from './run';
import { parseTechniquesFromContent, matchTechniques } from '../lib/parse-techniques';

console.log('parse-techniques tests:');

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

test('parses techniques from content', () => {
  const techs = parseTechniquesFromContent(sampleAgent);
  assertEqual(techs.length, 2);
  assertEqual(techs[0].name, 'Bezier Profile Revolution');
  assertEqual(techs[1].name, 'CSG Detail Cutting');
});

test('parses keywords correctly', () => {
  const techs = parseTechniquesFromContent(sampleAgent);
  assert(techs[0].keywords.includes('vase'));
  assert(techs[0].keywords.includes('goblet'));
  assertEqual(techs[0].keywords.length, 4);
});

test('matchTechniques finds correct techniques for prompt', () => {
  const techs = parseTechniquesFromContent(sampleAgent);
  const matched = matchTechniques('a decorative vase', techs);
  assertEqual(matched.length, 1);
  assertEqual(matched[0].name, 'Bezier Profile Revolution');
});

test('matchTechniques returns empty for no match', () => {
  const techs = parseTechniquesFromContent(sampleAgent);
  const matched = matchTechniques('a wooden table', techs);
  assertEqual(matched.length, 0);
});

test('matchTechniques uses word boundaries', () => {
  const techs = parseTechniquesFromContent(sampleAgent);
  const matched = matchTechniques('a small bowl', techs);
  assertEqual(matched.length, 1);
});

summary();
