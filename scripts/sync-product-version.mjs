#!/usr/bin/env node
// Single product-version source: /VERSION.
// Synchronizes the root package and CLI runtime trace. Internal workspaces use
// their own fixed private versions and are validated separately.

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const version = readFileSync(path.join(root, 'VERSION'), 'utf8').trim();
if (!/^\d+\.\d+\.\d+(?:-[A-Za-z0-9.-]+)?$/u.test(version)) {
  throw new Error(`VERSION file does not contain a semver string: "${version}"`);
}

let changed = 0;
const packagePath = path.join(root, 'package.json');
const packageJson = JSON.parse(readFileSync(packagePath, 'utf8'));
if (packageJson.name !== 'masterpiece-os') throw new Error('Unexpected root package name');
if (packageJson.version !== version) {
  packageJson.version = version;
  writeFileSync(packagePath, `${JSON.stringify(packageJson, null, 2)}\n`, 'utf8');
  changed += 1;
  console.log(`  [set]  package.json -> ${version}`);
} else {
  console.log(`  [ok]   package.json already at ${version}`);
}

const tracePath = path.join(root, 'apps', 'cli', 'src', 'runtime-trace.js');
const trace = readFileSync(tracePath, 'utf8');
const versionPattern = /export const DEFAULT_APP_VERSION = '([^']+)';/u;
const match = versionPattern.exec(trace);
if (!match) throw new Error('apps/cli/src/runtime-trace.js DEFAULT_APP_VERSION is missing');
if (match[1] !== version) {
  writeFileSync(tracePath, trace.replace(versionPattern, `export const DEFAULT_APP_VERSION = '${version}';`), 'utf8');
  changed += 1;
  console.log(`  [set]  apps/cli/src/runtime-trace.js -> ${version}`);
} else {
  console.log(`  [ok]   apps/cli/src/runtime-trace.js already at ${version}`);
}

console.log(changed ? `Updated ${changed} file(s). Refresh package-lock.json if package.json changed.` : 'No changes — product version already in sync.');
