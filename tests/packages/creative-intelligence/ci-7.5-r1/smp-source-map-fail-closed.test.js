/**
 * CI-W1C.7.5-R1 — SourceMap Parser Fail-Closed Tests (SMP-01..07).
 *
 * Per spec PART L §49:
 *   SMP-01 string[] planningTruth parses
 *   SMP-02 object[] planningTruth hard-fails
 *   SMP-03 object[] needs hard-fails
 *   SMP-04 object[] evidence hard-fails
 *   SMP-05 object[] planningClaims hard-fails
 *   SMP-06 no silent [] fallback
 *   SMP-07 parse failure enters normal repair path
 *
 * These tests cover Goal C of the R1 spec.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..');
const csIndexUrl = pathToFileURL(
  path.join(repoRoot, 'packages/creative-intelligence/src/strategic-synthesis/index.ts')
).href;

async function loadParser() {
  const m = await import(csIndexUrl);
  return {
    parseStrategicSynthesis: m.parseStrategicSynthesis,
    StrategicSynthesisParseError: m.StrategicSynthesisParseError,
    STRATEGIC_SYNTHESIS_SCHEMA_VERSION: m.STRATEGIC_SYNTHESIS_SCHEMA_VERSION,
    STRATEGIC_SYNTHESIS_PROMPT_VERSION: m.STRATEGIC_SYNTHESIS_PROMPT_VERSION
  };
}

function minimalArtifact(rawSourceMap) {
  return JSON.stringify({
    schemaVersion: '0.1',
    projectId: 'smp-proj',
    promptVersion: 'ci-w1c.7.4-strategic-synthesis-v0.3',
    generatedAt: '2026-08-21T00:00:00.000Z',
    sourceMap: rawSourceMap,
    projectUnderstanding: {
      summary: 'x', coreChallenge: 'x', transformationGoal: 'x',
      epistemicClass: 'MODEL_INFERENCE',
      factRefs: [], needRefs: [], evidenceRefs: [], planningClaimRefs: []
    },
    tensions: [], insights: [], opportunities: [], diagnostics: [],
    meta: { attempt: 1, provider: null, model: null, modelCallCount: 1 }
  });
}

test('SMP-01: string[] sourceMap fields parse correctly', async () => {
  const { parseStrategicSynthesis, STRATEGIC_SYNTHESIS_SCHEMA_VERSION, STRATEGIC_SYNTHESIS_PROMPT_VERSION } = await loadParser();
  const raw = minimalArtifact({
    planningTruth: ['f1'],
    userRequirements: [],
    lockedIdentity: ['li1'],
    prohibitedDirections: [],
    needs: ['n1'],
    evidence: ['e1'],
    planningClaims: ['p1'],
    legacyVisualEvidenceExcluded: ['v1']
  });
  const artifact = parseStrategicSynthesis({ rawText: raw, projectId: 'smp-proj', attempt: 1, provider: null, model: null, modelCallCount: 1 });
  assert.deepEqual(artifact.sourceMap.planningTruth, ['f1']);
  assert.deepEqual(artifact.sourceMap.userRequirements, []);
  assert.deepEqual(artifact.sourceMap.lockedIdentity, ['li1']);
  assert.deepEqual(artifact.sourceMap.prohibitedDirections, []);
  assert.deepEqual(artifact.sourceMap.needs, ['n1']);
  assert.deepEqual(artifact.sourceMap.evidence, ['e1']);
  assert.deepEqual(artifact.sourceMap.planningClaims, ['p1']);
  assert.deepEqual(artifact.sourceMap.legacyVisualEvidenceExcluded, ['v1']);
});

test('SMP-02: object[] planningTruth hard-fails (not silent fallback)', async () => {
  const { parseStrategicSynthesis, StrategicSynthesisParseError } = await loadParser();
  const raw = minimalArtifact({
    planningTruth: [{ id: 'fake' }],
    userRequirements: [],
    lockedIdentity: [],
    prohibitedDirections: [],
    needs: [],
    evidence: [],
    planningClaims: [],
    legacyVisualEvidenceExcluded: []
  });
  assert.throws(
    () => parseStrategicSynthesis({ rawText: raw, projectId: 'smp-proj', attempt: 1, provider: null, model: null, modelCallCount: 1 }),
    (err) => err instanceof StrategicSynthesisParseError && err.code === 'PARSE_SOURCE_MAP_PLANNINGTRUTH_NOT_STRING_ARRAY'
  );
});

test('SMP-03: object[] needs hard-fails', async () => {
  const { parseStrategicSynthesis, StrategicSynthesisParseError } = await loadParser();
  const raw = minimalArtifact({
    planningTruth: [],
    userRequirements: [],
    lockedIdentity: [],
    prohibitedDirections: [],
    needs: [{ id: 'n-fake' }],
    evidence: [],
    planningClaims: [],
    legacyVisualEvidenceExcluded: []
  });
  assert.throws(
    () => parseStrategicSynthesis({ rawText: raw, projectId: 'smp-proj', attempt: 1, provider: null, model: null, modelCallCount: 1 }),
    (err) => err instanceof StrategicSynthesisParseError && err.code === 'PARSE_SOURCE_MAP_NEEDS_NOT_STRING_ARRAY'
  );
});

test('SMP-04: object[] evidence hard-fails', async () => {
  const { parseStrategicSynthesis, StrategicSynthesisParseError } = await loadParser();
  const raw = minimalArtifact({
    planningTruth: [],
    userRequirements: [],
    lockedIdentity: [],
    prohibitedDirections: [],
    needs: [],
    evidence: [{ id: 'e-fake' }],
    planningClaims: [],
    legacyVisualEvidenceExcluded: []
  });
  assert.throws(
    () => parseStrategicSynthesis({ rawText: raw, projectId: 'smp-proj', attempt: 1, provider: null, model: null, modelCallCount: 1 }),
    (err) => err instanceof StrategicSynthesisParseError && err.code === 'PARSE_SOURCE_MAP_EVIDENCE_NOT_STRING_ARRAY'
  );
});

test('SMP-05: object[] planningClaims hard-fails (legacy code preserved)', async () => {
  const { parseStrategicSynthesis, StrategicSynthesisParseError } = await loadParser();
  const raw = minimalArtifact({
    planningTruth: [],
    userRequirements: [],
    lockedIdentity: [],
    prohibitedDirections: [],
    needs: [],
    evidence: [],
    planningClaims: [{ id: 'p-fake' }],
    legacyVisualEvidenceExcluded: []
  });
  assert.throws(
    () => parseStrategicSynthesis({ rawText: raw, projectId: 'smp-proj', attempt: 1, provider: null, model: null, modelCallCount: 1 }),
    (err) => err instanceof StrategicSynthesisParseError && err.code === 'PARSE_SOURCE_MAP_PLANNING_CLAIMS'
  );
});

test('SMP-06: undefined field is allowed (= empty array), not silent fallback from invalid', async () => {
  const { parseStrategicSynthesis } = await loadParser();
  // Field omitted entirely (undefined) should parse to [].
  const raw = minimalArtifact({
    planningTruth: [],
    userRequirements: [],
    lockedIdentity: [],
    prohibitedDirections: [],
    needs: [],
    evidence: [],
    // planningClaims omitted
    legacyVisualEvidenceExcluded: []
  });
  const artifact = parseStrategicSynthesis({ rawText: raw, projectId: 'smp-proj', attempt: 1, provider: null, model: null, modelCallCount: 1 });
  assert.deepEqual(artifact.sourceMap.planningClaims, []);
});

test('SMP-07: parse failure throws the same error class as R2-PTR tests (StrategicSynthesisParseError)', async () => {
  const { parseStrategicSynthesis, StrategicSynthesisParseError } = await loadParser();
  const raw = minimalArtifact({
    planningTruth: 'not-an-array',
    userRequirements: [],
    lockedIdentity: [],
    prohibitedDirections: [],
    needs: [],
    evidence: [],
    planningClaims: [],
    legacyVisualEvidenceExcluded: []
  });
  try {
    parseStrategicSynthesis({ rawText: raw, projectId: 'smp-proj', attempt: 1, provider: null, model: null, modelCallCount: 1 });
    assert.fail('expected throw');
  } catch (err) {
    assert.ok(err instanceof StrategicSynthesisParseError, 'must be a StrategicSynthesisParseError');
    // The error code identifies the field; the orchestrator
    // uses this to drive the single-repair path. Repo
    // underscore convention (PARSE_SOURCE_MAP_<FIELD>_NOT_STRING_ARRAY).
    assert.ok(/NOT_STRING_ARRAY/.test(err.code), `unexpected code: ${err.code}`);
  }
});
