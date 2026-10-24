// Offline methodology probes, never imported by production.
// These briefs and their decisions are human-authored synthetic examples.
// Passing does not prove autonomous analysis or generated-image quality.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {analysisDirectionSuggestion} from '../../src/analysis-direction-suggestion.js';
import {compileSpacePrompt} from '../../src/generation-runtime/space/compiler.js';

const cases = [
  {
    id: 'bakery-methodology', brand: 'Community Bakery', industry: 'Bakery retail',
    concept: 'A warm bakery with readable purchase and collection steps',
    nodes: ['Bakery entrance', 'Bread display', 'Payment counter', 'Separate collection point'],
    network: 'Bakery entrance connects to bread display, then payment counter and separate collection point.',
    relationship: 'The payment queue stays beside the bread display; collection customers approach from the other side without crossing the entrance.',
    visible: 'Separate payment and collection worktops remain visible, with a clear customer approach to each and an unobstructed entrance.',
    architecture: 'Bakery timber display shelves define the retail edge and leave the central customer route open.',
    material: 'Natural timber', behavior: 'Visible fine grain with matte reflection',
    color: 'Warm ochre', scope: 'Bakery display backing panels only',
    exclude: /pearlescent|珠光|九州|consultation|advisory workstation|treatment|equipment fitting/iu,
  },
  {
    id: 'outdoor-methodology', brand: 'Trail Equipment Studio', industry: 'Outdoor equipment retail',
    concept: 'A practical equipment studio with a distinct hands-on fitting area',
    nodes: ['Equipment entrance', 'Equipment display', 'Pack fitting area', 'Comparison worktable'],
    network: 'Equipment entrance connects to equipment display and pack fitting area, with a comparison worktable beside the fitting area.',
    relationship: 'Pack fitting remains outside the browsing aisle; the comparison worktable separates staff and visitor sides with access on both sides.',
    visible: 'A pack fitting platform and an independent comparison worktable are readable; two accessible chairs face each other across the worktable.',
    architecture: 'Equipment display bays occupy the perimeter and leave open access around the fitting platform.',
    material: 'Brushed aluminum', behavior: 'Restrained directional reflection with visible surface grain',
    color: 'Forest green', scope: 'Equipment display backing panels only',
    exclude: /pearlescent|珠光|九州|treatment|bread display|payment counter|collection point/iu,
  },
];

function input(c) {
  const color = {name:c.color, role:'Display accent', spatialUsage:'local_accent', surfaceApplicability:c.scope};
  const material = {material:c.material, behavior:[c.behavior], brandRole:c.architecture, forbidden:['Mirror finish']};
  const lighting = {source:['Diffuse daylight'], contrast:'Moderate', interactionWithMaterials:['Soft surface reflection'], forbidden:[]};
  const packet = {
    projectId:c.id, schemaVersion:'1.0',
    validation:{hardFactStatus:'pass', executionDataStatus:'ready'},
    projectFacts:{brandName:{value:c.brand}, industry:{value:c.industry}, brandRole:{value:c.concept}},
    creativeDecision:{uniqueUpgradeThesis:c.concept, targetWorldview:[], strategicNegatives:['Blocked entrance']},
    mediaTranslations:{spatial:{
      spatialConcept:c.concept, sceneProgram:c.nodes, functionalNetwork:[c.network],
      functionalRelationships:[c.relationship], mustBeVisible:[c.visible], structureLanguage:[c.architecture],
      signatureSpatialMechanism:[c.architecture], brandRoleManifestation:[], positiveDifferentiators:[],
      materialLanguage:[material], lightingLanguage:lighting,
      colorBehavior:{primary:[], secondary:[], accent:[color], forbidden:[]},
    }},
    colorSystem:{primary:[], secondary:[], accent:[color], forbidden:[]},
    materialSystem:[material], lightingSystem:lighting,
  };
  return {packet, projectContext:{}, taskContract:{projectId:c.id, generationBasis:'standard', subtype:'custom', aspectRatio:'16:9'}};
}

