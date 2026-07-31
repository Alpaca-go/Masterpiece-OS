import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { composePrompt } from '@masterpiece/image-generation-runtime/prompt/index.js';

const capabilities = { modelId: 'wan2.7-image-pro' };
const ref = (role) => ({ role, assetId: role, localPath: '/x.png', sha256: 'x', source: 'user_selected', includeReason: 'test' });
const sources = (preset) => ({ preset, purpose: preset === 'visual_extension' || preset === 'integrated_anchor' ? 'production' : 'exploration', userIntent: {} });
const snapshotDir = path.join(import.meta.dirname, 'fixtures', 'prompt-snapshots');

function assertStructureSnapshot(preset, prompt) {
  const actual = prompt.match(/^#{1,2} .+$/gm)?.join('\n') || '';
  const expected = fs
    .readFileSync(path.join(snapshotDir, `${preset}.prompt.md`), 'utf8')
    .replace(/\r\n/g, '\n')
    .trim();
  assert.equal(actual, expected);
}

test('visual extension prompt contains visual-only structure', () => {
  const prompt = composePrompt({
    sources: sources('visual_extension'),
    context: { visualContext: { brandName: '视觉品牌' }, references: [ref('current_project_identity')] },
    capabilities,
    parameters: { size: '1024*1024' },
  }).compiledPromptMarkdown;
  assert.match(prompt, /当前视觉项目/);
  assert.doesNotMatch(prompt, /Reference Anchor 风格预览|文策商业结论/);
  assertStructureSnapshot('visual_extension', prompt);
});

test('document concept prompt declares exploration boundaries without Logo requirements', () => {
  const prompt = composePrompt({
    sources: sources('document_concept'),
    context: { documentContext: { brandName: '文策品牌', audience: ['年轻人'] }, references: [] },
    capabilities,
    parameters: { size: '1024*1024' },
  }).compiledPromptMarkdown;
  assert.match(prompt, /这是一张概念探索图/);
  assert.match(prompt, /不要求生成准确 Logo/);
  assert.doesNotMatch(prompt, /Logo 锁定/);
  assertStructureSnapshot('document_concept', prompt);
});

test('reference preview prompt does not load document context and marks unapproved preview', () => {
  const prompt = composePrompt({
    sources: sources('reference_preview'),
    context: {
      referenceCapsule: { inheritedStyle: { color: ['red'] }, prohibitedReferenceIdentity: { brandNames: ['参考品牌'] } },
      referenceDecision: { status: 'awaiting_decision' },
      references: [ref('reference_style')],
    },
    capabilities,
    parameters: { size: '1024*1024' },
  }).compiledPromptMarkdown;
  assert.match(prompt, /尚未人工批准/);
  assert.match(prompt, /参考品牌/);
  assert.doesNotMatch(prompt, /目标用户|文策/);
  assertStructureSnapshot('reference_preview', prompt);
});

test('integrated anchor keeps legacy identity and Locked Assets sections', () => {
  const prompt = composePrompt({
    sources: sources('integrated_anchor'),
    context: {
      resolvedContext: { identity: { brandName: '正式品牌' }, lockedAssets: { logoLocked: true, lockedFacts: ['Logo'] }, products: [], businessTouchpoints: {}, prohibitedDirections: [], conflicts: [] },
      referenceCapsule: { inheritedStyle: {}, prohibitedReferenceIdentity: {}, userAvoidance: [] },
      anchorBriefMarkdown: '# Brief',
      references: [ref('current_project_logo'), ref('reference_style')],
    },
    capabilities,
    parameters: { size: '1024*1024' },
  }).compiledPromptMarkdown;
  assert.match(prompt, /不可修改资产/);
  assert.match(prompt, /用户本次明确要求/);
  assertStructureSnapshot('integrated_anchor', prompt);
});
