// Space prompt budget tests (Recovery R5).
//
// r10.4 regression repair — the budget is SPLIT into two distinct layers:
//   1. Compiler / Quality Prompt Budget (7500, monitoring, never fail-closed).
//   2. Provider Hard Limit (resolved from the Seedream Adapter Capability,
//      fail-closed).
//
// The hard cap is read from `SEEDREAM_ADAPTER_CAPABILITY.prompt.maxCharacters`
// through `resolveProviderPromptLimit()` so this test file never re-declares
// the number; the adapter capability is the single source of truth.
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  measurePromptBudget,
  assertPromptBudget,
  resolveProviderPromptLimit,
} from '@masterpiece/image-generation-runtime/vnext/space-quality/index.js';
import { SEEDREAM_ADAPTER_CAPABILITY } from '@masterpiece/image-generation-runtime/vnext/seedream-adapter.js';

const QUALITY_BUDGET = 7_500;
const PROVIDER_LIMIT = resolveProviderPromptLimit();
const ABOVE_QUALITY = QUALITY_BUDGET + 100; // 7600 — above quality, under provider
const AT_CAP = PROVIDER_LIMIT; // boundary: exactly at provider cap
const OVER_CAP = PROVIDER_LIMIT + 1; // one over: must block

// Sanity: the single source of truth is wired through the resolver. If the
// adapter capability ever changes, this test will fail loud and we update the
// expected ranges below.
test('resolveProviderPromptLimit() reads the Seedream Adapter Capability (no hardcoded copy)', () => {
  assert.equal(PROVIDER_LIMIT, SEEDREAM_ADAPTER_CAPABILITY.prompt.maxCharacters);
  assert.ok(PROVIDER_LIMIT > QUALITY_BUDGET, 'provider cap must sit above the quality budget');
});

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

// r10.4 regression repair: prompts that exceed the old 7500 quality budget
// but are still under the real Provider cap (e.g. 7588 / 7655 / 8000 / 11000)
// must PASS the budget gate. The quality overflow surfaces as a WARN finding
// (`SPACE_PROMPT_ABOVE_QUALITY_BUDGET`) plus the `qualityBudgetExceeded`
// trace flag, but it must NOT block generation.
test('8000-char prompt: passes Provider limit, only flags quality-budget warn (no block)', () => {
  const blocks = { architectural_concept: 'x'.repeat(8000) };
  const budget = measurePromptBudget('x'.repeat(8000), blocks);
  assert.equal(budget.status, 'pass', '8000 chars is under the provider cap, must not block');
  assert.equal(budget.qualityBudgetExceeded, true);
  assert.equal(budget.adapterLimit, PROVIDER_LIMIT);
  assert.equal(budget.providerLimit, PROVIDER_LIMIT);
  assert.ok(
    budget.findings.some((f) => f.code === 'SPACE_PROMPT_ABOVE_QUALITY_BUDGET' && f.severity === 'warn'),
    'expected quality-budget warn (non-block)',
  );
  assert.ok(
    !budget.findings.some((f) => f.code === 'SPACE_PROMPT_EXCEEDS_ADAPTER_LIMIT'),
    'must NOT raise the provider hard-cap finding under the cap',
  );
  // assertPromptBudget must NOT throw — the budget passes the fail-closed gate.
  assert.doesNotThrow(() => assertPromptBudget(budget));
});

test('quality-budget overflow is recorded on the trace, not the provider gate', () => {
  const prompt = 'x'.repeat(ABOVE_QUALITY);
  const blocks = { architectural_concept: prompt };
  const budget = measurePromptBudget(prompt, blocks);
  assert.equal(budget.chars, ABOVE_QUALITY);
  assert.equal(budget.qualityBudgetExceeded, true);
  assert.equal(budget.status, 'pass');
  assert.ok(budget.findings.some((f) => f.code === 'SPACE_PROMPT_ABOVE_QUALITY_BUDGET'));
  assert.ok(!budget.findings.some((f) => f.severity === 'block'));
  assert.doesNotThrow(() => assertPromptBudget(budget));
});

test('prompt exactly at the Provider cap is the boundary — passes (withinProviderCap)', () => {
  const prompt = 'x'.repeat(AT_CAP);
  const blocks = { architectural_concept: prompt };
  const budget = measurePromptBudget(prompt, blocks);
  assert.equal(budget.chars, AT_CAP);
  assert.equal(budget.status, 'pass', 'exactly at the provider cap is still inside the cap');
  assert.ok(
    !budget.findings.some((f) => f.code === 'SPACE_PROMPT_EXCEEDS_ADAPTER_LIMIT'),
    'must NOT raise provider-cap finding at the boundary',
  );
  assert.doesNotThrow(() => assertPromptBudget(budget));
});

test('prompt over the Provider cap blocks with SPACE_PROMPT_EXCEEDS_ADAPTER_LIMIT', () => {
  const prompt = 'x'.repeat(OVER_CAP);
  const blocks = { architectural_concept: prompt };
  const budget = measurePromptBudget(prompt, blocks);
  assert.equal(budget.status, 'blocked');
  assert.ok(
    budget.findings.some((f) => f.code === 'SPACE_PROMPT_EXCEEDS_ADAPTER_LIMIT' && f.severity === 'block'),
    `expected the provider-cap block finding; got: ${JSON.stringify(budget.findings)}`,
  );
  assert.throws(() => assertPromptBudget(budget), /SPACE_PROMPT_BUDGET_BLOCKED/);
});

// Caller-supplied provider capability overrides the default. This is how a
// non-Seedream adapter would plug in without us re-declaring the cap here.
test('caller-supplied providerCapability.maxCharacters is honored as the hard cap', () => {
  const customCap = 9_000;
  const providerCapability = { prompt: { maxCharacters: customCap } };
  // 9100 chars: above the custom cap (9000), under Seedream default (12000).
  const prompt = 'x'.repeat(customCap + 100);
  const blocks = { architectural_concept: prompt };
  const budget = measurePromptBudget(prompt, blocks, { providerCapability });
  assert.equal(budget.providerLimit, customCap);
  assert.equal(budget.status, 'blocked');
  assert.ok(budget.findings.some((f) => f.code === 'SPACE_PROMPT_EXCEEDS_ADAPTER_LIMIT'));
});
