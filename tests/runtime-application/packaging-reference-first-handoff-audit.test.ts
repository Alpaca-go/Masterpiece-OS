// P3-C1.1 — Reference-first Packaging handoff audit guards.
//
// The audit found that the current Reference Anchor producer does not yet
// emit a PackagingTranslationV2, persist a semantic source fingerprint, or
// own a project-level active-run selection. These guards preserve that honest
// HOLD boundary and prevent downstream Packaging from filling the gap.

import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { createPackagingWorkspaceService } from '@masterpiece/runtime-core';
import { getPackagingShotContract } from '@masterpiece/image-generation-runtime/packaging/contracts.js';
import {
  validateReferenceStyleCapsule,
} from '@masterpiece/runtime-core/application/reference-anchor-core.ts';
import {
  createQuickStyleExtractionService,
} from '@masterpiece/runtime-core/application/quick-style-extraction-service.ts';

const ROOT = path.resolve(import.meta.dirname, '..', '..');
const P2_CURRENT = 'a593278b55e437fac59d768c5cee734d9a9fc201';
const P3A_CURRENT = 'f95c145b9b1e37430ac68315c9e039f1f3262ae4';
const P3B_ACCEPTED = '2ac4cf1cc18156d1e4a508382b4563298d69c014';
const REFERENCE_CORE = path.join(ROOT, 'packages', 'runtime-core', 'src', 'application', 'reference-anchor-core.ts');
const REFERENCE_SERVICE = path.join(ROOT, 'packages', 'runtime-core', 'src', 'application', 'reference-anchor-service.ts');
const REFERENCE_PROMPT = path.join(ROOT, 'packages', 'runtime-core', 'src', 'application', 'reference-reconstruction-prompts.ts');
const PROJECT_CONTRACTS = path.join(ROOT, 'packages', 'project-contracts', 'src', 'index.ts');
const CURRENT_GRAPH = path.join(ROOT, 'apps', 'web-runtime', 'src', 'current-operation-graph.ts');
const WORKSPACE = path.join(ROOT, 'packages', 'runtime-core', 'src', 'application', 'packaging', 'workspace-service.js');

function read(file: string): string {
  return readFileSync(file, 'utf8');
}

function git(args: string[]): string {
  return execFileSync('git', args, { cwd: ROOT, encoding: 'utf8' }).trim();
}

function walk(root: string): string[] {
  const result: string[] = [];
  const visit = (directory: string) => {
    if (!existsSync(directory)) return;
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const target = path.join(directory, entry.name);
      if (entry.isDirectory()) visit(target);
      else result.push(target);
    }
  };
  visit(root);
  return result;
}

function capsule(projectId = 'project-a', runId = 'run-a') {
  return {
    schemaVersion: '1.0',
    sourceRunId: runId,
    currentProjectId: projectId,
    generatedAt: '2026-08-14T12:00:00.000Z',
    currentProject: {
      brandName: 'Audit Brand',
      industry: 'Audit Industry',
      logoLocked: true,
      logoAssetIds: ['logo-01'],
      lockedFacts: ['brand identity is locked'],
      coreProducts: ['Audit Product'],
      businessTouchpoints: ['packaging'],
    },
    projectFacts: {
      coreProducts: ['Audit Product'],
      services: [],
      touchpoints: {
        packaging: ['rigid carton'],
        viApplications: [],
        serviceMaterials: [],
        spatial: [],
        digital: [],
      },
      designAdvice: [],
      uncertainties: [],
    },
    inheritedStyle: {
      color: ['restrained warm/cool contrast'],
      layoutAndTypography: ['asymmetric information hierarchy'],
      graphicLanguage: ['layered modular graphic rhythm'],
      materialAndPhotography: ['tactile paper with controlled light'],
      extensionMechanism: ['repeat hierarchy across touchpoints'],
    },
    userPreference: null,
    userAvoidance: [],
    prohibitedReferenceIdentity: {
      brandNames: [],
      logos: [],
      slogans: [],
      signatureGraphics: [],
      proprietaryPatterns: [],
    },
    anchorGoal: 'Create an approved generic reference-led anchor direction.',
    aspectRatio: '16:9',
    humanNotes: [],
    uncertainties: [],
  } as const;
}

