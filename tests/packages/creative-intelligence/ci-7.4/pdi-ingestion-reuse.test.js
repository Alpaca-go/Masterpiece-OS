/**
 * CI-W1C.7.4 — Document Ingestion Reuse (PDI-01..09).
 *
 * Verifies the planning-strategic-evidence builder REUSES the
 * existing `@masterpiece/document-ingestion/document-preparation.js`
 * `prepareDocumentSet` + `classifyDocumentRole` and produces
 * `PlanningStrategicEvidenceArtifact` shape correctly.
 *
 * Zero-network. Pure function tests.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  mapRoleToSourceRole,
  buildSourceDocumentId,
  buildClaimId,
  assertPlanningClaimKey,
  assertPlanningSourceRole,
  planningEvidenceFingerprint,
  buildPlanningStrategicEvidenceArtifact
} from '../../../../packages/creative-intelligence/src/strategic-synthesis/index.ts';
import { classifyDocumentRole } from '@masterpiece/document-ingestion/document-preparation.js';

// ---------------------------------------------------------------------------
// PDI-01..02 — mapRoleToSourceRole
// ---------------------------------------------------------------------------

test('PDI-01: mapRoleToSourceRole maps planning roles to PLANNING_STRATEGIC_SOURCE', () => {
  assert.equal(mapRoleToSourceRole('creative-brief'), 'PLANNING_STRATEGIC_SOURCE');
  assert.equal(mapRoleToSourceRole('brand-strategy'), 'PLANNING_STRATEGIC_SOURCE');
  assert.equal(mapRoleToSourceRole('market-research'), 'PLANNING_STRATEGIC_SOURCE');
  assert.equal(mapRoleToSourceRole('product-information'), 'PLANNING_STRATEGIC_SOURCE');
});

test('PDI-02: mapRoleToSourceRole refuses to map visual-guideline/reference to planning', () => {
  assert.equal(mapRoleToSourceRole('visual-guideline'), 'LEGACY_VISUAL_EVIDENCE');
  assert.equal(mapRoleToSourceRole('reference'), 'LEGACY_VISUAL_EVIDENCE');
  assert.equal(mapRoleToSourceRole('unknown'), 'UNKNOWN_SOURCE');
  assert.equal(mapRoleToSourceRole('not-a-real-role'), 'UNKNOWN_SOURCE');
});

// ---------------------------------------------------------------------------
// PDI-03..04 — id helpers
// ---------------------------------------------------------------------------

test('PDI-03: buildSourceDocumentId is stable and includes projectId + role + filename + hash slice', () => {
  const id = buildSourceDocumentId('proj-A', 'PLANNING_STRATEGIC_SOURCE', 'brief.md', 'abc123def456xxx');
  assert.ok(id.startsWith('proj-A:PLANNING_STRATEGIC_SOURCE:brief.md:abc123def456xxx'.slice(0, id.length)));
  assert.ok(id.includes('proj-A'));
  assert.ok(id.includes('PLANNING_STRATEGIC_SOURCE'));
  assert.ok(id.includes('brief.md'));
  assert.ok(id.includes('abc123def456xxx'.slice(0, 16)));
});

test('PDI-04: buildClaimId is stable across calls', () => {
  const a = buildClaimId('src-1', 'industry', 'value-hash-1');
  const b = buildClaimId('src-1', 'industry', 'value-hash-1');
  assert.equal(a, b);
  assert.ok(a.startsWith('src-1:industry:'));
});

// ---------------------------------------------------------------------------
// PDI-05..06 — assertions
// ---------------------------------------------------------------------------

test('PDI-05: assertPlanningClaimKey accepts canonical and rejects unknown', () => {
  // Canonical
  for (const k of [
    'brand_positioning',
    'brand_role',
    'industry',
    'business_model',
    'product_service',
    'target_audience',
    'audience_problem',
    'brand_promise',
    'competitive_context',
    'differentiation_logic',
    'communication_task',
    'strategic_objective',
    'experience_objective',
    'transformation_objective',
    'touchpoint_priority',
    'brand_personality'
  ]) {
    assertPlanningClaimKey(k);
  }
  // Unknown
  assert.throws(() => assertPlanningClaimKey('not-a-real-key'), /PLANNING-CLAIM-KEY-NOT-REGISTERED/);
});

test('PDI-06: assertPlanningSourceRole accepts the three valid roles', () => {
  assertPlanningSourceRole('PLANNING_STRATEGIC_SOURCE');
  assertPlanningSourceRole('LEGACY_VISUAL_EVIDENCE');
  assertPlanningSourceRole('UNKNOWN_SOURCE');
  assert.throws(() => assertPlanningSourceRole('foo'), /PLANNING-SOURCE-ROLE-INVALID/);
});

// ---------------------------------------------------------------------------
// PDI-07..08 — fingerprint determinism
// ---------------------------------------------------------------------------

test('PDI-07: planningEvidenceFingerprint is deterministic and order-independent', () => {
  const a = {
    projectId: 'proj-A',
    sourceDocuments: [
      { sourceDocumentId: 's1', filename: 'b.md', documentRole: 'brand-strategy', sourceRole: 'PLANNING_STRATEGIC_SOURCE', contentHash: 'h1', chunkCount: 2 },
      { sourceDocumentId: 's2', filename: 'c.md', documentRole: 'market-research', sourceRole: 'PLANNING_STRATEGIC_SOURCE', contentHash: 'h2', chunkCount: 3 }
    ],
    claims: [
      { claimId: 'c1', key: 'industry', value: 'foo', epistemicClass: 'FACT', sourceDocumentId: 's1', chunkRefs: ['chunk-1'] },
      { claimId: 'c2', key: 'brand_role', value: 'bar', epistemicClass: 'FACT', sourceDocumentId: 's2', chunkRefs: ['chunk-2'] }
    ]
  };
  // Reverse the order
  const b = {
    projectId: 'proj-A',
    sourceDocuments: [...a.sourceDocuments].reverse(),
    claims: [...a.claims].reverse()
  };
  assert.equal(planningEvidenceFingerprint(a), planningEvidenceFingerprint(b));
  assert.equal(planningEvidenceFingerprint(a).length, 64); // SHA-256 hex
});

test('PDI-08: planningEvidenceFingerprint is sensitive to value and epistemicClass changes', () => {
  const base = {
    projectId: 'proj-A',
    sourceDocuments: [],
    claims: [
      { claimId: 'c1', key: 'industry', value: 'foo', epistemicClass: 'FACT', sourceDocumentId: 's1', chunkRefs: ['chunk-1'] }
    ]
  };
  const valueChanged = {
    ...base,
    claims: [{ ...base.claims[0], value: 'foo-2' }]
  };
  const classChanged = {
    ...base,
    claims: [{ ...base.claims[0], epistemicClass: 'USER_REQUIREMENT' }]
  };
  assert.notEqual(planningEvidenceFingerprint(base), planningEvidenceFingerprint(valueChanged));
  assert.notEqual(planningEvidenceFingerprint(base), planningEvidenceFingerprint(classChanged));
});

// ---------------------------------------------------------------------------
// PDI-09 — end-to-end: buildPlanningStrategicEvidenceArtifact with real fixture
// ---------------------------------------------------------------------------

test('PDI-09: end-to-end ingestion of a real fixture produces a valid artifact', async () => {
  // Load the real fixture from disk.
  const fs = await import('node:fs/promises');
  const path = await import('node:path');
  const fixturePath = path.join(
    process.cwd(),
    'tests',
    'fixtures',
    'planning-briefs',
    'qualification-planning-a.md'
  );

  // We must read the file the same way the builder does (via
  // `readPlanningBriefFile` → runtime-core's `parseTextDocument`),
  // because parseTextDocument trims the text. The hash must be
  // computed from the SAME text the builder sees.
  const {
    planningBriefContentHash,
    readPlanningBriefFile
  } = await import(
    '../../../../packages/creative-intelligence/src/strategic-synthesis/index.ts'
  );

  const readResult = await readPlanningBriefFile(fixturePath);
  const rawText = readResult.rawText;

  // Pre-classify role. The classifier is heuristic; we accept any role.
  // The key property: the artifact builder correctly handles every role.
  const classification = classifyDocumentRole({
    id: 'brief-a',
    filename: 'qualification-planning-a.md',
    rawText
  });
  assert.ok(
    ['creative-brief', 'brand-strategy', 'market-research', 'product-information', 'visual-guideline', 'reference', 'business-plan', 'mixed-planning', 'unknown'].includes(classification.role),
    `classifier returned unexpected role: ${classification.role}`
  );

  // Build a record (matches the project.json shape). Use the planning
  // helper for hash computation to ensure LF-normalization parity.
  const contentHash = planningBriefContentHash(rawText);
  const record = {
    sourceId: 'planning-brief:qualification-fixture-A:' + contentHash.slice(0, 16),
    filename: 'qualification-planning-a.md',
    extension: '.md',
    relativePath: 'tests/fixtures/planning-briefs/qualification-planning-a.md',
    sourceType: 'planning_document',
    contentHash,
    characterCount: rawText.length,
    registeredAt: '2026-08-20T16:00:00.000Z'
  };

  // The builder expects relativePath from projectRoot. We pass an absolute
  // path here as projectRoot + relativePath concatenation.
  const projectRoot = process.cwd();
  const artifact = await buildPlanningStrategicEvidenceArtifact({
    projectId: 'qualification-fixture-A',
    projectRoot,
    briefs: [record]
  });

  // Schema invariants
  assert.equal(artifact.schemaVersion, 'ci-w1c.7.4');
  assert.equal(artifact.projectId, 'qualification-fixture-A');
  assert.equal(artifact.planningEvidenceFingerprint.length, 64);
  assert.match(artifact.planningEvidenceFingerprint, /^[0-9a-f]{64}$/);
  assert.equal(artifact.documentSetHash.length, 64);
  assert.match(artifact.documentSetHash, /^[0-9a-f]{64}$/);
  // Every claim (if any) must have a registered key.
  for (const claim of artifact.claims) {
    assertPlanningClaimKey(claim.key);
  }
  // The defensive skip rule: if the classifier returns a non-planning role,
  // the artifact's sourceDocuments list MUST be empty (the builder refuses to
  // include LEGACY_VISUAL_EVIDENCE / UNKNOWN_SOURCE briefs).
  if (classification.role === 'visual-guideline' || classification.role === 'reference' || classification.role === 'unknown') {
    assert.equal(artifact.sourceDocuments.length, 0, 'non-planning sourceRole must be defensively skipped');
    assert.equal(artifact.claims.length, 0, 'non-planning sourceRole must produce no claims');
  } else {
    // For a planning role, the artifact must include the source document.
    assert.equal(artifact.sourceDocuments.length, 1, 'planning role must include the source document');
    assert.equal(artifact.sourceDocuments[0].sourceRole, 'PLANNING_STRATEGIC_SOURCE');
  }
});
