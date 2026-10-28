import test from 'node:test';
import assert from 'node:assert/strict';
import { createShortChainTaskContract } from '../src/generation-runtime/generation/task-contract.js';

const BASE = {
  projectId: 'b2bc6cf8-fad4-4770-a49b-b6fbee59745b',
  deliverableFamily: 'space',
  subtype: 'dining',
  shot: 'three_quarter_wide',
  currentInstruction: '临街潮汕牛杂，中央明档',
  aspectRatio: '16:9',
  count: 1
};

test('style controls are absent unless explicitly supplied', () => {
  const task = createShortChainTaskContract(BASE);
  assert.equal(task.styleControls, undefined);
});

test('supplied style controls fill defaults including no numeric prices', () => {
  const task = createShortChainTaskContract({ ...BASE, styleControls: { lighting: 'warm_dim' } });
  assert.equal(task.styleControls.lighting, 'warm_dim');
  assert.equal(task.styleControls.density, 'designer_choice');
  assert.equal(task.styleControls.priceDisplay, 'none');
});

test('known style values are preserved', () => {
  const task = createShortChainTaskContract({
    ...BASE,
    styleControls: {
      lighting: 'warm_dim',
      density: 'dense',
      materials: 'brick_wood',
      brandColorArea: 'accent',
      tradition: 'balanced',
      props: 'lived_in',
      shot: 'interior',
      priceDisplay: 'real_menu'
    }
  });
  assert.equal(task.styleControls.lighting, 'warm_dim');
  assert.equal(task.styleControls.priceDisplay, 'real_menu');
  assert.equal(task.styleControls.shot, 'interior');
});

test('unknown style values fall back to designer choice without failing the task', () => {
  const task = createShortChainTaskContract({
    ...BASE,
    styleControls: { lighting: 'neon_everywhere', density: 42, priceDisplay: 'invented' }
  });
  assert.equal(task.styleControls.lighting, 'designer_choice');
  assert.equal(task.styleControls.density, 'designer_choice');
  assert.equal(task.styleControls.priceDisplay, 'none');
});

test('style controls do not interfere with knowledgeContext', () => {
  const task = createShortChainTaskContract({
    ...BASE,
    styleControls: { density: 'dense' },
    knowledgeContext: [{ id: 'lived-in-detail', source: '冯烫烫', text: '桌面细节提升烟火气' }]
  });
  assert.equal(task.knowledgeContext.length, 1);
  assert.equal(task.styleControls.density, 'dense');
});
