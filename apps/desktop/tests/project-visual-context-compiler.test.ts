import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {
  compileProjectVisualContext,
  validateProjectVisualContext,
  writeProjectVisualContext
} from '../src/main/project-visual-context-compiler.ts';
import type { ProjectRecord } from '../src/shared/types';

function makeProject(overrides: Record<string, unknown> = {}) {
  return {
    id: '00000000-0000-0000-0000-000000000001',
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

function baseInput(overrides: Record<string, unknown> = {}) {
  return {
    project: makeProject(),
    sourceRunId: 'run-1',
    reportMarkdown: '',
    reportPath: '/out/视觉方案升级报告.md',
    runtimeReportPath: '/out/.runtime/run-report.json',
    assetCount: 0,
    imageCount: 0,
    provider: 'openai-compatible',
    model: 'gpt-5',
    ...overrides
  };
}

test('用户确认品牌优先于 detected 品牌与报告推断', () => {
  const input = baseInput({
    project: makeProject({ brandName: '冯烫烫', detectedBrandName: '错误品牌' }),
    reportMarkdown: '# 报告\n\n**品牌与行业：** 错误品牌；行业X。'
  });
  assert.equal(compileProjectVisualContext(input).identity.brandName, '冯烫烫');
});

test('用户确认行业优先于报告推断', () => {
  const input = baseInput({
    project: makeProject({ industry: '川味小吃', detectedIndustry: '别的' }),
    reportMarkdown: '# 报告\n\n**品牌与行业：** X；现有素材指向粤式餐饮。'
  });
  assert.equal(compileProjectVisualContext(input).identity.industry, '川味小吃');
});

test('Logo 默认锁定；显式解锁被尊重', () => {
  const locked = compileProjectVisualContext(baseInput({ project: makeProject({ logoLocked: undefined }) }));
  assert.equal(locked.lockedAssets.logoLocked, true);
  const unlocked = compileProjectVisualContext(baseInput({ project: makeProject({ logoLocked: false }) }));
  assert.equal(unlocked.lockedAssets.logoLocked, false);
});

test('普通旧样机（包装/袋子）不会自动成为 confirmed 结构', () => {
  const input = baseInput({
    project: makeProject({}),
    reportMarkdown: '# 报告\n\n## 2. 当前视觉问题\n**包装与应用：** 餐巾、筷套和袋子已展示基础延展。'
  });
  const ctx = compileProjectVisualContext(input);
  assert.notEqual(ctx.packaging.status, 'confirmed');
  assert.ok(ctx.packaging.structures.includes('袋'));
});

test('缺失身份与未确认结构进入 uncertainties', () => {
  const ctx = compileProjectVisualContext(
    baseInput({ project: makeProject({}), reportMarkdown: '# 报告\n\n很少内容。' })
  );
  assert.equal(ctx.identity.brandName, 'unknown');
  assert.ok(ctx.uncertainties.some((value) => value.includes('FIELD_UNKNOWN:brandName')));
  assert.ok(ctx.uncertainties.some((value) => value.includes('PACKAGING_STRUCTURE_UNCONFIRMED')));
});

test('编译过程零模型调用', () => {
  const original = globalThis.fetch;
  (globalThis as { fetch: unknown }).fetch = () => {
    throw new Error('model called!');
  };
  try {
    compileProjectVisualContext(
      baseInput({ reportMarkdown: '# 报告\n\n**品牌与行业：** 冯烫烫；川味。' })
    );
  } finally {
    (globalThis as { fetch: unknown }).fetch = original;
  }
});

test('相同输入产生稳定（确定性）输出', () => {
  const input = baseInput({ reportMarkdown: '# 报告\n\n**品牌与行业：** 冯烫烫；川味小吃。' });
  const a = compileProjectVisualContext(input);
  const b = compileProjectVisualContext(input);
  const normalize = (value: ReturnType<typeof compileProjectVisualContext>) =>
    JSON.stringify({ ...value, generatedAt: '' });
  assert.equal(normalize(a), normalize(b));
});

test('Schema 校验失败可定位', () => {
  const ctx = compileProjectVisualContext(baseInput());
  const broken = { ...ctx, identity: undefined } as unknown as typeof ctx;
  const { valid, errors } = validateProjectVisualContext(broken);
  assert.equal(valid, false);
  assert.ok(errors.some((value) => value.includes('identity')));
});

test('原子写入失败不破坏旧文件', async () => {
  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'pvc-write-'));
  const target = path.join(tmp, 'project-visual-context.json');
  const oldContent = '{"schemaVersion":"1.0","note":"old"}';
  await fs.writeFile(target, oldContent, 'utf8');
  const ctx = compileProjectVisualContext(
    baseInput({ reportMarkdown: '# 报告\n\n**品牌与行业：** 冯烫烫；川味。' })
  );
  await assert.rejects(
    () =>
      writeProjectVisualContext(target, ctx, {
        rename: (async () => {
          throw Object.assign(new Error('locked'), { code: 'EPERM' });
        }) as typeof fs.rename
      }),
    (error: Error & { code?: string }) => (error.code ?? '').includes('WRITE_FAILED')
  );
  assert.equal(await fs.readFile(target, 'utf8'), oldContent);
});
