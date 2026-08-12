// Packaging V1 / P1 / D2 — Real Golden Baseline Output runner test
//
// P1 / D2 freezes the scaffold + finalize runner
// (scripts/run-packaging-golden-baseline.mjs). The runner
// itself does NOT call a real provider; it scaffolds the
// run dir + writes prompt.txt, and the human curator
// performs the actual image generation through the
// standard Masterpiece image-generation runtime, drops
// the output as output.png, and finalizes the manifest.
//
// This test pins:
//   - the runner file exists and is executable
//   - --list works (no side effects)
//   - --scaffold creates a run dir + prompt.txt
//   - --scaffold refuses to overwrite without --force
//   - --finalize requires output.png
//   - --finalize writes a valid manifest.json with the
//     required fields (Golden Project / Shot Contract /
//     Generation Mode / Anchor IDs / Golden Prompt ID+version /
//     Provider / Model / Approval status)
//   - the runner script is NOT imported by any production
//     code (the script is a manual / opt-in / cost-sensitive
//     tool; only scripts/ may spawn it)

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..', '..');
const RUNNER = path.join(REPO_ROOT, 'scripts', 'run-packaging-golden-baseline.mjs');
const OUTPUTS_DIR = path.join(
  REPO_ROOT,
  'tests',
  'fixtures',
  'packaging',
  'jiuzhou',
  'baseline-outputs',
);

const PRODUCTION_ROOTS = [
  'apps/cli',
  'apps/web',
  'apps/web-runtime',
  'packages/runtime-core',
  'packages/image-generation-contracts',
  'packages/image-generation-runtime',
  'packages/model-runtime',
];

