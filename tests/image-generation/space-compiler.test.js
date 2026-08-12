// Phase 9B source adapter + space compiler tests.
//
// Verifies the production space-quality compiler (Recovery R3):
//   - V5 packet maps to Phase 9B layers without generic fallbacks
//   - fail-closed: SPACE_PHASE9B_SOURCE_INSUFFICIENT on missing fields
//   - output block order matches Phase 9B Mode B (architecture before brand)
//   - deterministic (same input -> same prompt)
//   - architecture_context appears before architectural_concept when anchors exist
//   - brand translation appears AFTER architecture blocks
//   - negative block is last
//   - no project/brand name hardcoding in compiler output logic
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  compileSpacePrompt,
  adaptSpaceSource,
  isSpaceSourceInsufficient,
} from '@masterpiece/image-generation-runtime/generation/space-quality/index.js';

function makePacket(overrides = {}) {
  const spatial = {
    status: 'ready',
    spatialConcept: '层叠半透明介质从天花垂落，在中心汇合形成夹层光，边缘缓慢过渡为墙',
    brandRoleManifestation: ['接待区以连续膜天花承载品牌的科学与优雅双重角色'],
    signatureSpatialMechanism: ['半透明层叠介质形成无硬收边的空间边界', '暖色间接光沿膜边缘漫射'],
    functionalNetwork: [
      '入口→接待：短走廊缓冲，街道与室内视觉连续',
      '接待→等候：弧形膜天花引导，低到高的空间序列',
      '等候→咨询：半透膜弱分隔，保持视觉连续与听觉私密',
      '咨询→治疗：后部私密轴线，材质从透到实',
    ],
    positiveDifferentiators: ['膜介质而非紫色亚克力', '连续天花而非网红灯箱'],
    mustBeVisible: ['接待台与膜天花的连续关系', '入口玻璃与室内的视觉渗透'],
    structureLanguage: ['连续曲面', '无硬收边', '从透到实的材质渐变'],
    materialLanguage: [
      { material: '手工矿物涂料', behavior: ['哑光、微颗粒、暖白'], brandRole: '承载科学克制感', forbidden: ['亮面瓷砖'] },
      { material: '磨砂金属', behavior: ['暖调拉丝、低反射'], brandRole: '点缀收口', forbidden: ['镀铬'] },
    ],
    lightingLanguage: {
      source: ['暖色间接光', '膜后漫射天光'],
      contrast: '低对比、柔阴影',
      interactionWithMaterials: ['光在哑光矿物表面均匀衰减'],
      forbidden: ['彩色射灯', '紫色霓虹'],
    },
    colorBehavior: { primary: [], secondary: [], accent: [], forbidden: ['高饱和紫'] },
    brandIntegration: ['品牌标识仅在接待台正面，低调'],
    functionalRelationships: ['接待可视入口，咨询保持私密'],
    sceneProgram: ['接待区', '等候区', '咨询室', '治疗室'],
    peopleBehavior: ['顾客进门即被接待，不被直视'],
    sceneMisreadRisks: [],
    functionalExperience: [],
  };
  return {
    schemaVersion: '1.0',
    projectId: 'proj-test',
    validation: { hardFactStatus: 'pass', executionDataStatus: 'ready' },
    projectFacts: {
      brandName: { value: '测试品牌', status: 'confirmed' },
      industry: { value: 'medical_aesthetics', status: 'confirmed' },
      brandRole: { value: '以科学与优雅并重的医美空间', status: 'confirmed' },
    },
    creativeDecision: {
      uniqueUpgradeThesis: '从网红医美升级为有建筑深度的科学美学空间',
      targetWorldview: ['克制、温润、有光的深度'],
      strategicNegatives: ['夜店紫', '发光亚克力'],
      toneBoundaries: [],
    },
    diagnosis: {
      brandMisreadRisks: [
        { status: 'confirmed', description: '避免紫色霓虹夜店感', appliesTo: { deliverables: ['space'] } },
      ],
    },
    colorSystem: { primary: [], secondary: [], accent: [], forbidden: ['高饱和紫'] },
    materialSystem: spatial.materialLanguage,
    lightingSystem: spatial.lightingLanguage,
    mediaTranslations: { spatial },
    lockedAssets: [],
    abstractions: [],
    provenance: { sourceFingerprint: 'fp-test' },
    ...overrides,
  };
}

const taskContract = {
  projectId: 'proj-test',
  deliverableFamily: 'space',
  subtype: 'reception',
  shot: 'interior',
  aspectRatio: '3:4',
  currentInstruction: '生成接待区主视觉',
  mustInclude: [],
  mustAvoid: ['紫色霓虹'],
  referenceAssetIds: [],
};

