import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import {
  CREATIVE_INTELLIGENCE_SHADOW_FILENAME,
  EVIDENCE_LEDGER_FILENAME,
  PROJECT_TRUTH_MODEL_FILENAME,
  createCreativeIntelligenceShadowService
} from '../src/main/creative-intelligence-shadow-service.ts';

test('shadow service persists evidence and truth before its read-only manifest', async (context) => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'masterpiece-ci-shadow-'));
  context.after(() => fs.rm(root, { recursive: true, force: true }));
  const projectId = 'project-01';
  const generatedAt = '2026-08-03T08:00:00.000Z';
  const visualContext = {
    schemaVersion: '2.0', projectId, version: 1, generatedAt,
    brandCore: { name: 'Northstar', industry: 'Hospitality', brandRole: null, audience: [] },
    lockedAssets: { logoAssetIds: [], brandNameLocked: true, confirmedColors: [], packageStructures: [], productAssetIds: [], lockedAssetIds: [], mustPreserve: [] },
    visualIdentity: { tone: [], colorBehavior: [], graphicBehavior: [], materialBehavior: [], compositionBehavior: [], lightingBehavior: [] },
    styleBoundaries: { mustAvoid: [], uncertainItems: [] },
    confirmedDecisions: [], sourceAssetRefs: [],
    provenance: { builderId: 'fixture', builderVersion: '1', sourceKinds: ['project_record'], sourceFingerprint: 'fixture' }
  } as const;
  const service = createCreativeIntelligenceShadowService({
    projects: {
      get: async () => ({ id: projectId }),
      paths: async () => ({ root, outputs: path.join(root, 'outputs'), runtime: path.join(root, 'runtime') })
    } as never,
    projectContext: {
      getShortChain: async () => visualContext,
      get: async () => { throw new Error('not needed'); }
    } as never,
    documentContext: {} as never,
    getDocumentContextLink: async () => null
  });

  const output = await service.build(projectId);
  const directory = path.join(root, 'creative-intelligence-v2');
  assert.equal(output.status, 'shadow_only');
  assert.equal(output.downstreamWritePolicy, 'disabled');
  await Promise.all([
    fs.access(path.join(directory, EVIDENCE_LEDGER_FILENAME)),
    fs.access(path.join(directory, PROJECT_TRUTH_MODEL_FILENAME)),
    fs.access(path.join(directory, CREATIVE_INTELLIGENCE_SHADOW_FILENAME))
  ]);
  assert.equal((await service.get(projectId)).projectId, projectId);
});
