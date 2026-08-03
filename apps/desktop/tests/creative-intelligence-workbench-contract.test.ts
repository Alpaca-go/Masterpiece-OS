import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('Creative Intelligence workbench exposes the complete Phase 4 decision flow', async () => {
  const source = await readFile(new URL('../src/renderer/src/components/CreativeIntelligenceWorkbench.tsx', import.meta.url), 'utf8');
  for (const required of [
    '视觉方案', '品牌文档', '联合分析', '快速分析', '方向推演',
    'Evidence Ledger', 'Category Opportunity Map', '三个机制级创意方向',
    '保留为主方向', '组合到主方向', '淘汰此方向', '保存草稿',
    '确认并生成 Creative Decision'
  ]) {
    assert.ok(source.includes(required), `workbench is missing ${required}`);
  }
  assert.match(source, /creativeIntelligence\.confirm\(project\.id/);
  assert.match(source, /!selectedDirectionId \|\| !rationale\.trim\(\)/);
});

test('Creative Intelligence IPC never routes a draft save through formal confirmation', async () => {
  const preload = await readFile(new URL('../src/preload/index.ts', import.meta.url), 'utf8');
  assert.match(preload, /saveDraft:.*creative-intelligence:save-draft/);
  assert.match(preload, /confirm:.*creative-intelligence:confirm/);
  const anchorService = await readFile(new URL('../src/main/reference-anchor-service.ts', import.meta.url), 'utf8');
  assert.match(anchorService, /anchor-decision-inheritance\.json/);
  assert.match(anchorService, /acceptedMechanisms/);
  assert.match(anchorService, /rejectedMechanisms/);
  assert.notEqual(
    preload.match(/saveDraft:[^\n]+/)?.[0],
    preload.match(/confirm:[^\n]+/)?.[0]
  );
});
