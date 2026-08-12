import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
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

export function classifyProductionImport(specifier) {
  if (/apps[\\/]desktop|@masterpiece\/desktop/iu.test(specifier)) return 'Desktop path';
  if (/^(?:electron|electron-vite|electron-builder)(?:\/|$)/u.test(specifier)) return 'Electron dependency';
  if (/(?:^|[\\/])labs[\\/]/u.test(specifier)) return 'lab module';
  if (/(?:^|[\\/])(?:archive|historical)[\\/]/iu.test(specifier)) return 'historical/archive module';
  return null;
}

function run() {
  const failures = [];
  let fileCount = 0;
  for (const productionRoot of productionRoots) {
    for (const file of walk(path.join(root, productionRoot))) {
      fileCount += 1;
      const body = fs.readFileSync(file, 'utf8');
      for (const match of body.matchAll(importPattern)) {
        const specifier = match[1];
        const violation = classifyProductionImport(specifier);
        if (violation) failures.push(`RC002 ${path.relative(root, file)} imports ${violation} "${specifier}"`);
      }
    }
  }

  const lock = JSON.parse(fs.readFileSync(path.join(root, 'package-lock.json'), 'utf8'));
  for (const key of ['apps/desktop', 'node_modules/electron', 'node_modules/electron-vite', 'node_modules/electron-builder']) {
    if (lock.packages?.[key]) failures.push(`RC002 package-lock.json retains ${key}`);
  }
  if (fs.existsSync(path.join(root, 'apps', 'desktop', 'package.json'))) failures.push('RC002 apps/desktop/package.json still exists');

  if (failures.length) {
    console.error('[production-boundaries] FAIL:');
    for (const failure of failures) console.error(`  ${failure}`);
    process.exitCode = 1;
    return;
  }
  console.log(`[production-boundaries] PASS — checked ${fileCount} current production files; Desktop/Electron/lab/archive imports are absent.`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) run();
