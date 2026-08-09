// R10.4.1 — fresh post-repair sample binding test.
//
// Guards the R10.4.1 final-acceptance evidence: the three fresh Standard
// samples under quality-baselines/r10.4.1-post-repair/ must be bound to their
// real run/output (runId, imageSha256, promptHash, compilerId, commitSha,
// baselineId, generatedAt) and must pass the fail-closed integrity gate as
// FRESH samples (not historical copy-forward). The JZMX Reference-First sample
// is carried-forward evidence only.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const base = 'space-generator/quality-baselines/r10.4.1-post-repair';
const REPAIR_COMMIT = 'de5b0f804371d16968f9209b649ae21f29c7775b';
const REPAIR_TIME = '2026-08-09T17:41:56+08:00';

const FRESH_SAMPLES = [
  'jiuzhou-aesthetics/jzmx-standard-1',
  'feng-tang-tang/ftt-standard-1',
  'yi-ji-liang-fang/yjlf-standard-1',
];

function sha256(buf) {
  return crypto.createHash('sha256').update(buf).digest('hex');
}

test('R10.4.1 fresh samples pass the integrity gate as fresh (not historical)', async () => {
  const integrityMod = await import(pathToFileURL(path.join(
    repoRoot,
    'packages/image-generation-runtime/src/quality/final-acceptance-artifact-integrity.js',
  )).href);
  const { verifyFinalAcceptanceArtifactIntegrity } = integrityMod;

  for (const rel of FRESH_SAMPLES) {
    const dir = path.join(repoRoot, base, rel);
    const evaluation = JSON.parse(fs.readFileSync(path.join(dir, 'evaluation.json'), 'utf8'));
    const run = JSON.parse(fs.readFileSync(path.join(dir, 'run.json'), 'utf8'));
    const prompt = fs.readFileSync(path.join(dir, 'prompt.md'), 'utf8');
    const output = fs.readFileSync(path.join(dir, 'output.png'));

    // Core binding contract.
    assert.equal(evaluation.baselineId, 'r10.4.1-post-repair', `${rel}: baseline`);
    assert.equal(evaluation.commitSha, REPAIR_COMMIT, `${rel}: repair commit`);
    assert.equal(run.compilerMode, 'r8_6_golden', `${rel}: production compiler`);
    assert.equal(run.referenceCount, 0, `${rel}: refs=0`);
    assert.equal(run.aspectRatio, '16:9', `${rel}: 16:9`);
    assert.equal(evaluation.runId, run.runId, `${rel}: runId binding`);
    assert.equal(evaluation.imageSha256, sha256(output), `${rel}: imageSha256 binding`);

    const promptHash = sha256(Buffer.from(prompt, 'utf8'));
    const gate = verifyFinalAcceptanceArtifactIntegrity({
      evaluation,
      run,
      outputBuffer: output,
      compiledPromptHash: promptHash,
      acceptedCompilerIds: ['phase9b-quality-compiler'],
      expectedBaselineId: 'r10.4.1-post-repair',
      repairCommitSha: REPAIR_COMMIT,
      repairCommitTime: REPAIR_TIME,
    });
    assert.equal(gate.status, 'pass', `${rel}: integrity pass`);
    assert.equal(gate.sampleIsFresh, true, `${rel}: fresh`);
    assert.equal(gate.historicalOnly, false, `${rel}: not historical`);
    assert.ok(gate.checks.imageHashMatched && gate.checks.runIdMatched, `${rel}: hash+run bound`);
  }
});

test('R10.4.1 fresh prompt carries no decorative-object functional hard requirement', () => {
  const decorative = /艺术装置|雕塑|装饰装置|中心装置|艺术品|sculpture|art installation/i;
  for (const rel of FRESH_SAMPLES) {
    const prompt = fs.readFileSync(path.join(repoRoot, base, rel, 'prompt.md'), 'utf8');
    const bridge = prompt.split('Architecture-Function Bridge')[1]?.split('**Concept Drift Guards')[0] ?? '';
    assert.doesNotMatch(bridge, decorative, `${rel}: no decorative-object functional hard requirement`);
  }
});
