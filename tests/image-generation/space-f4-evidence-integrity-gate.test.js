// r2.0 §8 / Phase F-4: run evidence integrity gate unit tests.
//
// The runtime validator is PURE: it consumes an EvidenceBundle (data
// only, produced by the desktop scanner) and a
// ShortChainEvidenceValidationContext (caller expectations) and produces
// a ShortChainEvidenceCheckpoint. The tests below construct synthetic
// bundles and contexts and assert every binding check + severity
// rule. No filesystem, no I/O.
//
// Run: node --test tests/image-generation/space-f4-evidence-integrity-gate.test.js

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  validateShortChainEvidenceIntegrity,
  extractEvidenceBindings,
  VNEXT_EVIDENCE_INTEGRITY_GATE_VERSION,
  VNEXT_EVIDENCE_FILE_NAMES,
} from '@masterpiece/image-generation-runtime/space/index.js';

// Builder helpers. The scanner produces per-file records; the
// validator consumes them. The shape mirrors ShortChainEvidenceFileRecord
// (the runtime module only sees the data, not the type).

function record(name, {
  path = `/artifacts/${name}`,
  exists = true,
  sizeBytes = 100,
  sha256 = null,
  kind = 'json-object',
  payload = null,
  error = null,
} = {}) {
  return { name, path, exists, sizeBytes, sha256, kind, payload, error };
}

function happyBundle({
  generationBasis = 'standard',
  referenceIds = [],
  validated = false,
  promptHash = 'fp-happy',
  runId = 'run-1',
  taskId = 'task-1',
  projectId = 'project-1',
  imageHash = 'img-sha-happy',
  targetScene = 'reception',
  outputSha = imageHash,
} = {}) {
  // 9 records, one per file name. The build mirrors what the
  // scanner would produce.
  const files = [];
  for (const name of VNEXT_EVIDENCE_FILE_NAMES) {
    if (name === 'task-contract.json') {
      files.push(record(name, {
        kind: 'json-object',
        payload: {
          schemaVersion: '1.0',
          taskId,
          projectId,
          deliverableFamily: 'space',
          subtype: targetScene,
          generationBasis,
          referenceAssetIds: referenceIds,
        },
      }));
    } else if (name === 'reference-trace.json') {
      files.push(record(name, {
        kind: 'json-object',
        payload: {
          schemaVersion: '1.0',
          referenceMode: generationBasis === 'standard' ? 'text_only' : 'reference_assisted',
          providerReferenceCount: referenceIds.length,
          references: referenceIds.map((id) => ({ id, source: 'user_explicit' })),
        },
      }));
    } else if (name === 'provider-payload.redacted.json') {
      files.push(record(name, {
        kind: 'json-object',
        payload: {
          model: 'seedream-5',
          prompt: 'redacted-prompt',
          size: '2560*1440',
          aspectRatio: '16:9',
          references: referenceIds.map((id) => ({ id, source: 'user_explicit' })),
          promptHash,
        },
      }));
    } else if (name === 'trace.json') {
      files.push(record(name, {
        kind: 'json-object',
        payload: {
          projectId,
          taskId,
          contextFingerprint: 'ctx-fp',
          route: {},
          trace: { sourceFingerprint: promptHash },
          compiledAt: '2026-08-10T00:00:00.000Z',
        },
      }));
    } else if (name === 'run.json') {
      files.push(record(name, {
        kind: 'json-object',
        payload: {
          schemaVersion: '1.0',
          runId,
          projectId,
          taskId,
          status: 'succeeded',
          images: [{
            imageId: 'img-1',
            relativePath: 'images/img-1.png',
            mimeType: 'image/png',
            sizeBytes: 1024,
            sha256: imageHash,
          }],
        },
      }));
    } else if (name === 'output.png') {
      files.push(record(name, {
        kind: 'image',
        sizeBytes: 1024,
        sha256: outputSha,
        payload: null,
      }));
    } else if (name === 'validations/summary.json') {
      files.push(record(name, {
        kind: 'json-object',
        payload: validated ? {
          schemaVersion: '1.0',
          projectId,
          taskId,
          flowState: 'passed',
          similarityAudit: null,
        } : null,
        exists: validated,
        sizeBytes: validated ? 200 : 0,
        error: validated ? null : 'summary absent (not validated)',
      }));
    } else {
      // target-scene-projection.json + prompt-source-map.json are
      // optional Phase A1; absent by default. Marked as NOT exists
      // (rather than exists=true with 0 bytes) so the validator's
      // 0-byte warn rule doesn't fire spuriously.
      files.push(record(name, { exists: false, sizeBytes: 0, kind: null, payload: null, error: null }));
    }
  }
  return {
    schemaVersion: '1.0',
    projectId,
    taskId,
    compileArtifactDir: '/artifacts',
    runDir: '/runs/run-1',
    validationsDir: '/validations',
    files,
    bindings: {
      runId,
      taskId,
      promptHash,
      imageHash,
      referenceIds,
      targetScene,
      generationBasis,
    },
    capturedAt: '2026-08-10T00:00:00.000Z',
  };
}

