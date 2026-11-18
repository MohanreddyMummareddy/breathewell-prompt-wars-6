import { readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

async function sources(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(
    entries
      .filter((entry) => !['node_modules', '.git', '.vercel', 'coverage'].includes(entry.name))
      .map(async (entry) => {
        const path = join(directory, entry.name);
        return entry.isDirectory() ? sources(path) : /\.(mjs|js)$/.test(entry.name) ? [path] : [];
      }),
  );
  return files.flat();
}

for (const file of await sources('.')) {
  const result = spawnSync(process.execPath, ['--check', file], { stdio: 'inherit' });
  if (result.error || result.status !== 0) {
    console.error(`Syntax check failed: ${file}`);
    process.exit(1);
  }
}
console.log('All JavaScript source files passed syntax validation.');
