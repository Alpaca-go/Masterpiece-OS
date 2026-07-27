// 生图功能 V1 Phase 1：Contracts 与 Schema 结构回归测试。
// 目的：锁定 JSON Schema 与文档 §6 / §9 的枚举一致性，无需 ajv 依赖。
// 运行：node --test tests/image-generation/contracts-schema.test.js

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCHEMA_DIR = path.join(__dirname, '..', '..', 'schemas', 'image-generation');

function loadSchema(name) {
  const file = path.join(SCHEMA_DIR, name);
  const raw = fs.readFileSync(file, 'utf8');
  return JSON.parse(raw);
}

const SCHEMA_FILES = [
  'image-provider-capabilities.schema.json',
  'image-generation-task.schema.json',
  'image-generation-review.schema.json',
  'image-generation-gate-result.schema.json',
  'image-generation-run.schema.json',
  'image-generation-task-v2.schema.json',
  'source-context-snapshot-v2.schema.json'
];

test('all image-generation schemas exist and are valid draft 2020-12 objects', () => {
  for (const name of SCHEMA_FILES) {
    const schema = loadSchema(name);
    assert.equal(
      schema.$schema,
      'https://json-schema.org/draft/2020-12/schema',
      `${name} must declare draft 2020-12`
    );
    assert.ok(typeof schema.$id === 'string' && schema.$id.length > 0, `${name} must have $id`);
    assert.equal(schema.type, 'object', `${name} root must be object`);
    assert.equal(schema.additionalProperties, false, `${name} must forbid additional properties`);
    assert.ok(Array.isArray(schema.required) && schema.required.length > 0, `${name} must list required`);
  }
});

test('run status enum matches documented §6.4 state machine (11 states)', () => {
  const run = loadSchema('image-generation-run.schema.json');
  const statuses = run.properties.status.enum;
  assert.deepEqual(statuses, [
    'created',
    'validating',
    'blocked',
    'ready',
    'submitting',
    'queued',
    'running',
    'downloading',
    'succeeded',
    'failed',
    'cancelled'
  ]);
});

test('gate-result error enum matches documented §9 blocking codes (8+9+8=25 unique)', () => {
  const gate = loadSchema('image-generation-gate-result.schema.json');
  const codes = gate.properties.errors.items.properties.code.enum;

  const gateA = [
    'CURRENT_PROJECT_CONTEXT_MISSING',
    'CURRENT_PROJECT_IDENTITY_MISSING',
    'REFERENCE_ANCHOR_NOT_APPROVED',
    'LOCKED_ASSET_CONFLICT_UNRESOLVED',
    'REFERENCE_BRAND_IDENTITY_LEAK',
    'REFERENCE_LOGO_DIRECT_COPY',
    'REFERENCE_SLOGAN_LEAK',
    'REFERENCE_SIGNATURE_GRAPHIC_DIRECT_COPY',
    'GENERATION_PRESET_MISSING',
    'GENERATION_PRESET_UNSUPPORTED',
    'VISUAL_CONTEXT_REQUIRED',
    'DOCUMENT_CONTEXT_REQUIRED',
    'RESOLVED_CONTEXT_REQUIRED',
    'REFERENCE_CONTEXT_REQUIRED',
    'CURRENT_IDENTITY_IMAGE_REQUIRED',
    'REFERENCE_RUN_REJECTED',
    'REFERENCE_RUN_NOT_READY',
    'SOURCE_BUNDLE_INVALID'
  ];
  const gateB = [
    'ANCHOR_GENERATION_BRIEF_MISSING',
    'IMAGE_GENERATION_TASK_INVALID',
    'TASK_PROMPT_EMPTY',
    'OUTPUT_TYPE_UNSUPPORTED',
    'ASPECT_OR_SIZE_UNSUPPORTED',
    'REFERENCE_IMAGE_MISSING',
    'REFERENCE_IMAGE_LIMIT_EXCEEDED',
    'PROVIDER_CONFIG_MISSING',
    'PROVIDER_MODEL_UNAVAILABLE',
    'REFERENCE_IMAGE_REQUIRED',
    'GENERATION_INTENT_MISSING',
    'PROMPT_FRAGMENT_EMPTY',
    'PROMPT_COMPOSITION_FAILED'
  ];
  const gateC = [
    'PROVIDER_TASK_ID_MISSING',
    'PROVIDER_RESULT_MISSING',
    'IMAGE_RESULT_URL_MISSING',
    'IMAGE_DOWNLOAD_FAILED',
    'IMAGE_MIME_INVALID',
    'IMAGE_FILE_EMPTY',
    'IMAGE_HASH_FAILED',
    'OUTPUT_WRITE_FAILED'
  ];
  const expected = [...gateA, ...gateB, ...gateC];
  assert.deepEqual(codes, expected);
  assert.equal(new Set(codes).size, codes.length, 'blocking codes must be unique');
});

test('gate-result warning enum matches documented §9.4 (8 non-blocking codes)', () => {
  const gate = loadSchema('image-generation-gate-result.schema.json');
  const codes = gate.properties.warnings.items.properties.code.enum;
  assert.deepEqual(codes, [
    'LOGO_RENDERING_MAY_BE_INACCURATE',
    'GENERATED_TEXT_MAY_BE_UNSAFE',
    'GRAPHIC_ANCHOR_MAY_BE_GENERIC',
    'COLOR_BALANCE_MAY_BE_SUBOPTIMAL',
    'VISUAL_DIRECTION_MAY_BE_WEAK',
    'PACKAGING_STRUCTURE_UNCONFIRMED',
    'REFERENCE_IMAGES_REDUCED',
    'INFORMATION_DENSITY_MAY_BE_HIGH',
    'CONCEPT_ONLY',
    'BRAND_IDENTITY_NOT_FULLY_BOUND',
    'CURRENT_IDENTITY_NOT_BOUND',
    'LOGO_RENDERING_NOT_GUARANTEED',
    'PACKAGING_STRUCTURE_NOT_GUARANTEED',
    'DOCUMENT_CONTEXT_NOT_USED',
    'REFERENCE_STYLE_NOT_USED',
    'VISUAL_CONTEXT_NOT_USED',
    'UNAPPROVED_REFERENCE_PREVIEW',
    'LIMITED_VISUAL_EVIDENCE',
    'LIMITED_DOCUMENT_EVIDENCE',
    'USER_INTENT_EMPTY'
  ]);
});

test('task schema pins P0 output type / provider / outputCount / watermark', () => {
  const task = loadSchema('image-generation-task.schema.json');
  assert.equal(task.properties.outputType.const, 'master_anchor_image');
  assert.equal(task.properties.providerId.const, 'dashscope');
  assert.equal(task.properties.parameters.properties.outputCount.const, 1);
  assert.equal(task.properties.parameters.properties.watermark.const, false);
  assert.deepEqual(task.properties.region.enum, ['beijing', 'singapore']);
});

test('review schema enforces the four §6.5 review decisions', () => {
  const review = loadSchema('image-generation-review.schema.json');
  assert.deepEqual(review.properties.decision.enum, [
    'selected',
    'usable_after_edit',
    'reference_only',
    'rejected'
  ]);
  assert.equal(review.properties.score.minimum, 1);
  assert.equal(review.properties.score.maximum, 5);
});

test('reference role enum matches §8.4 payload ordering roles', () => {
  const task = loadSchema('image-generation-task.schema.json');
  const roles = task.$defs.reference.properties.role.enum;
  assert.deepEqual(roles, [
    'current_project_logo',
    'current_project_product',
    'current_project_identity',
    'reference_style'
  ]);
});
