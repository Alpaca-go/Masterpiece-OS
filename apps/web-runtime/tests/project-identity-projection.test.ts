import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { PACKAGING_WORKSPACE_STATUS } from '@masterpiece/runtime-core/application/packaging/index.js';
import { createRuntimeServices } from '@masterpiece/runtime-core/application/runtime-services.ts';
import {
  buildProjectVisualContext,
  writeProjectVisualContext,
} from '@masterpiece/runtime-core/application/project-visual-context-builder.ts';
import {
  createCurrentBusinessOperations,
  projectCanonicalIdentityFromAuthorities,
} from '../src/current-operation-graph.ts';

const PROFILE_ID = 'profile-p3-c4-1';
const MODEL_ID = 'seedream-5.0-pro';
const BRAND = 'Canonical Identity Brand';
const INDUSTRY = 'botanical skincare';
const BRAND_ROLE = 'evidence-backed botanical care specialist';
const PRODUCT = 'Canonical Serum 30ml';
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M/wHwAE/wJ/lP5qVQAAAABJRU5ErkJggg==',
  'base64',
);

function translation(concept: string) {
  return {
    status: 'ready' as const,
    packagingConcept: concept,
    productAndCategoryRole: ['botanical serum'],
    structureStrategy: [{
      structure: 'cylindrical glass bottle with dropper',
      purpose: 'contain serum',
      locked: true,
      evidenceRefs: ['canonical-fixture'],
    }],
    openingExperience: ['unscrew cap and dispense with dropper'],
    productArrangement: ['single centered bottle'],
    graphicTranslation: [],
    informationHierarchy: ['brand', 'product', '30ml'],
    substrateLanguage: ['frosted glass'],
    craftLanguage: [{ craft: 'screen print', purpose: 'clear hierarchy', forbiddenUse: [] }],
    colorBehavior: { base: ['warm white'], identity: ['forest green'], accent: [], forbidden: [] },
    logoPolicy: ['reserve clear area'],
    seriesArchitecture: [],
    photographyDirection: ['soft studio light'],
    packagingMisreadRisks: [],
    missingRequiredFields: [],
  };
}

