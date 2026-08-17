import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';

/**
 * CI-7 shadow integration: direction-evaluation.json + direction-selection.json
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

test('CI-7 shadow: direction-evaluation.json artifact is written', async () => {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ci7-shadow-eval-'));
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

    assert.equal(result.ok, true, `shadow should succeed: ${result.errorMessage}`);
    assert.ok(result.files.includes('direction-evaluation.json'),
      `direction-evaluation.json should be written, got: ${result.files.join(', ')}`);

    const artifactPath = path.join(result.artifactDirectory, 'direction-evaluation.json');
    const raw = await fs.readFile(artifactPath, 'utf8');
    const artifact = JSON.parse(raw);

    assert.equal(artifact.schemaVersion, '0.1');
    assert.equal(artifact.authoritative, false);
    assert.equal(artifact.mode, 'shadow');
    assert.equal(artifact.projectId, 'p-shadow');
    assert.ok(artifact.evaluationSet, 'should have evaluationSet');
    assert.ok(artifact.evaluationSet.evaluations);
    assert.ok(artifact.evaluationSet.ranking);
    assert.ok(artifact.evaluationSet.recommendation);
    assert.equal(artifact.evaluationSet.provenance.mode, 'shadow');
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true });
  }
});

test('CI-7 shadow: direction-selection.json artifact is unselected by default', async () => {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ci7-shadow-sel-'));
  try {
    const result = await runProjectTruthShadowSafely({
      projectId: 'p-shadow2',
      projectContextRoot: tmpDir,
      carriers: {
        projectRecord: { id: 'p-shadow2', brandName: 'ShadowBrand', industry: 'tech' },
        documentVisualContext: dvcFixture(),
      },
      generatedAt: '2026-01-01T00:00:00.000Z',
    });

    assert.equal(result.ok, true);
    assert.ok(result.files.includes('direction-selection.json'),
      'direction-selection.json should be written');

    const artifactPath = path.join(result.artifactDirectory, 'direction-selection.json');
    const raw = await fs.readFile(artifactPath, 'utf8');
    const artifact = JSON.parse(raw);

    assert.equal(artifact.schemaVersion, '0.1');
    assert.equal(artifact.authoritative, false);
    assert.equal(artifact.mode, 'shadow');
    // Golden fixture: unselected by default
    assert.equal(artifact.selectionState.selectedDirectionId, null);
    assert.equal(artifact.selectionState.selectedAt, null);
    assert.equal(artifact.selectionState.selectedBy, null);
    assert.equal(artifact.selectionState.selectionSource, null);
    assert.equal(artifact.selectionState.revision, 0);
    assert.deepEqual(artifact.selectionState.previousSelectionIds, []);
    assert.equal(artifact.selectionState.status, 'unselected');
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true });
  }
});

test('CI-7 shadow: evaluation never auto-selects (Hard Golden)', async () => {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ci7-shadow-eval2-'));
  try {
    const result = await runProjectTruthShadowSafely({
      projectId: 'p-shadow3',
      projectContextRoot: tmpDir,
      carriers: {
        projectRecord: { id: 'p-shadow3', brandName: 'ShadowBrand', industry: 'tech', logoLocked: true },
        documentVisualContext: dvcFixture({ brandName: 'ShadowBrand', businessModel: 'B2B2C' }),
      },
      generatedAt: '2026-01-01T00:00:00.000Z',
    });

    assert.equal(result.ok, true);
    const evalPath = path.join(result.artifactDirectory, 'direction-evaluation.json');
    const selPath = path.join(result.artifactDirectory, 'direction-selection.json');
    const evalArtifact = JSON.parse(await fs.readFile(evalPath, 'utf8'));
    const selArtifact = JSON.parse(await fs.readFile(selPath, 'utf8'));

    // Even if evaluation recommends a direction, selection is unselected
    if (evalArtifact.evaluationSet.recommendation.status === 'available') {
      assert.equal(selArtifact.selectionState.selectedDirectionId, null,
        'selection MUST remain unselected even when recommendation exists');
      assert.equal(selArtifact.selectionState.status, 'unselected');
    }
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true });
  }
});
