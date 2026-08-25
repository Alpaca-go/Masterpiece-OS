/**
 * CI-W1C.7.2 — strip-markdown-fences helper unit test.
 *
 * Real production failure: chat-completions APIs (OpenAI / Qwen /
 * dashscope) return JSON wrapped in ` ```json\n{...}\n``` ` fences.
 * The legacy parsers called `JSON.parse(input.rawText)` directly
 * and the leading backtick of the fence caused
 * `Unexpected token '`'` to fail every live call.
 *
 * The fix is a shared `stripMarkdownFences()` utility consumed by
 * `parse-strategic-synthesis`, `parse-model-assisted` (Concept) and
 * `parse-model-assisted` (Direction).
 *
 * This test pins the helper's behavior. If a future change breaks
 * any case, the test fails loudly before the live G01/G02 call
 * spends another 6 minutes discovering the same regression.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { stripMarkdownFences } from '@masterpiece/creative-intelligence/contracts/strip-markdown-fences.ts';

test('FENCE-01: strips ```json ... ``` wrapper (with newline after opening fence)', () => {
  const input = '```json\n{"a":1,"b":2}\n```';
  assert.equal(stripMarkdownFences(input), '{"a":1,"b":2}');
});

test('FENCE-02: strips ``` ... ``` wrapper (no language tag)', () => {
  const input = '```\n{"a":1,"b":2}\n```';
  assert.equal(stripMarkdownFences(input), '{"a":1,"b":2}');
});

test('FENCE-03: strips fence when opening line has no trailing newline', () => {
  const input = '```json{"a":1,"b":2}\n```';
  // Note: the helper trims a newline if present; absence of newline
  // is allowed because the regex `\r?\n?` is optional.
  assert.equal(stripMarkdownFences(input), '{"a":1,"b":2}');
});

test('FENCE-04: handles CR-LF line endings', () => {
  const input = '```json\r\n{"a":1,"b":2}\r\n```';
  assert.equal(stripMarkdownFences(input), '{"a":1,"b":2}');
});

test('FENCE-05: idempotent — running twice yields same result as running once', () => {
  const input = '```json\n{"a":1}\n```';
  const once = stripMarkdownFences(input);
  const twice = stripMarkdownFences(once);
  assert.equal(twice, once);
});

test('FENCE-06: returns text unchanged when no fence present', () => {
  const input = '{"a":1,"b":2}';
  assert.equal(stripMarkdownFences(input), '{"a":1,"b":2}');
});

test('FENCE-07: tolerates leading/trailing whitespace and BOM', () => {
  const input = '\uFEFF  \n  ```json\n{"a":1}\n```  \n';
  assert.equal(stripMarkdownFences(input), '{"a":1}');
});

test('FENCE-08: returns empty string for empty input', () => {
  assert.equal(stripMarkdownFences(''), '');
});

test('FENCE-09: returns empty string for whitespace-only input', () => {
  assert.equal(stripMarkdownFences('   \n  '), '');
});

test('FENCE-10: JSON.parse works on the stripped output of a real Qwen response shape', () => {
  // Verbatim shape of the failure we saw in CI-W1C.7.2-R0 PART F
  // (synthesis.attempt-1.raw.txt). The helper must produce text
  // that JSON.parse accepts without throwing.
  const rawText = '```json\n{"schemaVersion":"ci7.strategic-synthesis.v1","projectId":"G01"}\n```';
  const stripped = stripMarkdownFences(rawText);
  const parsed = JSON.parse(stripped);
  assert.equal(parsed.schemaVersion, 'ci7.strategic-synthesis.v1');
  assert.equal(parsed.projectId, 'G01');
});

test('FENCE-11: only leading fence stripped if input is exactly ``` (no body)', () => {
  // Defensive: if a model returns just a fence, the helper should
  // not loop or throw. The result is empty after trim.
  const input = '```json\n```';
  const result = stripMarkdownFences(input);
  assert.equal(result, '');
});

test('FENCE-12: input that LOOKS like a fence but is not at the start is left intact', () => {
  // Inner backticks should not be touched.
  const input = 'prefix text ```json\n{"a":1}\n``` suffix';
  const result = stripMarkdownFences(input);
  // Helper is best-effort: it strips the leading ``` if present.
  // In this case, the leading char is "p", not backtick, so the
  // helper returns the input unchanged.
  assert.equal(result, 'prefix text ```json\n{"a":1}\n``` suffix');
});
