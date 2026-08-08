// Tests: space spatial mechanism source (R8.5.1 §3, §4, §5, §26)
//
// End-to-end: a JZMX-style packet (which historically caused the
// brand-motif architecture pollution) must compile to a prompt where:
//   - architecture blocks contain no motif literal (羽毛/孔雀/feather/...)
//   - the brand translation block contains the motif side
//   - the prompt length is within +5% of the failed R8.5 smoke
//   - the spatial_concept identity in architecture is normalized
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  compilePhase9bSpacePrompt,
} from '@masterpiece/image-generation-runtime/vnext/space-quality/index.js';
import { readFileSync } from 'node:fs';

const PACKET_PATH = 'space-generator/quality-baselines/r85-text-only-smokes/_packets/jiuzhou-aesthetics/visual-decision-packet.json';
const FAILED_PROMPT_PATH = 'space-generator/quality-baselines/r85-text-only-smokes/jiuzhou-aesthetics/reception-v1/prompt.md';

function loadJZMX() {
  return JSON.parse(readFileSync(PACKET_PATH, 'utf8'));
}

test('source: rendered architecture blocks contain no motif literal', () => {
  const packet = loadJZMX();
  const out = compilePhase9bSpacePrompt({
    packet,
    taskContract: {
      deliverableFamily: 'space',
      subtype: 'reception',
      shot: 'entrance_view',
      currentInstruction: 'reception test',
      aspectRatio: '16:9',
      mustAvoid: [],
    },
    brandKey: 'jiuzhou-aesthetics',
    anchorMaxCount: 0,
  });

  // The architecture-only block ids. These must NOT contain motif literals
  // (羽毛, 孔雀, feather, peacock, plume).
  const archBlocks = ['spatial_intent', 'architecture_language', 'architectural_concept', 'architecture_dna'];
  const motifRe = /羽毛|翎|孔雀|feather|plume|peacock/i;
  for (const id of archBlocks) {
    const text = out.blocksById[id]?.text || '';
    assert.ok(!motifRe.test(text), `arch block "${id}" must not contain motif literal`);
  }
});

test('source: experience goal / concept primary has no motif title', () => {
  const packet = loadJZMX();
  const out = compilePhase9bSpacePrompt({
    packet,
    taskContract: { deliverableFamily: 'space', subtype: 'reception', aspectRatio: '16:9', mustAvoid: [] },
    brandKey: 'jiuzhou-aesthetics',
    anchorMaxCount: 0,
  });
  const concept = out.layers.architecturalConcept.primary || '';
  const expGoal = out.layers.spatialIntent.experienceGoal || '';
  for (const s of [concept, expGoal]) {
    assert.ok(!/翎羽之境|羽|孔雀|Realm of Feathers/i.test(s),
      `architecture concept / experience goal must not contain motif title: "${s}"`);
  }
});

test('source: brand-motif stream captures the motif side', () => {
  const packet = loadJZMX();
  const out = compilePhase9bSpacePrompt({
    packet,
    taskContract: { deliverableFamily: 'space', subtype: 'reception', aspectRatio: '16:9', mustAvoid: [] },
    brandKey: 'jiuzhou-aesthetics',
    anchorMaxCount: 0,
  });
  const motifs = out.layers.semantic.brandMotifSemantics;
  assert.ok(motifs.length >= 1, 'expects brand-motif stream to be populated');
});

test('source: prompt length is within +5% of the failed R8.5 smoke', () => {
  const packet = loadJZMX();
  const out = compilePhase9bSpacePrompt({
    packet,
    taskContract: { deliverableFamily: 'space', subtype: 'reception', aspectRatio: '16:9', mustAvoid: [] },
    brandKey: 'jiuzhou-aesthetics',
    anchorMaxCount: 0,
  });
  const failed = readFileSync(FAILED_PROMPT_PATH, 'utf8');
  // strip leading '# ' headers of failed prompt? Failed prompt is the full
  // finalPrompt body, so just compare lengths.
  const newLen = out.finalPrompt.length;
  const oldLen = failed.length;
  const ratio = newLen / oldLen;
  assert.ok(ratio <= 1.05, `prompt grew more than 5%: new=${newLen} old=${oldLen} ratio=${ratio.toFixed(3)}`);
});

test('source: COMPILER still emits a complete block set', () => {
  const packet = loadJZMX();
  const out = compilePhase9bSpacePrompt({
    packet,
    taskContract: { deliverableFamily: 'space', subtype: 'reception', aspectRatio: '16:9', mustAvoid: [] },
    brandKey: 'jiuzhou-aesthetics',
    anchorMaxCount: 0,
  });
  const required = ['task', 'spatial_intent', 'architecture_language', 'architecture_function_bridge', 'architectural_concept', 'architecture_dna', 'brand_translation', 'functional_requirement', 'material', 'lighting', 'composition', 'rendering', 'negative_constraints'];
  for (const id of required) {
    assert.ok(out.blocksById[id], `block ${id} present`);
  }
});

test('source: brand translation block still mentions the brand explicitly', () => {
  const packet = loadJZMX();
  const out = compilePhase9bSpacePrompt({
    packet,
    taskContract: { deliverableFamily: 'space', subtype: 'reception', aspectRatio: '16:9', mustAvoid: [] },
    brandKey: 'jiuzhou-aesthetics',
    anchorMaxCount: 0,
  });
  // The brand block is the only place where brand identity (post-composite)
  // belongs. It must mention 九州美学.
  const brand = out.blocksById.brand_translation?.text || '';
  assert.ok(/九州美学|医疗美容|brand/i.test(brand), 'brand block should still identify the brand');
});
