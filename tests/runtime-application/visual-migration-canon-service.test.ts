import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import type { ReferenceStyleCapsule, VisualMigrationReferencePackV1 } from '@masterpiece/project-contracts/index.ts';
import { compileLockedAssets } from '@masterpiece/creative-production-runtime/locked-assets.js';
import { compileStyleProfile } from '@masterpiece/creative-production-runtime/style-profile.js';
import { createVisualMigrationCanonService } from '@masterpiece/runtime-core/application/visual-migration-canon-service.ts';
import {
  buildVisualMigrationCanonId,
  computeVisualMigrationCanonFingerprint,
} from '@masterpiece/runtime-core/application/visual-migration-canon-contract.ts';
import {
  canonicalSerializeVisualMigrationValue,
  computeVisualMigrationManifestFingerprint,
  sha256Fingerprint,
} from '@masterpiece/runtime-core/application/visual-migration-reference-pack-contract.ts';

async function fixture() {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'masterpiece-vm2-canon-'));
  const projectRoot = path.join(root, 'project');
  await fs.mkdir(projectRoot, { recursive: true });
  const project = {
    id: 'project-1', projectName: '当前品牌', brandName: '当前品牌', industry: '零售',
    logoLocked: true, lockedFacts: ['Logo 必须原样保留'], assets: [],
  };
  const capsule: ReferenceStyleCapsule = {
    schemaVersion: '1.0', sourceRunId: 'run-1', currentProjectId: 'project-1', generatedAt: '2026-09-02T00:00:00.000Z',
    currentProject: {
      brandName: '当前品牌', industry: '零售', logoLocked: true, logoAssetIds: [],
      lockedFacts: ['Logo 必须原样保留'], coreProducts: [], businessTouchpoints: ['包装'],
    },
    projectFacts: {
      coreProducts: [], services: [],
      touchpoints: { packaging: ['包装'], viApplications: [], serviceMaterials: [], spatial: [], digital: [] },
      designAdvice: [], uncertainties: [],
    },
    inheritedStyle: {
      color: ['低饱和暖色'], layoutAndTypography: ['大留白'], graphicLanguage: ['克制线条'],
      materialAndPhotography: ['真实纸张'], extensionMechanism: ['单一焦点'],
    },
    userPreference: null, userAvoidance: ['不要拼贴'],
    prohibitedReferenceIdentity: {
      brandNames: ['参考品牌'], logos: ['参考 Logo'], slogans: [], signatureGraphics: [], proprietaryPatterns: [],
    },
    anchorGoal: '迁移视觉机制', aspectRatio: '1:1', humanNotes: [], uncertainties: [],
  };
  const creativeDecision = {
    schemaVersion: '6.0', id: 'creative-decision-quick-run-1', projectId: 'project-1', version: '1.0.0',
    brandCoreJudgment: ['Logo 必须原样保留'], currentVisualProblems: [], retainedAssets: ['Logo 必须原样保留'],
    reconstructableAssets: ['低饱和暖色'], inheritedReferenceMechanisms: ['低饱和暖色'], prohibitedReferenceContent: ['参考 Logo'],
    visualUpgradeThesis: '迁移视觉机制',
    primaryDirection: { name: 'Quick', summary: '迁移视觉机制', keywords: ['低饱和暖色'], mood: [] },
    styleBoundaries: { allowed: ['低饱和暖色'], forbidden: ['参考 Logo'] },
    outputPriorities: ['包装'], risks: [], createdAt: '2026-09-02T00:00:00.000Z',
  };
  const styleProfile = compileStyleProfile({
    creativeDecision, version: '1.0.0', id: 'style-1',
    overrides: {
      colorSystem: { primary: ['低饱和暖色'] },
      graphicLanguage: { coreMotifs: ['克制线条'] },
    },
  }, '2026-09-02T00:00:00.000Z');
  const lockedAssets = compileLockedAssets({
    projectId: 'project-1',
    visualContext: {
      projectId: 'project-1', identity: { brandName: '当前品牌' },
      lockedAssets: { logoLocked: false, logoAssetIds: [], lockedFacts: ['Logo 必须原样保留'] },
      products: { coreProducts: [] }, packaging: { status: 'unknown', structures: [] },
    },
  }, '2026-09-02T00:00:00.000Z');
  const capsuleFingerprint = sha256Fingerprint(canonicalSerializeVisualMigrationValue(capsule));
  const withoutFingerprint: Omit<VisualMigrationReferencePackV1, 'manifestFingerprint'> = {
    schemaVersion: 'visual-migration-reference-pack/v1', referencePackId: `vmrp-${'a'.repeat(32)}`,
    projectId: 'project-1', sourceReferenceAnchorRunId: 'run-1', createdAt: '2026-09-02T00:00:00.000Z',
    sourceFingerprint: `sha256:${'b'.repeat(64)}`,
    references: [{
      referenceId: 'reference-01',
      storagePath: `visual-migration/reference-packs/vmrp-${'a'.repeat(32)}/assets/reference-01.png`,
      originalFileName: 'reference.png', mimeType: 'image/png', byteSize: 8, sha256: 'c'.repeat(64), role: 'style_reference',
    }],
    semanticEvidence: {
      capsuleFingerprint, briefFingerprint: `sha256:${'d'.repeat(64)}`,
      creativeDecisionId: 'creative-decision-quick-run-1', styleProfileId: 'style-1',
    },
  };
  const manifest = { ...withoutFingerprint, manifestFingerprint: computeVisualMigrationManifestFingerprint(withoutFingerprint) };
  let packAvailable = true;
  const projects = { paths: async () => ({ root: projectRoot }), get: async () => project };
  const packs = {
    resolve: async () => {
      if (!packAvailable) throw new Error('reference pack missing');
      return { manifest, references: [{ ...manifest.references[0], absolutePath: path.join(projectRoot, 'reference.png') }] };
    },
  };
  const service = createVisualMigrationCanonService(projects as never, packs as never);
  const input = {
    projectId: 'project-1', referenceAnchorRunId: 'run-1', referencePackId: manifest.referencePackId,
    capsule, styleProfile, lockedAssets,
  };
  return { root, projectRoot, project, capsule, styleProfile, lockedAssets, manifest, projects, packs, service, input, setPackAvailable: (value: boolean) => { packAvailable = value; } };
}

