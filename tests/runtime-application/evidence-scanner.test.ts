// r2.0 §8 / Phase F-4: Evidence Scanner (DESKTOP layer) unit tests.
//
// The scanner reads the 9 evidence files from disk and produces a
// pure-data EvidenceBundle. The runtime validator consumes the
// bundle without ever reading the filesystem; this test pins the
// scanner's read + extract behavior end-to-end.
//
// Tests cover:
//   - happy path: 9 files present → bundle with correct bindings
//   - missing files: bundle.files reflect missing + exists=false
//   - bad JSON: file.error populated, payload=null
//   - output.png sha256: scanner computes the actual sha256, NOT
//     the one in run.json. The runtime validator cross-checks the two.
//   - integration: scanner + validator together produce a clean
//     ShortChainEvidenceCheckpoint.

import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import {
  scanShortChainEvidence,
  runShortChainEvidenceCheckpoint,
} from '@masterpiece/runtime-core/application/image-generation/evidence-scanner.ts';

const FIXED_NOW = new Date('2026-08-10T12:00:00.000Z');

async function makeTempRoot() {
  return fs.mkdtemp(path.join(os.tmpdir(), 'masterpiece-r2-f4-scanner-'));
}

function pngBytes(seed: string): Buffer {
  // Minimal valid PNG: signature + IHDR + IEND. The resolver /
  // scanner only reads the first 16 bytes for the signature probe;
  // IEND is required for the file to be a "real" PNG.
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(1, 0); // width
  ihdr.writeUInt32BE(1, 4); // height
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // color type: RGB
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace
  const ihdrChunk = Buffer.concat([
    Buffer.from([0x00, 0x00, 0x00, 0x0d]),
    Buffer.from('IHDR'),
    ihdr,
    // CRC of IHDR: not strictly needed for the scanner, but we
    // include a dummy 4-byte placeholder so the file is at least
    // shape-valid. The scanner doesn't validate PNG.
    Buffer.from([0x00, 0x00, 0x00, 0x00]),
  ]);
  const iendChunk = Buffer.concat([
    Buffer.from([0x00, 0x00, 0x00, 0x00]),
    Buffer.from('IEND'),
    Buffer.from('ae', 'hex'),
    Buffer.from('42', 'hex'),
    Buffer.from('60', 'hex'),
    Buffer.from('82', 'hex'),
  ]);
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    ihdrChunk,
    iendChunk,
  ]);
}