function truthSnapshot() {
  return {
    lockedAssets: {
      brand: { name: 'Audit Brand', locked: true },
      logo: { present: true, usageMode: 'reserved', locked: true },
      productIdentity: { name: 'Audit Product', locked: true },
      category: { name: 'Audit Category', locked: true },
      structure: { formFactor: 'rigid carton', locked: true },
      mandatoryCopy: { items: [], locked: true },
      confirmedComponents: { items: ['carton'], locked: true },
    },
    projectIdentity: { projectId: 'project-a', projectName: 'Audit Project' },
    analysisContext: {},
    projectVisualContext: {
      packageStructures: ['rigid carton'],
      packagingConcept: 'Existing analysis-led Packaging concept.',
    },
  };
}

test('AI-01 ReferenceStyleCapsule anchorGoal is not a packagingConcept alias', () => {
  assert.equal(validateReferenceStyleCapsule(capsule()).valid, true);
  const contracts = read(PROJECT_CONTRACTS);
  const capsuleBlock = contracts.slice(
    contracts.indexOf('export interface ReferenceStyleCapsule'),
    contracts.indexOf('export interface ContextConflict'),
  );
  assert.match(capsuleBlock, /anchorGoal/u);
  assert.doesNotMatch(capsuleBlock, /packagingConcept/u);
  assert.doesNotMatch(read(REFERENCE_CORE), /packagingConcept\s*:/u);
});

test('AI-02 Reference image or capsule ratio cannot override P2 output geometry', () => {
  assert.equal(capsule().aspectRatio, '16:9');
  assert.equal(getPackagingShotContract('PKG-HERO-SINGLE').aspectRatio, '4:5');
  assert.doesNotMatch(read(CURRENT_GRAPH), /referenceStyleCapsule[\s\S]{0,200}aspectRatio/iu);
});

test('AI-03 Reference producer owns Packaging semantics independently of analysis-led output', () => {
  const service = read(REFERENCE_SERVICE);
  assert.match(service, /projectContext\.get\(projectId\)/u);
  assert.match(service, /pipeline\.analyzeReferenceStyle/u);
  assert.match(service, /createReferencePackagingSource/u);
  assert.match(read(REFERENCE_PROMPT), /"packagingTranslation"/u);
  assert.match(read(REFERENCE_PROMPT), /"packagingConcept"/u);
  assert.doesNotMatch(service, /visualDecisionPacket\.mediaTranslations\.packaging/u);
});

test('AI-04 cross-project Reference output is rejected before creative consumption', async () => {
  const service = createQuickStyleExtractionService(
    {
      getRun: async () => ({ projectId: 'project-a', decision: 'approved' }),
      getCapsule: async () => capsule('project-b', 'run-a'),
    } as any,
    {} as any,
    {} as any,
    { getActive: async () => null } as any,
  );
  await assert.rejects(
    () => service.extract('project-a', 'run-a'),
    (error: any) => error?.code === 'QUICK_EXTRACTION_SOURCE_INVALID',
  );
});

test('AI-05 Reference capsule requires an explicit producer run identity', () => {
  const invalid = { ...capsule(), sourceRunId: '' };
  const validation = validateReferenceStyleCapsule(invalid);
  assert.equal(validation.valid, false);
  assert.ok(validation.errors.some((item) => item.includes('sourceRunId')));
});

test('AI-06 reliable semantic source fingerprint is producer-owned', () => {
  const contracts = read(PROJECT_CONTRACTS);
  assert.match(contracts, /export interface PackagingTranslationSource[\s\S]*sourceFingerprint/u);
  assert.match(read(REFERENCE_SERVICE), /computeReferencePackagingSourceFingerprint/u);
  assert.doesNotMatch(read(REFERENCE_SERVICE), /sourceFingerprint\s*:\s*(?:runId|record\.id|new Date|Date\.now)/u);
});