test('VM-2 persistence creates canon.json and active.json on first build', async (t) => {
  const f = await fixture(); t.after(() => fs.rm(f.root, { recursive: true, force: true }));
  const result = await f.service.createOrGet(f.input);
  assert.equal(result.created, true);
  const canonPath = path.join(f.projectRoot, 'visual-migration', 'canons', result.canon.canonId, 'canon.json');
  const pointer = JSON.parse(await fs.readFile(path.join(f.projectRoot, 'visual-migration', 'canons', 'active.json'), 'utf8'));
  assert.equal(JSON.parse(await fs.readFile(canonPath, 'utf8')).canonId, result.canon.canonId);
  assert.equal(pointer.canonId, result.canon.canonId);
});

test('VM-2 persistence reuses the same Canon for identical inputs', async (t) => {
  const f = await fixture(); t.after(() => fs.rm(f.root, { recursive: true, force: true }));
  const first = await f.service.createOrGet(f.input);
  const canonPath = path.join(f.projectRoot, 'visual-migration', 'canons', first.canon.canonId, 'canon.json');
  const pointerPath = path.join(f.projectRoot, 'visual-migration', 'canons', 'active.json');
  const canonBefore = await fs.readFile(canonPath);
  const pointerBefore = await fs.readFile(pointerPath);
  const canonMtimeBefore = (await fs.stat(canonPath)).mtimeMs;
  const pointerMtimeBefore = (await fs.stat(pointerPath)).mtimeMs;
  const second = await f.service.createOrGet(f.input);
  assert.equal(first.created, true);
  assert.equal(second.created, false);
  assert.equal(second.canon.canonId, first.canon.canonId);
  assert.deepEqual(await fs.readFile(canonPath), canonBefore);
  assert.deepEqual(await fs.readFile(pointerPath), pointerBefore);
  assert.equal((await fs.stat(canonPath)).mtimeMs, canonMtimeBefore);
  assert.equal((await fs.stat(pointerPath)).mtimeMs, pointerMtimeBefore);
  const directories = await fs.readdir(path.join(f.projectRoot, 'visual-migration', 'canons'), { withFileTypes: true });
  assert.equal(directories.filter((entry) => entry.isDirectory()).length, 1);
});

