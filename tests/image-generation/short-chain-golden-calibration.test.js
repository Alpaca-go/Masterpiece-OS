import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import test from 'node:test';

const fixtureUrl = new URL('../fixtures/prompts/jiuzhou-space-golden-prompt.md', import.meta.url);
const CONFIRMED_NORMALIZED_SHA256 = 'f638357a6b9b7be7814ca59e3d74e0ac37e18a988190fd5408f2160470e7fdae';

test('Golden Prompt fixture freezes the complete confirmed source text by digest', async () => {
  const fixture = await fs.readFile(fixtureUrl, 'utf8');
  const normalizeNewlines = (value) => value.replace(/\r\n?/gu, '\n').trim();
  const digest = crypto.createHash('sha256').update(normalizeNewlines(fixture)).digest('hex');
  assert.equal(digest, CONFIRMED_NORMALIZED_SHA256);
});

test('Golden Prompt fixture retains every calibration evidence block', async () => {
  const fixture = await fs.readFile(fixtureUrl, 'utf8');
  for (const marker of [
    '九州美学',
    '高端医美全链生态平台',
    '这不是普通美容院',
    '现代医疗专业感',
    '未来材料科技感',
    '【核心视觉方向】',
    '【空间设定】',
    '【空间视觉机制】',
    '【色彩】',
    '【材质】',
    '【光线】',
    '【构图与摄影】',
    '【品牌呈现】',
    '【人物】',
    '【最终效果】',
    '【严格禁止】',
  ]) {
    assert.match(fixture, new RegExp(marker, 'u'));
  }
});
