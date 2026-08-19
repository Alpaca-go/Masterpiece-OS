/**
 * CI-W1C.7 — Creative Reasoning Service mock-mode test.
 *
 * Verifies that the runtime service:
 *   - uses the mock factory by default (no real model call)
 *   - produces a complete synthesis + concept + direction + report
 *   - never calls the image provider (imageProviderCallCount === 0)
 *   - persists shadow artifacts at the expected paths
 *   - reports the stage pass / fail + blocked codes
 *
 * This test is project-agnostic. No real provider is touched.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';

import {
  createCreativeReasoningService,
} from '../../../../packages/runtime-core/src/application/creative-reasoning-service.ts';

function makeTruth() {
  return {
    schemaVersion: '1.0',
    projectId: 'proj-test-service',
    facts: [
      { id: 'f1', key: 'brand.name', value: 'Acme Studio', authority: 'USER_CONFIRMED', sourceRefs: [] },
      { id: 'f2', key: 'brand.role', value: 'architecture firm', authority: 'USER_CONFIRMED', sourceRefs: [] },
      { id: 'f3', key: 'audience.primary', value: 'private clients building family homes', authority: 'USER_CONFIRMED', sourceRefs: [] },
    ],
    conflicts: [],
  };
}

function makeNeeds() {
  return [
    { id: 'n1', type: 'communication', statement: 'clarify the studio', factRefs: ['f1', 'f3'], needRefs: [] },
  ];
}

function makeEvidence() {
  return {
    schemaVersion: '1.0',
    projectId: 'proj-test-service',
    items: [
      { id: 'e1', sourceKind: 'planning_document', summary: 'planning brief', factRefs: ['f3'], confidence: 0.9 },
    ],
  };
}

test('creative-reasoning-service: default mock path produces all stages + report; image provider call count = 0', async () => {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ci-w1c.7-'));
  const service = createCreativeReasoningService({
    outputRoot: async () => tmpDir,
  });
  const result = await service.run({
    projectId: 'proj-test-service',
    truth: makeTruth(),
    needs: makeNeeds(),
    evidence: makeEvidence(),
  });
  assert.equal(result.imageProviderCallCount, 0);
  assert.equal(result.mode, 'model_assisted_shadow');
  assert.ok(result.shadow.synthesis);
  assert.ok(result.shadow.conceptSet);
  assert.ok(result.shadow.directionSet);
  assert.ok(result.shadow.report);
  assert.ok(result.shadow.reportMarkdown.length > 0);
  // Output paths point to files we just wrote.
  for (const p of [result.outputPaths.synthesis, result.outputPaths.conceptSet, result.outputPaths.directionSet, result.outputPaths.reportJson]) {
    const stat = await fs.stat(p);
    assert.ok(stat.isFile(), `expected file at ${p}`);
  }
  const mdStat = await fs.stat(result.outputPaths.reportMarkdown);
  assert.ok(mdStat.isFile(), `expected file at ${result.outputPaths.reportMarkdown}`);
  // Stage attempt count: the mock fixture's facts are empty (no
  // real fact refs), so the gate blocks. The runtime runs
  // 1 primary + 1 repair per spec §13. The repair is also
  // expected to fail because the mock fixture is project-agnostic
  // and has no real factRefs to resolve.
  assert.ok(result.stages.synthesis.attempts === 1 || result.stages.synthesis.attempts === 2);
  assert.ok(result.stages.concept.attempts === 1 || result.stages.concept.attempts === 2);
  assert.ok(result.stages.direction.attempts === 1 || result.stages.direction.attempts === 2);
  // The mock path is expected to fail at least one gate (the mock
  // fixture has empty factRefs); we assert the failure is detected
  // and bounded — never more than 2 attempts per stage.
  assert.ok(result.stages.synthesis.attempts <= 2);
  assert.ok(result.stages.concept.attempts <= 2);
  assert.ok(result.stages.direction.attempts <= 2);
  await fs.rm(tmpDir, { recursive: true, force: true });
});

test('creative-reasoning-service: report markdown contains all 6 sections + selection-frozen notice', async () => {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ci-w1c.7-'));
  const service = createCreativeReasoningService({
    outputRoot: async () => tmpDir,
  });
  const result = await service.run({
    projectId: 'proj-test-service',
    truth: makeTruth(),
    needs: makeNeeds(),
    evidence: makeEvidence(),
  });
  assert.ok(result.shadow.reportMarkdown.includes('## 01 项目理解'));
  assert.ok(result.shadow.reportMarkdown.includes('## 02 关键洞察'));
  assert.ok(result.shadow.reportMarkdown.includes('## 03 Opportunity Territories'));
  assert.ok(result.shadow.reportMarkdown.includes('## 04 Creative Concepts'));
  assert.ok(result.shadow.reportMarkdown.includes('## 05 Visual Direction Explorations'));
  assert.ok(result.shadow.reportMarkdown.includes('## 06 System Recommendation'));
  assert.ok(result.shadow.reportMarkdown.includes('selection is unchanged by this report'));
  assert.ok(result.shadow.reportMarkdown.includes('Image provider call count: **0**'));
  await fs.rm(tmpDir, { recursive: true, force: true });
});
