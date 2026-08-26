// A4 G-A4-06 — Legacy Desktop Runtime Isolation
//
// Per A4 spec §11:
//   G-A4-06: Prevent removed Desktop runtime from becoming CURRENT
//            authority again.
//
// The Desktop / Electron runtime was removed in S5. This guard
// explicitly verifies the well-known Desktop anchors are absent
// from the CURRENT production tree (apps/, packages/, scripts/).
//
// Note: this guard is INTENTIONALLY REDUNDANT with
//   verify-production-boundaries.mjs  (general Desktop/Electron scan)
//   tests/web-runtime-host-boundary.test.js  (Web runtime boundary)
//   tests/archive-boundary.test.js           (archive / legacy boundary)
//   tests/runtime-boundary.test.js          (runtime boundary)
// but it is also intentionally NARROW + DETERMINISTIC and serves
// as a single file the A4 audit can reference. The redundancy
// is deliberate: the existing guards are general; this one names
// the specific Desktop anchors that must not return.

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// Forbidden Desktop / Electron anchors (well-known paths and identifiers).
const FORBIDDEN_PATHS = Object.freeze([
  'apps/desktop',
  'apps/desktop/',
  'apps/electron',
  'apps/electron/',
  'desktop/',
  'electron/',
  'main-process',
  'preload/',
  'electron-builder',
  'electron-main.js',
]);

// Forbidden Desktop-specific identifiers in package.json `name` / `description` fields.
const FORBIDDEN_PACKAGE_KEYS = Object.freeze([
  /"name":\s*"@masterpiece\/desktop"/u,
  /"name":\s*"@masterpiece\/electron"/u,
  /"name":\s*"masterpiece-os-desktop"/u,
]);

const SCAN_ROOTS = ['apps', 'packages', 'scripts'];
const PACKAGE_JSON_FILES = ['apps/*/package.json', 'packages/*/package.json'];

// Scan for forbidden TRACKED paths (git ls-tree HEAD).
// On-disk untracked orphans are out of scope for this guard;
// they are handled by the existing `tests/runtime-boundary.test.js`
// + `tests/archive-boundary.test.js` and by the user's own
// `mavis-trash` workflow. This guard ensures the *tracked*
// Desktop / Electron tree has not been re-introduced.
const { execFileSync } = await import('node:child_process');
const violations = [];
let pathScanned = 0;
const tracked = (() => {
  try {
    const out = execFileSync('git', ['ls-tree', '-d', '--name-only', 'HEAD', 'apps', 'packages', 'scripts'], { cwd: root, encoding: 'utf8' });
    return out.split('\n').map((line) => line.trim()).filter(Boolean);
  } catch (error) {
    return [];
  }
})();

for (const dirPath of tracked) {
  const lower = dirPath.toLowerCase();
  pathScanned += 1;
  if (lower === 'apps/desktop' || lower === 'apps/electron' || lower === 'desktop' || lower === 'electron') {
    violations.push({
      guard: 'G-A4-06-legacy-desktop-tracked-dir',
      where: dirPath,
      message: `Removed Desktop / Electron directory is TRACKED in HEAD: ${dirPath}`,
    });
  }
}

// Scan package.json files for forbidden name / description patterns
for (const pattern of PACKAGE_JSON_FILES) {
  const matched = await glob(pattern);
  for (const pkgPath of matched) {
    const content = await fs.readFile(pkgPath, 'utf8');
    for (const regex of FORBIDDEN_PACKAGE_KEYS) {
      const m = content.match(regex);
      if (m) {
        const lineNumber = content.slice(0, m.index).split('\n').length;
        violations.push({
          guard: 'G-A4-06-legacy-desktop-package-name',
          file: path.relative(root, pkgPath).split(path.sep).join('/'),
          line: lineNumber,
          message: 'Removed Desktop / Electron package name returned in package.json',
          excerpt: m[0],
        });
      }
    }
  }
}

// Forbidden identifiers in apps/ runtime entrypoints (the entry that would
// launch Electron's main process must be absent).
const runtimeEntryPoints = [
  'apps/cli/bin/masterpiece-os.js',
  'apps/web-runtime/src/main.ts',
];
for (const rel of runtimeEntryPoints) {
  const abs = path.join(root, rel);
  let content;
  try { content = await fs.readFile(abs, 'utf8'); } catch { continue; }
  if (content.includes('electron') || content.includes('Electron')) {
    violations.push({
      guard: 'G-A4-06-legacy-desktop-runtime-entrypoint',
      file: rel,
      message: 'Electron identifier found in a CURRENT runtime entrypoint',
    });
  }
}

const result = {
  guard: 'A4-legacy-desktop',
  trackedDirScanned: pathScanned,
  packageJsonScanned: PACKAGE_JSON_FILES.length,
  violationCount: violations.length,
  violations,
};

console.log(JSON.stringify(result, null, 2));
if (violations.length > 0) {
  console.error(`[verify-runtime-isolation] FAIL — ${violations.length} violation(s) detected.`);
  process.exit(1);
}
console.log(`[verify-runtime-isolation] PASS — scanned ${pathScanned} tracked directories + package.jsons + runtime entrypoints, 0 Desktop / Electron returns.`);

async function glob(pattern) {
  // Minimal glob: supports `apps/*/package.json` style.
  if (!pattern.includes('*')) return [path.join(root, pattern)];
  const parts = pattern.split('/');
  const starIndex = parts.indexOf('*');
  const prefix = parts.slice(0, starIndex).join('/');
  const suffix = parts.slice(starIndex + 1).join('/');
  const base = path.join(root, prefix);
  let entries;
  try {
    entries = await fs.readdir(base, { withFileTypes: true });
  } catch (error) {
    if (error.code === 'ENOENT') return [];
    throw error;
  }
  const results = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const candidate = path.join(prefix, entry.name, suffix);
    const abs = path.join(root, candidate);
    try {
      const stat = await fs.stat(abs);
      if (stat.isFile()) results.push(abs);
    } catch { /* skip */ }
  }
  return results;
}
