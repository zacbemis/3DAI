import fs from 'fs';
import path from 'path';

interface ParsedTechnique {
  name: string;
  keywords: string[];
  content: string;
}

const TECHNIQUE_REGEX = /### Technique: (.+)\n\s*Keywords: (.+)\n([\s\S]*?)(?=\n### Technique:|\n## [\w\d]|$)/g;
const MAX_TECHNIQUES = 4;

let cachedAgent: string | null = null;
let cachedMtime = 0;
let resolvedPath: string | null = null;
let cachedTechniques: ParsedTechnique[] | null = null;
let cachedIndex: string | null = null;
let cachedRulesAndLimitations: string | null = null;

// Synonym map: common words → technique keywords they should match
const SYNONYMS: Record<string, string[]> = {
  container:    ['box', 'enclosure', 'case', 'housing', 'jar'],
  storage:      ['box', 'enclosure', 'case', 'organizer', 'tray'],
  holder:       ['stand', 'mount', 'bracket', 'cradle', 'rack'],
  stand:        ['holder', 'mount', 'cradle', 'riser', 'platform'],
  cover:        ['lid', 'cap', 'enclosure', 'case'],
  jar:          ['vase', 'bottle', 'container', 'pot', 'urn'],
  pot:          ['vase', 'planter', 'jar', 'bowl', 'container'],
  drink:        ['cup', 'mug', 'goblet', 'glass', 'bottle'],
  glass:        ['cup', 'goblet', 'wine glass', 'chalice', 'flute'],
  furniture:    ['shelf', 'bookshelf', 'rack', 'cabinet', 'table'],
  table:        ['shelf', 'furniture', 'desk', 'platform'],
  desk:         ['organizer', 'desk organizer', 'tray', 'caddy'],
  tool:         ['wrench', 'screwdriver', 'handle', 'grip', 'lever'],
  fastener:     ['bolt', 'screw', 'nut', 'washer', 'thread'],
  pipe:         ['tube', 'cylinder', 'channel', 'gutter', 'coupling'],
  tube:         ['pipe', 'cylinder', 'channel', 'coupling'],
  round:        ['curve', 'smooth', 'cylinder', 'sphere', 'circular'],
  circular:     ['round', 'ring', 'annulus', 'disc', 'radial'],
  decorative:   ['ornamental', 'band', 'ring', 'pattern', 'lattice'],
  kitchen:      ['spoon', 'scoop', 'ladle', 'spatula', 'tray', 'funnel'],
  bathroom:     ['soap dish', 'towel holder', 'toothbrush holder', 'shower drain'],
  wall:         ['wall mount', 'bracket', 'hook', 'mount'],
  phone:        ['phone stand', 'phone holder', 'tablet stand', 'phone dock'],
  laptop:       ['laptop stand', 'laptop riser', 'monitor riser'],
  cable:        ['cable organizer', 'cable clip', 'cable holder', 'cable management'],
  card:         ['card holder', 'card rack', 'card organizer', 'card slot', 'sd card holder'],
  battery:      ['battery holder', 'battery case', 'aa holder', 'cell holder'],
  flower:       ['vase', 'planter', 'pot', 'urn'],
  plant:        ['planter', 'pot', 'vase', 'saucer', 'drainage'],
  electronic:   ['electronics', 'enclosure', 'case', 'raspberry pi', 'arduino'],
  light:        ['lamp', 'lampshade', 'candle holder', 'lantern'],
  candle:       ['candle holder', 'lantern', 'votive'],
  door:         ['door stop', 'door handle', 'over-door hook', 'door wedge'],
  towel:        ['towel bar', 'towel holder', 'towel rail', 'towel hook'],
  hanger:       ['hook', 'coat hook', 'wall hook', 'j-hook'],
  writing:      ['pen', 'pencil', 'marker', 'stylus'],
  chess:        ['chess', 'rook', 'bishop', 'pawn', 'knight', 'queen', 'king'],
  game:         ['chess', 'token', 'dice', 'piece'],
  jewelry:      ['ring', 'band', 'jewelry box', 'watch box'],
  mechanical:   ['gear', 'bearing', 'coupling', 'shaft', 'cam', 'pulley'],
  wheel:        ['gear', 'pulley', 'knob', 'handwheel'],
};

// Simple English stemming: strip common suffixes to match roots
function stem(word: string): string {
  return word
    .replace(/ies$/, 'y')
    .replace(/sses$/, 'ss')
    .replace(/([^s])s$/, '$1')
    .replace(/ing$/, '')
    .replace(/ed$/, '')
    .replace(/er$/, '')
    .replace(/tion$/, 't')
    .replace(/ness$/, '');
}

