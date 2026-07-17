import test from 'node:test';
import assert from 'node:assert/strict';
import { parseBrandDnaResponse } from '../../src/v5/brand-dna/response-parser.js';

test('Brand DNA response parser deterministically repairs a missing comma', () => {
  const parsed = parseBrandDnaResponse(`{
    "brandDna": {
      "oneSentenceDna": "可信供应链建立长期安心"
      "genes": [
        { "id": "gene-trust", "statement": "医药级确定性" }
      ]
    }
  }`);

  assert.deepEqual(parsed, {
    brandDna: {
      oneSentenceDna: '可信供应链建立长期安心',
      genes: [{ id: 'gene-trust', statement: '医药级确定性' }]
    }
  });
});

test('Brand DNA response parser repairs common model JSON syntax without changing values', () => {
  const parsed = parseBrandDnaResponse(`\`\`\`json
  {
    'status': 'suggested',
    'confidence': .86,
    'keywords': ['严谨', '可信',],
  }
  \`\`\``);

  assert.deepEqual(parsed, {
    status: 'suggested',
    confidence: 0.86,
    keywords: ['严谨', '可信']
  });
});

test('Brand DNA response parser still fails closed when no JSON object exists', () => {
  assert.throws(
    () => parseBrandDnaResponse('模型没有返回结构化对象'),
    /未找到 JSON 对象/
  );
});
