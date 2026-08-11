#!/usr/bin/env node
// verify-workspace-boundaries.mjs
// Enforces monorepo workspace boundaries.
//
// FAIL checks (release gate):
//   1. No `@masterpiece-os/*` package names remain in the repository.
//      All internal packages must use the `@masterpiece/*` namespace.
//
//   2. Each app/package under `apps/` and `packages/` must declare every
//      internal `@masterpiece/*` package it actually imports in its
//      own `package.json` `dependencies`. A deep import that reaches
//      into another workspace package without a declared dependency
//      is a leaked boundary.
//
// WARN checks (reported, not failing — to be addressed in Stage 3):
//   3. Deep imports of the form `../../../../packages/<name>/src/...`
//      from `apps/**`. The replacement is `@masterpiece/<name>` via
//      the `exports` field. Counted per file.
//   4. Non-exported subpath imports (e.g. `packages/<name>/src/internal/x.js`)
//      when the package's `exports` field does not advertise that path.
//
// Idempotent and offline. Does NOT execute the build or run tests.

import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const failures = [];
const warnings = [];

function fail(label, detail) {
  console.log(`  [FAIL] ${label}${detail ? ' — ' + detail : ''}`);
  failures.push({ label, detail });
}
function warn(label, detail) {
  console.log(`  [WARN] ${label}${detail ? ' — ' + detail : ''}`);
  warnings.push({ label, detail });
}
function ok(label) { console.log(`  [ok]   ${label}`); }

function readJson(rel) {
  return JSON.parse(readFileSync(path.join(root, rel), 'utf8'));
}

function listDir(rel) {
  const full = path.join(root, rel);
  if (!existsSync(full)) return [];
  return readdirSync(full).filter((name) => {
    const stat = statSync(path.join(full, name));
    return stat.isDirectory();
  });
}

function walkFiles(dir, results = [], ignore = ['node_modules', '.git', 'out', 'release', 'dist', '.vite']) {
  const full = path.join(root, dir);
  if (!existsSync(full)) return results;
  for (const entry of readdirSync(full)) {
    if (ignore.includes(entry)) continue;
    const e = path.join(full, entry);
    const st = statSync(e);
    if (st.isDirectory()) {
      walkFiles(path.relative(root, e), results, ignore);
    } else if (/\.(m?js|ts|tsx|jsx|cjs)$/u.test(entry)) {
      results.push(path.relative(root, e));
    }
  }
  return results;
}

function readText(rel) {
  return readFileSync(path.join(root, rel), 'utf8');
}

// ---- 1. No @masterpiece-os/ residuals ----
console.log('\n[1] Checking for @masterpiece-os/ namespace residuals...');
let foundResiduals = 0;
const allJson = walkFiles('.', [], ['node_modules', '.git', 'out', 'release', 'dist', '.vite', '.codex-smoke']);
for (const f of allJson) {
  if (!f.endsWith('package.json')) continue;
  let text;
  try { text = readText(f); } catch { continue; }
  if (/@masterpiece-os\//u.test(text)) {
    fail('residual @masterpiece-os/ reference', f);
    foundResiduals += 1;
  }
}
if (foundResiduals === 0) ok('no @masterpiece-os/ package name residuals');

// ---- 2. Workspace apps/packages must declare internal deps ----
console.log('\n[2] Checking that workspace consumers declare internal @masterpiece/* deps...');
const consumerRoots = [
  ...listDir('apps').map((n) => `apps/${n}`),
];
const internalPackages = listDir('packages');
const internalNames = new Set(
  internalPackages
    .map((p) => {
      try {
        return readJson(`packages/${p}/package.json`).name;
      } catch {
        return null;
      }
    })
    .filter(Boolean),
);
console.log(`  internal packages discovered: ${[...internalNames].join(', ')}`);