// ---------------------------------------------------------------------
// 1. Surface contract
// ---------------------------------------------------------------------

test('F-4: VNEXT_EVIDENCE_INTEGRITY_GATE_VERSION is a non-empty string', () => {
  assert.equal(typeof VNEXT_EVIDENCE_INTEGRITY_GATE_VERSION, 'string');
  assert.ok(VNEXT_EVIDENCE_INTEGRITY_GATE_VERSION.length > 0);
  assert.match(VNEXT_EVIDENCE_INTEGRITY_GATE_VERSION, /^vnext-evidence-integrity-gate@/);
});

test('F-4: VNEXT_EVIDENCE_FILE_NAMES has exactly 9 entries', () => {
  assert.equal(VNEXT_EVIDENCE_FILE_NAMES.length, 9);
});

// ---------------------------------------------------------------------
// 2. Happy path
// ---------------------------------------------------------------------

test('F-4: happy path — all required files present, all bindings match, pass = true', () => {
  const bundle = happyBundle();
  const result = validateShortChainEvidenceIntegrity(bundle, {
    expectedProjectId: 'project-1',
    expectedTaskId: 'task-1',
    expectedRunId: 'run-1',
    expectedPromptHash: 'fp-happy',
    expectedTargetScene: 'reception',
    expectedGenerationBasis: 'standard',
  });
  assert.equal(result.pass, true);
  assert.deepEqual(result.issues, []);
  assert.equal(result.projectId, 'project-1');
  assert.equal(result.taskId, 'task-1');
  assert.equal(result.schemaVersion, '1.0');
  assert.equal(result.version, VNEXT_EVIDENCE_INTEGRITY_GATE_VERSION);
  assert.equal(result.missingRequired.length, 0);
});

test('F-4: happy path with reference_first + 2 references + expectedValidated', () => {
  const bundle = happyBundle({
    generationBasis: 'reference_first',
    referenceIds: ['ref-1', 'ref-2'],
    validated: true,
  });
  const result = validateShortChainEvidenceIntegrity(bundle, {
    expectedGenerationBasis: 'reference_first',
    expectedReferenceIds: ['ref-1', 'ref-2'],
    expectedValidated: true,
  });
  assert.equal(result.pass, true);
  assert.equal(result.bindings.generationBasis, 'reference_first');
  assert.deepEqual(result.bindings.referenceIds, ['ref-1', 'ref-2']);
});

// ---------------------------------------------------------------------
// 3. Required file missing
// ---------------------------------------------------------------------

test('F-4: required file missing → block + missingRequired', () => {
  const bundle = happyBundle();
  // Make output.png absent.
  const out = bundle.files.find((r) => r.name === 'output.png');
  out.exists = false;
  out.sha256 = null;
  out.sizeBytes = 0;
  const result = validateShortChainEvidenceIntegrity(bundle);
  assert.equal(result.pass, false);
  assert.ok(result.missingRequired.includes('output.png'));
  const issues = result.issues.filter((i) => i.file === 'output.png');
  assert.ok(issues.length > 0);
  assert.equal(issues[0].severity, 'block');
  assert.equal(issues[0].code, 'EVIDENCE_REQUIRED_FILE_MISSING');
});

test('F-4: required file unreadable (JSON parse error) → block + readable code', () => {
  const bundle = happyBundle();
  const trace = bundle.files.find((r) => r.name === 'trace.json');
  trace.error = 'Unexpected token } in JSON at position 0';
  trace.payload = null;
  const result = validateShortChainEvidenceIntegrity(bundle);
  assert.equal(result.pass, false);
  const issues = result.issues.filter((i) => i.file === 'trace.json');
  assert.ok(issues.length > 0);
  assert.equal(issues[0].severity, 'block');
  assert.equal(issues[0].code, 'EVIDENCE_FILE_UNREADABLE');
});