test('P3-C4.1 production composition root identity fixture', async (t) => {
  const dataPath = await fs.mkdtemp(path.join(os.tmpdir(), 'masterpiece-p3-c4-1-'));
  const sourcePath = path.join(dataPath, 'canonical-source.png');
  await fs.writeFile(sourcePath, PNG);
  t.after(() => fs.rm(dataPath, { recursive: true, force: true }));

  const settings = {
    defaultDataPath: dataPath,
    profiles: [{
      id: PROFILE_ID,
      displayName: 'P3-C4.1 Local',
      provider: 'volcengine',
      protocol: 'seedream-image',
      modelType: 'image_generation',
      registryModelId: MODEL_ID,
      modelId: MODEL_ID,
      isDefault: true,
      isEnabled: true,
      hasApiKey: true,
    }],
  } as any;
  const services = createRuntimeServices({
    dataPath,
    readSettings: async () => settings,
    readCredentials: async () => ({
      provider: 'volcengine', protocol: 'seedream-image', model: MODEL_ID,
      apiKey: 'SANCTIONED_LOCAL_TEST_ONLY', baseUrl: 'http://127.0.0.1:1', region: '',
    } as any),
    analysisRuntime: { resolvePromptRoot: () => path.resolve('apps/cli/prompts') },
  });

  const created = await services.projects.create({ sourcePaths: [sourcePath], apiProfileId: PROFILE_ID });
  const project = await services.projects.update(created.id, {
    projectName: 'Canonical Identity Project',
    brandName: BRAND,
    industry: INDUSTRY,
    status: 'ready',
  });
  const paths = await services.projects.paths(project.id);
  const context = buildProjectVisualContext({
    project,
    generatedAt: '2026-08-15T00:00:00.000Z',
    structuredAnalysisRunId: 'canonical-analysis-run',
    structuredAnalysis: { brandCore: { brandRole: BRAND_ROLE } },
  });
  const contextPath = path.join(paths.root, 'project-context', 'project-visual-context.vnext.json');
  await writeProjectVisualContext(contextPath, context);
  await services.projects.update(project.id, {
    visualContextVNextFilename: 'project-visual-context.vnext.json',
    visualContextVNextStatus: 'ready',
    visualContextVNextVersion: context.version,
    visualContextVNextLastBuiltAt: context.generatedAt,
  });
  await services.projectContext.upsertPackagingTranslation(project.id, {
    schemaVersion: '1.0', sourceKind: 'analysis_led', projectId: project.id,
    producerRunId: 'canonical-analysis-run', sourceFingerprint: 'canonical-analysis-fingerprint',
    translationContract: 'PackagingTranslationV2', generatedAt: '2026-08-15T00:00:00.000Z',
    translation: translation('Canonical analysis-led packaging direction.'),
  });
  await services.projectContext.upsertPackagingTranslation(project.id, {
    schemaVersion: '1.0', sourceKind: 'reference_first', projectId: project.id,
    producerRunId: 'canonical-reference-run', sourceFingerprint: 'canonical-reference-fingerprint',
    translationContract: 'PackagingTranslationV2', generatedAt: '2026-08-15T00:00:00.000Z',
    translation: translation('Canonical reference-first packaging direction.'),
  });
  await services.projects.update(project.id, {
    activeReferenceSource: {
      schemaVersion: '1.0', projectId: project.id, runId: 'canonical-reference-run',
      sourceFingerprint: 'canonical-reference-fingerprint', selectedAt: '2026-08-15T00:00:00.000Z',
    },
  });
  await services.lockedAssets.compile(project.id, {
    explicitAssets: [
      { type: 'brand_name', name: BRAND },
      { type: 'logo', name: `${BRAND} Logo` },
      { type: 'product_category', name: INDUSTRY },
      { type: 'packaging_structure', name: 'cylindrical glass bottle with dropper' },
      { type: 'packaging_artwork', name: PRODUCT },
      { type: 'required_visual_element', name: '30ml' },
    ],
  });

  const canonicalContext = await services.projectContext.getShortChain(project.id);
  const canonicalProject = await services.projects.get(project.id);
  const identity = projectCanonicalIdentityFromAuthorities({
    projectId: project.id,
    project: canonicalProject,
    projectVisualContext: canonicalContext,
    productIdentityName: PRODUCT,
  });
  await t.test('AP-01..07 canonical owners project the complete mode-invariant identity', () => {
    assert.deepEqual(identity, {
      projectId: project.id,
      projectName: 'Canonical Identity Project',
      brandName: BRAND,
      industry: INDUSTRY,
      brandRole: BRAND_ROLE,
      productIdentity: PRODUCT,
    });
  });

  const operations = createCurrentBusinessOperations(services, {
    settings: {
      get: () => settings,
      save: () => settings,
      saveProfile: () => settings,
      deleteProfile: () => settings,
      setDefaultProfile: () => settings,
      setProfileEnabled: () => settings,
      testProfile: () => ({ ok: true }),
    },
    readCredentials: async () => ({
      provider: 'volcengine', protocol: 'seedream-image', model: MODEL_ID,
      apiKey: 'SANCTIONED_LOCAL_TEST_ONLY', baseUrl: 'http://127.0.0.1:1', region: '',
    } as any),
    dataPath,
    searchCredential: {
      has: async () => false,
      read: async () => '',
      write: async () => undefined,
      remove: async () => undefined,
    },
  });

  async function prepare(mode: 'analysis_led' | 'reference_first') {
    const session = await operations['packaging:create-session'](
      { host: 'node-web' }, { projectId: project.id },
    );
    await operations['packaging:update-intent']({ host: 'node-web' }, {
      sessionId: session.sessionId,
      patch: {
        apiProfileId: PROFILE_ID,
        providerModelId: MODEL_ID,
        generationMode: mode,
        shotContractId: 'PKG-HERO-SINGLE',
        referenceAssignments: mode === 'reference_first' ? [{
          assetId: canonicalProject.assets[0]!.id,
          role: 'product_identity_reference',
          source: 'user',
        }] : [],
      },
    });
    return operations['packaging:prepare-generation']({ host: 'node-web' }, session.sessionId);
  }

  await t.test('AP-11 production composition root analysis-led reaches READY', async () => {
    assert.equal((await prepare('analysis_led')).view.status, PACKAGING_WORKSPACE_STATUS.READY);
  });
  await t.test('AP-12 production composition root reference-first reaches READY', async () => {
    assert.equal((await prepare('reference_first')).view.status, PACKAGING_WORKSPACE_STATUS.READY);
  });

  await t.test('AP-13 missing canonical identity fails closed without filler', async () => {
    await services.projects.update(project.id, { brandName: '' });
    await assert.rejects(() => prepare('analysis_led'), /project_identity_brand_name_missing/u);
    await services.projects.update(project.id, { brandName: BRAND, industry: '' });
    await assert.rejects(() => prepare('analysis_led'), /project_identity_industry_missing/u);
    await services.projects.update(project.id, { industry: INDUSTRY });

    const roleMissing = await services.projectContext.getShortChain(project.id);
    roleMissing.promptSourceObject!.projectFacts.brandRole = '';
    await writeProjectVisualContext(contextPath, roleMissing);
    await assert.rejects(() => prepare('analysis_led'), /project_identity_brand_role_missing/u);
    roleMissing.promptSourceObject!.projectFacts.brandRole = BRAND_ROLE;
    await writeProjectVisualContext(contextPath, roleMissing);
  });

  await t.test('AP-14 project mismatch fails closed at canonical selector authority', async () => {
    await services.projects.update(project.id, {
      activeReferenceSource: {
        schemaVersion: '1.0', projectId: '00000000-0000-0000-0000-000000000000',
        runId: 'canonical-reference-run', sourceFingerprint: 'canonical-reference-fingerprint',
        selectedAt: '2026-08-15T00:00:00.000Z',
      },
    });
    await assert.rejects(
      () => prepare('reference_first'),
      /PACKAGING_CONTEXT_PROJECT_MISMATCH|active Reference source belongs to another project/u,
    );
  });
});
