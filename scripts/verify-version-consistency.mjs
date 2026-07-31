#!/usr/bin/env node
// verify-version-consistency.mjs
// Release gate: confirms the product version is unified across every place it appears.
//
// Checks (all must pass):
//   1. /VERSION contains a semver string.
//   2. /package.json "version" matches /VERSION.
//   3. /apps/desktop/package.json "version" matches /VERSION.
//   4. /package-lock.json root package version matches /VERSION.
//   5. No sub-directory contains a package-lock.json (single-lockfile policy).
//   6. /src/runtime-trace.js DEFAULT_APP_VERSION constant matches /VERSION.
//   7. /apps/desktop/package-lock.json must NOT exist.
//   8. /packages/*/package.json (internal shared packages) all carry
//      "private": true and "version": "0.0.0" — they must not impersonate
//      the product version.
//   9. /labs/*/package.json (lab packages) all carry "private": true.
//
// Exits non-zero on the first failure (or collects all failures and exits
// non-zero at the end — current behaviour: collect-then-fail).
//
// Idempotent and offline.

import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const SEMVER = /^\d+\.\d+\.\d+(-[A-Za-z0-9.-]+)?$/;

const failures = [];
function check(label, cond, detail) {
  if (cond) {
    console.log(`  [ok]   ${label}`);
  } else {
    console.log(`  [FAIL] ${label}${detail ? ' — ' + detail : ''}`);
    failures.push(label);
  }
}

function readVersion() {
  const raw = readFileSync(path.join(root, 'VERSION'), 'utf8').trim();
  if (!SEMVER.test(raw)) {
    throw new Error(`VERSION file does not contain a semver string: "${raw}"`);
  }
  return raw;
}

function readJson(rel) {
  const full = path.join(root, rel);
  return JSON.parse(readFileSync(full, 'utf8'));
}

function walkPackageJson(dir, results = []) {
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules' || entry === '.git') continue;
    const full = path.join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) {
      walkPackageJson(full, results);
    } else if (entry === 'package.json') {
      results.push(full);
    }
  }
  return results;
}

const version = readVersion();
console.log(`Product version: ${version}\n`);

// 1. VERSION itself
check('VERSION file', true);

// 2. root package.json
const rootPkg = readJson('package.json');
check(
  'package.json version matches VERSION',
  rootPkg.version === version,
  `found "${rootPkg.version}"`,
);

// 3. apps/desktop/package.json
const desktopPkg = readJson('apps/desktop/package.json');
check(
  'apps/desktop/package.json version matches VERSION',
  desktopPkg.version === version,
  `found "${desktopPkg.version}"`,
);

// 4. root lockfile
const lockPath = path.join(root, 'package-lock.json');
if (existsSync(lockPath)) {
  const lock = readJson('package-lock.json');
  const lockRootVer = lock.packages?.['']?.version;
  check(
    'package-lock.json root version matches VERSION',
    lockRootVer === version,
    `found "${lockRootVer}"`,
  );
} else {
  check('package-lock.json exists', false, 'missing — run `npm install` first');
}

// 5. no sub-directory lockfiles
const extraLockfiles = [];
function findLockfiles(dir) {
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules' || entry === '.git') continue;
    const full = path.join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) {
      findLockfiles(full);
    } else if (entry === 'package-lock.json' && full !== lockPath) {
      extraLockfiles.push(full.substring(root.length + 1));
    }
  }
}
findLockfiles(root);
check(
  'no sub-directory package-lock.json files',
  extraLockfiles.length === 0,
  extraLockfiles.length ? `found: ${extraLockfiles.join(', ')}` : '',
);

// 6. runtime-trace.js DEFAULT_APP_VERSION
const rtPath = path.join(root, 'src', 'runtime-trace.js');
if (existsSync(rtPath)) {
  const rt = readFileSync(rtPath, 'utf8');
  const m = /export const DEFAULT_APP_VERSION = '([^']+)'/.exec(rt);
  check(
    'src/runtime-trace.js DEFAULT_APP_VERSION matches VERSION',
    !!m && m[1] === version,
    m ? `found "${m[1]}"` : 'constant not found',
  );
} else {
  check('src/runtime-trace.js exists', false);
}

// 7. apps/desktop/package-lock.json must NOT exist
const desktopLock = path.join(root, 'apps', 'desktop', 'package-lock.json');
check(
  'apps/desktop/package-lock.json does NOT exist',
  !existsSync(desktopLock),
  existsSync(desktopLock) ? 'still present' : '',
);

// 8. internal packages are 0.0.0 + private
console.log('\nInternal packages (packages/*):');
for (const entry of readdirSync(path.join(root, 'packages'))) {
  const pkgPath = path.join(root, 'packages', entry, 'package.json');
  if (!existsSync(pkgPath)) continue;
  const j = readJson(`packages/${entry}/package.json`);
  check(
    `  packages/${entry}: private + version 0.0.0`,
    j.private === true && j.version === '0.0.0',
    `name="${j.name}" private=${j.private} version="${j.version}"`,
  );
}

// 9. labs are private
console.log('\nLab packages (labs/*):');
for (const entry of readdirSync(path.join(root, 'labs'))) {
  const pkgPath = path.join(root, 'labs', entry, 'package.json');
  if (!existsSync(pkgPath)) continue;
  const j = readJson(`labs/${entry}/package.json`);
  check(
    `  labs/${entry}: private`,
    j.private === true,
    `name="${j.name}" private=${j.private}`,
  );
}

console.log();
if (failures.length === 0) {
  console.log('PASS  version consistency gate completed without inconsistencies.');
  process.exit(0);
} else {
  console.log(`FAIL  ${failures.length} inconsistency check(s) failed:`);
  for (const f of failures) console.log(`  - ${f}`);
  process.exit(1);
}
