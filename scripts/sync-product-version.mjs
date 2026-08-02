#!/usr/bin/env node
// sync-product-version.mjs
// Single source of truth: /VERSION
// Synchronises product version into every product-facing manifest and the CLI
// runtime fallback. Internal packages keep their independent 0.0.0 versions.
//
// Idempotent — safe to run repeatedly.

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function readVersion() {
  const raw = readFileSync(path.join(root, 'VERSION'), 'utf8').trim();
  if (!/^\d+\.\d+\.\d+(-[A-Za-z0-9.-]+)?$/.test(raw)) {
    throw new Error(`VERSION file does not contain a semver string: "${raw}"`);
  }
  return raw;
}

function updatePackageJson(relPath, expectedName, version) {
  const full = path.join(root, relPath);
  if (!existsSync(full)) {
    console.warn(`  [skip] ${relPath} does not exist`);
    return false;
  }
  const json = JSON.parse(readFileSync(full, 'utf8'));
  if (expectedName && json.name !== expectedName) {
    throw new Error(
      `${relPath}: expected name="${expectedName}", found name="${json.name}"`,
    );
  }
  if (json.version === version) {
    console.log(`  [ok]   ${relPath} already at ${version}`);
    return false;
  }
  json.version = version;
  writeFileSync(full, JSON.stringify(json, null, 2) + '\n', 'utf8');
  console.log(`  [set]  ${relPath} → ${version}`);
  return true;
}

function updateRuntimeTrace(version) {
  const relative = path.join('apps', 'cli', 'src', 'runtime-trace.js');
  const full = path.join(root, relative);
  if (!existsSync(full)) {
    throw new Error(`${relative} missing`);
  }
  const text = readFileSync(full, 'utf8');
  const re = /export const DEFAULT_APP_VERSION = '([^']+)';/;
  if (!re.test(text)) {
    throw new Error(
      `${relative}: DEFAULT_APP_VERSION constant not found or not in expected format`,
    );
  }
  const current = re.exec(text)[1];
  if (current === version) {
    console.log(`  [ok]   ${relative} DEFAULT_APP_VERSION already at ${version}`);
    return false;
  }
  const next = text.replace(re, `export const DEFAULT_APP_VERSION = '${version}';`);
  writeFileSync(full, next, 'utf8');
  console.log(`  [set]  ${relative} DEFAULT_APP_VERSION → ${version}`);
  return true;
}

const version = readVersion();
console.log(`VERSION file declares: ${version}`);

let changed = 0;
changed += updatePackageJson('package.json', 'masterpiece-os', version) ? 1 : 0;
changed += updatePackageJson('apps/desktop/package.json', 'masterpiece-os-desktop', version) ? 1 : 0;
changed += updatePackageJson('apps/cli/package.json', '@masterpiece/cli', version) ? 1 : 0;
changed += updatePackageJson('apps/cli/templates/masterpiece-os-v5.json', null, version) ? 1 : 0;
changed += updateRuntimeTrace(version) ? 1 : 0;

if (changed === 0) {
  console.log('\nNo changes — product version already in sync.');
} else {
  console.log(`\nUpdated ${changed} file(s) to version ${version}.`);
  console.log('Run `npm install --package-lock-only` to refresh the root lockfile.');
}
