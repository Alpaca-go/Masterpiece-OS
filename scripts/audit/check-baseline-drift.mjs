import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const baselineCommit = '322ae676c546340fd7a9d467bca66ebe3fd023f7';
const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(scriptDir, '..', '..');
const manifestPath = path.join(root, 'docs', 'baseline', 'baseline-files-manifest.md');
const manifest = fs.readFileSync(manifestPath, 'utf8');
const files = manifest.split(/\r?\n/)
  .map((line) => line.match(/^\| `([^`]+)` \|/)?.[1])
  .filter(Boolean);

if (files.length === 0) {
  console.error('BASELINE_DRIFT_CHECK_FAILED: manifest contains no paths');
  process.exit(2);
}

const diff = spawnSync('git', ['diff', '--quiet', baselineCommit, '--', ...files], {
  cwd: root,
  stdio: 'ignore',
});
if (diff.error || (diff.status !== 0 && diff.status !== 1)) {
  console.error(`BASELINE_DRIFT_CHECK_FAILED: cannot compare with ${baselineCommit}`);
  process.exit(2);
}

const status = spawnSync('git', ['status', '--porcelain', '--', ...files], {
  cwd: root,
  encoding: 'utf8',
});
if (status.error || status.status !== 0) {
  console.error('BASELINE_DRIFT_CHECK_FAILED: cannot inspect working tree');
  process.exit(2);
}

if (diff.status === 1 || status.stdout.trim()) {
  console.error('BASELINE_DRIFT_DETECTED');
  if (status.stdout.trim()) process.stderr.write(status.stdout);
  process.exit(1);
}

console.log(`BASELINE_CLEAN commit=${baselineCommit} files=${files.length}`);
