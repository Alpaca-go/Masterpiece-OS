// verify:production-boundaries — repository-slimming-v2 Phase 6 gate.
// 1. Desktop production code must not import from labs/.
// 2. Desktop packaging config must not include labs/.
// 3. Preload must not expose legacy visual/reference translation APIs.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const failures = [];

const CODE_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.mjs', '.cjs']);
function* walk(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === '.git') continue;
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) yield* walk(absolute);
    else if (CODE_EXTENSIONS.has(path.extname(entry.name))) yield absolute;
  }
}

// 1. Desktop src/tests/scripts must not reference labs/.
const desktopRoots = ['apps/desktop/src', 'apps/desktop/tests', 'apps/desktop/scripts'];
const importPattern = /(?:from\s+|import\s*\(|require\s*\()\s*['"]([^'"]*labs\/[^'"]*)['"]/g;
let desktopFileCount = 0;
for (const desktopRoot of desktopRoots) {
  const absolute = path.join(root, desktopRoot);
  if (!fs.existsSync(absolute)) continue;
  for (const file of walk(absolute)) {
    desktopFileCount += 1;
    const content = fs.readFileSync(file, 'utf8');
    for (const match of content.matchAll(importPattern)) {
      failures.push(`${path.relative(root, file)} imports lab module "${match[1]}"`);
    }
  }
}

// 2. electron-builder config must not package labs.
const builderConfig = fs.readFileSync(path.join(root, 'apps/desktop/electron-builder.yml'), 'utf8');
if (/labs\//u.test(builderConfig)) {
  failures.push('apps/desktop/electron-builder.yml references labs/');
}

// 2b. Build output (if present) must not contain lab modules.
const outDirectory = path.join(root, 'apps/desktop/out');
if (fs.existsSync(outDirectory)) {
  for (const file of walk(outDirectory)) {
    const content = fs.readFileSync(file, 'utf8');
    if (content.includes('labs/document-visual-directions') || content.includes('labs/reference-style-conversion')) {
      failures.push(`${path.relative(root, file)} bundles lab code`);
    }
  }
}

// 3. Preload must not expose legacy translation APIs.
const preload = fs.readFileSync(path.join(root, 'apps/desktop/src/preload/index.ts'), 'utf8');
for (const banned of ['visualTranslation', 'referenceTranslation', 'startVisualTranslation', 'startReferenceTranslation']) {
  if (preload.includes(banned)) failures.push(`preload exposes legacy API surface "${banned}"`);
}

if (failures.length > 0) {
  console.error('[production-boundaries] FAIL:');
  for (const failure of failures) console.error(`  ${failure}`);
  process.exit(1);
}
console.log(`[production-boundaries] PASS — checked ${desktopFileCount} desktop files, packaging config and preload surface.`);
