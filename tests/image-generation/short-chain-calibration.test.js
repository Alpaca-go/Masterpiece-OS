import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import test from 'node:test';

const fixtureUrl = new URL('../fixtures/prompts/jiuzhou-space-golden-prompt.md', import.meta.url);
const sourceUrl = new URL(
  '../../evaluation/known-cases/jiuzhou-aesthetic/垂直测试/jiuzhou-space-golden-prompt.md',
  import.meta.url,
);

test('Golden Prompt fixture freezes the complete confirmed source text verbatim', async () => {
  const [fixture, sourceDocument] = await Promise.all([
    fs.readFile(fixtureUrl, 'utf8'),
    fs.readFile(sourceUrl, 'utf8'),
  ]);
  const sourceBody = sourceDocument.slice(sourceDocument.indexOf('请生成一张'));
  const normalizeNewlines = (value) => value.replace(/\r\n?/gu, '\n').trim();
  assert.equal(normalizeNewlines(fixture), normalizeNewlines(sourceBody));
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
