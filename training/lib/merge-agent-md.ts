import fs from 'fs';

// Match section 5 by heading text, not number (consistent with skills.ts)
const SECTION_5_PATTERN = /^## (?:\d+\.\s*)?OpenSCAD Language Rules/m;

export function findInsertionPoint(content: string): number {
  const match = content.match(SECTION_5_PATTERN);
  if (!match || match.index === undefined) {
    throw new Error('Cannot find "OpenSCAD Language Rules" section in agent.md — aborting to prevent corruption');
  }
  return match.index;
}

export function insertTechnique(content: string, techniqueBlock: string): string {
  const insertAt = findInsertionPoint(content);
  const insertion = `---\n\n${techniqueBlock}\n\n`;
  return content.slice(0, insertAt) + insertion + content.slice(insertAt);
}

export function insertVisualFailure(content: string, row: string): string {
  const sec2Match = content.match(/^## (?:\d+\.\s*)?How to Evaluate Your Output/m);
  const sec3Match = content.match(/^## (?:\d+\.\s*)?How to Iterate/m);
  if (!sec2Match || !sec3Match || sec2Match.index === undefined || sec3Match.index === undefined) return content;

  // Find the last table row (line starting with |) between section 2 and 3
  const section2Content = content.slice(sec2Match.index, sec3Match.index);
  const lastPipeIdx = section2Content.lastIndexOf('\n|');
  if (lastPipeIdx === -1) return content;

  // Find the end of that last table row
  const absIdx = sec2Match.index + lastPipeIdx;
  const nextNewline = content.indexOf('\n', absIdx + 1);
  const insertAt = nextNewline !== -1 ? nextNewline + 1 : absIdx + 1;

  return content.slice(0, insertAt) + row + '\n' + content.slice(insertAt);
}

export function backupAndWrite(agentMdPath: string, newContent: string): void {
  const bakPath = agentMdPath + '.bak';
  fs.copyFileSync(agentMdPath, bakPath);
  const tmpPath = agentMdPath + '.tmp';
  fs.writeFileSync(tmpPath, newContent, 'utf-8');
  fs.renameSync(tmpPath, agentMdPath);
}