async function setupHappyProject(opts: {
  basis?: 'standard' | 'reference_first' | 'continuation';
  referenceIds?: string[];
  validated?: boolean;
  promptHash?: string;
  imageHash?: string;
  runId?: string;
  taskId?: string;
  projectId?: string;
  targetScene?: string;
  injectOutputSha?: string | null;
  dropFiles?: ReadonlyArray<string>;
  malformedJson?: ReadonlyArray<string>;
} = {}) {
  const basis = opts.basis ?? 'standard';
  const referenceIds = opts.referenceIds ?? [];
  const validated = opts.validated ?? false;
  const promptHash = opts.promptHash ?? 'fp-happy';
  const runId = opts.runId ?? 'run-1';
  const taskId = opts.taskId ?? 'task-1';
  const projectId = opts.projectId ?? 'project-1';
  const targetScene = opts.targetScene ?? 'reception';
  const dropFiles = new Set(opts.dropFiles ?? []);
  const malformedJson = new Set(opts.malformedJson ?? []);

  const root = await makeTempRoot();
  const compileArtifactDir = path.join(root, 'image-generation-vnext', 'compilations', taskId);
  const runDir = path.join(root, 'image-generation', runId);
  const validationsDir = path.join(root, 'image-generation-vnext', 'validations');
  await fs.mkdir(compileArtifactDir, { recursive: true });
  await fs.mkdir(path.join(runDir, 'images'), { recursive: true });
  await fs.mkdir(validationsDir, { recursive: true });

  // Compute the actual sha256 of the output.png bytes so the bundle
  // has a real file hash. The imageHash in run.json claims the same
  // value unless opts.injectOutputSha overrides.
  const imageBytes = pngBytes('happy');
  const imageSha = crypto.createHash('sha256').update(imageBytes).digest('hex');
  const claimedImageHash = opts.imageHash ?? imageSha;
  const finalImageHash = opts.injectOutputSha !== null && opts.injectOutputSha !== undefined
    ? opts.injectOutputSha
    : claimedImageHash;

  // task-contract.json
  if (!dropFiles.has('task-contract.json')) {
    const taskContract = {
      schemaVersion: '1.0',
      taskId,
      projectId,
      deliverableFamily: 'space',
      subtype: targetScene,
      shot: 'entrance_view',
      count: 1,
      aspectRatio: '16:9',
      currentInstruction: 'Generate the first formal reception result.',
      mustInclude: [],
      mustAvoid: [],
      referenceAssetIds: referenceIds,
      generationBasis: basis,
      logoUsageMode: 'blank_area',
    };
    await fs.writeFile(
      path.join(compileArtifactDir, 'task-contract.json'),
      JSON.stringify(taskContract, null, 2),
      'utf8',
    );
  }

  // reference-trace.json (only meaningful for reference_first / continuation)
  if (!dropFiles.has('reference-trace.json') && (basis === 'reference_first' || basis === 'continuation' || referenceIds.length > 0)) {
    const referenceTrace = {
      schemaVersion: '1.0',
      referenceMode: basis === 'standard' ? 'text_only' : 'reference_assisted',
      providerReferenceCount: referenceIds.length,
      references: referenceIds.map((id) => ({ id, source: 'user_explicit' })),
    };
    await fs.writeFile(
      path.join(compileArtifactDir, 'reference-trace.json'),
      JSON.stringify(referenceTrace, null, 2),
      'utf8',
    );
  }

  // provider-payload.redacted.json
  if (!dropFiles.has('provider-payload.redacted.json')) {
    const payload = {
      model: 'seedream-5',
      prompt: 'redacted-prompt-text',
      size: '2560*1440',
      aspectRatio: '16:9',
      references: referenceIds.map((id) => ({ id, source: 'user_explicit' })),
      promptHash,
    };
    await fs.writeFile(
      path.join(compileArtifactDir, 'provider-payload.redacted.json'),
      JSON.stringify(payload, null, 2),
      'utf8',
    );
  }

  // trace.json
  if (!dropFiles.has('trace.json')) {
    const trace = {
      projectId,
      taskId,
      contextFingerprint: 'ctx-fp',
      route: {},
      trace: { sourceFingerprint: promptHash },
      compiledAt: FIXED_NOW.toISOString(),
    };
    await fs.writeFile(
      path.join(compileArtifactDir, 'trace.json'),
      JSON.stringify(trace, null, 2),
      'utf8',
    );
  }

  // run.json
  if (!dropFiles.has('run.json')) {
    const run = {
      schemaVersion: '1.0',
      runId,
      projectId,
      taskId,
      status: 'succeeded',
      deliverable: 'interior_scene',
      outputType: 'concept_image',
      providerId: 'dashscope',
      modelId: 'seedream-5',
      region: 'beijing',
      createdAt: FIXED_NOW.toISOString(),
      updatedAt: FIXED_NOW.toISOString(),
      completedAt: FIXED_NOW.toISOString(),
      gate: { blocked: false, errors: [], warnings: [] },
      images: [{
        imageId: 'img-1',
        relativePath: 'images/img-1.png',
        mimeType: 'image/png',
        sizeBytes: imageBytes.length,
        sha256: claimedImageHash,
      }],
    };
    await fs.writeFile(
      path.join(runDir, 'run.json'),
      JSON.stringify(run, null, 2),
      'utf8',
    );
  }

  // output.png
  if (!dropFiles.has('output.png')) {
    await fs.writeFile(path.join(runDir, 'images', 'img-1.png'), imageBytes);
  }

  // validations/summary.json (only when validated=true)
  if (validated && !dropFiles.has('validations/summary.json')) {
    const summary = {
      schemaVersion: '1.0',
      projectId,
      taskId,
      flowState: 'passed',
      similarityAudit: null,
    };
    await fs.writeFile(
      path.join(validationsDir, `${taskId}.summary.json`),
      JSON.stringify(summary, null, 2),
      'utf8',
    );
  }

  // Apply malformed JSON where requested
  for (const name of malformedJson) {
    const target = (
      name === 'run.json' ? path.join(runDir, 'run.json')
      : name === 'validations/summary.json' ? path.join(validationsDir, `${taskId}.summary.json`)
      : path.join(compileArtifactDir, name)
    );
    await fs.writeFile(target, '{ this is not valid JSON', 'utf8');
  }

  return {
    root,
    compileArtifactDir,
    runDir,
    validationsDir,
    projectId,
    taskId,
    runId,
    imageSha,
    claimedImageHash,
    finalImageHash,
  };
}

// ---------------------------------------------------------------------
// 1. Happy path
// ---------------------------------------------------------------------

