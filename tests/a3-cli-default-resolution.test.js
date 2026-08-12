// A3-G CLI Default Provider Resolution — offline subprocess tests
//
// Per A3 spec §22 / §23 / §24: the CLI must use the same
// Analysis Provider Registry / Provider Policy semantics as the
// Web Runtime. The CLI must NOT contain a `if selected === 'qwen'`
// branch. The default falls back to `getCurrentProviderPolicy().
// default` (currently Volcengine / doubao-seed-2.1-turbo).
//
// These tests exercise the CLI by spawning the masterpiece-os.js
// binary as a subprocess so the routing logic is verified end-to-end
// (not just in isolation). They are offline (no network) by
// running against a missing-credential environment so the CLI
// surfaces a credentials / policy / override error before any
// HTTP request.

import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import process from 'node:process';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { mkdirSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';

const __filename = fileURLToPath(import.meta.url);
const repoRoot = path.resolve(path.dirname(__filename), '..');
const cliBin = path.join(repoRoot, 'apps', 'cli', 'bin', 'masterpiece-os.js');

function runCli(args, envOverrides = {}) {
  // Strip any provider credentials so the CLI's reasoner factory
  // fails fast (no real network call attempted).
  const env = { ...process.env, ...envOverrides };
  delete env.VOLCENGINE_API_KEY;
  delete env.ARK_API_KEY;
  delete env.QWEN_API_KEY;
  delete env.MASTERPIECE_PROVIDER;
  for (const [k, v] of Object.entries(envOverrides)) env[k] = v;
  return spawnSync(process.execPath, [cliBin, ...args], {
    cwd: repoRoot,
    env,
    encoding: 'utf8',
    timeout: 30_000,
  });
}

test('A3-G CLI --help advertises both qwen and volcengine providers', () => {
  const result = runCli(['help']);
  assert.equal(result.status, 0, `CLI exited non-zero: ${result.stderr}`);
  assert.match(result.stdout, /qwen/u);
  assert.match(result.stdout, /volcengine/u);
  assert.match(result.stdout, /Provider Policy/i);
});

test('A3-G CLI inventory command works without any provider config (offline)', () => {
  // `inventory` does not call any provider; it just walks the
  // input directory. This confirms the CLI boots end-to-end after
  // the A3-G refactor (resolveReasoner is never called for
  // `inventory`).
  const tmpRoot = mkdtempSync(path.join(tmpdir(), 'a3-cli-inv-'));
  const result = runCli(['inventory', tmpRoot, '--json']);
  assert.equal(result.status, 0, `CLI exited non-zero: ${result.stderr}`);
  const payload = JSON.parse(result.stdout);
  assert.ok(typeof payload.totalFiles === 'number');
  assert.ok(typeof payload.imageCount === 'number');
});

test('A3-G CLI with --provider unknown fails explicitly (REASONER_PROVIDER_UNSUPPORTED)', () => {
  const result = runCli(['analyze', repoRoot, '--provider', 'totally-fake-provider']);
  assert.notEqual(result.status, 0, 'CLI should exit non-zero for unknown provider');
  assert.match(result.stderr, /不支持的 Reasoner Provider|totally-fake-provider/u);
});

test('A3-G CLI default (no --provider) surfaces credentials-missing when policy default is volcengine', () => {
  // With VOLCENGINE_API_KEY / ARK_API_KEY stripped, the policy
  // default routes to Volcengine; the reasoner factory throws
  // VOLCENGINE_API_KEY_MISSING (or equivalent). The CLI exits
  // non-zero with a clear error.
  const result = runCli(['analyze', repoRoot]);
  assert.notEqual(result.status, 0, 'CLI should exit non-zero when no credentials are available');
  const combined = `${result.stdout}\n${result.stderr}`;
  assert.match(combined, /API[_ ]?Key|API_KEY|provider|Provider|Reasoner/i);
});

test('A3-G CLI with --provider qwen surfaces credentials-missing for Qwen (still routes through registry)', () => {
  const result = runCli(['analyze', repoRoot, '--provider', 'qwen']);
  assert.notEqual(result.status, 0, 'CLI should exit non-zero for qwen without credentials');
  const combined = `${result.stdout}\n${result.stderr}`;
  assert.match(combined, /API[_ ]?Key|API_KEY|QWEN/i);
});

test('A3-G CLI MASTERPIECE_PROVIDER=qwen (env var) also routes through the registry', () => {
  const result = runCli(['analyze', repoRoot], { MASTERPIECE_PROVIDER: 'qwen' });
  assert.notEqual(result.status, 0, 'CLI should exit non-zero for env-var qwen without credentials');
  const combined = `${result.stdout}\n${result.stderr}`;
  assert.match(combined, /API[_ ]?Key|API_KEY|QWEN/i);
});
