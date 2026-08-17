import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';

/**
 * CI-8 shadow integration: 3 new shadow artifacts.
 *
 *   - selected-direction-snapshot.json
 *   - visual-canon.json
 *   - anchor-contract.json
 *
 * All authoritative=false, mode=shadow. Production never reads them.
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

test('CI-8 shadow: 3 new shadow artifacts are written when selection is unselected', async () => {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ci8-shadow-unsel-'));
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

    // Shadow must complete
    assert.equal(result.ok, true, `shadow should succeed: ${result.errorMessage}`);

    // The 3 new artifacts should be written (or the canon/anchor ones may be skipped
    // if no selection exists — that's the Golden fixture #1: no selection, no canon/anchor).
    assert.ok(result.files.includes('selected-direction-snapshot.json'),
      'selected-direction-snapshot.json must be written (even when unselected)');
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true });
  }
});

test('CI-8 shadow: selected-direction-snapshot artifact has correct structure (unselected state)', async () => {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ci8-shadow-snap-'));
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
    const artifactPath = path.join(result.artifactDirectory, 'selected-direction-snapshot.json');
    const raw = await fs.readFile(artifactPath, 'utf8');
    const artifact = JSON.parse(raw);

    assert.equal(artifact.schemaVersion, '0.1');
    assert.equal(artifact.authoritative, false);
    assert.equal(artifact.mode, 'shadow');
    assert.equal(artifact.projectId, 'p-shadow2');
    // Without user action, snapshot is null
    assert.equal(artifact.snapshot, null);
    // Diagnostics should indicate selection required (string array of code+message)
    assert.ok(Array.isArray(artifact.diagnostics));
    assert.ok(artifact.diagnostics.some((d) => typeof d === 'string' && d.startsWith('CANON_SELECTION_REQUIRED')));
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true });
  }
});

test('CI-8 shadow: visual-canon.json artifact is NOT written when no selection', async () => {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ci8-shadow-canon-'));
  try {
    const result = await runProjectTruthShadowSafely({
      projectId: 'p-shadow3',
      projectContextRoot: tmpDir,
      carriers: {
        projectRecord: { id: 'p-shadow3', brandName: 'ShadowBrand', industry: 'tech' },
        documentVisualContext: dvcFixture(),
      },
      generatedAt: '2026-01-01T00:00:00.000Z',
    });

    assert.equal(result.ok, true);
    // Canon should NOT exist (Golden fixture: no selection, no canon)
    assert.ok(!result.files.includes('visual-canon.json'),
      'visual-canon.json must NOT be written when no selection');
    assert.ok(!result.files.includes('anchor-contract.json'),
      'anchor-contract.json must NOT be written when no selection');
    // The selection artifact must still exist (default unselected state)
    assert.ok(result.files.includes('direction-selection.json'),
      'direction-selection.json must always be written (unselected default)');
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true });
  }
});
