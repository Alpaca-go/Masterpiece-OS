import test from 'node:test';
import assert from 'node:assert/strict';
import { compileTransformationBrief, validateCreativeDirectorBrief } from '../../packages/image-generation-runtime/src/creative-director/index.js';

const input = {
  projectId: 'project-1', mode: 'upgrade', generatedAt: '2026-07-27T00:00:00.000Z',
  visualContext: { brandName: 'Example' }, visualAnalysisReport: 'Replace the legacy collage composition.',
  assets: [{ assetId: 'logo', name: 'Logo' }, { assetId: 'legacy-board', name: 'Legacy board' }, { assetId: 'pack', name: 'Package structure' }],
  userIntent: { outputType: 'anchor_image', description: 'Create an upgraded anchor.', aspectRatio: '16:9' },
  lockedAssets: { brandName: 'Example', logoAssetIds: ['logo'], lockedFacts: ['Brand name Example'], requiredStructures: ['Package silhouette'] },
  modelConfig: { providerProfileId: 'profile-1', modelId: 'text-model' },
};

function validBrief() {
  return {
    preserve: { identity: ['Brand name Example', 'logo'], visualAssets: [], structures: ['Package silhouette'] },
    mustChange: { composition: ['Replace the collage'], graphicLanguage: ['Create a singular hero gesture'], hierarchy: [], material: [], photography: [], applicationStrategy: [] },
    prohibitedCarryover: ['Do not reuse the old four-panel layout'],
    newDirection: { visualAnchor: 'A sculptural product stage', sceneMechanism: 'One central scene', compositionStrategy: ['Centered depth'], colorRelationship: ['Warm color against neutral'], materialAndLighting: ['Soft side light'], typographyRelationship: [], informationHierarchy: [] },
    imageReferencePlan: { identity_reference: ['logo'], structure_reference: ['pack'], style_reference: [], analysis_only: ['legacy-board'], excluded: [] },
    creativeDifferenceTarget: { level: 'medium', explanation: 'Preserve identity while changing visual expression.' }, warnings: []
  };
}

test('Creative Director compiles and validates a deterministic upgrade brief', async () => {
  const response = `\`\`\`json\n${JSON.stringify(validBrief())}\n\`\`\``;
  const result = await compileTransformationBrief(input, { invokeModel: async () => response });
  assert.equal(result.brief.mode, 'upgrade');
  assert.equal(result.brief.generatedAt, input.generatedAt);
  assert.equal(result.validation.valid, true);
  assert.match(result.prompt, /legacy-board/);
});

test('Creative Director rejects locked assets marked as changeable', () => {
  const brief = { ...validBrief(), mustChange: { ...validBrief().mustChange, composition: ['Replace Brand name Example'] } };
  assert.ok(validateCreativeDirectorBrief(brief, input).issues.includes('LOCKED_ASSET_MARKED_AS_CHANGEABLE'));
});
