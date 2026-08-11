import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const scanRoots = ['apps', 'packages', 'scripts', 'tests'];
const sourceExtensions = new Set(['.cjs', '.js', '.jsx', '.mjs', '.ts', '.tsx']);
const selfPath = path.join(repositoryRoot, 'tests', 'archive-boundary.test.js');

function collectFiles(root) {
  const files = [];
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === 'out') continue;
    const fullPath = path.join(root, entry.name);
    if (entry.isDirectory()) files.push(...collectFiles(fullPath));
    else if (sourceExtensions.has(path.extname(entry.name))) files.push(fullPath);
  }
  return files;
}

const archiveReferencePatterns = [
  /(?:from\s+|import\s*\(|require\s*\()\s*['"][^'"]*(?:^|[\\/])archive[\\/]/m,
  /(?:readFile|writeFile|readdir|stat|access|existsSync|createReadStream|createWriteStream|spawn|exec)(?:Sync)?\s*\([^)]*['"]archive['"]/s,
  /path\.(?:join|resolve)\s*\([^)]*['"]archive['"]/s,
];

test('active code and current tests do not load repository archive artifacts', () => {
  const violations = [];
  for (const root of scanRoots) {
    const absoluteRoot = path.join(repositoryRoot, root);
    for (const file of collectFiles(absoluteRoot)) {
      if (file === selfPath) continue;
      const source = fs.readFileSync(file, 'utf8');
      if (archiveReferencePatterns.some((pattern) => pattern.test(source))) {
        violations.push(path.relative(repositoryRoot, file).replaceAll('\\', '/'));
      }
    }
  }

  assert.deepEqual(violations, [], `archive dependencies are forbidden:\n${violations.join('\n')}`);
});
