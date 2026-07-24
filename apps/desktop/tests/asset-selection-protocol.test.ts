import test from 'node:test';
import assert from 'node:assert/strict';
import {
  assembleAssetSelectionProtocol,
  assertAssetSelectionProtocol,
  buildReferenceMasterSet,
  buildTaskReferenceSubsets,
  createFallbackCurrentProjectDecisions,
  createFallbackReferenceDecisions,
  groupReferenceNearDuplicates,
  normalizeCurrentProjectDecisions,
  normalizeReferenceDecisions,
  validateReferenceMasterSet
} from '../src/main/asset-selection-protocol/index.ts';
import { buildReferenceAssetSelectionPrompt } from '../src/main/asset-selection-protocol/prompts.ts';
import type {
  CurrentProjectAssetDecision,
  ProjectAsset,
  ProjectRecord,
  ProjectRuntimeContext,
  ReferenceAssetDecision
} from '../src/shared/types.ts';

function asset(id: string, originalName: string, sha256 = id): ProjectAsset {
  return {
    id,
    batchId: 'batch',
    sourceType: 'file',
    originalName,
    relativePath: `assets/${originalName}`,
    mimeType: 'image/png',
    sizeBytes: 100,
    sha256,
    status: 'ready'
  };
}

function project(assets: ProjectAsset[]): ProjectRecord {
  return {
    id: 'project-1',
    projectName: 'fixture-project',
    brandName: 'fixture-brand',
    detectedBrandName: 'fixture-brand',
    industry: 'fixture-domain',
    detectedIndustry: 'fixture-domain',
    logoLocked: true,
    logoFiles: ['identity-source.png'],
    lockedFacts: ['identity is retained'],
    assets
  } as ProjectRecord;
}

function referenceDecision(
  assetId: string,
  outputTypes: ReferenceAssetDecision['eligibleOutputTypes'],
  strength: ReferenceAssetDecision['styleCarrierStrength'] = 'high'
): ReferenceAssetDecision {
  return {
    assetId,
    filename: `${assetId}.png`,
    role: 'system_overview',
    primaryRole: 'system_overview',
    secondaryRoles: ['display_layout'],
    styleCarrierStrength: strength,
    includeInMasterSet: true,
    eligibleOutputTypes: outputTypes,
    representedStyleCarriers: ['layout', 'typography', 'graphic'],
    styleCarrierRules: [
      { category: 'layout', readableRule: '主体与信息区沿稳定网格分离，并保留明确呼吸区', confidence: 0.94 },
      { category: 'typography', readableRule: '标题、名称与说明形成三级字号和字重层级', confidence: 0.92 },
      { category: 'graphic', readableRule: '辅助图形以重复、裁切和密度变化连接不同输出', confidence: 0.9 }
    ],
    confidence: 0.93,
    reason: 'fixture evidence',
    requiresHumanReview: false
  };
}

test('fallback does not infer asset truth or roles from filenames', () => {
  const current = createFallbackCurrentProjectDecisions([
    asset('identity', 'brand-logo.png'),
    asset('structure', 'box-store-poster.png')
  ]);
  const reference = createFallbackReferenceDecisions([
    asset('reference', 'system-overview-packaging.png')
  ]);

  assert.deepEqual(current.map((item) => item.role), ['uncertain', 'uncertain']);
  assert.ok(current.every((item) =>
    item.authenticity === 'unknown'
    && item.includeInGenerationIdentityPack === false
    && item.generationUsage === 'exclude'
  ));
  assert.equal(reference[0]?.role, 'uncertain');
  assert.deepEqual(reference[0]?.eligibleOutputTypes, []);
  assert.equal(reference[0]?.includeInMasterSet, false);
});

test('confirmed identity evidence enters the core pack while duplicates remain excluded', () => {
  const assets = [
    asset('identity', 'source-a.png', 'same'),
    asset('duplicate', 'source-b.png', 'same')
  ];
  const raw: CurrentProjectAssetDecision[] = [{
    ...createFallbackCurrentProjectDecisions([assets[0]!])[0]!,
    role: 'brand_identity_evidence',
    roles: ['brand_identity_evidence', 'logo_evidence'],
    authenticity: 'user_confirmed_locked',
    keepInCorePack: true,
    includeInGenerationIdentityPack: true,
    canProveIdentity: true,
    generationUsage: 'identity',
    confidence: 1,
    requiresHumanReview: false
  }];
  const current = normalizeCurrentProjectDecisions(raw, assets);
  const references = [referenceDecision('reference', ['anchor_vi_system'])];
  const protocol = assembleAssetSelectionProtocol(project(assets), current, references);

  assert.deepEqual(protocol.currentProjectCorePack.sourceAssetIds, ['identity']);
  assert.equal(protocol.currentCorePackValidation.excludesDuplicateAssets, true);
  assert.equal(current[0]?.generationUsage, 'identity');
  assert.doesNotThrow(() => assertAssetSelectionProtocol(protocol));
});

