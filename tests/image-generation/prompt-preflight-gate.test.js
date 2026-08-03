import assert from 'node:assert/strict';
import test from 'node:test';
import { runPromptPreflightGate } from '@masterpiece/image-generation-runtime/gates/prompt-preflight-gate.js';
import { compileProjectSpecificGenerationContract } from '@masterpiece/creative-production-runtime/project-generation-contract.js';
import { phase1Packet } from '../fixtures/phase1.js';

test('preflight blocks cross-media language in a packaging prompt', () => {
  const packet = phase1Packet();
  const projectContract = compileProjectSpecificGenerationContract({
    visualDecisionPacket: packet,
    deliverable: 'packaging',
  });
  const report = runPromptPreflightGate({
    finalPrompt: '包装盒使用接待台、空间动线与天花结构。',
    taskContract: { deliverableFamily: 'packaging' },
    projectContract,
    packagingTranslation: packet.mediaTranslations.packaging,
  });
  assert.equal(report.status, 'blocked');
  assert.ok(report.findings.some((item) => item.code === 'CROSS_MEDIA_LANGUAGE_LEAK'));
});

test('preflight detects other-project and Golden content leakage', () => {
  const packet = phase1Packet();
  const projectContract = compileProjectSpecificGenerationContract({
    visualDecisionPacket: packet,
    deliverable: 'packaging',
  });
  const report = runPromptPreflightGate({
    finalPrompt: 'Foreign Brand exact frozen evaluation phrase',
    taskContract: { deliverableFamily: 'packaging' },
    projectContract,
    packagingTranslation: packet.mediaTranslations.packaging,
    otherProjectTerms: ['Foreign Brand'],
    goldenFragments: ['exact frozen evaluation phrase'],
  });
  assert.ok(report.findings.some((item) => item.code === 'OTHER_PROJECT_SEMANTIC_LEAK'));
  assert.ok(report.findings.some((item) => item.code === 'GOLDEN_CONTENT_LEAK'));
});

test('preflight enforces the active adapter budget and returns actionable remediation', () => {
  const report = runPromptPreflightGate({
    finalPrompt: 'x'.repeat(101),
    taskContract: { deliverableFamily: 'poster' },
    requireProjectContract: false,
    maxPromptCharacters: 100,
  });
  const finding = report.findings.find((item) => item.code === 'PROMPT_CHARACTER_BUDGET_EXCEEDED');
  assert.equal(report.status, 'blocked');
  assert.equal(report.promptCharacters, 101);
  assert.equal(report.maxPromptCharacters, 100);
  assert.equal(finding?.remediation, 'restore_or_shorten_edited_prompt');
});

test('preflight exposes project specificity, legacy reuse and packaging evidence codes', () => {
  const packet = phase1Packet();
  // Pass an explicit minimal approvedCreativeDecision so the synthesiser
  // does not populate enough categories to flip specificity to 'ready'.
  // The test asserts that several blocker codes fire when the contract
  // itself is not yet project-specific enough.
  const projectContract = compileProjectSpecificGenerationContract({
    visualDecisionPacket: packet,
    deliverable: 'packaging',
    approvedCreativeDecision: { direction_id: 'pkt-fixture', version: '1' },
  });
  projectContract.mustTransform[0].targetExpression = ['写实羽毛照片'];
  const report = runPromptPreflightGate({
    finalPrompt: 'Generate a serum bottle package.',
    taskContract: {
      deliverableFamily: 'packaging',
      currentInstruction: '生成精华瓶包装',
      logoUsageMode: 'reference',
    },
    projectContract,
    packagingTranslation: {
      ...packet.mediaTranslations.packaging,
      productRoleEvidenceRefs: [],
      structureStrategy: [{ structure: '盒', evidenceRefs: [] }],
    },
  });
  const codes = new Set(report.findings.map((item) => item.code));
  for (const code of [
    'PROJECT_SPECIFICITY_TOO_LOW',
    'GENERIC_INDUSTRY_FALLBACK',
    'LITERAL_LEGACY_ASSET_REUSE',
    'PACKAGING_STRUCTURE_EVIDENCE_MISSING',
    'PACKAGING_PRODUCT_ROLE_MISSING',
    'UNSUPPORTED_PRODUCT_INVENTION',
  ]) assert.equal(codes.has(code), true, code);
});

test('spatial preflight requires a unique upgrade thesis and functional brand-role expression', () => {
  const packet = phase1Packet();
  const projectContract = compileProjectSpecificGenerationContract({
    visualDecisionPacket: packet,
    deliverable: 'space',
  });
  projectContract.upgradeThesis.statement = '';
  const report = runPromptPreflightGate({
    finalPrompt: 'Generic reception interior.',
    taskContract: { deliverableFamily: 'space', logoUsageMode: 'post_composite' },
    projectContract,
    spatialTranslation: {
      functionalRelationships: [],
      sceneProgram: [],
    },
  });
  const codes = new Set(report.findings.map((item) => item.code));
  assert.equal(codes.has('UNIQUE_UPGRADE_THESIS_MISSING'), true);
  assert.equal(codes.has('BRAND_ROLE_UNDEREXPRESSED'), true);
});

