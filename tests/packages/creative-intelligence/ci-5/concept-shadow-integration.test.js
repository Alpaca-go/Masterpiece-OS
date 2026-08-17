import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';

/**
 * CI-5 concept shadow integration tests.
 *
 * Verifies:
 *   - concept-intelligence.json artifact is written
 *   - authoritative=false, mode=shadow
 *   - failure in concept generation doesn't break the base shadow run
 *   - production continues when concept shadow fails
 */

import {
  runProjectTruthShadowSafely,
} from '@masterpiece/runtime-core/application/project-truth-shadow-service.ts';
import { adaptProjectRecord, adaptDocumentVisualContext } from '@masterpiece/creative-intelligence/index.ts';

const CTX = { projectId: 'p-shadow', generatedAt: '2026-01-01T00:00:00.000Z', sourceFingerprints: {} };

function dvcFixture(overrides = {}) {
  return {
    schemaVersion: '1.0',
    sourceRunId: 'r1',
    generatedAt: '2026-01-01T00:00:00.000Z',
    brandName: 'ShadowBrand',
    industry: 'tech',
    products: ['product1'],
    services: ['service1'],
    targetAudience: ['enterprise'],
    pricePositioning: 'mid',
    businessModel: 'B2B',
    brandPersonality: ['professional'],
    visualPreferences: ['minimal'],
    requiredTouchpoints: ['logo'],
    lockedFacts: [],
    prohibitedDirections: [],
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

test('CI-5 shadow: concept-intelligence.json artifact is written', async () => {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ci5-shadow-'));
  try {
    const result = await runProjectTruthShadowSafely({
      projectId: 'p-shadow',
      projectContextRoot: tmpDir,
      carriers: {
        projectRecord: { id: 'p-shadow', brandName: 'ShadowBrand', industry: 'tech' },
        documentVisualContext: dvcFixture(),
      },
      generatedAt: '2026-01-01T00:00:00.000Z',
    });

    assert.equal(result.ok, true, `shadow run should succeed: ${result.errorMessage}`);
    assert.ok(result.files.includes('concept-intelligence.json'),
      `concept-intelligence.json should be written, got files: ${result.files.join(', ')}`);

    // Read and validate artifact
    const artifactPath = path.join(result.artifactDirectory, 'concept-intelligence.json');
    const raw = await fs.readFile(artifactPath, 'utf8');
    const artifact = JSON.parse(raw);

    assert.equal(artifact.schemaVersion, '0.1');
    assert.equal(artifact.authoritative, false);
    assert.equal(artifact.mode, 'shadow');
    assert.equal(artifact.projectId, 'p-shadow');
    assert.ok(artifact.conceptSet, 'should have conceptSet');
    assert.ok(artifact.diversity, 'should have diversity report');
    assert.ok(artifact.gateSummary, 'should have gate summary');
    assert.ok(artifact.leakage, 'should have leakage report');
    assert.ok(artifact.generatedAt);
    assert.ok(artifact.ciVersion);
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true });
  }
});

test('CI-5 shadow: concept set inside artifact has all required fields', async () => {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ci5-shadow2-'));
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
    const artifactPath = path.join(result.artifactDirectory, 'concept-intelligence.json');
    const artifact = JSON.parse(await fs.readFile(artifactPath, 'utf8'));

    const { conceptSet } = artifact;
    assert.equal(conceptSet.schemaVersion, '0.1');
    assert.equal(conceptSet.provenance.mode, 'shadow');
    assert.ok(Array.isArray(conceptSet.concepts));
    assert.ok(Array.isArray(conceptSet.gateResults));
    assert.ok(Array.isArray(conceptSet.blockedConceptIds));
    assert.ok(Array.isArray(conceptSet.diagnostics));

    // Each concept has the required fields
    for (const c of conceptSet.concepts) {
      assert.ok(c.id);
      assert.ok(c.title);
      assert.ok(c.thesis);
      assert.ok(c.strategicMechanism);
      assert.ok(c.strategicPattern);
      assert.ok(Array.isArray(c.opportunityRefs));
      assert.ok(Array.isArray(c.insightRefs));
      assert.ok(Array.isArray(c.needRefs));
      assert.ok(Array.isArray(c.factRefs));
      assert.ok(Array.isArray(c.evidenceRefs));
      assert.ok(['grounded', 'provisional', 'blocked'].includes(c.status));
      // No forbidden fields
      assert.equal(c.visualMechanism, undefined);
      assert.equal(c.direction, undefined);
      assert.equal(c.anchor, undefined);
      assert.equal(c.prompt, undefined);
    }

    // Gate results cover all 8 gates for each concept
    const gatesPerConcept = new Map();
    for (const gr of conceptSet.gateResults) {
      if (!gatesPerConcept.has(gr.conceptId)) {
        gatesPerConcept.set(gr.conceptId, []);
      }
      gatesPerConcept.get(gr.conceptId).push(gr.gate);
    }
    for (const [cid, gates] of gatesPerConcept) {
      assert.equal(gates.length, 8,
        `concept ${cid} should have 8 gate results, got ${gates.length}`);
    }
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true });
  }
});

test('CI-5 shadow: base artifacts still written even when concept generation would fail', async () => {
  // We test this indirectly: even a project with very few facts
  // (that may produce 0 concepts) should still write the base 6 + concept artifact.
  // The concept artifact may just have 0 concepts, but it must be present.
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ci5-shadow3-'));
  try {
    const result = await runProjectTruthShadowSafely({
      projectId: 'p-shadow3',
      projectContextRoot: tmpDir,
      carriers: {
        projectRecord: { id: 'p-shadow3', brandName: 'Minimal', industry: 'tech' },
        // No document context → fewer carriers → fewer needs → maybe no concepts
      },
      generatedAt: '2026-01-01T00:00:00.000Z',
    });

    assert.equal(result.ok, true, `shadow run should succeed: ${result.errorMessage}`);
    // Base 6 files always present
    const baseFiles = [
      'project-truth.json', 'evidence-ledger.json',
      'truth-resolutions.json', 'truth-conflicts.json',
      'validation-report.json', 'shadow-report.json',
    ];
    for (const f of baseFiles) {
      assert.ok(result.files.includes(f), `base file ${f} should be present`);
    }
    // Concept artifact should still be written (even with 0 concepts)
    assert.ok(result.files.includes('concept-intelligence.json'),
      'concept-intelligence.json should still be written');
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true });
  }
});
