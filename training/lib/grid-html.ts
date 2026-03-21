// training/lib/grid-html.ts
// Shared grid HTML generation for 4-view renders

import fs from 'fs';
import path from 'path';

export function createGridHtml(renderDir: string): string {
  const gridHtml = `<html><body style="margin:0;padding:0;background:#fff;display:grid;grid-template-columns:1fr 1fr;gap:2px">
<div><div style="background:rgba(0,0,0,0.6);color:#fff;padding:4px 8px;font-family:sans-serif;font-size:14px">Isometric</div><img src="iso.png" style="width:100%"></div>
<div><div style="background:rgba(0,0,0,0.6);color:#fff;padding:4px 8px;font-family:sans-serif;font-size:14px">Front</div><img src="front.png" style="width:100%"></div>
<div><div style="background:rgba(0,0,0,0.6);color:#fff;padding:4px 8px;font-family:sans-serif;font-size:14px">Right</div><img src="right.png" style="width:100%"></div>
<div><div style="background:rgba(0,0,0,0.6);color:#fff;padding:4px 8px;font-family:sans-serif;font-size:14px">Top</div><img src="top.png" style="width:100%"></div>
</body></html>`;
  const outPath = path.join(renderDir, 'grid.html');
  fs.writeFileSync(outPath, gridHtml);
  return outPath;
}

export function ensureGridHtml(renderDir: string): string | null {
  const gridPath = path.join(renderDir, 'grid.html');
  if (fs.existsSync(gridPath)) return gridPath;

  // Auto-generate if all 4 PNGs exist
  const iso = path.join(renderDir, 'iso.png');
  const front = path.join(renderDir, 'front.png');
  const right = path.join(renderDir, 'right.png');
  const top = path.join(renderDir, 'top.png');

  if (fs.existsSync(iso) && fs.existsSync(front) && fs.existsSync(right) && fs.existsSync(top)) {
    return createGridHtml(renderDir);
  }

  return null;
}