test('VM-2 persistence resolves Canon and visual evidence after runtime restart', async (t) => {
  const f = await fixture(); t.after(() => fs.rm(f.root, { recursive: true, force: true }));
  const first = await f.service.createOrGet(f.input);
  const restarted = createVisualMigrationCanonService(f.projects as never, f.packs as never);
  const resolved = await restarted.resolve('project-1', first.canon.canonId);
  const active = await restarted.getActive('project-1');
  assert.equal(resolved.referencePack.referencePackId, f.manifest.referencePackId);
  assert.equal(resolved.references.length, 1);
  assert.equal(active?.canon.canonId, first.canon.canonId);
  assert.equal(active?.referencePack.referencePackId, f.manifest.referencePackId);
});

test('VM-2 persistence detects canon.json tampering', async (t) => {
  const f = await fixture(); t.after(() => fs.rm(f.root, { recursive: true, force: true }));
  const first = await f.service.createOrGet(f.input);
  const filename = path.join(f.projectRoot, 'visual-migration', 'canons', first.canon.canonId, 'canon.json');
  const raw = JSON.parse(await fs.readFile(filename, 'utf8'));
  raw.transferSystem.goal = 'tampered';
  await fs.writeFile(filename, JSON.stringify(raw));
  await assert.rejects(() => f.service.resolve('project-1', first.canon.canonId), { code: 'VISUAL_MIGRATION_CANON_FINGERPRINT_MISMATCH' });
});

test('VM-2 persistence rejects an active pointer project mismatch', async (t) => {
  const f = await fixture(); t.after(() => fs.rm(f.root, { recursive: true, force: true }));
  await f.service.createOrGet(f.input);
  const filename = path.join(f.projectRoot, 'visual-migration', 'canons', 'active.json');
  const pointer = JSON.parse(await fs.readFile(filename, 'utf8'));
  pointer.projectId = 'other-project';
  await fs.writeFile(filename, JSON.stringify(pointer));
  await assert.rejects(() => f.service.getActive('project-1'), { code: 'VISUAL_MIGRATION_CANON_INTEGRITY_FAILED' });
});

test('VM-2.1 persistence creates a new Canon while preserving the old Canon byte-for-byte', async (t) => {
  const f = await fixture(); t.after(() => fs.rm(f.root, { recursive: true, force: true }));
  const first = await f.service.createOrGet(f.input);
  const oldPath = path.join(f.projectRoot, 'visual-migration', 'canons', first.canon.canonId, 'canon.json');
  const oldBytes = await fs.readFile(oldPath);
  const changedProfile = structuredClone(f.styleProfile);
  changedProfile.colorSystem.secondary = ['柔和中性色'];
  const second = await f.service.createOrGet({ ...f.input, styleProfile: changedProfile });
  assert.notEqual(second.canon.canonId, first.canon.canonId);
  const old = await f.service.resolve('project-1', first.canon.canonId);
  const current = await f.service.resolve('project-1', second.canon.canonId);
  assert.equal(old.canon.status, 'valid');
  assert.equal(current.canon.status, 'valid');
  assert.deepEqual(await fs.readFile(oldPath), oldBytes);
  assert.equal((await f.service.getActive('project-1'))?.canon.canonId, second.canon.canonId);
});