test('literal legacy asset scan ignores explicit prohibitions but blocks positive reuse', () => {
  const packet = phase1Packet();
  const projectContract = compileProjectSpecificGenerationContract({
    visualDecisionPacket: packet,
    deliverable: 'space',
  });
  const forbidden = projectContract.mustTransform[0].forbiddenLiteralUse[0];
  const base = {
    taskContract: { deliverableFamily: 'space', logoUsageMode: 'post_composite' },
    projectContract,
    spatialTranslation: {
      functionalRelationships: ['入口连接展示与接待', '咨询连接系统服务'],
      sceneProgram: ['入口识别', '专业咨询'],
    },
  };
  const prohibition = runPromptPreflightGate({
    ...base,
    finalPrompt: `${projectContract.projectIdentity.brandRole}\n禁止${forbidden}`,
  });
  assert.equal(
    prohibition.findings.some((item) =>
      item.code === 'LITERAL_LEGACY_ASSET_REUSE'
      && item.detail.includes('Positive generation instruction')),
    false,
  );
  const positive = runPromptPreflightGate({
    ...base,
    finalPrompt: `${projectContract.projectIdentity.brandRole}\n主体装饰使用${forbidden}`,
  });
  assert.equal(positive.findings.some((item) =>
    item.code === 'LITERAL_LEGACY_ASSET_REUSE'), true);
});

test('spatial preflight exposes all positive mechanism gate codes', () => {
  const packet = phase1Packet();
  const projectContract = compileProjectSpecificGenerationContract({
    visualDecisionPacket: packet,
    deliverable: 'space',
  });
  const report = runPromptPreflightGate({
    finalPrompt: `${projectContract.projectIdentity.brandRole}\nStrict negative: generic`,
    taskContract: { deliverableFamily: 'space', logoUsageMode: 'post_composite' },
    projectContract,
    spatialTranslation: {
      functionalRelationships: ['接待连接咨询'],
      sceneProgram: ['接待'],
      brandRoleManifestation: [],
      signatureSpatialMechanism: [],
      functionalNetwork: [],
      positiveDifferentiators: [],
      mustBeVisible: [],
    },
  });
  const codes = new Set(report.findings.map((item) => item.code));
  for (const code of [
    'POSITIVE_SPATIAL_MECHANISM_MISSING',
    'BRAND_ROLE_NOT_SPATIALLY_MANIFESTED',
    'FLAGSHIP_PROGRAM_TOO_GENERIC',
    'NEGATIVE_RULES_OUTWEIGH_POSITIVE_MECHANISM',
  ]) assert.equal(codes.has(code), true, code);
});

test('spatial preflight accepts rich brand constraints when positive mechanisms remain dominant', () => {
  const packet = phase1Packet();
  const projectContract = compileProjectSpecificGenerationContract({
    visualDecisionPacket: packet,
    deliverable: 'space',
  });
  const spatialTranslation = {
    functionalRelationships: ['entrance to reception', 'reception to waiting', 'waiting to service'],
    sceneProgram: ['arrival identity', 'guided reception', 'social waiting'],
    brandRoleManifestation: ['social arrival atmosphere', 'recognizable service ritual', 'welcoming pause'],
    signatureSpatialMechanism: ['layered identity threshold', 'continuous color-guided circulation'],
    functionalNetwork: ['entrance node', 'reception node', 'waiting node'],
    positiveDifferentiators: ['brand-led threshold', 'distinctive circulation rhythm'],
    mustBeVisible: ['identity threshold', 'reception relationship', 'material depth'],
  };
  Object.assign(projectContract, spatialTranslation);
  projectContract.mustTransform = [{
    sourceAsset: 'confirmed source',
    semanticMeaning: ['identity'],
    targetExpression: ['layered threshold'],
    forbiddenLiteralUse: Array.from({ length: 8 }, (_, index) => `legacy prohibition ${index}`),
    evidenceRefs: ['asset:confirmed'],
  }];
  const report = runPromptPreflightGate({
    finalPrompt: [
      `Approved upgrade thesis: avoid generic decoration while preserving ${projectContract.projectIdentity.brandRole}.`,
      'Positive Spatial Mechanism — Must Drive the Image',
      ...Object.values(spatialTranslation).flat(),
      'Tone Boundaries',
      'Strict negative: generic decoration',
    ].join('\n'),
    taskContract: {
      deliverableFamily: 'space',
      logoUsageMode: 'post_composite',
      mustAvoid: ['unrelated logo', 'moodboard', 'collage'],
    },
    projectContract,
    spatialTranslation,
  });

  assert.equal(
    report.findings.some((item) => item.code === 'NEGATIVE_RULES_OUTWEIGH_POSITIVE_MECHANISM'),
    false,
  );
});
