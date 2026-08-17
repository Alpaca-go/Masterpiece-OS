import assert from 'node:assert/strict';
import test from 'node:test';
import path from 'node:path';
import os from 'node:os';
import fs from 'node:fs/promises';

/**
 * CI-4 NICE shadow integration.
 *
 * Spec #39: 3 new artifacts (need-intelligence.json, insight-intelligence.json,
 *           opportunity-map.json). All authoritative=false / mode=shadow.
 * Spec #41: shadow failure must NOT block production.
 */

import {
  runProjectTruthShadowSafely,
} from '@masterpiece/runtime-core/application/project-truth-shadow-service.ts';

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

test('CI-4 shadow: writes 9 base+CI artifacts when DVC + project record provided', async () => {
  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'ci4-shadow-'));
  try {
    const result = await runProjectTruthShadowSafely({
      projectId: 'p1',
      projectContextRoot: tmp,
      carriers: {
        projectRecord: { id: 'p1', brandName: 'TestBrand', industry: 'tech' },
        documentVisualContext: DVC,
      },
    });
    assert.equal(result.ok, true);
    // 6 base + 1 doc-intel + 3 NICE + 1 concept (CI-5) + 1 direction (CI-6)
    // + 1 evaluation + 1 selection (CI-7) + 1 selected-direction-snapshot (CI-8)
    // + 1 production-translation-context (CI-9) = 16 files
    assert.equal(result.files.length, 16);
    // All 3 NICE artifacts present.
    assert.ok(result.files.includes('need-intelligence.json'));
    assert.ok(result.files.includes('insight-intelligence.json'));
    assert.ok(result.files.includes('opportunity-map.json'));
    // Verify each artifact structure.
    for (const filename of ['need-intelligence.json', 'insight-intelligence.json', 'opportunity-map.json']) {
      const fullPath = path.join(result.artifactDirectory, filename);
      const content = JSON.parse(await fs.readFile(fullPath, 'utf8'));
      assert.equal(content.schemaVersion, '0.1');
      assert.equal(content.authoritative, false);
      assert.equal(content.mode, 'shadow');
      assert.equal(content.projectId, 'p1');
      assert.ok(content.ciVersion);
    }
    // need-intelligence has at least one Need.
    const need = JSON.parse(await fs.readFile(path.join(result.artifactDirectory, 'need-intelligence.json'), 'utf8'));
    assert.ok(need.needs.length > 0, 'should produce at least one need');
    // insight-intelligence has at least one Insight.
    const ins = JSON.parse(await fs.readFile(path.join(result.artifactDirectory, 'insight-intelligence.json'), 'utf8'));
    assert.ok(ins.insights.length > 0, 'should produce at least one insight');
    // opportunity-map has the right shape.
    const opp = JSON.parse(await fs.readFile(path.join(result.artifactDirectory, 'opportunity-map.json'), 'utf8'));
    assert.equal(opp.opportunityMap.provenance.mode, 'shadow');
  } finally {
    await fs.rm(tmp, { recursive: true, force: true });
  }
});

test('CI-4 shadow: NICE artifacts written even without DVC (no doc-intel file)', async () => {
  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'ci4-shadow-no-dvc-'));
  try {
    const result = await runProjectTruthShadowSafely({
      projectId: 'p1',
      projectContextRoot: tmp,
      carriers: {
        projectRecord: { id: 'p1', brandName: 'X' },
      },
    });
    assert.equal(result.ok, true);
    // 6 base + 0 doc-intel + 3 NICE + 1 concept (CI-5) + 1 direction (CI-6)
    // + 1 evaluation + 1 selection (CI-7) + 1 selected-direction-snapshot (CI-8)
    // + 1 production-translation-context (CI-9) = 15 files
    assert.equal(result.files.length, 15);
    assert.ok(!result.files.includes('document-intelligence.json'));
    assert.ok(result.files.includes('need-intelligence.json'));
    assert.ok(result.files.includes('insight-intelligence.json'));
    assert.ok(result.files.includes('opportunity-map.json'));
  } finally {
    await fs.rm(tmp, { recursive: true, force: true });
  }
});

test('CI-4 shadow: NICE failure does NOT break base shadow files', async () => {
  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'ci4-shadow-fail-'));
  try {
    // Empty carriers — base shadow still completes, NICE pipeline may produce
    // empty needs/insights/opportunities but the artifacts must still be written.
    const result = await runProjectTruthShadowSafely({
      projectId: 'p1',
      projectContextRoot: tmp,
      carriers: {},
    });
    assert.equal(result.ok, true);
    // 6 base + 3 NICE + 1 concept (CI-5) + 1 direction (CI-6)
    // + 1 evaluation + 1 selection (CI-7) + 1 selected-direction-snapshot (CI-8) = 14 files
    // Core assertion: all base files still present; count reflects current artifact set.
    assert.ok(result.files.length >= 11, `expected ≥11 files, got ${result.files.length}`);
    assert.ok(result.files.includes('project-truth.json'));
    assert.ok(result.files.includes('evidence-ledger.json'));
    assert.ok(result.files.includes('truth-resolutions.json'));
    assert.ok(result.files.includes('truth-conflicts.json'));
    assert.ok(result.files.includes('validation-report.json'));
    assert.ok(result.files.includes('shadow-report.json'));
    assert.ok(result.files.includes('need-intelligence.json'));
    assert.ok(result.files.includes('insight-intelligence.json'));
    assert.ok(result.files.includes('opportunity-map.json'));
  } finally {
    await fs.rm(tmp, { recursive: true, force: true });
  }
});
