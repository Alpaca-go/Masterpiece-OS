import assert from 'node:assert/strict';
import test from 'node:test';
import { structuredAnalysisPacketFixture } from '../../../tests/runtime-application/analysis-runtime-fixtures.ts';
import { buildVisualDecisionPacket } from '../src/runtime/visual-decision-packet.js';
import { evaluateDeliverableSufficiency } from '../src/analysis-decisions/deliverable-sufficiency.js';
import { completeStructuredAnalysis } from '../src/analysis-decisions/analysis-completion-orchestrator.js';
import { validateSpatialSemantics } from '../src/generation-runtime/space/semantic/validate-spatial-semantics.js';
import { adaptSpaceSource } from '../src/generation-runtime/space/source-adapter.js';
import { compileSpatialMechanisms } from '../src/generation-runtime/space/semantic/compile-spatial-mechanisms.js';
import { compileSpacePrompt } from '../src/generation-runtime/space/compiler.js';
import { createMultiModelImageAdapter } from '../src/image-adapter/multi-model.js';
import { sanitizeBrandManifestation } from '../src/generation-runtime/space/semantic/sanitize-brand-expression.js';

const execution = { outputLanguage: 'en', aspectRatio: '16:9', camera: { focalLength: '35mm' } };

test('Packet and source adapter reject empty functional data even with a stale ready flag', () => {
  const packet = structuredAnalysisPacketFixture();
  packet.mediaTranslations.spatial.functionalNetwork = [];
  packet.mediaTranslations.spatial.functionalRelationships = ['   '];
  const normalized = buildVisualDecisionPacket({core: packet, extracted: packet});
  assert.equal(normalized.validation.executionDataStatus, 'insufficient');
  assert.ok(normalized.validation.missingExecutionFields.includes('mediaTranslations.spatial.functionalNetwork'));
  assert.throws(() => adaptSpaceSource({packet, taskContract: {generationBasis:'standard'}, projectContext:{}}), /functionalNetwork/);
});

test('blank string arrays cannot satisfy spatial decision repair', () => {
  const packet = structuredAnalysisPacketFixture();
  packet.mediaTranslations.spatial.signatureSpatialMechanism = ['   '];
  packet.mediaTranslations.spatial.functionalNetwork = [' ', '\t', '\n'];
  const result = evaluateDeliverableSufficiency({packet, deliverable:'space', execution});
  assert.ok(result.issues.some(issue => issue.path.endsWith('signatureSpatialMechanism')));
  assert.ok(result.issues.some(issue => issue.path.endsWith('functionalNetwork')));
});

test('stale ready packet cannot compile when all functional entries are removed by cleanup', () => {
  const packet = structuredAnalysisPacketFixture();
  packet.mediaTranslations.spatial.functionalNetwork = ['大型艺术装置'];
  packet.mediaTranslations.spatial.functionalRelationships = ['大型艺术装置'];
  assert.throws(() => adaptSpaceSource({packet, taskContract:{generationBasis:'standard'}, projectContext:{}}), /after semantic cleanup/);
});

test('semantic cleanup cannot erase required data and still complete analysis', async () => {
  const packet = structuredAnalysisPacketFixture();
  packet.mediaTranslations.spatial.functionalNetwork[0] = '围绕大型艺术装置组织布局';
  const result = await completeStructuredAnalysis({packet, deliverable:'space', execution,
    model: async () => { throw new Error('unexpected repair'); },
    validateFinalPacket: candidate => validateSpatialSemantics(candidate.mediaTranslations.spatial),
    repairInvalidFinalPacket: async ({packet: candidate}) => {
      const cleaned = structuredClone(candidate);
      cleaned.mediaTranslations.spatial.functionalNetwork = [];
      cleaned.mediaTranslations.spatial.functionalRelationships = [];
      return cleaned;
    },
  });
  assert.equal(result.status, 'failed');
  assert.ok(result.unresolvedFields.includes('mediaTranslations.spatial.functionalNetwork'));
});

test('explicit material installation survives in brand layer, outside the functional and architectural layers', () => {
  const packet = structuredAnalysisPacketFixture();
  const installation = '层叠半透明珠光薄片艺术装置，柔光穿透薄片';
  packet.mediaTranslations.spatial.signatureSpatialMechanism = [installation];
  const semantics = compileSpatialMechanisms(packet);
  assert.ok(semantics.brandMotifSemantics.some(item => item.text === installation));
  assert.ok(!semantics.architectureSemantics.some(item => item.text === installation));
  assert.ok(!semantics.functionalSemantics.some(item => item.text === installation));
  const layers = adaptSpaceSource({packet, taskContract:{generationBasis:'standard'}, projectContext:{}});
  assert.ok(layers._raw.brandRoleManifestation.includes(installation));
  assert.ok(!layers._raw.functionalNetwork.includes(installation));
  const compiled = compileSpacePrompt({packet, taskContract:{generationBasis:'standard',aspectRatio:'16:9'}, projectContext:{}});
  const adapter = createMultiModelImageAdapter({adapterId:'seedream-5.0-pro',modelId:'configured-image-model',apiKey:'test-key',baseUrl:'https://example.invalid/v3'});
  const request = adapter.compileRequest({prompt:compiled.finalPrompt,negativeRules:[],aspectRatio:'16:9',imageSize:'2K',outputCount:1,references:[]});
  assert.ok(request.body.prompt.includes(installation));
  assert.ok(request.body.prompt.endsWith(compiled.finalPrompt));
  assert.match(request.body.prompt.slice(0, -compiled.finalPrompt.length), /Output aspect ratio: 16:9/);
  assert.equal(request.body.model, 'configured-image-model');
  assert.ok(!request.body.image);
});

test('installation preservation retains identity and gradient guards', () => {
  assert.deepEqual(sanitizeBrandManifestation(['带 Logo 的艺术装置']).lines, []);
  const result = sanitizeBrandManifestation(['白到紫色渐变的艺术装置']);
  assert.equal(result.records[0].reason, 'color_demoted_to_accent');
});

test('ordinary hospitality space needs no art object and packaging is unaffected', () => {
  const packet = structuredAnalysisPacketFixture();
  const layers = adaptSpaceSource({packet, taskContract:{generationBasis:'standard'}, projectContext:{}});
  assert.doesNotMatch(JSON.stringify(layers), /艺术装置|sculpture/iu);
  assert.equal(evaluateDeliverableSufficiency({packet,deliverable:'space',execution}).status,'ready');
  packet.mediaTranslations.spatial.functionalNetwork = [];
  assert.equal(evaluateDeliverableSufficiency({packet,deliverable:'packaging',execution}).status,'ready');
});
