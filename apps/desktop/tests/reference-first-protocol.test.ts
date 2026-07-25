import test from 'node:test';
import assert from 'node:assert/strict';
import {
  bindFact,
  buildAnalysisEvidencePack,
  buildGenerationIdentityPack,
  buildGenericReferenceMasterSet,
  buildProjectRuntimeContext,
  buildStructurePolicy,
  compileGenerationBrief,
  compileTaskDefinition,
  detectBroadcastEvidence,
  evaluateGenerationReadiness,
  resolveAssetAuthenticity,
  resolveFactStatus,
  scanProtocolHardcodes,
  selectTaskReferences,
  validateAuthenticityDecisions
} from '../src/main/reference-first/index.ts';
import type {
  BrandCopyRecord,
  CurrentProjectAssetDecision,
  ProjectGraphicAnchor,
  ProjectRecord,
  ProjectRuntimeContext,
  ReferenceAssetDecision,
  StyleCarrier,
  SystemAnchor
} from '../src/shared/types.ts';

function runtime(overrides: Partial<ProjectRuntimeContext> = {}): ProjectRuntimeContext {
  return {
    projectId: 'project-fixture',
    brandName: 'Runtime Identity',
    productFacts: ['Runtime fact'],
    userLockedAssets: [],
    userRetainedCopy: [],
    userConfirmedRealAssets: [],
    outputTasks: ['digital_campaign'],
    referenceAssetIds: ['reference-1'],
    projectMetadata: {},
    ...overrides
  };
}

function currentDecision(
  assetId: string,
  role: CurrentProjectAssetDecision['role']
): CurrentProjectAssetDecision {
  return {
    assetId,
    filename: `${assetId}.png`,
    role,
    roles: [role],
    authenticity: 'unknown',
    keepInCorePack: true,
    includeInAnalysisEvidencePack: true,
    includeInGenerationIdentityPack: false,
    generationUsage: 'exclude',
    keepReason: 'fixture observation',
    extractedFacts: [],
    lockedEvidence: [],
    containsLegacyStyle: false,
    legacyStyleShouldInfluenceOutput: false,
    confidence: 0.9,
    requiresHumanReview: false
  };
}

function referenceDecision(
  outputTypes: ReferenceAssetDecision['eligibleOutputTypes'] = ['digital_campaign']
): ReferenceAssetDecision {
  return {
    assetId: 'reference-1',
    filename: 'reference-1.png',
    role: 'display_layout',
    primaryRole: 'display_layout',
    secondaryRoles: ['typography_detail', 'graphic_detail'],
    styleCarrierStrength: 'high',
    includeInMasterSet: true,
    eligibleOutputTypes: outputTypes,
    representedStyleCarriers: ['layout', 'typography', 'graphic'],
    styleCarrierRules: [
      { category: 'layout', readableRule: '主体区与信息区沿稳定网格分离，并保留明确呼吸区', confidence: 0.95 },
      { category: 'typography', readableRule: '标题、名称与说明形成三级字号和字重层级', confidence: 0.93 },
      { category: 'graphic', readableRule: '辅助图形通过重复、裁切与密度变化维持跨输出一致性', confidence: 0.91 }
    ],
    confidence: 0.94,
    reason: 'fixture visual evidence',
    requiresHumanReview: false
  };
}

test('asset authenticity is controlled by runtime confirmation, not asset labels', () => {
  const context = runtime({
    userLockedAssets: [{ assetId: 'locked', reason: 'user decision' }],
    userConfirmedRealAssets: ['real']
  });
  const locked = resolveAssetAuthenticity({
    assetId: 'locked',
    observedAuthenticity: 'stock_mockup',
    observedCapabilities: { canProveIdentity: true, canProveLockedAsset: true }
  }, context);
  const real = resolveAssetAuthenticity({
    assetId: 'real',
    observedCapabilities: { canProveStructure: true }
  }, context);
  const concept = resolveAssetAuthenticity({
    assetId: 'concept',
    observedAuthenticity: 'design_concept_only',
    observedCapabilities: { canProveStructure: true }
  }, context);

  assert.equal(locked.authenticity, 'user_confirmed_locked');
  assert.equal(locked.includeInGenerationIdentityPack, true);
  assert.equal(real.authenticity, 'user_confirmed_real');
  assert.equal(real.canProveStructure, true);
  assert.equal(concept.canProveStructure, false);
  assert.equal(concept.includeInGenerationIdentityPack, false);
  assert.deepEqual(validateAuthenticityDecisions([locked, real, concept]), []);
});

