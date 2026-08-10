import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const require = createRequire(import.meta.url);
const parserUrl = pathToFileURL(path.join(
  repoRoot,
  'packages/model-runtime/src/response-parser.js',
)).href;
const { parseStructuredResponse } = await import(parserUrl);

test('parses clean JSON untouched', () => {
  assert.deepEqual(parseStructuredResponse('{"a": 1, "b": [true, null]}'), { a: 1, b: [true, null] });
});

test('strips Markdown code fences and surrounding prose', () => {
  assert.deepEqual(
    parseStructuredResponse('```json\n{"k": "v"}\n```'),
    { k: 'v' },
  );
});

test('repairs a missing comma before a property name', () => {
  assert.deepEqual(parseStructuredResponse('{"a": "x" "b": "y"}'), { a: 'x', b: 'y' });
});

test('repairs a missing comma before a number value', () => {
  assert.deepEqual(parseStructuredResponse('{"a": [1 2 3]}'), { a: [1, 2, 3] });
});

test('repairs a missing comma before a boolean / null value', () => {
  assert.deepEqual(parseStructuredResponse('{"a": true "b": 1}'), { a: true, b: 1 });
  assert.deepEqual(parseStructuredResponse('{"a": null "b": "x"}'), { a: null, b: 'x' });
});

test('repairs a missing comma between array objects', () => {
  assert.deepEqual(
    parseStructuredResponse('{"list": [{"a": 1} {"b": 2}]}'),
    { list: [{ a: 1 }, { b: 2 }] },
  );
});

test('repairs a missing comma between array strings', () => {
  assert.deepEqual(parseStructuredResponse('{"list": ["a" "b" "c"]}'), { list: ['a', 'b', 'c'] });
});

test('repairs a trailing comma', () => {
  assert.deepEqual(parseStructuredResponse('{"a": 1,}'), { a: 1 });
});

test('repairs a missing comma before a nested object property', () => {
  assert.deepEqual(
    parseStructuredResponse('{"outer": {"x": "a" "y": 2}}'),
    { outer: { x: 'a', y: 2 } },
  );
});

test('fails closed on genuinely ambiguous output', () => {
  assert.throws(() => parseStructuredResponse('{"a": 1 2}'), /结构化 JSON 解析失败/);
});