test('F-4: reference_first basis + reference-trace.json missing → EVIDENCE_REFERENCE_TRACE_MISSING', () => {
  const bundle = happyBundle({ generationBasis: 'reference_first' });
  const refTrace = bundle.files.find((r) => r.name === 'reference-trace.json');
  refTrace.exists = false;
  refTrace.payload = null;
  refTrace.sizeBytes = 0;
  const result = validateShortChainEvidenceIntegrity(bundle, {
    expectedGenerationBasis: 'reference_first',
  });
  assert.equal(result.pass, false);
  const issues = result.issues.filter((i) => i.code === 'EVIDENCE_REFERENCE_TRACE_MISSING');
  assert.equal(issues.length, 1);
  assert.equal(issues[0].severity, 'block');
});

test('F-4: expectedValidated=true + summary missing → EVIDENCE_VALIDATIONS_SUMMARY_MISSING', () => {
  const bundle = happyBundle({ validated: false });
  const result = validateShortChainEvidenceIntegrity(bundle, { expectedValidated: true });
  assert.equal(result.pass, false);
  const issues = result.issues.filter((i) => i.code === 'EVIDENCE_VALIDATIONS_SUMMARY_MISSING');
  assert.equal(issues.length, 1);
  assert.equal(issues[0].severity, 'block');
  assert.equal(issues[0].file, 'validations/summary.json');
});

// ---------------------------------------------------------------------
// 4. Binding consistency
// ---------------------------------------------------------------------

test('F-4: projectId mismatch → block EVIDENCE_PROJECT_MISMATCH', () => {
  const bundle = happyBundle();
  const result = validateShortChainEvidenceIntegrity(bundle, { expectedProjectId: 'OTHER' });
  const issues = result.issues.filter((i) => i.code === 'EVIDENCE_PROJECT_MISMATCH');
  assert.equal(issues.length, 1);
  assert.equal(issues[0].severity, 'block');
  assert.equal(result.pass, false);
});

test('F-4: taskId mismatch → block EVIDENCE_TASK_MISMATCH', () => {
  const bundle = happyBundle();
  const result = validateShortChainEvidenceIntegrity(bundle, { expectedTaskId: 'OTHER' });
  const issues = result.issues.filter((i) => i.code === 'EVIDENCE_TASK_MISMATCH');
  assert.equal(issues.length, 1);
  assert.equal(issues[0].file, 'task-contract.json');
  assert.equal(result.pass, false);
});

test('F-4: runId mismatch → block EVIDENCE_RUN_MISMATCH', () => {
  const bundle = happyBundle();
  const result = validateShortChainEvidenceIntegrity(bundle, { expectedRunId: 'OTHER' });
  const issues = result.issues.filter((i) => i.code === 'EVIDENCE_RUN_MISMATCH');
  assert.equal(issues.length, 1);
  assert.equal(issues[0].file, 'run.json');
  assert.equal(result.pass, false);
});

test('F-4: promptHash mismatch → block EVIDENCE_PROMPT_HASH_MISMATCH', () => {
  const bundle = happyBundle();
  const result = validateShortChainEvidenceIntegrity(bundle, { expectedPromptHash: 'OTHER' });
  const issues = result.issues.filter((i) => i.code === 'EVIDENCE_PROMPT_HASH_MISMATCH');
  assert.equal(issues.length, 1);
  assert.equal(issues[0].file, 'trace.json');
  assert.equal(result.pass, false);
});

test('F-4: imageHash mismatch (output.png actual sha256 != run.json claim) → block', () => {
  const bundle = happyBundle({ imageHash: 'claimed-hash', outputSha: 'actual-on-disk-hash' });
  const result = validateShortChainEvidenceIntegrity(bundle);
  const issues = result.issues.filter((i) => i.code === 'EVIDENCE_IMAGE_HASH_MISMATCH');
  assert.equal(issues.length, 1);
  assert.equal(issues[0].severity, 'block');
  assert.equal(issues[0].file, 'output.png');
  assert.match(issues[0].message, /actual-on-disk-hash/);
  assert.match(issues[0].message, /claimed-hash/);
  assert.equal(result.pass, false);
});

test('F-4: referenceIds mismatch (different set) → block EVIDENCE_REFERENCE_ID_MISMATCH', () => {
  const bundle = happyBundle({ generationBasis: 'reference_first', referenceIds: ['ref-1', 'ref-2'] });
  const result = validateShortChainEvidenceIntegrity(bundle, {
    expectedReferenceIds: ['ref-1', 'ref-3'],
  });
  const issues = result.issues.filter((i) => i.code === 'EVIDENCE_REFERENCE_ID_MISMATCH');
  assert.equal(issues.length, 1);
  assert.equal(issues[0].severity, 'block');
  assert.equal(result.pass, false);
});