test('VM-2.1 pointer write failure preserves the prior pointer and prior Canon', async (t) => {
  const f = await fixture(); t.after(() => fs.rm(f.root, { recursive: true, force: true }));
  const first = await f.service.createOrGet(f.input);
  const canonPath = path.join(f.projectRoot, 'visual-migration', 'canons', first.canon.canonId, 'canon.json');
  const pointerPath = path.join(f.projectRoot, 'visual-migration', 'canons', 'active.json');
  const canonBefore = await fs.readFile(canonPath);
  const pointerBefore = await fs.readFile(pointerPath);
  const failing = createVisualMigrationCanonService(f.projects as never, f.packs as never, {
    writeJson: async (filename: string, value: unknown) => {
      if (path.basename(filename) === 'active.json') {
        throw Object.assign(new Error('pointer write failed'), { code: 'TEST_POINTER_WRITE_FAILED' });
      }
      await fs.mkdir(path.dirname(filename), { recursive: true });
      await fs.writeFile(filename, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
    },
  });
  const changedProfile = structuredClone(f.styleProfile);
  changedProfile.colorSystem.secondary = ['柔和中性色'];
  await assert.rejects(
    () => failing.createOrGet({ ...f.input, styleProfile: changedProfile }),
    { code: 'TEST_POINTER_WRITE_FAILED' },
  );
  assert.deepEqual(await fs.readFile(canonPath), canonBefore);
  assert.deepEqual(await fs.readFile(pointerPath), pointerBefore);
  assert.equal((await f.service.getActive('project-1'))?.canon.canonId, first.canon.canonId);
});

test('VM-2.1 resolves a legacy Canon without compiler identity alongside the current compiler Canon', async (t) => {
  const f = await fixture(); t.after(() => fs.rm(f.root, { recursive: true, force: true }));
  const current = await f.service.createOrGet(f.input);
  const legacy = structuredClone(current.canon);
  Reflect.deleteProperty(legacy.source as unknown as Record<string, unknown>, 'compilerVersion');
  Reflect.deleteProperty(legacy.trace as unknown as Record<string, unknown>, 'compilerVersion');
  legacy.sourceFingerprint = sha256Fingerprint(canonicalSerializeVisualMigrationValue({
    projectId: legacy.projectId,
    projectIdentityFingerprint: legacy.source.projectIdentityFingerprint,
    lockedAssetFingerprint: legacy.source.lockedAssetFingerprint,
    referencePackSourceFingerprint: legacy.source.referencePackSourceFingerprint,
    referencePackManifestFingerprint: legacy.source.referencePackManifestFingerprint,
    capsuleFingerprint: legacy.source.capsuleFingerprint,
    briefFingerprint: legacy.source.briefFingerprint,
    styleProfileFingerprint: legacy.source.styleProfileFingerprint,
    creativeDecisionId: legacy.source.creativeDecisionId,
  }));
  legacy.trace.sourceFingerprint = legacy.sourceFingerprint;
  legacy.canonId = buildVisualMigrationCanonId(legacy.projectId, legacy.sourceFingerprint);
  legacy.canonFingerprint = computeVisualMigrationCanonFingerprint(legacy);
  const legacyPath = path.join(f.projectRoot, 'visual-migration', 'canons', legacy.canonId, 'canon.json');
  await fs.mkdir(path.dirname(legacyPath), { recursive: true });
  await fs.writeFile(legacyPath, `${JSON.stringify(legacy, null, 2)}\n`, 'utf8');
  assert.notEqual(legacy.canonId, current.canon.canonId);
  assert.equal((await f.service.resolve('project-1', legacy.canonId)).canon.canonId, legacy.canonId);
  assert.equal((await f.service.resolve('project-1', current.canon.canonId)).canon.canonId, current.canon.canonId);
});

test('VM-2 persistence fails explicitly when Reference Pack evidence is missing', async (t) => {
  const f = await fixture(); t.after(() => fs.rm(f.root, { recursive: true, force: true }));
  const first = await f.service.createOrGet(f.input);
  f.setPackAvailable(false);
  await assert.rejects(() => f.service.resolve('project-1', first.canon.canonId), { code: 'VISUAL_MIGRATION_CANON_REFERENCE_PACK_INVALID' });
  await assert.rejects(() => f.service.createOrGet(f.input), { code: 'VISUAL_MIGRATION_CANON_REFERENCE_PACK_INVALID' });
});
