import assert from 'node:assert/strict';
import test from 'node:test';
import { runPromptPreflightGate } from '../../packages/image-generation-runtime/src/gates/prompt-preflight-gate.js';
import { compileProjectSpecificGenerationContract } from '../../packages/creative-production-runtime/src/project-generation-contract.js';
import { phase1Packet } from '../phase1-fixtures.js';

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

test('preflight exposes project specificity, legacy reuse, packaging evidence and Logo route codes', () => {
  const packet = phase1Packet();
  const projectContract = compileProjectSpecificGenerationContract({
    visualDecisionPacket: packet,
    deliverable: 'packaging',
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
    'LOGO_POST_COMPOSITE_ROUTE_NOT_ENFORCED',
  ]) assert.equal(codes.has(code), true, code);
});
