/**
 * CI-W1C.7.4-R1 — Real Epistemic Extraction (REE-01..09).
 *
 * Verifies the deterministic epistemic classifier and the real
 * extraction path (no more hardcoded FACT):
 *   - REE-01 declarative industry → FACT
 *   - REE-02 必须/需要 → USER_REQUIREMENT
 *   - REE-03 建议/可能 → MODEL_INFERENCE
 *   - REE-04 待确认/TBD → UNKNOWN
 *   - REE-05 UNKNOWN precedence beats FACT-looking key
 *   - REE-06 USER_REQUIREMENT never promoted as FACT
 *   - REE-07 MODEL_INFERENCE never promoted as FACT
 *   - REE-08 real fixture extraction emits multiple classes
 *   - REE-09 all four classes exercised across fixtures
 *
 * Zero-network. Pure epistemic-classifier semantics + real
 * extraction over the test fixtures.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..');
const csIndexUrl = pathToFileURL(
  path.join(repoRoot, 'packages/creative-intelligence/src/strategic-synthesis/index.ts')
).href;

// ---------------------------------------------------------------------------
// REE-01..05 — classifier direct unit tests
// ---------------------------------------------------------------------------

test('REE-01: declarative industry value classifies as FACT', async () => {
  const { classifyPlanningClaimEpistemicClass } = await import(csIndexUrl);
  assert.equal(
    classifyPlanningClaimEpistemicClass({ value: 'Marketing technology', lineText: 'industry: Marketing technology' }),
    'FACT'
  );
});

test('REE-02: 必须 / 需要 classify as USER_REQUIREMENT', async () => {
  const { classifyPlanningClaimEpistemicClass } = await import(csIndexUrl);
  assert.equal(
    classifyPlanningClaimEpistemicClass({ value: '必须保持简体中文', lineText: '品牌输出语言: 必须保持简体中文' }),
    'USER_REQUIREMENT'
  );
  assert.equal(
    classifyPlanningClaimEpistemicClass({ value: 'should be auditable', lineText: 'brand_promise: should be auditable' }),
    'USER_REQUIREMENT'
  );
  assert.equal(
    classifyPlanningClaimEpistemicClass({ value: 'must be auditable in one GET', lineText: 'brand_promise: must be auditable in one GET' }),
    'USER_REQUIREMENT'
  );
});

test('REE-03: 建议 / 可能 / could / likely classify as MODEL_INFERENCE', async () => {
  const { classifyPlanningClaimEpistemicClass } = await import(csIndexUrl);
  assert.equal(
    classifyPlanningClaimEpistemicClass({ value: '建议偏向温暖的视觉感受', lineText: '品牌个性: 建议偏向温暖的视觉感受' }),
    'MODEL_INFERENCE'
  );
  assert.equal(
    classifyPlanningClaimEpistemicClass({ value: 'could pivot if LiveRamp converges', lineText: 'differentiation_logic: could pivot if LiveRamp converges' }),
    'MODEL_INFERENCE'
  );
  assert.equal(
    classifyPlanningClaimEpistemicClass({ value: 'likely in-house performance marketing', lineText: 'target_audience: likely in-house performance marketing' }),
    'MODEL_INFERENCE'
  );
});

test('REE-04: 待确认 / TBD / unknown classify as UNKNOWN', async () => {
  const { classifyPlanningClaimEpistemicClass } = await import(csIndexUrl);
  assert.equal(
    classifyPlanningClaimEpistemicClass({ value: '待确认（首批覆盖城市暂未敲定）', lineText: '行业: 待确认（首批覆盖城市暂未敲定）' }),
    'UNKNOWN'
  );
  assert.equal(
    classifyPlanningClaimEpistemicClass({ value: 'TBD — first vertical not yet decided', lineText: 'industry: TBD — first vertical not yet decided' }),
    'UNKNOWN'
  );
  assert.equal(
    classifyPlanningClaimEpistemicClass({ value: 'unknown at this time', lineText: 'industry: unknown at this time' }),
    'UNKNOWN'
  );
});

test('REE-05: UNKNOWN marker beats any other class on the same line', async () => {
  const { classifyPlanningClaimEpistemicClass } = await import(csIndexUrl);
  // "must" would normally yield USER_REQUIREMENT, but "TBD" precedes.
  assert.equal(
    classifyPlanningClaimEpistemicClass({ value: 'must be decided, TBD', lineText: 'industry: must be decided, TBD' }),
    'UNKNOWN'
  );
  // "建议" would normally yield MODEL_INFERENCE, but "未知" precedes.
  assert.equal(
    classifyPlanningClaimEpistemicClass({ value: '建议先保持未知', lineText: '行业: 建议先保持未知' }),
    'UNKNOWN'
  );
  // "should" would normally yield USER_REQUIREMENT, but "待确认" precedes.
  assert.equal(
    classifyPlanningClaimEpistemicClass({ value: 'should be 待确认 until cleared', lineText: 'industry: should be 待确认 until cleared' }),
    'UNKNOWN'
  );
});

// ---------------------------------------------------------------------------
// REE-06..07 — router never promotes USER_REQUIREMENT / MODEL_INFERENCE to FACT
// ---------------------------------------------------------------------------

test('REE-06: USER_REQUIREMENT is never routed to TRUTH (TRUTH requires FACT)', async () => {
  const { routePlanningClaim } = await import(csIndexUrl);
  const decision = routePlanningClaim({
    claimId: 'test:industry:abcd',
    key: 'industry',
    value: 'must be marketing technology',
    epistemicClass: 'USER_REQUIREMENT',
    sourceDocumentId: 'test',
    chunkRefs: ['chunk-1']
  });
  assert.equal(decision.destination, 'USER_REQ');
  assert.notEqual(decision.destination, 'TRUTH');
});

test('REE-07: MODEL_INFERENCE is never routed to TRUTH', async () => {
  const { routePlanningClaim } = await import(csIndexUrl);
  const decision = routePlanningClaim({
    claimId: 'test:industry:abcd',
    key: 'industry',
    value: 'could be marketing technology',
    epistemicClass: 'MODEL_INFERENCE',
    sourceDocumentId: 'test',
    chunkRefs: ['chunk-1']
  });
  assert.equal(decision.destination, 'INFERENCE');
  assert.notEqual(decision.destination, 'TRUTH');
});

// ---------------------------------------------------------------------------
// REE-08..09 — real fixture extraction exercises multiple classes
// ---------------------------------------------------------------------------

test('REE-08: real extraction over the A fixture emits >=2 epistemic classes', async () => {
  const { readPlanningBriefFile, buildPlanningStrategicEvidenceArtifact, buildPlanningBriefRecord } = await import(csIndexUrl);
  const fixturePath = path.join(repoRoot, 'tests', 'fixtures', 'planning-briefs', 'qualification-planning-a.md');
  const { rawText } = await readPlanningBriefFile(fixturePath);
  const contentHash = (await import('node:crypto')).createHash('sha256').update(rawText).digest('hex');
  const record = buildPlanningBriefRecord({
    projectId: 'qualification-fixture-A',
    filename: 'qualification-planning-a.md',
    relativePath: 'tests/fixtures/planning-briefs/qualification-planning-a.md',
    rawText,
    registeredAt: '2026-08-20T00:00:00.000Z'
  });
  // Defensive: contentHash must match.
  assert.equal(record.contentHash, contentHash);
  const artifact = await buildPlanningStrategicEvidenceArtifact({
    projectId: 'qualification-fixture-A',
    projectRoot: repoRoot,
    briefs: [record]
  });
  const classes = new Set(artifact.claims.map((c) => c.epistemicClass));
  assert.ok(classes.size >= 2, `expected >=2 epistemic classes, got ${[...classes].join(',')}`);
});

test('REE-09: across fixtures A and B, all four epistemic classes are exercised', async () => {
  const { readPlanningBriefFile, buildPlanningStrategicEvidenceArtifact, buildPlanningBriefRecord } = await import(csIndexUrl);
  const crypto = await import('node:crypto');
  const fixtures = [
    { id: 'qualification-fixture-A', path: 'qualification-planning-a.md' },
    { id: 'qualification-fixture-B', path: 'qualification-planning-b.md' }
  ];
  const allClasses = new Set();
  for (const fixture of fixtures) {
    const fixturePath = path.join(repoRoot, 'tests', 'fixtures', 'planning-briefs', fixture.path);
    const { rawText } = await readPlanningBriefFile(fixturePath);
    const record = buildPlanningBriefRecord({
      projectId: fixture.id,
      filename: fixture.path,
      relativePath: `tests/fixtures/planning-briefs/${fixture.path}`,
      rawText,
      registeredAt: '2026-08-20T00:00:00.000Z'
    });
    const artifact = await buildPlanningStrategicEvidenceArtifact({
      projectId: fixture.id,
      projectRoot: repoRoot,
      briefs: [record]
    });
    void crypto;
    for (const c of artifact.claims) allClasses.add(c.epistemicClass);
  }
  for (const required of ['FACT', 'USER_REQUIREMENT', 'MODEL_INFERENCE', 'UNKNOWN']) {
    assert.ok(allClasses.has(required), `required class ${required} not exercised across A+B`);
  }
});
