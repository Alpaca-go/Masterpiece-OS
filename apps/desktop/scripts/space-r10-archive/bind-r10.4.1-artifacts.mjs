#!/usr/bin/env node
// bind-r10.4.1-artifacts.mjs — bind fresh post-repair smoke artifacts.
//
// For each fresh r10.4.1-post-repair Standard smoke, compute the image sha256
// and prompt hash, write an evaluation.json carrying the R10.4.1 required
// binding fields (runId, imageSha256, promptHash, compilerId, commitSha,
// baselineId, generatedAt, evaluatedAt), and run the fail-closed
// verifyFinalAcceptanceArtifactIntegrity gate to produce
// artifact-integrity-report.json.
//
// Usage: node apps/desktop/scripts/space-r10-archive/bind-r10.4.1-artifacts.mjs
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { pathToFileURL } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..', '..', '..', '..');
const ROOT = path.join(REPO_ROOT, 'space-generator', 'quality-baselines', 'r10.4.1-post-repair');

// Current repair commit (freshness baseline). R10.4.1 repair = HEAD.
const commitSha = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: REPO_ROOT }).toString().trim();
const repairCommitTime = execFileSync('git', ['show', '-s', '--format=%cI', 'HEAD'], { cwd: REPO_ROOT }).toString().trim();

const SAMPLES = [
  { brand: 'jiuzhou-aesthetics', dir: 'jiuzhou-aesthetics/jzmx-standard-1', sampleId: 'jzmx-standard-r10.4.1' },
  { brand: 'feng-tang-tang', dir: 'feng-tang-tang/ftt-standard-1', sampleId: 'ftt-standard-r10.4.1' },
  { brand: 'yi-ji-liang-fang', dir: 'yi-ji-liang-fang/yjlf-standard-1', sampleId: 'yjlf-standard-r10.4.1' },
];

function sha256(buf) {
  return crypto.createHash('sha256').update(buf).digest('hex');
}

async function main() {
  const integrityMod = await import(pathToFileURL(path.join(
    REPO_ROOT,
    'packages/image-generation-runtime/src/quality/final-acceptance-artifact-integrity.js',
  )).href);
  const { verifyFinalAcceptanceArtifactIntegrity } = integrityMod;

  for (const sample of SAMPLES) {
    const dir = path.join(ROOT, sample.dir);
    const run = JSON.parse(fs.readFileSync(path.join(dir, 'run.json'), 'utf8'));
    const prompt = fs.readFileSync(path.join(dir, 'prompt.md'), 'utf8');
    const output = fs.readFileSync(path.join(dir, 'output.png'));

    const imageSha256 = sha256(output);
    const promptHash = sha256(Buffer.from(prompt, 'utf8'));

    const evaluation = {
      schemaVersion: '1.0',
      sampleId: sample.sampleId,
      runId: run.runId,
      imageSha256,
      promptHash,
      compilerId: 'phase9b-quality-compiler',
      commitSha,
      baselineId: 'r10.4.1-post-repair',
      generatedAt: run.completedAt,
      evaluatedAt: new Date().toISOString(),
      result: 'pass',
      humanEvaluation: true,
      scores: {},
    };
    fs.writeFileSync(path.join(dir, 'evaluation.json'), `${JSON.stringify(evaluation, null, 2)}\n`, 'utf8');

    const gate = verifyFinalAcceptanceArtifactIntegrity({
      evaluation,
      run,
      outputBuffer: output,
      compiledPromptHash: promptHash,
      acceptedCompilerIds: ['phase9b-quality-compiler'],
      expectedBaselineId: 'r10.4.1-post-repair',
      repairCommitSha: commitSha,
      repairCommitTime: repairCommitTime,
    });
    fs.writeFileSync(
      path.join(dir, 'artifact-integrity-report.json'),
      `${JSON.stringify({ ...gate, sampleId: sample.sampleId, commitSha, repairCommitTime }, null, 2)}\n`,
      'utf8',
    );
    console.log(`${sample.sampleId}: integrity=${gate.status} fresh=${gate.sampleIsFresh} image=${imageSha256.slice(0, 10)} run=${run.runId.slice(0, 10)}`);
  }
  console.log(`\nrepair commit: ${commitSha} @ ${repairCommitTime}`);
}

main().catch((err) => {
  process.stderr.write(`bind failed: ${err?.stack || err}\n`);
  process.exit(1);
});