test('F-4: scanner reads 9 evidence files and extracts bindings (standard basis)', async () => {
  const ctx = await setupHappyProject({ basis: 'standard' });
  const bundle = await scanShortChainEvidence({
    projectId: ctx.projectId,
    taskId: ctx.taskId,
    runId: ctx.runId,
    compileArtifactDir: ctx.compileArtifactDir,
    runDir: ctx.runDir,
    validationsDir: ctx.validationsDir,
    now: () => FIXED_NOW,
  });
  assert.equal(bundle.schemaVersion, '1.0');
  assert.equal(bundle.projectId, ctx.projectId);
  assert.equal(bundle.taskId, ctx.taskId);
  assert.equal(bundle.capturedAt, FIXED_NOW.toISOString());
  assert.equal(bundle.files.length, 9);
  // All 9 names present
  const names = new Set(bundle.files.map((f) => f.name));
  for (const expected of [
    'task-contract.json',
    'target-scene-projection.json',
    'prompt-source-map.json',
    'reference-trace.json',
    'provider-payload.redacted.json',
    'trace.json',
    'run.json',
    'output.png',
    'validations/summary.json',
  ] as const) {
    assert.ok(names.has(expected), `bundle.files must include ${expected}`);
  }
  // Bindings
  assert.equal(bundle.bindings.runId, ctx.runId);
  assert.equal(bundle.bindings.taskId, ctx.taskId);
  assert.equal(bundle.bindings.promptHash, 'fp-happy');
  assert.equal(bundle.bindings.imageHash, ctx.claimedImageHash);
  assert.equal(bundle.bindings.targetScene, 'reception');
  assert.equal(bundle.bindings.generationBasis, 'standard');
  assert.deepEqual(bundle.bindings.referenceIds, []);
  // File-level health
  const output = bundle.files.find((f) => f.name === 'output.png');
  assert.equal(output!.kind, 'image');
  assert.equal(output!.sha256, ctx.imageSha);
});

test('F-4: scanner extracts referenceIds from reference-trace.json for reference_first', async () => {
  const ctx = await setupHappyProject({ basis: 'reference_first', referenceIds: ['ref-a', 'ref-b'] });
  const bundle = await scanShortChainEvidence({
    projectId: ctx.projectId,
    taskId: ctx.taskId,
    runId: ctx.runId,
    compileArtifactDir: ctx.compileArtifactDir,
    runDir: ctx.runDir,
    validationsDir: ctx.validationsDir,
  });
  assert.equal(bundle.bindings.generationBasis, 'reference_first');
  assert.deepEqual(bundle.bindings.referenceIds, ['ref-a', 'ref-b']);
});

test('F-4: scanner computes sha256 of output.png (NOT the one in run.json)', async () => {
  // Set up project where run.json claims imageHash=claimed, but
  // the actual file's sha is different. The scanner must compute
  // the actual hash; the runtime validator cross-checks the two.
  const ctx = await setupHappyProject({
    basis: 'standard',
    imageHash: 'claimed-but-stale-hash',
  });
  // The scanner's computed sha for output.png is ctx.imageSha; the
  // run.json's claim is `claimed-but-stale-hash`. The two should
  // differ.
  assert.notEqual(ctx.imageSha, 'claimed-but-stale-hash');
  const bundle = await scanShortChainEvidence({
    projectId: ctx.projectId,
    taskId: ctx.taskId,
    runId: ctx.runId,
    compileArtifactDir: ctx.compileArtifactDir,
    runDir: ctx.runDir,
    validationsDir: ctx.validationsDir,
  });
  const output = bundle.files.find((f) => f.name === 'output.png');
  assert.equal(output!.sha256, ctx.imageSha, 'scanner must compute the actual file hash');
  // The validator should now flag this as a mismatch.
  const result = await runShortChainEvidenceCheckpoint({
    projectId: ctx.projectId,
    taskId: ctx.taskId,
    runId: ctx.runId,
    compileArtifactDir: ctx.compileArtifactDir,
    runDir: ctx.runDir,
    validationsDir: ctx.validationsDir,
  });
  assert.equal(result.pass, false);
  const issues = result.issues.filter((i) => i.code === 'EVIDENCE_IMAGE_HASH_MISMATCH');
  assert.equal(issues.length, 1);
});

// ---------------------------------------------------------------------
// 2. Missing / unreadable files
// ---------------------------------------------------------------------