test('AI-07 no Packaging Context, Reference Packaging, or binding store is introduced', () => {
  const production = [
    ...walk(path.join(ROOT, 'packages')),
    ...walk(path.join(ROOT, 'apps', 'web-runtime', 'src')),
  ].filter((file) => /\.(?:js|ts|json)$/u.test(file));
  for (const file of production) {
    assert.doesNotMatch(
      path.basename(file),
      /packaging-(?:reference-)?(?:context|translation)-(?:store|database)|reference-bindings/iu,
    );
  }
});

test('AI-08 Reference producer does not create a second Locked Asset authority', () => {
  const source = `${read(REFERENCE_CORE)}\n${read(REFERENCE_SERVICE)}`;
  assert.doesNotMatch(source, /createLockedAssetsService|compileLockedAssets/u);
});

test('AI-09 Reference producer does not create a second Shot Contract authority', () => {
  const source = `${read(REFERENCE_CORE)}\n${read(REFERENCE_SERVICE)}`;
  assert.doesNotMatch(source, /PKG-HERO-SINGLE|PACKAGING_SHOT_CONTRACT|providerHints/u);
});

test('AI-10 downstream Packaging does not interpret ReferenceStyleCapsule into semantics', () => {
  const downstream = `${read(CURRENT_GRAPH)}\n${read(WORKSPACE)}`;
  assert.doesNotMatch(downstream, /ReferenceStyleCapsule|reference-style-capsule|anchorGoal/u);
});

test('AI-11 Packaging entry contains no Reference translation model call', () => {
  const downstream = `${read(CURRENT_GRAPH)}\n${read(WORKSPACE)}`;
  assert.doesNotMatch(downstream, /analyzeReferenceStyle|generateVisualReconstructionDecision|chat\.completions|responses\.create/iu);
});

test('AI-12 Packaging resolver never selects a Reference run by latest timestamp', () => {
  const graph = read(CURRENT_GRAPH);
  assert.doesNotMatch(graph, /referenceAnchor\.listRuns|reference-runs|sort\([^)]*(?:updatedAt|createdAt)/iu);
});

test('AI-13 selected reference_first mode does not silently fall back to analysis_led', () => {
  const service = createPackagingWorkspaceService();
  const session = service.createSession({
    projectId: 'project-a',
    truthSnapshot: truthSnapshot(),
    initialIntent: {
      schemaVersion: '1.0',
      generationMode: 'reference_first',
      shotContractId: 'PKG-HERO-SINGLE',
      explicitUserConstraints: { text: '' },
      referenceAssignments: [],
      providerModelId: 'seedream-5.0-pro',
      apiProfileId: 'profile-audit',
    },
  });
  assert.throws(() => service.prepareGeneration(session.sessionId));
  assert.equal(service.getView(session.sessionId).intent?.generationMode, 'reference_first');
});

test('AI-14 current P2 frozen Packaging production diff is zero', () => {
  assert.equal(git([
    'diff', '--name-only', P2_CURRENT, 'HEAD', '--',
    'packages/image-generation-runtime/src/packaging',
  ]), '');
});

test('AI-15 current P3-A frozen Workspace production diff is zero', () => {
  assert.equal(git([
    'diff', '--name-only', P3A_CURRENT, 'HEAD', '--',
    'packages/runtime-core/src/application/packaging',
  ]), '');
});

test('AI-16 P3-B accepted production semantics are unchanged by C1.1', () => {
  assert.equal(git([
    'diff', '--name-only', P3B_ACCEPTED, 'HEAD', '--',
    'apps/web/src/features/packaging',
    'apps/web-runtime/src/current-operation-graph.ts',
    'packages/runtime-core/src/operations/packaging-operations.js',
    'packages/runtime-core/src/application/packaging',
  ]), '');
});
