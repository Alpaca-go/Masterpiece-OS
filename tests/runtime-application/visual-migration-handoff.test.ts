import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createCreativeSessionService } from '@masterpiece/runtime-core/application/creative-session-service.ts';
import { createQuickStyleExtractionService } from '@masterpiece/runtime-core/application/quick-style-extraction-service.ts';
import { createVisualMigrationReferencePackService } from '@masterpiece/runtime-core/application/visual-migration-reference-pack-service.ts';
import { createVisualMigrationCanonService } from '@masterpiece/runtime-core/application/visual-migration-canon-service.ts';
import { compileLockedAssets } from '@masterpiece/creative-production-runtime/locked-assets.js';
import { compileStyleProfile } from '@masterpiece/creative-production-runtime/style-profile.js';

test('VM-2 approved handoff persists Canon linkage, resolves evidence after restart, and reuses it', async (t) => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'masterpiece-vm1-handoff-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const projectRoot = path.join(root, 'project');
  const runRoot = path.join(root, 'run');
  await fs.mkdir(path.join(runRoot, 'input', 'reference-assets'), { recursive: true });
  await fs.mkdir(projectRoot, { recursive: true });
  for (let index = 1; index <= 4; index += 1) {
    await fs.writeFile(
      path.join(runRoot, 'input', 'reference-assets', `${String(index).padStart(2, '0')}-reference.png`),
      Buffer.from(`89504e470d0a1a0a010${index}`, 'hex'),
    );
  }

  const project = {
    id: 'project-1', brandName: '测试品牌', industry: '零售', description: '视觉迁移',
    lockedFacts: ['Logo 不得修改'], assets: [],
  };
  const projects = {
    paths: async () => ({ root: projectRoot }),
    get: async () => project,
  };
  const capsule = {
    schemaVersion: '1.0', sourceRunId: 'run-1', currentProjectId: 'project-1',
    generatedAt: '2026-09-02T00:00:00.000Z',
    currentProject: { lockedFacts: ['Logo 不得修改'], businessTouchpoints: ['包装'] },
    inheritedStyle: {
      color: ['暖灰'], layoutAndTypography: ['大留白'], graphicLanguage: ['克制线条'],
      materialAndPhotography: ['真实纸张'], extensionMechanism: ['单一焦点'],
    },
    userAvoidance: [],
    prohibitedReferenceIdentity: { brandNames: [], logos: [], slogans: [], signatureGraphics: [], proprietaryPatterns: [] },
    anchorGoal: '迁移视觉机制', humanNotes: [], uncertainties: [],
  };
  const referenceAnchors = {
    getRun: async () => ({
      id: 'run-1', projectId: 'project-1', decision: 'approved', status: 'completed',
      referenceAssetNames: ['reference-1.png', 'reference-2.png', 'reference-3.png', 'reference-4.png'],
    }),
    getCapsule: async () => capsule,
    getBrief: async () => '# Anchor Brief',
    runRoot: async () => runRoot,
  };
  const sessions = createCreativeSessionService(projects as never);
  const packs = createVisualMigrationReferencePackService(projects as never, referenceAnchors as never);
  const canons = createVisualMigrationCanonService(projects as never, packs);
  let active: any = null;
  let compiledLocks: any[] = [];
  const styles = {
    getActive: async () => active,
    compile: async (_projectId: string, decision: any, overrides: any) => {
      active = compileStyleProfile({ creativeDecision: decision, id: 'style-1', overrides });
      return active;
    },
  };
  const lockedAssets = {
    compile: async () => {
      compiledLocks = compileLockedAssets({
        projectId: 'project-1',
        visualContext: {
          projectId: 'project-1', identity: { brandName: '测试品牌' },
          lockedAssets: { logoLocked: false, logoAssetIds: [], lockedFacts: ['Logo 不得修改'] },
          products: { coreProducts: [] }, packaging: { status: 'unknown', structures: [] },
        },
      });
      return compiledLocks;
    },
    list: async () => compiledLocks,
  };
  const handoff = createQuickStyleExtractionService(
    referenceAnchors as never, sessions, lockedAssets as never, styles as never, packs, canons,
  );

  const first = await handoff.extract('project-1', 'run-1');
  const persisted = await sessions.get('project-1');
  assert.equal(first.referencePackId, persisted?.referencePackId);
  assert.equal(persisted?.sourceReferenceAnchorRunId, 'run-1');
  assert.equal(first.created, true);
  assert.equal(first.visualMigrationCanonId, persisted?.visualMigrationCanonId);
  assert.equal(first.visualMigrationCanonFingerprint, persisted?.visualMigrationCanonFingerprint);

  const restartedPacks = createVisualMigrationReferencePackService(projects as never, referenceAnchors as never);
  const restartedCanons = createVisualMigrationCanonService(projects as never, restartedPacks);
  const resolved = await restartedCanons.resolve('project-1', first.visualMigrationCanonId);
  assert.equal(resolved.canon.source.referencePackId, first.referencePackId);
  assert.equal(resolved.references.length, 4);
  assert.equal(resolved.references[0]?.originalFileName, 'reference-1.png');

  const second = await handoff.extract('project-1', 'run-1');
  assert.equal(second.referencePackId, first.referencePackId);
  assert.equal(second.created, false);
  assert.equal(second.visualMigrationCanonId, first.visualMigrationCanonId);
  assert.equal(second.visualMigrationCanonCreated, false);
  const canonDirectories = (await fs.readdir(path.join(projectRoot, 'visual-migration', 'canons'), { withFileTypes: true }))
    .filter((entry) => entry.isDirectory());
  assert.equal(canonDirectories.length, 1);
});