test('structure policy distinguishes confirmed, open, locked and not-applicable states', () => {
  const context = runtime({ userConfirmedRealAssets: ['structure'] });
  const confirmed = resolveAssetAuthenticity({
    assetId: 'structure',
    observedCapabilities: { canProveStructure: true }
  }, context);
  const concept = resolveAssetAuthenticity({
    assetId: 'concept',
    observedAuthenticity: 'design_concept_only',
    observedCapabilities: { canProveStructure: true }
  }, context);

  assert.equal(buildStructurePolicy([confirmed], { domain: 'other' }).status, 'real_structure_detected');
  assert.equal(buildStructurePolicy([concept], { domain: 'other' }).status, 'open_for_redesign');
  assert.equal(buildStructurePolicy([concept], { domain: 'other', locked: true }).status, 'locked');
  assert.equal(buildStructurePolicy([], { domain: 'interface', notApplicable: true }).status, 'not_applicable');
});

test('facts bind only to their actual sources and detect broadcast evidence', () => {
  const fact = bindFact({
    id: 'fact-1',
    key: 'identity',
    value: 'Confirmed value',
    classification: 'identity_fact',
    sources: [{
      type: 'visual_asset',
      sourceId: 'asset-1',
      value: 'Confirmed value',
      confidence: 0.9
    }],
    entersGenerationIdentityPack: true
  });
  const broadcast = { ...fact, id: 'broadcast', sourceAssetIds: ['asset-1', 'asset-2'], evidenceAssetIds: ['asset-1', 'asset-2'] };

  assert.equal(resolveFactStatus(fact.sources || []), 'confirmed');
  assert.deepEqual(fact.evidenceAssetIds, ['asset-1']);
  assert.deepEqual(detectBroadcastEvidence([fact], ['asset-1', 'asset-2']), []);
  assert.deepEqual(detectBroadcastEvidence([broadcast], ['asset-1', 'asset-2']), ['broadcast']);
});

test('analysis and generation packs remain separate and observed copy is not retained', () => {
  const context = runtime({ userConfirmedRealAssets: ['identity'], userLockedAssets: [] });
  const identityDecision = currentDecision('identity', 'brand_identity_evidence');
  const legacyDecision = currentDecision('legacy', 'legacy_visual_only');
  const authenticity = [
    resolveAssetAuthenticity({
      assetId: 'identity',
      observedCapabilities: { canProveIdentity: true }
    }, context),
    resolveAssetAuthenticity({
      assetId: 'legacy',
      observedAuthenticity: 'design_concept_only'
    }, context)
  ];
  const identityFact = bindFact({
    id: 'identity-fact',
    key: 'identity',
    value: 'Runtime Identity',
    classification: 'identity_fact',
    sources: [{ type: 'project_metadata', value: 'Runtime Identity', confidence: 1 }],
    entersGenerationIdentityPack: true
  });
  const copy: BrandCopyRecord[] = [{
    text: 'Observed words',
    status: 'observed',
    evidenceAssetIds: ['legacy'],
    useInGeneration: false
  }];
  const structure = buildStructurePolicy(authenticity, { domain: 'other' });
  const analysis = buildAnalysisEvidencePack([identityDecision, legacyDecision], authenticity);
  const identity = buildGenerationIdentityPack({
    runtime: context,
    assetDecisions: [identityDecision, legacyDecision],
    authenticityDecisions: authenticity,
    facts: [identityFact],
    copy,
    structurePolicy: structure
  });

  assert.deepEqual(analysis.assetIds, ['identity', 'legacy']);
  assert.deepEqual(identity.assets.map((item) => item.assetId), ['identity']);
  assert.deepEqual(identity.retainedCopy, []);
});

test('reference selection is runtime-task driven and insufficient evidence fails closed', () => {
  const master = buildGenericReferenceMasterSet([referenceDecision()]);
  const selected = selectTaskReferences(master, ['digital_campaign']);
  const insufficient = selectTaskReferences(master, ['spatial_scene']);

  assert.equal(selected.subsets[0]?.matchLevel, 'exact');
  assert.deepEqual(selected.subsets[0]?.selectedAssetIds, ['reference-1']);
  assert.equal(insufficient.subsets[0]?.matchLevel, 'insufficient');
  assert.deepEqual(insufficient.subsets[0]?.selectedAssetIds, []);
  assert.equal(insufficient.validations[0]?.passed, false);
});

test('task and brief compilers use runtime metadata instead of protocol material lists', () => {
  const context = runtime({
    projectMetadata: {
      taskDefinitions: {
        digital_campaign: {
          taskPurpose: 'Publish a runtime-defined announcement',
          primarySubjectTypes: ['runtime subject'],
          requiredObjects: ['runtime object'],
          compositionRules: ['runtime composition rule']
        }
      }
    }
  });
  const master = buildGenericReferenceMasterSet([referenceDecision()]);
  const structure = buildStructurePolicy([], { domain: 'other' });
  const task = compileTaskDefinition({
    outputType: 'digital_campaign',
    runtime: context,
    structurePolicy: structure,
    styleCarriers: master.styleCarriers
  });

  assert.equal(task.taskPurpose, 'Publish a runtime-defined announcement');
  assert.deepEqual(task.requiredObjects, ['runtime object']);
  assert.ok(task.compositionRules.includes('runtime composition rule'));
});