test('adaptSpaceSource maps a ready V5 packet into Phase 9B layers', () => {
  const layers = adaptSpaceSource({ packet: makePacket(), taskContract });
  assert.ok(layers.spatialIntent.experienceGoal);
  assert.ok(layers.spatialIntent.spatialStrategy.length >= 1);
  assert.ok(layers.architectureLanguage.spatialPrinciples.length >= 1);
  assert.ok(layers.architectureLanguage.architecturalCharacteristics.length >= 1);
  assert.ok(layers.architectureFunctionBridge.commercialPurpose);
  assert.ok(layers.architecturalConcept.primary);
  assert.equal(layers.materials.length, 2);
});

test('adaptSpaceSource fails closed when no spatial signal survives', () => {
  // R8.5 redirected: architecture blocks now come from the action-verb IR,
  // which requires spatial keywords (curve/layer/translucent/etc.) in the
  // V5 spatial fields. Emptying all spatial fields leaves no signal, so
  // the adapter must fail closed.
  const packet = makePacket();
  packet.mediaTranslations.spatial.spatialConcept = '';
  packet.mediaTranslations.spatial.signatureSpatialMechanism = [];
  packet.mediaTranslations.spatial.brandRoleManifestation = [];
  packet.mediaTranslations.spatial.structureLanguage = [];
  packet.mediaTranslations.spatial.functionalNetwork = [];
  packet.mediaTranslations.spatial.functionalRelationships = [];
  packet.mediaTranslations.spatial.sceneProgram = [];
  packet.mediaTranslations.spatial.peopleBehavior = [];
  packet.mediaTranslations.spatial.mustBeVisible = [];
  packet.mediaTranslations.spatial.positiveDifferentiators = [];
  packet.creativeDecision.uniqueUpgradeThesis = '';
  packet.creativeDecision.targetWorldview = [];
  let threw = false;
  try {
    adaptSpaceSource({ packet, taskContract });
  } catch (err) {
    threw = true;
    assert.ok(isSpaceSourceInsufficient(err));
    assert.ok(Array.isArray(err.missing) && err.missing.length > 0);
  }
  assert.ok(threw, 'expected SPACE_PHASE9B_SOURCE_INSUFFICIENT');
});

test('compiled prompt has Phase 9B block order with architecture before brand', () => {
  const result = compileSpacePrompt({ packet: makePacket(), taskContract, brandKey: 'jiuzhou-aesthetics' });
  const ids = result.blockIds;
  const idx = (id) => ids.indexOf(id);

  // Architecture layers precede brand.
  assert.ok(idx('spatial_intent') < idx('architecture_language'), 'spatial_intent before architecture_language');
  assert.ok(idx('architecture_language') < idx('architecture_function_bridge'), 'architecture_language before bridge');
  assert.ok(idx('architecture_function_bridge') < idx('architectural_concept'), 'bridge before concept');
  assert.ok(idx('architectural_concept') < idx('architecture_dna'), 'concept before dna');
  assert.ok(idx('architecture_dna') < idx('brand_translation'), 'architecture before brand');
  assert.ok(idx('brand_translation') < idx('material'), 'brand before material');
  assert.equal(ids[ids.length - 1], 'negative_constraints', 'negatives last');

  // With JZMX anchors, architecture_context block is present and before bridge.
  assert.ok(ids.includes('architecture_context'), 'architecture_context present for JZMX');
  assert.ok(idx('architecture_context') < idx('architecture_function_bridge'));
});

test('compiler is deterministic', () => {
  const a = compileSpacePrompt({ packet: makePacket(), taskContract, brandKey: 'jiuzhou-aesthetics' });
  const b = compileSpacePrompt({ packet: makePacket(), taskContract, brandKey: 'jiuzhou-aesthetics' });
  assert.equal(a.finalPrompt, b.finalPrompt);
  assert.equal(a.trace.sourceFingerprint, b.trace.sourceFingerprint);
});

test('compiler does not hardcode project/brand-specific rules', () => {
  // The same packet structure with a different, unknown brand should still
  // compile (anchors simply absent) and never branch on the brand string.
  const result = compileSpacePrompt({ packet: makePacket(), taskContract, brandKey: 'some-unknown-brand' });
  assert.ok(!result.blockIds.includes('architecture_context'), 'unknown brand has no anchors');
  assert.ok(result.finalPrompt.includes('Architectural Concept'));
});

test('selected JZMX anchors resolve to real on-disk reference images', () => {
  const result = compileSpacePrompt({ packet: makePacket(), taskContract, brandKey: 'jiuzhou-aesthetics' });
  assert.ok(result.anchors.length > 0, 'JZMX selects anchors');
  const withImages = result.referenceImages.filter((r) => r.imagePath);
  assert.ok(withImages.length > 0, 'at least one anchor has a real image');
});

test('negatives never outweigh positive architecture content', () => {
  const result = compileSpacePrompt({ packet: makePacket(), taskContract, brandKey: 'jiuzhou-aesthetics' });
  assert.ok(result.budget.negativeRatio <= 0.30, `negative ratio ${result.budget.negativeRatio} > 0.30`);
});
