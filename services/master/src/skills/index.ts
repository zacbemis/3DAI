import fs from 'fs';
import path from 'path';

// Technique parser + keyword matcher for agent-prod.md
// Filters 93 techniques down to the 1-4 most relevant for a given prompt

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

function loadAgentProd(): string {
  if (resolvedPath) {
    try {
      const mtime = fs.statSync(resolvedPath).mtimeMs;
      if (cachedAgent !== null && mtime === cachedMtime) return cachedAgent;
      cachedAgent = fs.readFileSync(resolvedPath, 'utf-8');
      cachedMtime = mtime;
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
      console.log(`[Skills] Loaded ${p}`);
      return cachedAgent;
    }
  }

  console.log('[Skills] No agent-prod.md found — using base prompt only');
  cachedAgent = '';
  return '';
}

function parseTechniques(content: string): ParsedTechnique[] {
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
  return techniques;
}

function keywordMatches(desc: string, keyword: string): boolean {
  const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`\\b${escaped}\\b`).test(desc);
}

/**
 * Returns technique guidance for a given prompt.
 * Filters agent-prod.md to only relevant techniques (max 4).
 * Returns empty string if no techniques match.
 */
export function getSkillsPrompt(description: string): string {
  const agent = loadAgentProd();
  if (!agent) return '';

  const descLower = description.toLowerCase();
  const techniques = parseTechniques(agent);

  // Match by keywords
  let matched = techniques.filter(t =>
    t.keywords.some(kw => keywordMatches(descLower, kw))
  );

  // Cap at MAX_TECHNIQUES, prioritize by keyword overlap count
  if (matched.length > MAX_TECHNIQUES) {
    matched.sort((a, b) => {
      const aCount = a.keywords.filter(kw => keywordMatches(descLower, kw)).length;
      const bCount = b.keywords.filter(kw => keywordMatches(descLower, kw)).length;
      return bCount - aCount;
    });
    matched = matched.slice(0, MAX_TECHNIQUES);
  }

  if (matched.length === 0) return '';

  // Extract OpenSCAD rules section
  const rulesMatch = agent.match(/## (?:\d+\.\s*)?OpenSCAD Language Rules[\s\S]*?(?=\n## |$)/);
  const rules = rulesMatch ? rulesMatch[0] : '';

  const sections = [
    ...matched.map(t => t.content),
    rules,
  ];

  console.log(`[Skills] "${description}" → ${matched.length} techniques: ${matched.map(t => t.name).join(', ')}`);

  return sections.join('\n\n');
}
