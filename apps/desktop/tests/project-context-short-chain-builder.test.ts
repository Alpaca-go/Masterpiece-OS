import assert from 'node:assert/strict';
import test from 'node:test';
import type { ProjectRecord } from '../src/shared/types.ts';
import {
  buildProjectVisualContextShortChain,
  migrateProjectVisualContextShortChain,
  validateProjectVisualContextShortChain,
} from '../src/main/project-context-short-chain-builder.ts';

function project(): ProjectRecord {
  return {
    id: 'project-1',
    projectName: 'Project One',
    detectedProjectName: 'Project One',
    projectNameSource: 'common-file-prefix',
    projectNameConfidence: 0.9,
    brandName: 'Brand One',
    industry: 'hospitality',
    detectedBrandName: 'Brand One',
    detectedIndustry: 'hospitality',
    factConfidence: { brandName: 0.9, industry: 0.8 },
    description: '',
    logoLocked: true,
    lockedFacts: ['Keep the approved wordmark'],
    outputLanguage: 'zh-CN',
    provider: 'test',
    model: 'test',
    apiProfileId: null,
    analysisProfile: 'fusion-enhanced',
    status: 'completed',
    createdAt: '2026-07-29T00:00:00.000Z',
    updatedAt: '2026-07-29T00:00:00.000Z',
    lastRunAt: null,
    lastDurationMs: null,
    assetCount: 1,
    imageCount: 1,
    lastReportFilename: 'human-report.md',
    lastError: null,
    logoFiles: ['assets/logo.png'],
    briefFiles: [],
    assets: [{
      id: 'asset-logo',
      batchId: 'batch-1',
      sourceType: 'file',
      originalName: 'logo.png',
      relativePath: 'assets/logo.png',
      mimeType: 'image/png',
      sizeBytes: 10,
      sha256: 'abc',
      status: 'ready',
    }],
  };
}

test('Short-Chain context is built from project facts and structured data without report markdown', () => {
  const context = buildProjectVisualContextShortChain({
    project: project(),
    generatedAt: '2026-07-29T00:00:00.000Z',
    structuredAnalysis: {
      visualIdentity: {
        tone: ['calm and precise'],
      },
      styleBoundaries: {
        mustAvoid: ['visual clutter'],
      },
    },
  });
  assert.equal(context.schemaVersion, '2.0');
  assert.equal(context.brandCore.name, 'Brand One');
  assert.deepEqual(context.lockedAssets.logoAssetIds, ['asset-logo']);
  assert.deepEqual(context.visualIdentity.tone, ['calm and precise']);
  assert.equal(JSON.stringify(context).includes('human-report.md'), false);
  assert.deepEqual(validateProjectVisualContextShortChain(context), { valid: true, errors: [] });
});

test('Short-Chain context version increments independently of a report filename', () => {
  const first = buildProjectVisualContextShortChain({ project: project() });
  const withoutReport = { ...project(), lastReportFilename: null };
  const second = buildProjectVisualContextShortChain({
    project: withoutReport,
    previousContext: first,
  });
  assert.equal(second.version, 2);
  assert.equal(second.projectId, first.projectId);
});

test('legacy Short-Chain context migrates to a report-independent PromptSourceObject', () => {
  const legacy = buildProjectVisualContextShortChain({
    project: project(),
    generatedAt: '2026-07-30T00:00:00.000Z',
  });
  const withoutPromptSource = { ...legacy, promptSourceObject: undefined };
  const migrated = migrateProjectVisualContextShortChain(withoutPromptSource);

  assert.equal(migrated.promptSourceObject.schemaVersion, '1.0');
  assert.equal(migrated.promptSourceObject.projectFacts.brandName, 'Brand One');
  assert.equal(migrated.promptSourceObject.provenance.sourceKinds.includes('legacy_migration'), true);
  assert.equal(
    migrated.promptSourceObject.provenance.sourceKinds.includes('analysis_report' as never),
    false,
  );
});

