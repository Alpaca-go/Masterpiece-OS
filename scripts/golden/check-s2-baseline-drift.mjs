import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const baselineCommit = 'deb1cba8b40b22bf9c026ae5ec40f5b46389d6e2';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const manifest = fs.readFileSync(path.join(root, 'docs/baseline/baseline-files-manifest.md'), 'utf8');
const files = manifest.split(/\r?\n/).map((line) => line.match(/^\| `([^`]+)` \|/)?.[1]).filter(Boolean);
assert.ok(files.length > 0, 'baseline manifest must contain files');

const productionFiles = files.filter((file) => file !== 'package.json');
const changedProduction = execFileSync('git', ['diff', '--name-only', baselineCommit, '--', ...productionFiles], { cwd: root, encoding: 'utf8' }).trim();
const dirtyProduction = execFileSync('git', ['status', '--porcelain', '--', ...productionFiles], { cwd: root, encoding: 'utf8' }).trim();
if (changedProduction || dirtyProduction) {
  console.error('BASELINE_DRIFT_DETECTED');
  if (changedProduction) console.error(changedProduction);
  if (dirtyProduction) console.error(dirtyProduction);
  process.exit(1);
}

const baselinePackage = JSON.parse(execFileSync('git', ['show', `${baselineCommit}:package.json`], { cwd: root, encoding: 'utf8' }));
const currentPackage = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
assert.equal(currentPackage.scripts['golden:test'], 'node ./scripts/golden/run-golden.mjs');
delete currentPackage.scripts['golden:test'];
if (JSON.stringify(currentPackage) !== JSON.stringify(baselinePackage)) {
  console.error('BASELINE_DRIFT_DETECTED: package.json contains changes beyond the sanctioned S2 golden:test hook');
  process.exit(1);
}

console.log(`BASELINE_CLEAN commit=${baselineCommit} files=${files.length} sanctionedTestHooks=1`);