test('F-4: referenceIds mismatch (different order) → still mismatch (set semantics)', () => {
  const bundle = happyBundle({ generationBasis: 'reference_first', referenceIds: ['ref-1', 'ref-2'] });
  const result = validateShortChainEvidenceIntegrity(bundle, {
    expectedReferenceIds: ['ref-2', 'ref-1'],
  });
  // Order does not matter for binding; both are the same set.
  assert.equal(result.pass, true);
});

test('F-4: targetScene mismatch → block', () => {
  const bundle = happyBundle({ targetScene: 'reception' });
  const result = validateShortChainEvidenceIntegrity(bundle, { expectedTargetScene: 'consultation' });
  const issues = result.issues.filter((i) => i.code === 'EVIDENCE_TARGET_SCENE_MISMATCH');
  assert.equal(issues.length, 1);
  assert.equal(issues[0].file, 'task-contract.json');
  assert.equal(result.pass, false);
});

test('F-4: generationBasis mismatch → block', () => {
  const bundle = happyBundle({ generationBasis: 'standard' });
  const result = validateShortChainEvidenceIntegrity(bundle, { expectedGenerationBasis: 'reference_first' });
  const issues = result.issues.filter((i) => i.code === 'EVIDENCE_GENERATION_BASIS_MISMATCH');
  assert.equal(issues.length, 1);
  assert.equal(result.pass, false);
});

// ---------------------------------------------------------------------
// 5. Optional files: warn, not block
// ---------------------------------------------------------------------

test('F-4: optional file unreadable (target-scene-projection.json) → warn only, pass still true', () => {
  const bundle = happyBundle();
  const optional = bundle.files.find((r) => r.name === 'target-scene-projection.json');
  optional.error = 'parse error';
  optional.exists = true;
  optional.sizeBytes = 50;
  optional.kind = 'json-object';
  optional.payload = null;
  const result = validateShortChainEvidenceIntegrity(bundle);
  const issues = result.issues.filter((i) => i.file === 'target-scene-projection.json');
  assert.ok(issues.length > 0);
  assert.equal(issues[0].severity, 'warn');
  assert.equal(result.pass, true, 'optional file unreadable must NOT block');
});

test('F-4: 0-byte optional file → warn only, pass still true', () => {
  const bundle = happyBundle();
  const optional = bundle.files.find((r) => r.name === 'prompt-source-map.json');
  optional.sizeBytes = 0;
  optional.exists = true;
  optional.kind = 'text';
  optional.payload = null;
  const result = validateShortChainEvidenceIntegrity(bundle);
  const issues = result.issues.filter((i) => i.file === 'prompt-source-map.json');
  assert.equal(issues.length, 1);
  assert.equal(issues[0].severity, 'warn');
  assert.equal(result.pass, true);
});

// ---------------------------------------------------------------------
// 6. extractEvidenceBindings (public helper)
// ---------------------------------------------------------------------

test('F-4: extractEvidenceBindings pulls 7 fields from the bundle', () => {
  const bundle = happyBundle({
    generationBasis: 'reference_first',
    referenceIds: ['ref-1', 'ref-2'],
    promptHash: 'fp-x',
    runId: 'run-x',
    taskId: 'task-x',
    imageHash: 'sha-x',
    targetScene: 'consultation',
  });
  const bindings = extractEvidenceBindings(bundle);
  assert.equal(bindings.runId, 'run-x');
  assert.equal(bindings.taskId, 'task-x');
  assert.equal(bindings.promptHash, 'fp-x');
  assert.equal(bindings.imageHash, 'sha-x');
  assert.deepEqual(bindings.referenceIds, ['ref-1', 'ref-2']);
  assert.equal(bindings.targetScene, 'consultation');
  assert.equal(bindings.generationBasis, 'reference_first');
});

// ---------------------------------------------------------------------
// 7. Robustness
// ---------------------------------------------------------------------

test('F-4: validator does not throw when bundle.bindings is absent (re-derives from files)', () => {
  const bundle = happyBundle();
  // Strip the bindings entirely; the validator must re-derive from
  // the per-file records.
  bundle.bindings = undefined;
  // Should NOT throw; should re-derive from the files.
  const result = validateShortChainEvidenceIntegrity(bundle);
  assert.equal(result.bindings.runId, 'run-1');
  assert.equal(result.bindings.taskId, 'task-1');
  assert.equal(result.bindings.generationBasis, 'standard');
});

test('F-4: validator rejects malformed bundle', () => {
  assert.throws(() => validateShortChainEvidenceIntegrity(null), /bundle is required/);
  assert.throws(() => validateShortChainEvidenceIntegrity({}), /bundle\.files must be an array/);
});
