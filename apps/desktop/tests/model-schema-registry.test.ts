import assert from 'node:assert/strict';
import test from 'node:test';
import type { CurrentProjectProfile } from '../src/shared/types.ts';
import {
  buildAudienceFacts,
  compileProjectFactsPromptConstraints,
  evaluateProjectFactsAnalysisReadiness,
  PROJECT_FACTS_METADATA,
  ProjectFactsSchema
} from '../src/main/model-schema/project-facts.schema.ts';
import { MODEL_SCHEMA_REGISTRY } from '../src/main/model-schema/schema-registry.ts';
import { ReferenceAssetsSchema } from '../src/main/model-schema/reference-assets.schema.ts';
import { compileRepairPrompt } from '../src/main/model-schema/validation-issues.ts';
import { validateCurrentProjectProfile } from '../src/main/reference-style-reconstruction.ts';

function projectFacts(targetAudience: unknown) {
  return {
    brandName: '示例品牌',
    industry: '餐饮',
    coreProducts: ['主食'],
    targetAudience,
    brandPositioning: '日常品质餐饮',
    usageScenarios: ['堂食'],
    businessTouchpoints: ['门店'],
    packagingStructures: [],
    visualSources: {
      productForms: ['碗装产品'],
      cookingActions: [],
      sensorySignals: ['热气'],
      consumptionActions: [],
      brandNameSemantics: [],
      spatialObjects: []
    },
    touchpointInventory: {
      primaryPackaging: [],
      secondaryPackaging: [],
      serviceMaterials: [],
      viApplications: [],
      spatialTouchpoints: ['门店'],
      digitalTouchpoints: []
    },
    confirmedFacts: []
  };
}

function currentProfile(targetAudience: string[]): CurrentProjectProfile {
  return {
    schemaVersion: 'current-project-profile-v1',
    projectId: 'project',
    projectName: '示例项目',
    brandName: '示例品牌',
    industry: '餐饮',
    coreProducts: ['主食'],
    targetAudience,
    brandPositioning: '日常品质餐饮',
    usageScenarios: ['堂食'],
    businessTouchpoints: ['门店'],
    lockedAssets: ['品牌名称'],
    packagingStructures: [],
    confirmedFacts: [],
    sourceArtifactIds: ['asset-1'],
    visualSources: {
      productForms: ['碗装产品'],
      cookingActions: [],
      sensorySignals: ['热气'],
      consumptionActions: [],
      brandNameSemantics: [],
      spatialObjects: []
    },
    touchpointInventory: {
      primaryPackaging: [],
      secondaryPackaging: [],
      serviceMaterials: [],
      viApplications: [],
      spatialTouchpoints: ['门店'],
      digitalTouchpoints: []
    }
  };
}

test('targetAudience accepts open expressions and an evidence-safe empty array', () => {
  for (const audience of [
    ['美食爱好者'],
    ['堂食用餐者'],
    ['品质导向的家庭决策者'],
    []
  ]) {
    const parsed = ProjectFactsSchema.safeParse(projectFacts(audience));
    assert.equal(parsed.success, true, JSON.stringify(parsed.issues));
    const profile = currentProfile(audience);
    assert.equal(validateCurrentProjectProfile(profile).passed, true);
    assert.notEqual(evaluateProjectFactsAnalysisReadiness(profile).status, 'blocked');
  }
});

test('targetAudience rejects invalid structure without applying a closed people dictionary', () => {
  const parsed = ProjectFactsSchema.safeParse(projectFacts('美食爱好者'));
  assert.equal(parsed.success, false);
  assert.equal(parsed.issues[0]?.path, 'projectFacts.targetAudience');
  assert.equal(parsed.issues[0]?.issueType, 'invalid_type');
  assert.deepEqual(parsed.issues[0]?.validExamples?.[0], []);
});

test('reference roles cannot borrow a valid generation output enum', () => {
  const parsed = ReferenceAssetsSchema.safeParse([{
    assetId: 'reference-1',
    filename: 'reference.png',
    role: 'packaging_series',
    primaryRole: 'packaging_series',
    secondaryRoles: [],
    styleCarrierStrength: 'high',
    includeInMasterSet: true,
    eligibleOutputTypes: ['packaging_series'],
    representedStyleCarriers: ['layout'],
    styleCarrierRules: [{
      category: 'layout',
      readableRule: '稳定的信息层级',
      confidence: 0.9
    }],
    confidence: 0.9,
    reason: '系列包装参考',
    requiresHumanReview: false
  }]);
  assert.equal(parsed.success, false);
  assert.deepEqual(
    parsed.issues.filter((issue) => issue.issueType === 'invalid_enum').map((issue) => issue.path),
    ['referenceAssets[0].role', 'referenceAssets[0].primaryRole']
  );
  assert.ok(parsed.issues.every((issue) => issue.allowedValues?.includes('packaging')));
});

test('repair prompts carry field, failed value, allowed values and a legal example', () => {
  const issue = ReferenceAssetsSchema.safeParse([{
    role: 'packaging_series',
    primaryRole: 'packaging_series',
    secondaryRoles: [],
    eligibleOutputTypes: [],
    representedStyleCarriers: [],
    styleCarrierStrength: 'high',
    styleCarrierRules: [],
    confidence: 0.8
  }]).issues[0]!;
  const prompt = compileRepairPrompt({
    issues: [issue],
    schemaSummary: MODEL_SCHEMA_REGISTRY.referenceAssets.summary,
    attempt: 1,
    maxAttempts: 2
  });
  assert.match(prompt, /字段：referenceAssets\[0\]\.role/u);
  assert.match(prompt, /失败值："packaging_series"/u);
  assert.match(prompt, /允许值：.*"packaging"/u);
  assert.match(prompt, /修复要求/u);
});

test('prompt, schema and readiness share the same targetAudience metadata', () => {
  const metadata = PROJECT_FACTS_METADATA.find((item) => item.path === 'targetAudience');
  assert.equal(metadata?.allowEmpty, true);
  assert.equal(metadata?.readinessRequirement, 'recommended');
  assert.match(ProjectFactsSchema.summary, /可空字符串数组/u);
  assert.match(compileProjectFactsPromptConstraints(), /为空不阻断/u);
});

test('visually inferred audiences retain source provenance and are never confirmed', () => {
  const facts = buildAudienceFacts(['夜间用餐者'], ['asset-1']);
  assert.equal(facts[0]?.status, 'inferred');
  assert.equal(facts[0]?.sources[0]?.type, 'visual_asset');
  assert.equal(facts[0]?.sources[0]?.sourceId, 'asset-1');
  assert.ok((facts[0]?.confidence || 0) < 1);
});