test('user-uploaded current visuals carry runtime authenticity into the identity pack and bind Logo evidence', () => {
  const assets = [asset('uploaded-logo', 'current-brand-board.png')];
  const raw: CurrentProjectAssetDecision[] = [{
    ...createFallbackCurrentProjectDecisions(assets)[0]!,
    role: 'brand_identity_evidence',
    roles: ['brand_identity_evidence', 'logo_evidence'],
    authenticity: 'unknown',
    keepInCorePack: true,
    includeInGenerationIdentityPack: false,
    canProveIdentity: true,
    generationUsage: 'exclude',
    confidence: 0.96,
    requiresHumanReview: false
  }];
  const runtimeContext: ProjectRuntimeContext = {
    projectId: 'project-1',
    brandName: 'fixture-brand',
    userLockedAssets: [],
    userRetainedCopy: [],
    userConfirmedRealAssets: ['uploaded-logo'],
    outputTasks: [],
    referenceAssetIds: [],
    projectMetadata: {
      currentProjectSource: 'user_uploaded_visual_scheme'
    }
  };

  const current = normalizeCurrentProjectDecisions(raw, assets, runtimeContext);
  const protocol = assembleAssetSelectionProtocol(
    project(assets),
    current,
    [referenceDecision('reference', ['anchor_vi_system'])]
  );

  assert.equal(current[0]?.authenticity, 'user_confirmed_real');
  assert.equal(current[0]?.includeInGenerationIdentityPack, true);
  assert.equal(current[0]?.generationUsage, 'identity');
  assert.deepEqual(protocol.currentProjectCorePack.logoAssetIds, ['uploaded-logo']);
  assert.deepEqual(
    protocol.currentProjectCorePack.lockedAssets.find((item) => /logo/iu.test(item.name))?.assetIds,
    ['uploaded-logo']
  );
  assert.equal(protocol.currentCorePackValidation.hasLogoEvidence, true);
  assert.doesNotThrow(() => assertAssetSelectionProtocol(protocol));
});

test('reference master set excludes near duplicates and requires readable style rules', () => {
  const first = referenceDecision('overview', ['anchor_vi_system']);
  first.duplicationGroupId = 'same-visual';
  const copy = { ...referenceDecision('overview-copy', ['anchor_vi_system'], 'medium'), duplicationGroupId: 'same-visual' };
  const master = buildReferenceMasterSet([first, copy]);
  const validation = validateReferenceMasterSet(master, [first, copy]);

  assert.deepEqual(master.assetIds, ['overview']);
  assert.ok(master.styleCarriers.every((item) => item.readableRule && !/跨参考视觉规律/u.test(item.readableRule)));
  assert.equal(validation.excludesNearDuplicates, true);
  assert.equal(validation.passed, true);
});

test('reference selection rejects model-invented output task names before subset paths are built', () => {
  const source = asset('reference', 'reference.png');
  const invalid = referenceDecision('reference', ['anchor_vi_system']);
  invalid.eligibleOutputTypes = ['brand_guidelines' as never, 'mockups' as never];

  assert.throws(
    () => normalizeReferenceDecisions([invalid], [source]),
    (error: unknown) => {
      const structured = error as Error & {
        code?: string;
        details?: { issues?: Array<{ path: string; receivedValue?: unknown; allowedValues?: unknown[] }> };
      };
      assert.equal(structured.code, 'MODEL_OUTPUT_INVALID_ENUM');
      assert.deepEqual(
        structured.details?.issues?.map((issue) => issue.receivedValue),
        ['brand_guidelines', 'mockups']
      );
      assert.ok(structured.details?.issues?.every((issue) =>
        issue.path.includes('eligibleOutputTypes') && issue.allowedValues?.includes('anchor_vi_system')));
      return true;
    }
  );
});

test('reference selection prompt enumerates every supported output task', () => {
  const prompt = buildReferenceAssetSelectionPrompt([asset('reference', 'reference.png')]);
  for (const outputType of [
    'anchor_vi_system',
    'packaging_single',
    'packaging_series',
    'brand_poster',
    'product_poster',
    'vi_application',
    'spatial_scene',
    'digital_campaign'
  ]) {
    assert.match(prompt, new RegExp(outputType));
  }
  assert.match(prompt, /不得自造 brand_guidelines、mockups、social_media、packaging_design/);
});

test('perceptual hashes group visually near files even when SHA-256 values differ', () => {
  const decisions = createFallbackReferenceDecisions([
    asset('first', 'a.png', 'sha-a'),
    asset('second', 'b.png', 'sha-b'),
    asset('third', 'c.png', 'sha-c')
  ]);
  const grouped = groupReferenceNearDuplicates(decisions, {
    first: '00000000',
    second: '00000001',
    third: '11111111'
  }, 1);

  assert.equal(grouped[0]?.duplicationGroupId, grouped[1]?.duplicationGroupId);
  assert.notEqual(grouped[0]?.duplicationGroupId, grouped[2]?.duplicationGroupId);
});

test('task subsets are compiled only for output types declared by runtime evidence', () => {
  const master = buildReferenceMasterSet([
    referenceDecision('overview', ['anchor_vi_system', 'digital_campaign']),
    referenceDecision('support', ['digital_campaign'], 'medium')
  ]);
  const { subsets } = buildTaskReferenceSubsets(master);

  assert.deepEqual(subsets.map((item) => item.outputType), ['anchor_vi_system', 'digital_campaign']);
  for (const subset of subsets) {
    assert.ok(subset.selectedAssetIds.length >= 1 && subset.selectedAssetIds.length <= 4);
    assert.ok(subset.selectedAssetIds.includes(subset.primaryReferenceAssetId));
    assert.equal(subset.supportingReferenceAssetIds.includes(subset.primaryReferenceAssetId), false);
  }
});
