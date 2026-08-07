// Space prompt budget tests (Recovery R5).
import test from 'node:test';
import assert from 'node:assert/strict';
import { measurePromptBudget, assertPromptBudget } from '@masterpiece/image-generation-runtime/vnext/space-quality/index.js';

test('budget passes for a target-length prompt with positive majority', () => {
  const blocks = {
    architectural_concept: 'x'.repeat(2000),
    material: 'm'.repeat(2000),
    lighting: 'l'.repeat(2000),
    negative_constraints: 'n'.repeat(500),
  };
  const prompt = Object.values(blocks).join('\n\n');
  const budget = measurePromptBudget(prompt, blocks);
  assert.equal(budget.status, 'pass');
  assert.ok(budget.negativeRatio < 0.30);
});

test('budget warns on high negative density', () => {
  const blocks = {
    architectural_concept: 'x'.repeat(200),
    negative_constraints: 'n'.repeat(4000),
  };
  const budget = measurePromptBudget(Object.values(blocks).join('\n\n'), blocks);
  assert.ok(budget.findings.some((f) => f.code === 'SPACE_NEGATIVE_DENSITY_TOO_HIGH'));
});

test('budget blocks above the adapter limit', () => {
  const blocks = { architectural_concept: 'x'.repeat(8000) };
  const budget = measurePromptBudget('x'.repeat(8000), blocks);
  assert.equal(budget.status, 'blocked');
  assert.ok(budget.findings.some((f) => f.code === 'SPACE_PROMPT_EXCEEDS_ADAPTER_LIMIT'));
  assert.throws(() => assertPromptBudget(budget), /SPACE_PROMPT_BUDGET_BLOCKED/);
});
