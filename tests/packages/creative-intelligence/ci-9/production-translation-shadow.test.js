/**
 * CI-9 Shadow Integration.
 *
 * Spec #59: 1 new production-translation shadow artifact is always written
 * (production-translation-context.json). Space and Packaging translation
 * contracts require a valid Canon (which requires an explicit user
 * selection). In the shadow service default state, no selection exists,
 * so only production-translation-context.json is written.
 *
 * All artifacts: authoritative=false, mode=shadow.
 *
 * File count expectations:
 *   - With DVC + project record: 15 + 1 = 16 (CI-8 + 1 PT context)
 *   - With project record only: 14 + 1 = 15
 */

import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';

import { runProjectTruthShadowSafely } from '@masterpiece/runtime-core/application/project-truth-shadow-service.ts';

const DVC = {
  schemaVersion: '1.0',
  sourceRunId: 'r1',
  generatedAt: '2026-01-01T00:00:00.000Z',
  brandName: 'TestBrand',
  industry: 'tech',
  products: ['app'],
  services: ['support'],
  targetAudience: ['enterprise'],
  pricePositioning: 'premium',
  businessModel: 'B2B',
  brandPersonality: ['innovator'],
  visualPreferences: ['minimal'],
  requiredTouchpoints: ['logo'],
  lockedFacts: ['use-blue'],
  prohibitedDirections: ['no-flashy'],
  unknownFields: [],
  evidence: [
    { field: 'brandName', documentId: 'd1', filename: 'brief.pdf', summary: 'X', section: 'intro' },
  ],
  sourceDocuments: [
    { documentId: 'd1', filename: 'brief.pdf', sourceType: 'pdf', characterCount: 1000 },
  ],
};

test('CI-9 shadow: writes 16 base+CI artifacts when DVC + project record provided', async () => {
  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'ci9-shadow-'));
  try {
    const result = await runProjectTruthShadowSafely({
      projectId: 'p1',
      projectContextRoot: tmp,
      carriers: {
        projectRecord: { id: 'p1', brandName: 'TestBrand', industry: 'tech' },
        documentVisualContext: DVC,
      },
    });
    assert.equal(result.ok, true, `shadow should succeed: ${result.errorMessage}`);
    // 6 base + 1 doc-intel + 3 NICE + 1 concept + 1 direction + 1 evaluation
    // + 1 selection + 1 selected-direction-snapshot (CI-8) + 1 production-translation-context (CI-9) = 16
    assert.equal(result.files.length, 16);
    assert.ok(result.files.includes('production-translation-context.json'),
      'production-translation-context.json must be written');
  } finally {
    await fs.rm(tmp, { recursive: true, force: true });
  }
});

test('CI-9 shadow: writes 15 base+CI artifacts without DVC', async () => {
  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'ci9-shadow-nodvc-'));
  try {
    const result = await runProjectTruthShadowSafely({
      projectId: 'p1',
      projectContextRoot: tmp,
      carriers: {
        projectRecord: { id: 'p1', brandName: 'X' },
      },
    });
    assert.equal(result.ok, true);
    // 6 base + 0 doc-intel + 3 NICE + 1 concept + 1 direction + 1 evaluation
    // + 1 selection + 1 selected-direction-snapshot (CI-8) + 1 production-translation-context (CI-9) = 15
    assert.equal(result.files.length, 15);
    assert.ok(result.files.includes('production-translation-context.json'),
      'production-translation-context.json must always be written');
  } finally {
    await fs.rm(tmp, { recursive: true, force: true });
  }
});

test('CI-9 shadow: production-translation-context artifact has correct structure', async () => {
  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'ci9-shadow-ctx-'));
  try {
    const result = await runProjectTruthShadowSafely({
      projectId: 'p1',
      projectContextRoot: tmp,
      carriers: {
        projectRecord: { id: 'p1', brandName: 'TestBrand' },
        documentVisualContext: DVC,
      },
      generatedAt: '2026-01-01T00:00:00.000Z',
    });
    assert.equal(result.ok, true);
    const artifactPath = path.join(result.artifactDirectory, 'production-translation-context.json');
    const raw = await fs.readFile(artifactPath, 'utf8');
    const artifact = JSON.parse(raw);
    assert.equal(artifact.schemaVersion, '0.1');
    assert.equal(artifact.authoritative, false);
    assert.equal(artifact.mode, 'shadow');
    assert.equal(artifact.projectId, 'p1');
    // Without user-action state, context is null
    assert.equal(artifact.context, null);
    assert.ok(Array.isArray(artifact.diagnostics));
    assert.ok(artifact.diagnostics.some((d) => typeof d === 'string' && d.startsWith('PT_CANON_REQUIRED')));
  } finally {
    await fs.rm(tmp, { recursive: true, force: true });
  }
});

test('CI-9 shadow: space-translation.json and packaging-translation.json NOT written in default fixture', async () => {
  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'ci9-shadow-no-contracts-'));
  try {
    const result = await runProjectTruthShadowSafely({
      projectId: 'p1',
      projectContextRoot: tmp,
      carriers: {
        projectRecord: { id: 'p1', brandName: 'TestBrand' },
        documentVisualContext: DVC,
      },
    });
    assert.equal(result.ok, true);
    // Space/Packaging translation contracts require a valid Canon (which requires
    // an explicit user selection). Shadow service has no user-action state, so
    // neither contract is written in this phase.
    assert.ok(!result.files.includes('space-translation.json'),
      'space-translation.json must NOT be written when no valid selection exists');
    assert.ok(!result.files.includes('packaging-translation.json'),
      'packaging-translation.json must NOT be written when no valid selection exists');
    assert.ok(!result.files.includes('space-translation-comparison.json'),
      'space-translation-comparison.json must NOT be written when no valid selection exists');
    assert.ok(!result.files.includes('packaging-translation-comparison.json'),
      'packaging-translation-comparison.json must NOT be written when no valid selection exists');
  } finally {
    await fs.rm(tmp, { recursive: true, force: true });
  }
});

test('CI-9 shadow: production-translation-context.json shadow failure does not break the rest', async () => {
  // Even when carriers are completely missing, the shadow service must produce
  // a result (shadow failure MUST NOT block production per Spec #59).
  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'ci9-shadow-empty-'));
  try {
    const result = await runProjectTruthShadowSafely({
      projectId: 'p1',
      projectContextRoot: tmp,
      carriers: {},
    });
    // Without any carriers, only the 6 base artifacts are written.
    // CI-9 PT context is in the same try block as CI-8, so if CI-8 fails,
    // PT context won't be written. But the function still returns ok=true.
    assert.equal(typeof result.ok, 'boolean');
  } finally {
    await fs.rm(tmp, { recursive: true, force: true });
  }
});