test('generation readiness blocks unverified assets and signature-graphic leakage', () => {
  const context = runtime({ userConfirmedRealAssets: ['identity'] });
  const authenticity = [resolveAssetAuthenticity({
    assetId: 'identity',
    observedCapabilities: { canProveIdentity: true }
  }, context)];
  const fact = bindFact({
    id: 'identity',
    key: 'identity',
    value: 'Runtime Identity',
    classification: 'identity_fact',
    sources: [{ type: 'project_metadata', value: 'Runtime Identity', confidence: 1 }],
    entersGenerationIdentityPack: true
  });
  const structure = buildStructurePolicy(authenticity, { domain: 'other', notApplicable: true });
  const pack = buildGenerationIdentityPack({
    runtime: context,
    assetDecisions: [currentDecision('identity', 'brand_identity_evidence')],
    authenticityDecisions: authenticity,
    facts: [fact],
    copy: [],
    structurePolicy: structure
  });
  const master = buildGenericReferenceMasterSet([referenceDecision()]);
  const subset = selectTaskReferences(master, ['digital_campaign']).subsets[0]!;
  const task = compileTaskDefinition({
    outputType: 'digital_campaign',
    runtime: context,
    structurePolicy: structure,
    styleCarriers: master.styleCarriers
  });
  const systemAnchor: SystemAnchor = {
    colorRelationship: '受控对比关系',
    layoutGrammar: '稳定网格',
    typographyHierarchy: '三级层级',
    materialLanguage: '真实表面',
    crossTouchpointConsistency: '清晰展示',
    primaryStyleCarrierIds: master.styleCarriers.map((item) => item.id)
  };
  const anchor: ProjectGraphicAnchor = {
    sourceElements: ['runtime fact'],
    reconstructedForm: 'project-owned form',
    formDescription: 'project-owned form',
    usageRole: 'primary',
    role: 'primary',
    extensionTouchpoints: [],
    resemblesReferenceSignatureGraphic: false
  };
  const brief = compileGenerationBrief({
    identityPack: pack,
    replaceableLegacyVisuals: [],
    styleCarriers: master.styleCarriers,
    systemAnchor,
    graphicAnchor: anchor,
    task,
    referenceSubset: subset
  });
  const ready = evaluateGenerationReadiness({
    identityPack: pack,
    authenticityDecisions: authenticity,
    styleCarriers: master.styleCarriers,
    taskReference: subset,
    anchor,
    signatureGraphics: [],
    generationBrief: brief
  });
  const leaking = evaluateGenerationReadiness({
    identityPack: pack,
    authenticityDecisions: authenticity,
    styleCarriers: master.styleCarriers,
    taskReference: subset,
    anchor: { ...anchor, resemblesReferenceSignatureGraphic: true },
    signatureGraphics: [],
    generationBrief: brief
  });

  assert.equal(ready.status, 'ready');
  assert.equal(ready.optionalAudienceContextAvailable, false);
  assert.ok(ready.warnings?.includes('TARGET_AUDIENCE_UNAVAILABLE_NON_BLOCKING'));
  assert.ok(!ready.blockingReasons.some((reason) => /AUDIENCE/u.test(reason)));
  assert.match(brief, /## 7\. Current Task Definition[\s\S]*digital_campaign/u);
  assert.equal(leaking.status, 'blocked');
  assert.ok(leaking.blockingReasons.includes('REFERENCE_SIGNATURE_GRAPHIC_LEAK'));
});

test('runtime context builder and protocol hardcode scan keep project facts outside protocol', () => {
  const project = {
    id: 'project',
    projectName: 'Fixture Project',
    brandName: 'Fixture Brand',
    detectedBrandName: '',
    industry: 'Fixture Domain',
    detectedIndustry: '',
    lockedFacts: ['runtime fact'],
    logoLocked: false
  } as ProjectRecord;
  const context = buildProjectRuntimeContext({
    project,
    outputTasks: ['digital_campaign'],
    referenceAssetIds: ['reference']
  });
  const clean = scanProtocolHardcodes('export function resolve(input) { return input; }', {
    projectNames: ['Fixture Project'],
    brandNames: ['Fixture Brand'],
    industryTerms: ['Fixture Domain'],
    productTerms: ['Fixture Product'],
    concreteTouchpointTerms: ['Fixture Touchpoint']
  });
  const contaminated = scanProtocolHardcodes('const value = "Fixture Brand";', {
    brandNames: ['Fixture Brand']
  });

  assert.equal(context.brandName, 'Fixture Brand');
  assert.equal(clean.passed, true);
  assert.deepEqual(contaminated.brandNames, ['Fixture Brand']);
  assert.equal(contaminated.passed, false);
});
