import assert from 'node:assert/strict';
import test from 'node:test';
import path from 'node:path';
import os from 'node:os';
import fs from 'node:fs/promises';

/**
 * CI-3 shadow integration tests.
 *
 * Spec #12: document-intelligence.json is a non-authoritative shadow artifact.
 * Spec #56: shadow failure must not break production.
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

test('CI-3 shadow: writes 6 base files + 1 document-intelligence.json when DVC present', async () => {
  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'ci3-shadow-'));
  try {
    const result = await runProjectTruthShadowSafely({
      projectId: 'p1',
      projectContextRoot: tmp,
      carriers: {
        projectRecord: { id: 'p1', brandName: 'X', industry: 'tech' },
        documentVisualContext: DVC,
      },
    });
    assert.equal(result.ok, true);
    // CI-4 adds 3 NICE artifacts; CI-5 adds 1 concept; CI-6 adds 1 direction;
    // CI-7 adds 1 evaluation + 1 selection = 2; CI-8 adds 1 selected-direction-snapshot.
    // CI-9 adds 1 production-translation-context.
    // expect 6 base + 1 doc-intel + 3 NICE + 1 concept + 1 direction + 2 + 1 + 1 = 16.
    assert.equal(result.files.length, 16);
    assert.ok(result.files.includes('document-intelligence.json'));
    // Verify the doc-intel artifact structure.
    const diPath = path.join(result.artifactDirectory, 'document-intelligence.json');
    const di = JSON.parse(await fs.readFile(diPath, 'utf8'));
    assert.equal(di.schemaVersion, '0.1');
    assert.equal(di.authoritative, false);
    assert.equal(di.mode, 'shadow');
    assert.equal(di.projectId, 'p1');
    assert.equal(di.isEmpty, false);
    assert.equal(di.context.brandName, 'TestBrand');
    assert.ok(di.ciVersion);
  } finally {
    await fs.rm(tmp, { recursive: true, force: true });
  }
});

test('CI-3 shadow: omits document-intelligence.json when no DVC provided', async () => {
  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'ci3-shadow-no-dvc-'));
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
    // + 1 production-translation-context (CI-9) = 15 files.
    assert.equal(result.files.length, 15);
    assert.ok(!result.files.includes('document-intelligence.json'));
  } finally {
    await fs.rm(tmp, { recursive: true, force: true });
  }
});

test('CI-3 shadow: DVC validation failure does NOT break the base 6 files', async () => {
  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'ci3-shadow-bad-dvc-'));
  try {
    const result = await runProjectTruthShadowSafely({
      projectId: 'p1',
      projectContextRoot: tmp,
      carriers: {
        projectRecord: { id: 'p1', brandName: 'X' },
        // DVC with wrong schemaVersion — interpretDocumentContext will throw.
        documentVisualContext: {
          schemaVersion: '0.9',
          sourceRunId: 'r1',
          generatedAt: '2026-01-01T00:00:00.000Z',
          brandName: 'X',
          industry: 'tech',
          products: [], services: [], targetAudience: [],
          pricePositioning: null, businessModel: null,
          brandPersonality: [], visualPreferences: [],
          requiredTouchpoints: [], lockedFacts: [], prohibitedDirections: [],
          unknownFields: [], evidence: [],
          sourceDocuments: [{ documentId: 'd1', filename: 'x.pdf', sourceType: 'pdf', characterCount: 100 }],
        },
      },
    });
    // Base 6 files must still be written; doc-intel skipped; CI-4 NICE always
    // written (3 files); CI-5 concept always written; CI-6 direction always written;
    // CI-7 evaluation + selection always written; CI-8 selected-direction-snapshot.
    // CI-9 production-translation-context always written.
    // Total 15.
    assert.equal(result.ok, true);
    assert.equal(result.files.length, 15);
    assert.ok(!result.files.includes('document-intelligence.json'));
  } finally {
    await fs.rm(tmp, { recursive: true, force: true });
  }
});