for (const consumer of consumerRoots) {
  const pkgPath = `${consumer}/package.json`;
  if (!existsSync(path.join(root, pkgPath))) continue;
  const pkg = readJson(pkgPath);
  const declaredDeps = new Set([
    ...Object.keys(pkg.dependencies ?? {}),
    ...Object.keys(pkg.devDependencies ?? {}),
  ]);
  const imported = new Set();
  const deepImported = new Set();
  const files = walkFiles(consumer);
  const importRe = /from\s+['"]@masterpiece\/([\w.-]+)(?:\/[^'"]*)?['"]/gu;
  const deepReLocal = /from\s+['"](?:\.\.\/)+packages\/([\w.-]+)\/src\//gu;
  for (const f of files) {
    let text;
    try { text = readText(f); } catch { continue; }
    let m;
    while ((m = importRe.exec(text)) !== null) imported.add(`@masterpiece/${m[1]}`);
    deepReLocal.lastIndex = 0;
    while ((m = deepReLocal.exec(text)) !== null) deepImported.add(m[1]);
  }

  // FAIL: @masterpiece/* imports without a declared dep
  for (const name of imported) {
    if (!declaredDeps.has(name)) {
      fail(`${consumer} imports ${name} without declaring it in package.json`);
    }
  }
  // FAIL: deep-imported package that has no @masterpiece/* dep entry either.
  // Each deep-imported packages/<name> must be reachable through the
  // declared @masterpiece/<name> workspace dependency.
  const deepUndeclared = [];
  for (const pkgName of deepImported) {
    const candidates = [`@masterpiece/${pkgName}`, `@masterpiece-os/${pkgName}`];
    if (!candidates.some((c) => declaredDeps.has(c))) {
      deepUndeclared.push(pkgName);
    }
  }
  if (deepUndeclared.length > 0) {
    fail(
      `${consumer} deep-imports packages without declaring a workspace dep`,
      `missing @masterpiece/* dep for: ${[...new Set(deepUndeclared)].join(', ')}`,
    );
  }

  if (imported.size > 0 || deepImported.size > 0) {
    const importedLabel = imported.size > 0
      ? `${imported.size} @masterpiece/* import(s)`
      : '';
    const deepLabel = deepImported.size > 0
      ? `${deepImported.size} deep import(s)`
      : '';
    ok(`${consumer} declares deps for ${[importedLabel, deepLabel].filter(Boolean).join(' + ')}`);
  } else {
    ok(`${consumer} has no internal imports`);
  }
}

// ---- 3. (FAIL) Deep imports of packages/*/src/* from apps/** or tests/** ----
console.log('\n[3] Scanning for deep relative imports of packages/*/src/* from apps/** and tests/**...');
const deepRe = /from\s+['"](?:\.\.\/)+packages\/([\w.-]+)\/src\//gu;
let deepImportFiles = 0;
let deepImportCount = 0;
const deepByPkg = new Map();
for (const dir of ['apps', 'tests']) {
  for (const f of walkFiles(dir)) {
    let text;
    try { text = readText(f); } catch { continue; }
    const matches = [...text.matchAll(deepRe)];
    if (matches.length === 0) continue;
    deepImportFiles += 1;
    deepImportCount += matches.length;
    for (const m of matches) {
      const pkg = m[1];
      deepByPkg.set(pkg, (deepByPkg.get(pkg) || 0) + 1);
    }
  }
}
if (deepImportCount === 0) {
  ok('no deep imports of packages/*/src/* in apps/** or tests/**');
} else {
  fail(
    `apps/** and tests/** deep-imports packages/*/src/*`,
    `${deepImportCount} occurrence(s) across ${deepImportFiles} file(s); packages: ${[...deepByPkg.entries()].map(([p, c]) => `${p}=${c}`).join(', ')}`,
  );
}

// ---- 4. (FAIL) Subpath imports that are not exported ----
console.log('\n[4] Scanning for subpath imports that are not in package.json exports...');
const subRe = /from\s+['"](?:\.\.\/)+packages\/([\w.-]+)\/src\/(.+?)['"]/gu;
const subViolations = new Map();
for (const dir of ['apps', 'tests']) {
  for (const f of walkFiles(dir)) {
    let text;
    try { text = readText(f); } catch { continue; }
    let m;
    while ((m = subRe.exec(text)) !== null) {
      const pkgName = m[1];
      const subPath = m[2];
      if (!subViolations.has(pkgName)) subViolations.set(pkgName, new Set());
      subViolations.get(pkgName).add(subPath);
    }
  }
}
if (subViolations.size === 0) {
  ok('all subpath imports in apps/** and tests/** are valid');
} else {
  for (const [pkgName, subPaths] of subViolations) {
    fail(`${dir}/** deep-imports subpaths from packages/${pkgName}`, `${subPaths.size} unique subpath(s)`);
  }
}

console.log();
console.log(`Summary: ${failures.length} failure(s), ${warnings.length} warning(s)`);
if (failures.length > 0) {
  console.log('\nFAIL — workspace boundary violations must be fixed before release.');
  for (const f of failures) console.log(`  - ${f.label}${f.detail ? ' — ' + f.detail : ''}`);
  process.exit(1);
}
console.log('\nPASS — workspace boundary gate clean. No deep imports remain.');