function runRunner(args) {
  try {
    const out = execFileSync('node', [RUNNER, ...args], {
      cwd: REPO_ROOT,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    return { code: 0, stdout: out, stderr: '' };
  } catch (e) {
    return {
      code: e.status ?? 1,
      stdout: (e.stdout ?? '').toString(),
      stderr: (e.stderr ?? '').toString(),
    };
  }
}

test('P1 / D2 runner file exists', () => {
  assert.ok(fs.existsSync(RUNNER), `expected runner: ${RUNNER}`);
});

test('P1 / D2 --list prints planned runs and exits 0', () => {
  const r = runRunner(['--list']);
  assert.equal(r.code, 0, `--list should exit 0; stderr=${r.stderr}`);
  assert.ok(r.stdout.includes('Planned P1 / D2 baseline runs'), '--list should print planned header');
  for (const shot of ['hero', 'series', 'open']) {
    assert.ok(r.stdout.includes(shot), `--list should mention ${shot}`);
  }
});

test('P1 / D2 --scaffold --shot hero --run 1 creates run dir + prompt.txt', () => {
  const r = runRunner(['--scaffold', '--shot', 'hero', '--run', '1', '--force']);
  assert.equal(r.code, 0, `--scaffold should exit 0; stderr=${r.stderr}`);
  const runDir = path.join(OUTPUTS_DIR, 'hero', 'jiuzhou.hero.rf.v1', 'run-1');
  assert.ok(fs.existsSync(runDir), `expected run dir: ${runDir}`);
  const promptTxt = path.join(runDir, 'prompt.txt');
  assert.ok(fs.existsSync(promptTxt), `expected prompt.txt: ${promptTxt}`);
  const body = fs.readFileSync(promptTxt, 'utf8');
  assert.ok(body.length > 200, 'prompt.txt must be substantive');
  assert.ok(body.includes('[PACKAGE SUBJECT]'), 'prompt.txt should contain the canonical sections');
  // cleanup so the test is idempotent
  fs.rmSync(runDir, { recursive: true, force: true });
});

test('P1 / D2 --scaffold refuses to overwrite without --force', () => {
  const r1 = runRunner(['--scaffold', '--shot', 'series', '--run', '1']);
  assert.equal(r1.code, 0, 'first scaffold should succeed');
  const r2 = runRunner(['--scaffold', '--shot', 'series', '--run', '1']);
  assert.notEqual(r2.code, 0, 'second scaffold without --force must fail');
  assert.ok(/already exists/.test(r2.stderr) || /already exists/.test(r2.stdout), 'error should mention "already exists"');
  // cleanup
  const runDir = path.join(OUTPUTS_DIR, 'series', 'jiuzhou.series.rf.v1', 'run-1');
  fs.rmSync(runDir, { recursive: true, force: true });
});

test('P1 / D2 --finalize fails when output.png is missing', () => {
  // scaffold first
  const r1 = runRunner(['--scaffold', '--shot', 'open', '--run', '1', '--force']);
  assert.equal(r1.code, 0);
  // --finalize should refuse
  const r2 = runRunner([
    '--finalize', '--shot', 'open', '--run', '1',
    '--provider', 'volcengine', '--model', 'doubao-seed-2.1-turbo',
    '--approval', 'approved',
  ]);
  assert.notEqual(r2.code, 0, '--finalize without output.png must fail');
  assert.ok(/output\.png not found/.test(r2.stderr + r2.stdout), 'error should mention missing output.png');
  // cleanup
  const runDir = path.join(OUTPUTS_DIR, 'open', 'jiuzhou.open.rf.v1', 'run-1');
  fs.rmSync(runDir, { recursive: true, force: true });
});

test('P1 / D2 --finalize writes a valid manifest.json with all required fields', () => {
  const r1 = runRunner(['--scaffold', '--shot', 'hero', '--run', '2', '--force']);
  assert.equal(r1.code, 0);
  const runDir = path.join(OUTPUTS_DIR, 'hero', 'jiuzhou.hero.rf.v1', 'run-2');
  // create a stub output.png (1x1 PNG) so --finalize can pass its existence check
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==', 'base64');
  fs.writeFileSync(path.join(runDir, 'output.png'), png);
  const r2 = runRunner([
    '--finalize', '--shot', 'hero', '--run', '2',
    '--provider', 'volcengine', '--model', 'doubao-seed-2.1-turbo',
    '--anchor-ids', 'anchor-hero-rf-01',
    '--approval', 'approved',
    '--limitations', 'first pass; Reference-First anchor not yet curated',
  ]);
  assert.equal(r2.code, 0, `--finalize should exit 0; stderr=${r2.stderr}`);
  const manifest = JSON.parse(fs.readFileSync(path.join(runDir, 'manifest.json'), 'utf8'));
  assert.equal(manifest.goldenProject, 'jiuzhou');
  assert.equal(manifest.goldenProjectId, 'golden-jiuzhou');
  assert.equal(manifest.shotContract, 'PKG-HERO-SINGLE');
  assert.equal(manifest.generationMode, 'reference-first');
  assert.deepEqual(manifest.goldenAnchorIds, ['anchor-hero-rf-01']);
  assert.equal(manifest.goldenPrompt.id, 'jiuzhou.hero.rf.v1');
  assert.equal(manifest.goldenPrompt.version, '1.0.0');
  assert.equal(manifest.provider, 'volcengine');
  assert.equal(manifest.model, 'doubao-seed-2.1-turbo');
  assert.equal(manifest.runNumber, 2);
  assert.equal(manifest.humanApprovalStatus, 'approved');
  assert.equal(manifest.knownLimitations, 'first pass; Reference-First anchor not yet curated');
  assert.ok(manifest.runFinalizedAt && /^\d{4}-\d{2}-\d{2}T/.test(manifest.runFinalizedAt), 'runFinalizedAt must be ISO timestamp');
  // cleanup
  fs.rmSync(runDir, { recursive: true, force: true });
});

test('P1 / D2 --finalize rejects unknown provider and unknown approval', () => {
  const r1 = runRunner(['--scaffold', '--shot', 'hero', '--run', '3', '--force']);
  assert.equal(r1.code, 0);
  const runDir = path.join(OUTPUTS_DIR, 'hero', 'jiuzhou.hero.rf.v1', 'run-3');
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==', 'base64');
  fs.writeFileSync(path.join(runDir, 'output.png'), png);
  const r2 = runRunner(['--finalize', '--shot', 'hero', '--run', '3', '--provider', 'banana', '--model', 'x', '--approval', 'approved']);
  assert.notEqual(r2.code, 0);
  const r3 = runRunner(['--finalize', '--shot', 'hero', '--run', '3', '--provider', 'qwen', '--model', 'x', '--approval', 'maybe']);
  assert.notEqual(r3.code, 0);
  // cleanup
  fs.rmSync(runDir, { recursive: true, force: true });
});

test('P1 / D2 production code does NOT import the runner (manual tool only)', () => {
  function walk(dir, acc) {
    if (!fs.existsSync(dir)) return acc;
    for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, ent.name);
      if (ent.isDirectory()) {
        if (ent.name === 'node_modules' || ent.name === 'dist' || ent.name === 'build' || ent.name === '.runtime') continue;
        walk(p, acc);
      } else if (ent.isFile()) {
        if (/\.(ts|tsx|js|mjs|cjs|json)$/.test(ent.name)) {
          acc.push(p);
        }
      }
    }
    return acc;
  }
  const offenders = [];
  for (const root of PRODUCTION_ROOTS) {
    const abs = path.join(REPO_ROOT, root);
    for (const file of walk(abs, [])) {
      const text = fs.readFileSync(file, 'utf8');
      if (text.includes('run-packaging-golden-baseline')) {
        offenders.push(path.relative(REPO_ROOT, file));
      }
    }
  }
  assert.deepEqual(offenders, [], `production code must NOT import the manual runner; offenders: ${offenders.join(', ')}`);
});
