import fs from 'fs';
import path from 'path';

export function archiveTraining(
  sourceDirs: string[],
  archiveBase: string
): string[] {
  const date = new Date().toISOString().slice(0, 10);  // YYYY-MM-DD
  const dateDir = path.join(archiveBase, date);
  fs.mkdirSync(dateDir, { recursive: true });

  const archived: string[] = [];

  for (const srcDir of sourceDirs) {
    const objectName = path.basename(srcDir);
    let destDir = path.join(dateDir, objectName);

    // Handle name collisions: append counter
    let counter = 2;
    while (fs.existsSync(destDir)) {
      destDir = path.join(dateDir, `${objectName}_${counter}`);
      counter++;
    }

    // Copy then remove source (move)
    copyDirRecursive(srcDir, destDir);
    fs.rmSync(srcDir, { recursive: true });
    archived.push(destDir);
  }

  return archived;
}

function copyDirRecursive(src: string, dest: string): void {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDirRecursive(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}
