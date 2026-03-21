// Shared technique parsing — canonical source of truth for the technique regex.
// skills.ts keeps its own copy for Electron build compatibility but should match this logic.

export interface TechniqueEntry {
  name: string;
  keywords: string[];
  content: string;
}

const TECHNIQUE_REGEX = /### Technique: (.+)\n\s*Keywords: (.+)\n([\s\S]*?)(?=\n### Technique:|\n## [\w\d]|$)/g;

export function parseTechniquesFromContent(content: string): TechniqueEntry[] {
  const techniques: TechniqueEntry[] = [];
  const regex = new RegExp(TECHNIQUE_REGEX.source, TECHNIQUE_REGEX.flags);

  let match;
  while ((match = regex.exec(content)) !== null) {
    techniques.push({
      name: match[1].trim(),
      keywords: match[2].split(',').map(k => k.trim().toLowerCase()).filter(k => k.length > 0),
      content: match[0],
    });
  }

  return techniques;
}

function keywordMatches(descLower: string, keyword: string): boolean {
  const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`\\b${escaped}\\b`).test(descLower);
}

export function matchTechniques(prompt: string, techniques: TechniqueEntry[]): TechniqueEntry[] {
  const descLower = prompt.toLowerCase();
  return techniques.filter(t => t.keywords.some(kw => keywordMatches(descLower, kw)));
}

// Category mapping: technique name → primary category
const TECHNIQUE_CATEGORIES: Record<string, string> = {};

// Map techniques to categories by keywords in their names
const CATEGORY_PATTERNS: [RegExp, string][] = [
  [/revolution|bezier|conical|foot.*base|piecewise.*stem|rimmed|paired.*vessel/i, 'revolution'],
  [/gear|hex|bracket|tooth|hub|chamfer|thread|bolt|nut|washer|coupling|bearing|cam|cotter|barb/i, 'mechanical'],
  [/hull.*chain|hull.*sphere|hull.*scaled|organic|spoon|handle|lever|arch.*bridge|j-hook/i, 'organic'],
  [/box|enclosure|assembly.*lid|lip.*groove|snap|battery.*compartment|container/i, 'enclosure'],
  [/grid|lattice|hex.*grid|hole.*grid|pattern|cutout|diamond.*band|teardrop|radial.*cut/i, 'pattern'],
  [/extrude|channel|twisted|wavy|linear.*profile|c-clamp|wire/i, 'extrusion'],
  [/furniture|cradle|angled|platform|frame|rack|stand|slot.*tray|organizer|stepped.*tray/i, 'assembly'],
];

function categorizeTechnique(techniqueName: string): string {
  for (const [pattern, category] of CATEGORY_PATTERNS) {
    if (pattern.test(techniqueName)) return category;
  }
  return 'uncategorized';
}

export function categorizeObject(prompt: string, techniques: TechniqueEntry[]): { primary: string; tags: string[] } {
  const matched = matchTechniques(prompt, techniques);

  if (matched.length === 0) {
    return { primary: 'uncategorized', tags: [] };
  }

  // Count category hits
  const categoryCounts: Record<string, number> = {};
  const allTags = new Set<string>();

  for (const t of matched) {
    const cat = categorizeTechnique(t.name);
    allTags.add(cat);
    // Count keyword hits per category for prioritization
    const descLower = prompt.toLowerCase();
    const hits = t.keywords.filter(kw => {
      const escaped = kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      return new RegExp(`\\b${escaped}\\b`).test(descLower);
    }).length;
    categoryCounts[cat] = (categoryCounts[cat] || 0) + hits;
  }

  // Primary = category with most keyword hits. Tie-break: first in CATEGORY_PATTERNS order
  const categoryOrder = CATEGORY_PATTERNS.map(([_, cat]) => cat);
  let primary = 'uncategorized';
  let maxHits = 0;
  for (const cat of categoryOrder) {
    if ((categoryCounts[cat] || 0) > maxHits) {
      maxHits = categoryCounts[cat];
      primary = cat;
    }
  }

  return { primary, tags: [...allTags] };
}