test('structured Prompt Source enriches context while ProjectRecord keeps identity authority', () => {
  const context = buildProjectVisualContextShortChain({
    project: project(),
    generatedAt: '2026-07-30T00:00:00.000Z',
    structuredAnalysisRunId: 'prompt-source-run-1',
    structuredAnalysis: {
      promptSourceObject: {
        schemaVersion: '1.0',
        projectId: 'project-1',
        generatedAt: '2026-07-30T00:00:00.000Z',
        projectFacts: {
          brandName: '模型错误品牌',
          industry: '模型错误行业',
          brandRole: 'premium hospitality platform',
          businessModel: null,
          primaryOfferings: ['service'],
        },
        lockedAssets: {
          logoAssetIds: [],
          preferredLogoAssetId: null,
          logoUsageMode: 'blank_area',
          confirmedColors: ['mineral violet'],
          mustPreserve: ['layered identity rhythm'],
          immutableStructures: [],
        },
        sourceVisualState: {
          valuableAssets: ['layered identity rhythm'],
          overusedElements: ['saturated gradient'],
          outdatedExpressions: ['literal mascot'],
          genericIndustryCliches: ['generic lounge'],
          brandMisreadRisks: ['tea room'],
        },
        upgradeTranslation: {
          preserve: ['identity rhythm'],
          weaken: ['literal mascot'],
          remove: ['neon gradient'],
          targetWorldview: ['calm precision'],
          toneBoundaries: [{ target: 'calm', avoid: ['cold laboratory'] }],
          transformations: [{
            sourceAsset: 'layered mark',
            abstractProperties: ['rhythm'],
            newExpression: ['translucent spatial layers'],
            forbiddenLiteralUse: ['pasted symbol'],
          }],
        },
        renderLanguage: {
          colorBehavior: {
            primary: [{ name: 'warm white', ratio: 70, role: 'stable base' }],
            secondary: [],
            accent: [{ name: 'mineral violet', ratio: 10, role: 'identity accent' }],
            forbidden: ['neon violet'],
          },
          materialBehavior: [{
            material: 'frosted glass',
            behavior: ['diffuse'],
            brandRole: 'precision',
            forbidden: [],
          }],
          lightingBehavior: {
            source: ['side daylight'],
            contrast: 'low',
            interactionWithMaterials: ['transmission'],
            forbidden: ['stage light'],
          },
          graphicBehavior: ['layered rhythm'],
        },
        negativeRules: { project: ['tea room'], model: ['random text'] },
        confidence: {
          projectFacts: 0.8,
          lockedAssets: 0.8,
          sourceVisualState: 0.8,
          upgradeTranslation: 0.8,
        },
        provenance: {
          sourceKinds: ['project_record', 'original_asset', 'structured_analysis'],
          structuredAnalysisRunId: 'prompt-source-run-1',
          sourceFingerprint: 'structured-fingerprint',
        },
      },
    },
  });

  assert.equal(context.promptSourceObject?.projectFacts.brandName, 'Brand One');
  assert.equal(context.promptSourceObject?.projectFacts.industry, 'hospitality');
  assert.equal(context.promptSourceObject?.lockedAssets.preferredLogoAssetId, 'asset-logo');
  assert.equal(context.promptSourceObject?.lockedAssets.logoUsageMode, 'post_composite');
  assert.deepEqual(context.promptSourceObject?.sourceVisualState.brandMisreadRisks, ['tea room']);
});

