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
