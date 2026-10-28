import test from 'node:test';
import assert from 'node:assert/strict';
import { createShortChainTaskContract } from '../src/generation-runtime/generation/task-contract.js';

const BASE = {
  projectId: 'b1d70c9d-6d92-485e-9a8f-ac9339ddfc8a',
  deliverableFamily: 'space',
  subtype: 'dining',
  shot: 'three_quarter_wide',
  currentInstruction: '商场店，品牌 IP，明档',
  aspectRatio: '16:9',
  count: 1
};

test('knowledgeContext is absent by default', () => {
  const task = createShortChainTaskContract(BASE);
  assert.equal(task.knowledgeContext, undefined);
});

test('knowledgeContext keeps id, source and text, and drops empty entries', () => {
  const task = createShortChainTaskContract({
    ...BASE,
    knowledgeContext: [
      { id: 'H1', source: '冯烫烫', text: '  暖黄偏暗优于明亮均匀  ' },
      { id: 'H2', source: '冯烫烫', text: '   ' },
      { source: 'case-library', text: '排烟罩收进结构' }
    ]
  });
  assert.equal(task.knowledgeContext.length, 2);
  assert.deepEqual(task.knowledgeContext[0], { id: 'H1', source: '冯烫烫', text: '暖黄偏暗优于明亮均匀' });
  assert.deepEqual(task.knowledgeContext[1], { id: '', source: 'case-library', text: '排烟罩收进结构' });
});

test('knowledgeContext is capped at seven entries', () => {
  const many = Array.from({ length: 12 }, (_, i) => ({ id: 'H' + i, source: 'case', text: 'rule ' + i }));
  const task = createShortChainTaskContract({ ...BASE, knowledgeContext: many });
  assert.equal(task.knowledgeContext.length, 7);
  assert.equal(task.knowledgeContext[6].id, 'H6');
});

test('knowledgeContext text is capped at 1200 characters', () => {
  const task = createShortChainTaskContract({
    ...BASE,
    knowledgeContext: [{ id: 'long', source: 'case', text: 'x'.repeat(2000) }]
  });
  assert.equal(task.knowledgeContext[0].text.length, 1200);
});
