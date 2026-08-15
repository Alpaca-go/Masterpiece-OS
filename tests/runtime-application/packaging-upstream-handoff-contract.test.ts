// P3-C1 — Upstream Context Handoff architecture guards.
//
// C1 is audit/contract only. These guards combine behavioural evidence from
// the real Workspace and Project Visual Context validators with bounded
// source/diff checks for authorities that must remain outside P3-C.

import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { createPackagingWorkspaceService } from '@masterpiece/runtime-core';
import {
  getPackagingShotContract,
} from '@masterpiece/image-generation-runtime/packaging/contracts.js';
import {
  PACKAGING_REFERENCE_ROLES,
} from '@masterpiece/image-generation-runtime/packaging/reference-policy.js';
import {
  validateProjectVisualContext,
} from '@masterpiece/runtime-core/application/project-visual-context-builder.ts';

const ROOT = path.resolve(import.meta.dirname, '..', '..');
const P2_CURRENT_PRODUCTION = 'a593278b55e437fac59d768c5cee734d9a9fc201';
const P3A_CURRENT_PRODUCTION = 'f95c145b9b1e37430ac68315c9e039f1f3262ae4';
const P3B_ACCEPTED = '2ac4cf1cc18156d1e4a508382b4563298d69c014';
const WEB_SOURCE = path.join(ROOT, 'apps', 'web', 'src');
const CURRENT_GRAPH = path.join(ROOT, 'apps', 'web-runtime', 'src', 'current-operation-graph.ts');
const WORKSPACE_SOURCE = path.join(
  ROOT,
  'packages',
  'runtime-core',
  'src',
  'application',
  'packaging',
  'workspace-service.js',
);
const P2_COMPILER = path.join(
  ROOT,
  'packages',
  'image-generation-runtime',
  'src',
  'packaging',
  'compiler.js',
);

function git(args: string[]): string {
  return execFileSync('git', args, { cwd: ROOT, encoding: 'utf8' }).trim();
}

function sourceFiles(root: string): string[] {
  const result: string[] = [];
  const visit = (directory: string) => {
    if (!existsSync(directory)) return;
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const absolute = path.join(directory, entry.name);
      if (entry.isDirectory()) visit(absolute);
      else if (/\.(?:js|ts)x?$/u.test(entry.name)) result.push(absolute);
    }
  };
  visit(root);
  return result;
}

function truthSnapshot() {
  return {
    lockedAssets: {
      brand: { name: 'Audit Brand', locked: true },
      logo: { present: true, usageMode: 'reserved', locked: true },
      productIdentity: { name: 'Audit Product', locked: true },
      category: { name: 'Audit Category', locked: true },
      structure: { formFactor: 'rigid carton', locked: true },
      mandatoryCopy: { items: ['30 ml'], locked: true },
      confirmedComponents: { items: ['carton', 'insert'], locked: true },
    },
    analysisContext: {
      detectedIndustry: 'Audit Industry',
      detectedProjectName: 'Audit Project',
      confidence: 1,
    },
    projectIdentity: { projectId: 'project-audit', projectName: 'Audit Project' },
    projectVisualContext: {
      packageStructures: ['folding carton', 'paper insert'],
      packagingConcept: 'A restrained packaging system grounded in verified structure.',
    },
  };
}

function intent(mode: 'analysis_led' | 'reference_first', withReference: boolean) {
  return {
    schemaVersion: '1.0',
    generationMode: mode,
    shotContractId: 'PKG-HERO-SINGLE',
    explicitUserConstraints: { text: '' },
    referenceAssignments: withReference
      ? [{ assetId: 'ref-01', role: 'product_identity_reference', source: 'project_asset' }]
      : [],
    providerModelId: 'seedream-5.0-pro',
    apiProfileId: 'profile-audit',
  };
}

function capturePrepare() {
  const inputs: any[] = [];
  const service = createPackagingWorkspaceService({
    newSessionId: () => `session-${inputs.length + 1}`,
    now: () => '2026-08-14T12:00:00.000Z',
    preparePackagingGeneration: (input: unknown) => {
      inputs.push(input);
      return { status: 'ready', input };
    },
  });
  return { service, inputs };
}

test('AH-C1-01 Web does not deep-import Visual Analysis or Project Visual Context internals', () => {
  for (const file of sourceFiles(WEB_SOURCE)) {
    const source = readFileSync(file, 'utf8');
    assert.doesNotMatch(source, /(?:project-visual-context-builder|visual-decision-packet|unified-visual-understanding)/u);
  }
});

test('AH-C1-02 Locked Assets remain resolved by the canonical runtime service', () => {
  const graph = readFileSync(CURRENT_GRAPH, 'utf8');
  assert.match(graph, /lockedAssets\.list\(safeId\)/u);
  assert.doesNotMatch(readFileSync(WORKSPACE_SOURCE, 'utf8'), /compileLockedAssets|createLockedAssetsService/u);
});

