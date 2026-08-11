import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const failures = [];
const extensions = new Set(['.ts', '.tsx', '.js', '.mjs', '.cjs']);
const productionRoots = ['apps/cli/src', 'apps/web/src', 'apps/web-runtime/src', 'packages'];
const importPattern = /(?:from\s+|import\s*\(|require\s*\()\s*['"]([^'"]+)['"]/gu;

function* walk(directory) {
  if (!fs.existsSync(directory)) return;
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (['node_modules', 'out', 'dist', 'build'].includes(entry.name)) continue;
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) yield* walk(absolute);
    else if (extensions.has(path.extname(entry.name))) yield absolute;
  }
}

let fileCount = 0;
for (const productionRoot of productionRoots) {
  for (const file of walk(path.join(root, productionRoot))) {
    fileCount += 1;
    const body = fs.readFileSync(file, 'utf8');
    for (const match of body.matchAll(importPattern)) {
      const specifier = match[1];
      if (/apps[\\/]desktop|@masterpiece\/desktop/iu.test(specifier)) {
        failures.push(`${path.relative(root, file)} imports removed Desktop path "${specifier}"`);
      }
      if (/^(?:electron|electron-vite|electron-builder)(?:\/|$)/u.test(specifier)) {
        failures.push(`${path.relative(root, file)} imports Electron dependency "${specifier}"`);
      }
      if (/(?:^|[\\/])labs[\\/]/u.test(specifier)) {
        failures.push(`${path.relative(root, file)} imports lab module "${specifier}"`);
      }
    }
  }
}

const lock = JSON.parse(fs.readFileSync(path.join(root, 'package-lock.json'), 'utf8'));
for (const key of ['apps/desktop', 'node_modules/electron', 'node_modules/electron-vite', 'node_modules/electron-builder']) {
  if (lock.packages?.[key]) failures.push(`package-lock.json retains ${key}`);
}
if (fs.existsSync(path.join(root, 'apps', 'desktop', 'package.json'))) {
  failures.push('apps/desktop/package.json still exists');
}

if (failures.length) {
  console.error('[production-boundaries] FAIL:');
  for (const failure of failures) console.error(`  ${failure}`);
  process.exit(1);
}
console.log(`[production-boundaries] PASS — checked ${fileCount} current production files; Desktop/Electron/lab imports are absent.`);
