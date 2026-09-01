import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createCreativeSessionService } from '@masterpiece/runtime-core/application/creative-session-service.ts';
import { createQuickStyleExtractionService } from '@masterpiece/runtime-core/application/quick-style-extraction-service.ts';
import { createVisualMigrationReferencePackService } from '@masterpiece/runtime-core/application/visual-migration-reference-pack-service.ts';
import { createReferenceOperations } from '@masterpiece/runtime-core/operations/reference-operations.js';

const REFERENCE_BYTES = Buffer.from('89504e470d0a1a0a010203040506', 'hex');

test('VM-1.5 browser intake cleanup preserves Run evidence for Production Pack handoff and restart', async (t) => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'masterpiece-vm15-browser-handoff-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const projectRoot = path.join(root, 'project');
  const intakeRoot = path.join(root, 'reference-anchor-intake');
  const intakeBatch = path.join(intakeRoot, 'batch-1');
  const intakeImage = path.join(intakeBatch, 'browser-reference.png');
  const runRoot = path.join(root, 'reference-runs', 'run-1');
  const runAssets = path.join(runRoot, 'input', 'reference-assets');
  await fs.mkdir(projectRoot, { recursive: true });
  await fs.mkdir(intakeBatch, { recursive: true });
  await fs.writeFile(intakeImage, REFERENCE_BYTES);

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
  const approvedRun = {
    id: 'run-1', projectId: 'project-1', decision: 'approved', status: 'completed',
    referenceAssetNames: ['browser-reference.png'],
  };
  const referenceAnchors = {
    start: async (input: { referenceAssetPaths: string[] }) => {
      await fs.mkdir(runAssets, { recursive: true });
      await fs.copyFile(input.referenceAssetPaths[0]!, path.join(runAssets, '01-browser-reference.png'));
      return { run: approvedRun };
    },
    getRun: async () => approvedRun,
    getCapsule: async () => capsule,
    getCapsuleMarkdown: async () => '# Capsule',
    getBrief: async () => '# Anchor Brief',
    runRoot: async () => runRoot,
  };
  const referenceOperations = createReferenceOperations({
    referenceAnchor: referenceAnchors,
    releaseReferenceAssets: async (paths: string[]) => {
      assert.deepEqual(paths, [intakeImage]);
      await fs.rm(intakeBatch, { recursive: true, force: true });
    },
  });

  await referenceOperations['reference-anchor:start'](null, {
    currentProjectId: 'project-1',
    referenceAssetPaths: [intakeImage],
  });
  assert.equal(await fs.stat(intakeImage).then(() => true).catch(() => false), false);
  assert.deepEqual(await fs.readFile(path.join(runAssets, '01-browser-reference.png')), REFERENCE_BYTES);

  const sessions = createCreativeSessionService(projects as never);
  const packs = createVisualMigrationReferencePackService(projects as never, referenceAnchors as never);
  let active: any = null;
  const handoff = createQuickStyleExtractionService(
    referenceAnchors as never,
    sessions,
    { compile: async () => [{ id: 'lock-1' }], list: async () => [{ id: 'lock-1' }] } as never,
    {
      getActive: async () => active,
      compile: async (_projectId: string, decision: any) => {
        active = { id: 'style-1', source: { creativeDecisionId: decision.id }, status: 'draft' };
        return active;
      },
    } as never,
    packs,
  );
  const result = await handoff.extract('project-1', 'run-1');
  assert.equal((await sessions.get('project-1'))?.referencePackId, result.referencePackId);

  await fs.rm(runAssets, { recursive: true, force: true });
  const restarted = createVisualMigrationReferencePackService(projects as never, referenceAnchors as never);
  const resolved = await restarted.resolve('project-1', result.referencePackId);
  assert.equal(resolved.references.length, 1);
  assert.deepEqual(await fs.readFile(resolved.references[0]!.absolutePath), REFERENCE_BYTES);
});