test('F-4: scanner records output.png as not exists when runDir has no images', async () => {
  const root = await makeTempRoot();
  const compileArtifactDir = path.join(root, 'compile');
  const runDir = path.join(root, 'run');
  const validationsDir = path.join(root, 'val');
  await fs.mkdir(compileArtifactDir, { recursive: true });
  await fs.mkdir(runDir, { recursive: true });
  await fs.mkdir(validationsDir, { recursive: true });
  // Only write task-contract.json so we can confirm the scanner
  // still produces 9 records (including the missing 8).
  await fs.writeFile(
    path.join(compileArtifactDir, 'task-contract.json'),
    JSON.stringify({ taskId: 't-1', projectId: 'p-1', subtype: 's', generationBasis: 'standard' }),
    'utf8',
  );
  const bundle = await scanShortChainEvidence({
    projectId: 'p-1',
    taskId: 't-1',
    runId: 'r-1',
    compileArtifactDir,
    runDir,
    validationsDir,
  });
  const output = bundle.files.find((f) => f.name === 'output.png');
  assert.equal(output!.exists, false);
  assert.equal(output!.sizeBytes, 0);
  assert.equal(output!.sha256, null);
  assert.equal(output!.kind, null);
});

test('F-4: scanner marks malformed JSON with file.error and payload=null', async () => {
  const ctx = await setupHappyProject({
    basis: 'standard',
    malformedJson: ['trace.json'],
  });
  const bundle = await scanShortChainEvidence({
    projectId: ctx.projectId,
    taskId: ctx.taskId,
    runId: ctx.runId,
    compileArtifactDir: ctx.compileArtifactDir,
    runDir: ctx.runDir,
    validationsDir: ctx.validationsDir,
  });
  const trace = bundle.files.find((f) => f.name === 'trace.json');
  assert.equal(trace!.exists, true);
  assert.equal(trace!.payload, null);
  assert.ok(trace!.error, 'malformed JSON must surface an error message');
  assert.equal(trace!.kind, 'json-object'); // kind is from signature probe
});

test('F-4: scanner returns null runId when runDir is null', async () => {
  const ctx = await setupHappyProject({ basis: 'standard' });
  const bundle = await scanShortChainEvidence({
    projectId: ctx.projectId,
    taskId: ctx.taskId,
    runId: null,
    compileArtifactDir: ctx.compileArtifactDir,
    runDir: null,
    validationsDir: ctx.validationsDir,
  });
  assert.equal(bundle.runDir, null);
  const runRec = bundle.files.find((f) => f.name === 'run.json');
  assert.equal(runRec!.exists, false);
  const outputRec = bundle.files.find((f) => f.name === 'output.png');
  assert.equal(outputRec!.exists, false);
  assert.equal(bundle.bindings.runId, null);
  assert.equal(bundle.bindings.imageHash, null);
});

// ---------------------------------------------------------------------
// 3. Integration: scanner + validator
// ---------------------------------------------------------------------

test('F-4: runShortChainEvidenceCheckpoint happy path produces a passing checkpoint', async () => {
  const ctx = await setupHappyProject({
    basis: 'reference_first',
    referenceIds: ['ref-1'],
    validated: true,
  });
  const result = await runShortChainEvidenceCheckpoint({
    projectId: ctx.projectId,
    taskId: ctx.taskId,
    runId: ctx.runId,
    compileArtifactDir: ctx.compileArtifactDir,
    runDir: ctx.runDir,
    validationsDir: ctx.validationsDir,
  }, {
    expectedProjectId: ctx.projectId,
    expectedTaskId: ctx.taskId,
    expectedRunId: ctx.runId,
    expectedPromptHash: 'fp-happy',
    expectedReferenceIds: ['ref-1'],
    expectedTargetScene: 'reception',
    expectedGenerationBasis: 'reference_first',
    expectedValidated: true,
  });
  assert.equal(result.pass, true);
  assert.equal(result.schemaVersion, '1.0');
  assert.equal(result.version, 'vnext-evidence-integrity-gate@1.0.0');
  assert.equal(result.issues.length, 0);
  assert.equal(result.missingRequired.length, 0);
  assert.equal(result.bindings.generationBasis, 'reference_first');
});

test('F-4: runShortChainEvidenceCheckpoint blocks on missing required file (run.json)', async () => {
  const ctx = await setupHappyProject({
    basis: 'standard',
    dropFiles: ['run.json'],
  });
  const result = await runShortChainEvidenceCheckpoint({
    projectId: ctx.projectId,
    taskId: ctx.taskId,
    runId: ctx.runId,
    compileArtifactDir: ctx.compileArtifactDir,
    runDir: ctx.runDir,
    validationsDir: ctx.validationsDir,
  });
  assert.equal(result.pass, false);
  const issues = result.issues.filter((i) => i.code === 'EVIDENCE_REQUIRED_FILE_MISSING' && i.file === 'run.json');
  assert.ok(issues.length > 0);
  assert.ok(result.missingRequired.includes('run.json'));
});