function loadAgentProd(): string {
  if (resolvedPath) {
    try {
      const mtime = fs.statSync(resolvedPath).mtimeMs;
      if (cachedAgent !== null && mtime === cachedMtime) return cachedAgent;
      cachedAgent = fs.readFileSync(resolvedPath, 'utf-8');
      cachedMtime = mtime;
      cachedTechniques = null;
      cachedIndex = null;
      cachedRulesAndLimitations = null;
      return cachedAgent;
    } catch {
      resolvedPath = null;
    }
  }

  const candidates = [
    path.join(__dirname, '../../agent-prod.md'),
    path.join(__dirname, '../../../agent-prod.md'),
    path.join(process.cwd(), 'agent-prod.md'),
  ];

  for (const p of candidates) {
    if (fs.existsSync(p)) {
      resolvedPath = p;
      cachedMtime = fs.statSync(p).mtimeMs;
      cachedAgent = fs.readFileSync(p, 'utf-8');
      cachedTechniques = null;
      cachedIndex = null;
      cachedRulesAndLimitations = null;
      console.log(`[Skills] Loaded ${p}`);
      return cachedAgent;
    }
  }

  console.log('[Skills] No agent-prod.md found — using base prompt only');
  cachedAgent = '';
  return '';
}

function parseTechniques(content: string): ParsedTechnique[] {
  if (cachedTechniques) return cachedTechniques;
  const techniques: ParsedTechnique[] = [];
  const regex = new RegExp(TECHNIQUE_REGEX.source, TECHNIQUE_REGEX.flags);
  let match;
  while ((match = regex.exec(content)) !== null) {
    techniques.push({
      name: match[1].trim(),
      keywords: match[2].split(',').map(k => k.trim().toLowerCase()).filter(k => k.length > 0),
      content: match[0],
    });
  }
  cachedTechniques = techniques;
  return techniques;
}

/**
 * Extract the technique index table from agent-prod.md.
 * Small (~100 lines) — gives the model awareness of all 93 patterns.
 */
export function getTechniqueIndex(): string {
  const agent = loadAgentProd();
  if (!agent) return '';
  if (cachedIndex) return cachedIndex;

  const start = agent.indexOf('## Technique Index');
  const end = agent.indexOf('## Techniques');
  if (start === -1 || end === -1) return '';

  cachedIndex = agent.slice(start, end).trim();
  return cachedIndex;
}

/**
 * Extract OpenSCAD Language Rules (section 5) and Limitations (section 6).
 * These are compact and valuable for every request.
 */
export function getRulesAndLimitations(): string {
  const agent = loadAgentProd();
  if (!agent) return '';
  if (cachedRulesAndLimitations) return cachedRulesAndLimitations;

  const rulesMatch = agent.match(/## 5\. OpenSCAD Language Rules[\s\S]*?(?=\n---\s*$)/m);
  const limitsMatch = agent.match(/## 6\. What This Agent Cannot Do Well[\s\S]*?(?=\n---\s*$)/m);

  const parts: string[] = [];
  if (rulesMatch) parts.push(rulesMatch[0].trim());
  if (limitsMatch) parts.push(limitsMatch[0].trim());

  cachedRulesAndLimitations = parts.join('\n\n');
  return cachedRulesAndLimitations;
}

/** Expand a user description into additional search terms via synonyms. */
function expandWithSynonyms(words: string[]): string[] {
  const expanded = new Set(words);
  for (const word of words) {
    const stemmed = stem(word);
    const synonymList = SYNONYMS[word] ?? SYNONYMS[stemmed];
    if (synonymList) {
      for (const syn of synonymList) expanded.add(syn);
    }
  }
  return Array.from(expanded);
}

/** Score a technique against the query. Higher = better match. */
function scoreTechnique(technique: ParsedTechnique, queryWords: string[]): number {
  let score = 0;
  const nameWords = technique.name.toLowerCase().split(/\s+/);

  for (const qw of queryWords) {
    const qStem = stem(qw);

    // Exact keyword match (strongest signal)
    for (const kw of technique.keywords) {
      if (kw === qw || kw === qStem) { score += 3; continue; }
      // Multi-word keyword contains query word
      if (kw.includes(' ') && kw.split(' ').some(p => p === qw || p === qStem)) score += 2;
    }

    // Technique name match
    if (nameWords.some(nw => nw === qw || stem(nw) === qStem)) score += 2;

    // Substring match on keywords (weaker but catches partial overlaps)
    for (const kw of technique.keywords) {
      if (qw.length >= 4 && kw.includes(qw)) score += 1;
    }
  }

  return score;
}

/**
 * Returns matched technique content for a given prompt.
 * Uses synonym expansion + scored ranking instead of exact keyword matching.
 */
export function getSkillsPrompt(description: string): string {
  const agent = loadAgentProd();
  if (!agent) return '';

  const descLower = description.toLowerCase();
  const rawWords = descLower.split(/\s+/).filter(w => w.length > 2);
  const queryWords = expandWithSynonyms(rawWords);
  const techniques = parseTechniques(agent);

  const scored = techniques
    .map(t => ({ technique: t, score: scoreTechnique(t, queryWords) }))
    .filter(s => s.score > 0)
    .sort((a, b) => b.score - a.score);

  // Deduplicate by technique name (agent-prod.md has duplicates)
  const seen = new Set<string>();
  const deduped = scored.filter(s => {
    if (seen.has(s.technique.name)) return false;
    seen.add(s.technique.name);
    return true;
  });

  const matched = deduped.slice(0, MAX_TECHNIQUES);

  if (matched.length === 0) return '';

  console.log(
    `[Skills] "${description}" → ${matched.length} techniques: ${matched.map(s => `${s.technique.name} (${s.score})`).join(', ')}`,
  );

  return matched.map(s => s.technique.content).join('\n\n');
}