for (const c of cases) {
  test(`${c.id}: current-project relations and scope reach suggestion and compiler without mutation`, () => {
    const source = input(c);
    const before = structuredClone(source);
    const suggestion = analysisDirectionSuggestion(c.id, source.packet, 'offline-analysis-fingerprint');
    assert.equal(suggestion.sourceType, 'analysis_suggestion');
    assert.equal(suggestion.fields.functionalNetwork, c.network);
    assert.equal(suggestion.fields.functionalRelationships, c.relationship);
    assert.equal(suggestion.fields.visibleRequirements, c.visible);
    assert.equal(suggestion.fields.colorEntries[0].surfaceApplicability, c.scope);
    assert.deepEqual(suggestion.sourcePaths.functionalRelationships, ['mediaTranslations.spatial.functionalRelationships[0]']);
    const result = compileSpacePrompt(source);
    for (const relation of [c.network, c.relationship, c.visible, c.architecture, c.scope]) {
      assert.ok(result.finalPrompt.includes(relation), `Lost decision: ${relation}`);
    }
    assert.doesNotMatch(result.finalPrompt, c.exclude);
    assert.deepEqual(source, before);
  });
}

test('insufficient evidence remains absent rather than acquiring another project decision', () => {
  const source = input(cases[0]);
  const spatial = source.packet.mediaTranslations.spatial;
  spatial.signatureSpatialMechanism = [];
  delete spatial.functionalRelationships;
  delete spatial.colorBehavior.accent[0].surfaceApplicability;
  delete spatial.colorBehavior.accent[0].spatialUsage;
  const result = analysisDirectionSuggestion(cases[0].id, source.packet, 'partial');
  assert.equal(result.fields.functionalRelationships, '');
  assert.equal(result.fields.artisticFocus, '');
  assert.equal(result.fields.colorEntries[0].surfaceApplicability, '');
  assert.equal(result.fields.colorEntries[0].spatialUsage, '');
  for (const field of ['functionalRelationships', 'artisticFocus', 'colorEntries[0].surfaceApplicability', 'colorEntries[0].spatialUsage']) {
    assert.ok(result.missingFields.some(item => item.field === field), field);
  }
  assert.throws(() => analysisDirectionSuggestion(cases[1].id, source.packet, 'partial'), /PROJECT_MISMATCH/);
});

test('brand or industry renaming alone does not change functional decisions or invent artwork', () => {
  const source = input(cases[0]);
  const first = analysisDirectionSuggestion(cases[0].id, source.packet, 'before');
  source.packet.projectFacts.brandName.value = 'Unrelated name';
  source.packet.projectFacts.industry.value = 'Medical aesthetics';
  const second = analysisDirectionSuggestion(cases[0].id, source.packet, 'after');
  assert.deepEqual(second.fields, first.fields);
  const prompt = compileSpacePrompt(source).finalPrompt;
  assert.ok(prompt.includes(cases[0].relationship));
  assert.doesNotMatch(prompt, /pearlescent|珠光|advisory workstation/iu);
});

test('relationship mutation is preserved as a change, not accepted on object counts', () => {
  const source = input(cases[1]);
  const before = compileSpacePrompt(source);
  const wrong = 'Two chairs sit on the same side of the comparison worktable facing the same direction.';
  source.packet.mediaTranslations.spatial.mustBeVisible = [wrong];
  const after = compileSpacePrompt(source);
  assert.notEqual(after.finalPrompt, before.finalPrompt);
  assert.ok(before.finalPrompt.includes(cases[1].visible));
  assert.ok(!after.finalPrompt.includes(cases[1].visible));
  assert.ok(after.finalPrompt.includes(wrong));
  // This exposes the limit: the existing compiler carries supplied semantics;
  // it does not independently judge their correctness or resolve contradictions.
});

test('historical P7a formal and provider prompts retain their recorded text hashes', () => {
  for (const [name, expected] of [
    ['P7a-formal-prompt.txt', '031d2d20b203d73b5a11b77c27792bde9b02a15cc912c8e0c5f2d9f8dd886ab9'],
    ['P7a-provider-prompt.txt', 'a7b402054cc0153517dd3d2411668fe0d1583f89c9c9eb3b8f30b6d64edfdc97'],
  ]) {
    // Git checkouts may use CRLF on Windows; historical hashes describe LF text.
    const text = readFileSync(new URL(`../../reports/p7a-prompt-budget/${name}`, import.meta.url), 'utf8').replace(/\r\n/g, '\n');
    assert.equal(createHash('sha256').update(text).digest('hex'), expected);
  }
});
