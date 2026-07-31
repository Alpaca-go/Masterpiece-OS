import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { compileProjectVisualContext } from '../src/main/project-visual-context-compiler.ts';
import type { ProjectRecord } from '../src/shared/types';

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '../../..');

function makeProject(overrides: Record<string, unknown> = {}) {
  return {
    id: 'freeze-0001-0000-0000-000000000001',
    projectName: '',
    detectedProjectName: '',
    projectNameSource: 'common-file-prefix',
    projectNameConfidence: 0,
    brandName: '',
    industry: '',
    detectedBrandName: '',
    detectedIndustry: '',
    factConfidence: { brandName: 0, industry: 0 },
    description: '',
    logoLocked: true,
    lockedFacts: [],
    outputLanguage: 'zh-CN',
    provider: 'openai-compatible',
    model: 'gpt-5',
    apiProfileId: null,
    analysisProfile: 'fusion-enhanced',
    status: 'completed',
    createdAt: '',
    updatedAt: '',
    lastRunAt: null,
    lastDurationMs: null,
    assetCount: 0,
    imageCount: 0,
    lastReportFilename: null,
    lastError: null,
    logoFiles: [],
    briefFiles: [],
    assets: [],
    ...overrides
  } as unknown as ProjectRecord;
}

test('冻结项目·冯烫烫：确认品牌优先、普通样机不确认为包装结构、零模型调用', async () => {
  const report = await fs.readFile(
    path.join(here, 'fixtures/project-visual-context/feng-tang-tang-report.md'),
    'utf8'
  );
  const project = makeProject({
    id: 'feng-tang-tang-0000-0000-000000000001',
    projectName: '冯烫烫',
    brandName: '冯烫烫',
    industry: '川味小吃与跷脚牛肉餐饮',
    detectedBrandName: '冯烫烫',
    detectedIndustry: '川味小吃与跷脚牛肉餐饮',
    factConfidence: { brandName: 1, industry: 1 },
    logoLocked: true,
    logoFiles: ['未标题-1-05.png', '未标题-1-06.png'],
    lockedFacts: ['原始 Logo 不得修改、重绘、拆解、替换或改变内部字形。']
  });

  const originalFetch = (globalThis as { fetch: unknown }).fetch;
  (globalThis as { fetch: unknown }).fetch = () => {
    throw new Error('model called!');
  };
  let ctx: ReturnType<typeof compileProjectVisualContext>;
  try {
    ctx = compileProjectVisualContext({
      project,
      sourceRunId: project.id,
      reportMarkdown: report,
      reportPath: 'r.md',
      runtimeReportPath: 'rr.json',
      assetCount: 10,
      imageCount: 10,
      provider: 'codex-visual-analysis',
      model: 'gpt-5'
    });
  } finally {
    (globalThis as { fetch: unknown }).fetch = originalFetch;
  }

  assert.equal(ctx.identity.brandName, '冯烫烫');
  assert.equal(ctx.identity.industry, '川味小吃与跷脚牛肉餐饮');
  assert.equal(ctx.lockedAssets.logoLocked, true);
  assert.equal(ctx.packaging.status, 'legacy_observed');
  assert.ok(ctx.packaging.structures.includes('袋'));
  assert.ok(ctx.uncertainties.some((value) => value.includes('PACKAGING_STRUCTURE_UNCONFIRMED')));
});

test('冻结项目·九州美学：确认品牌优先、包装不确认为 confirmed、资产决策表被解析', async () => {
  const report = await fs.readFile(
    path.join(here, 'fixtures/project-visual-context/jiuzhou-meixue-report.md'),
    'utf8'
  );
  const project = makeProject({
    id: 'jiuzhou-meixue-0000-0000-000000000001',
    projectName: '九州美学',
    brandName: '九州美学',
    industry: '新中式美学空间与家居器物',
    detectedBrandName: '九州美学',
    detectedIndustry: '新中式美学空间与家居器物',
    factConfidence: { brandName: 1, industry: 1 },
    logoLocked: true,
    lockedFacts: ['原始 Logo 不得修改、重绘或替换。']
  });
  const ctx = compileProjectVisualContext({
    project,
    sourceRunId: project.id,
    reportMarkdown: report,
    reportPath: 'r.md',
    runtimeReportPath: 'rr.json',
    assetCount: 5,
    imageCount: 5,
    provider: 'openai-compatible',
    model: 'gpt-5'
  });
  assert.equal(ctx.identity.brandName, '九州美学');
  assert.equal(ctx.identity.industry, '新中式美学空间与家居器物');
  assert.notEqual(ctx.packaging.status, 'confirmed');
  assert.ok(ctx.packaging.structures.includes('礼盒'));
  assert.ok(ctx.evaluation.modifiableAssets.length > 0);
});

test('冻结项目·简单项目：资料较少不崩溃，缺失进入 uncertainties', async () => {
  const report = await fs.readFile(
    path.join(here, 'fixtures/project-visual-context/simple-report.md'),
    'utf8'
  );
  const project = makeProject({ id: 'simple-0000-0000-0000-000000000001' });
  const ctx = compileProjectVisualContext({
    project,
    sourceRunId: project.id,
    reportMarkdown: report,
    reportPath: 'r.md',
    runtimeReportPath: 'rr.json',
    assetCount: 0,
    imageCount: 0,
    provider: 'openai-compatible',
    model: 'gpt-5'
  });
  assert.equal(ctx.schemaVersion, '1.0');
  assert.equal(ctx.identity.brandName, 'unknown');
  assert.equal(ctx.packaging.status, 'unknown');
  assert.ok(ctx.uncertainties.some((value) => value.includes('FIELD_UNKNOWN:brandName')));
  assert.ok(ctx.uncertainties.some((value) => value.includes('PACKAGING_STRUCTURE_UNCONFIRMED')));
});