test('validated Visual Decision Packet is persisted beside the compatibility Prompt Source', () => {
  const base = buildProjectVisualContextShortChain({ project: project() });
  const packet = {
    schemaVersion: '1.0',
    projectId: 'project-1',
    projectFacts: {},
    lockedAssets: [],
    assetInventory: {},
    diagnosis: {},
    creativeDecision: {},
    abstractions: [],
    mediaTranslations: {},
    colorSystem: {},
    materialSystem: [],
    lightingSystem: {},
    provenance: {
      createdFrom: [],
      generatedAt: '2026-07-30T00:00:00.000Z',
      modelId: 'test',
      sourceFingerprint: 'packet-fingerprint',
    },
    validation: {
      hardFactStatus: 'block',
      mode: 'exploration',
      missingRequiredFacts: ['brandRole'],
      conflicts: [],
      executionDataStatus: 'insufficient',
      missingExecutionFields: ['abstractions'],
    },
  };
  const context = buildProjectVisualContextShortChain({
    project: project(),
    previousContext: base,
    structuredAnalysis: { visualDecisionPacket: packet },
  });
  assert.equal(context.visualDecisionPacket?.provenance.sourceFingerprint, 'packet-fingerprint');
  assert.deepEqual(validateProjectVisualContextShortChain(context), { valid: true, errors: [] });
});

test('persisted Short-Chain context migrates a legacy Packet even when Prompt Source already exists', () => {
  const context = buildProjectVisualContextShortChain({
    project: project(),
    structuredAnalysis: {
      visualDecisionPacket: {
        schemaVersion: '1.0',
        projectId: 'project-1',
        projectFacts: {},
        lockedAssets: [],
        assetInventory: {},
        diagnosis: {
          brandMisreadRisks: [{
            code: 'legacy-clinic-risk',
            description: '避免被误读为冰冷诊疗空间',
            target: '冰冷诊疗空间',
            observation: '旧表达过度依赖机构白',
            whyItMatters: '削弱品牌温度',
            appliesTo: { taskFamilies: ['space'], subtypes: ['reception'], scenes: [] },
            evidenceRefs: ['asset:legacy'],
            confidence: 0.9,
            status: 'confirmed',
          }],
          categoryCliches: [],
        },
        creativeDecision: {
          brandRoleStatement: '',
          upgradeFrom: [],
          preserveCore: [],
          upgradeTo: ['有温度的当代服务体验'],
          uniqueUpgradeThesis: '',
          targetWorldview: ['专业可信', '人文温度'],
          toneBoundaries: [],
          strategicNegatives: ['冰冷机构感'],
        },
        abstractions: [],
        mediaTranslations: {
          spatial: {
            status: 'ready',
            structureLanguage: [],
            materialLanguage: [],
            lightingLanguage: { source: [], contrast: '', materialInteraction: [], forbidden: [] },
            colorBehavior: { primary: [], secondary: [], accent: [], forbidden: [] },
            brandIntegration: [],
            functionalExperience: ['legacy reception and consultation program'],
            sceneMisreadRisks: [],
          },
        },
        colorSystem: {},
        materialSystem: [],
        lightingSystem: {},
        provenance: {
          createdFrom: [],
          generatedAt: '2026-07-30T00:00:00.000Z',
          modelId: 'test',
          sourceFingerprint: 'legacy-packet-fingerprint',
        },
        validation: {
          hardFactStatus: 'pass',
          mode: 'formal_generation',
          missingRequiredFacts: [],
          conflicts: [],
          executionDataStatus: 'ready',
          missingExecutionFields: [],
        },
      },
    },
  });
  const persistedLegacy = structuredClone(context);
  const spatial = persistedLegacy.visualDecisionPacket?.mediaTranslations.spatial;
  if (!spatial) throw new Error('test fixture is missing spatial translation');
  delete (spatial as { sceneProgram?: string[] }).sceneProgram;

  const migrated = migrateProjectVisualContextShortChain(persistedLegacy);

  assert.deepEqual(
    migrated.visualDecisionPacket?.mediaTranslations.spatial.sceneProgram,
    ['legacy reception and consultation program'],
  );
  assert.deepEqual(
    migrated.visualDecisionPacket?.creativeDecision.toneBoundaries,
    [],
    'schema migration repairs shape but leaves project-specific tone to targeted repair',
  );
});