test('AH-C1-03 Shot geometry remains owned by the P2 Shot Contract', () => {
  assert.equal(getPackagingShotContract('PKG-HERO-SINGLE').aspectRatio, '4:5');
  assert.doesNotMatch(readFileSync(CURRENT_GRAPH, 'utf8'), /aspectRatio/u);
});

test('AH-C1-04 Reference roles and missing-reference precedence remain canonical P2 behaviour', () => {
  assert.ok(PACKAGING_REFERENCE_ROLES.includes('product_identity_reference'));
  const service = createPackagingWorkspaceService();
  const session = service.createSession({
    projectId: 'project-audit',
    truthSnapshot: truthSnapshot(),
    initialIntent: intent('reference_first', false),
  });
  assert.throws(
    () => service.prepareGeneration(session.sessionId),
    (error: any) => error?.code === 'REFERENCE_REQUIRED',
  );
});

test('AH-C1-05 the frozen P2 compiler contains no Provider, network, or LLM reasoning call', () => {
  const compiler = readFileSync(P2_COMPILER, 'utf8');
  assert.doesNotMatch(compiler, /\b(?:fetch|axios|openai|anthropic|chat\.completions|responses\.create)\b/iu);
});

test('AH-C1-06 Project Visual Context rejects a cross-project VisualDecisionPacket', () => {
  const validation = validateProjectVisualContext({
    schemaVersion: '2.0',
    projectId: 'project-a',
    version: 1,
    brandCore: { name: 'A' },
    lockedAssets: { mustPreserve: [] },
    sourceAssetRefs: [],
    provenance: { sourceFingerprint: 'fingerprint-a' },
    visualDecisionPacket: { schemaVersion: '1.0', projectId: 'project-b' },
  });
  assert.equal(validation.valid, false);
  assert.ok(validation.errors.some((item) => item.includes('belong to the project')));
});

test('AH-C1-07 analysis_led source mode is explicit and does not synthesize a Reference', () => {
  const { service, inputs } = capturePrepare();
  const session = service.createSession({
    projectId: 'project-audit',
    truthSnapshot: truthSnapshot(),
    initialIntent: intent('analysis_led', false),
  });
  service.prepareGeneration(session.sessionId);
  assert.equal(inputs[0].provenance.sourceMode, 'analysis_led');
  assert.deepEqual(inputs[0].referencePolicy.references, []);
});

test('AH-C1-08 reference_first source mode and explicit Reference are preserved', () => {
  const { service, inputs } = capturePrepare();
  const session = service.createSession({
    projectId: 'project-audit',
    truthSnapshot: truthSnapshot(),
    initialIntent: intent('reference_first', true),
  });
  service.prepareGeneration(session.sessionId);
  assert.equal(inputs[0].provenance.sourceMode, 'reference_first');
  assert.equal(inputs[0].referencePolicy.references[0].assetId, 'ref-01');
});

test('AH-C1-09 modes do not silently fall back into each other', () => {
  const analysis = capturePrepare();
  const analysisSession = analysis.service.createSession({
    projectId: 'project-audit',
    truthSnapshot: truthSnapshot(),
    initialIntent: intent('analysis_led', false),
  });
  analysis.service.prepareGeneration(analysisSession.sessionId);
  assert.equal(analysis.inputs[0].generationMode, 'analysis_led');

  const canonicalReferenceService = createPackagingWorkspaceService();
  const referenceSession = canonicalReferenceService.createSession({
    projectId: 'project-audit',
    truthSnapshot: truthSnapshot(),
    initialIntent: intent('reference_first', false),
  });
  assert.throws(() => canonicalReferenceService.prepareGeneration(referenceSession.sessionId));
  assert.equal(canonicalReferenceService.getView(referenceSession.sessionId).intent.generationMode, 'reference_first');
});

test('AH-C1-10 repository project-specific production-rule guard passes', () => {
  execFileSync(process.execPath, ['scripts/verify-no-project-specific-production-rules.mjs'], {
    cwd: ROOT,
    stdio: 'pipe',
  });
});

test('AH-C1-11 C1 foundation introduces no Packaging context database or store', () => {
  const changed = git(['diff', '--name-only', P3B_ACCEPTED, 'HEAD']);
  assert.doesNotMatch(changed, /packaging-context-(?:store|database)|packaging.*\.(?:db|sqlite)/iu);
});

test('AH-C1-12 current P2 frozen Packaging production diff is zero', () => {
  assert.equal(git([
    'diff', '--name-only', P2_CURRENT_PRODUCTION, 'HEAD', '--',
    'packages/image-generation-runtime/src/packaging',
  ]), '');
});

test('AH-C1-13 current P3-A frozen Workspace production diff is zero', () => {
  assert.equal(git([
    'diff', '--name-only', P3A_CURRENT_PRODUCTION, 'HEAD', '--',
    'packages/runtime-core/src/application/packaging'
  ]), '');
});

test('AH-C1-14 P3-B accepted production surfaces have no C1 semantic modification', () => {
  assert.equal(git([
    'diff', '--name-only', P3B_ACCEPTED, 'HEAD', '--',
    'apps/web/src/features/packaging',
    'packages/runtime-core/src/application/packaging'
  ]), '');
});
