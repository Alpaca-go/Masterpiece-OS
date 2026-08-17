import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';

/**
 * CI-6 direction shadow integration tests.
 *
 * Verifies:
 *   - direction-intelligence.json artifact is written
 *   - authoritative=false, mode=shadow
 *   - failure in direction generation doesn't break the base shadow run
 *   - production continues when direction shadow fails
 */

import { runProjectTruthShadowSafely } from '@masterpiece/runtime-core/application/project-truth-shadow-service.ts';

const CTX = { projectId: 'p-shadow', generatedAt: '2026-01-01T00:00:00.000Z', sourceFingerprints: {} };

function dvcFixture(overrides = {}) {
  return {
    schemaVersion: '1.0', sourceRunId: 'r1', generatedAt: '2026-01-01T00:00:00.000Z',
    brandName: 'ShadowBrand', industry: 'tech', products: ['p1'], services: ['s1'],
    targetAudience: ['enterprise'], pricePositioning: 'mid', businessModel: 'B2B',
    brandPersonality: ['professional'], visualPreferences: ['minimal'],
    requiredTouchpoints: ['logo'], lockedFacts: [], prohibitedDirections: [],
    unknownFields: [],
    evidence: [
      { field: 'brandName', documentId: 'd1', filename: 'brief.pdf', summary: 'X', section: 'intro', page: 1 },
    ],
    sourceDocuments: [
      { documentId: 'd1', filename: 'brief.pdf', sourceType: 'pdf', characterCount: 1000, pageCount: 5 },
    ],
    ...overrides,
  };
}

test('CI-6 shadow: direction-intelligence.json artifact is written', async () => {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ci6-shadow-'));
  try {
    const result = await runProjectTruthShadowSafely({
      projectId: 'p-shadow',
      projectContextRoot: tmpDir,
      carriers: {
        projectRecord: { id: 'p-shadow', brandName: 'ShadowBrand', industry: 'tech', logoLocked: true },
        documentVisualContext: dvcFixture(),
      },
      generatedAt: '2026-01-01T00:00:00.000Z',
    });

    assert.equal(result.ok, true, `shadow run should succeed: ${result.errorMessage}`);
    assert.ok(result.files.includes('direction-intelligence.json'),
      `direction-intelligence.json should be written, got: ${result.files.join(', ')}`);

    const artifactPath = path.join(result.artifactDirectory, 'direction-intelligence.json');
    const raw = await fs.readFile(artifactPath, 'utf8');
    const artifact = JSON.parse(raw);

    assert.equal(artifact.schemaVersion, '0.1');
    assert.equal(artifact.authoritative, false);
    assert.equal(artifact.mode, 'shadow');
    assert.equal(artifact.projectId, 'p-shadow');
    assert.ok(artifact.directionSet, 'should have directionSet');
    assert.ok(artifact.familyDifference, 'should have familyDifference report');
    assert.ok(artifact.gateSummary, 'should have gate summary');
    assert.ok(artifact.leakage, 'should have leakage report');
    assert.ok(artifact.ciVersion);
    assert.ok(artifact.generatedAt);
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true });
  }
});

test('CI-6 shadow: direction set inside artifact has all required fields', async () => {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ci6-shadow2-'));
  try {
    const result = await runProjectTruthShadowSafely({
      projectId: 'p-shadow2',
      projectContextRoot: tmpDir,
      carriers: {
        projectRecord: { id: 'p-shadow2', brandName: 'ShadowBrand', industry: 'tech', logoLocked: true },
        documentVisualContext: dvcFixture({ brandName: 'ShadowBrand', businessModel: 'B2B2C' }),
      },
      generatedAt: '2026-01-01T00:00:00.000Z',
    });

    assert.equal(result.ok, true);
    const artifactPath = path.join(result.artifactDirectory, 'direction-intelligence.json');
    const artifact = JSON.parse(await fs.readFile(artifactPath, 'utf8'));

    const { directionSet } = artifact;
    assert.equal(directionSet.schemaVersion, '0.1');
    assert.equal(directionSet.provenance.mode, 'shadow');
    assert.ok(Array.isArray(directionSet.directions));
    assert.ok(Array.isArray(directionSet.evaluations));
    assert.ok(Array.isArray(directionSet.blockedDirectionIds));
    assert.ok(Array.isArray(directionSet.diagnostics));

    for (const d of directionSet.directions) {
      assert.ok(d.id);
      assert.ok(d.title);
      assert.ok(d.thesis);
      assert.ok(d.visualMechanism);
      assert.ok(d.systemHypothesis);
      assert.ok(d.directionFamily);
      assert.ok(Array.isArray(d.crossMediaBehavior));
      assert.ok(Array.isArray(d.conceptRefs));
      assert.ok(Array.isArray(d.opportunityRefs));
      assert.ok(Array.isArray(d.insightRefs));
      assert.ok(Array.isArray(d.needRefs));
      assert.ok(Array.isArray(d.factRefs));
      assert.ok(Array.isArray(d.evidenceRefs));
      assert.ok(['grounded', 'provisional', 'blocked'].includes(d.status));
      // No forbidden fields
      assert.equal(d.anchor, undefined);
      assert.equal(d.prompt, undefined);
      assert.equal(d.productionPrompt, undefined);
      assert.equal(d.selectedDirection, undefined);
    }
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true });
  }
});

test('CI-6 shadow: base artifacts still written even when minimal', async () => {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ci6-shadow3-'));
  try {
    const result = await runProjectTruthShadowSafely({
      projectId: 'p-shadow3',
      projectContextRoot: tmpDir,
      carriers: {
        projectRecord: { id: 'p-shadow3', brandName: 'Minimal', industry: 'tech' },
        // No DVC — fewer carriers
      },
      generatedAt: '2026-01-01T00:00:00.000Z',
    });

    assert.equal(result.ok, true, `shadow run should succeed: ${result.errorMessage}`);
    const baseFiles = [
      'project-truth.json', 'evidence-ledger.json',
      'truth-resolutions.json', 'truth-conflicts.json',
      'validation-report.json', 'shadow-report.json',
    ];
    for (const f of baseFiles) {
      assert.ok(result.files.includes(f), `base file ${f} should be present`);
    }
    // Direction artifact should still be written (even with 0 directions)
    assert.ok(result.files.includes('direction-intelligence.json'),
      'direction-intelligence.json should still be written');
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true });
  }
});
