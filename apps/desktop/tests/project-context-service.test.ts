import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { createProjectStore } from '../src/main/project-store.ts';
import { createProjectContextService } from '../src/main/project-context-service.ts';

function uuid(): string {
  return crypto.randomUUID();
}

async function seedProject(root: string) {
  const id = uuid();
  const dir = path.join(root, 'projects', `${id.slice(0, 8)}-${id}`);
  await fs.mkdir(path.join(dir, 'outputs'), { recursive: true });
  await fs.mkdir(path.join(dir, 'runtime'), { recursive: true });
  const project = {
    id,
    projectName: '测试项目',
    detectedProjectName: '测试项目',
    projectNameSource: 'common-file-prefix',
    projectNameConfidence: 0.9,
    brandName: '测试品牌',
    industry: '测试行业',
    detectedBrandName: '测试品牌',
    detectedIndustry: '测试行业',
    factConfidence: { brandName: 0.9, industry: 0.9 },
    description: '',
    logoLocked: true,
    lockedFacts: ['原始 Logo 不得修改。'],
    outputLanguage: 'zh-CN',
    provider: 'openai-compatible',
    model: 'gpt-5',
    apiProfileId: null,
    analysisProfile: 'fusion-enhanced',
    status: 'completed',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    lastRunAt: null,
    lastDurationMs: null,
    assetCount: 3,
    imageCount: 3,
    lastReportFilename: '视觉方案升级报告.md',
    lastError: null,
    logoFiles: [],
    briefFiles: [],
    assets: []
  };
  await fs.writeFile(path.join(dir, 'project.json'), `${JSON.stringify(project, null, 2)}\n`, 'utf8');
  await fs.writeFile(
    path.join(dir, 'outputs', '视觉方案升级报告.md'),
    '# 项目视觉方案升级报告\n\n**品牌与行业：** 测试品牌；测试行业。\n\n## 2. 当前视觉问题\n\n**包装与应用：** 礼盒、标签已展示基础延展。\n',
    'utf8'
  );
  await fs.writeFile(
    path.join(dir, 'runtime', 'run-report.json'),
    JSON.stringify({ provider: 'openai-compatible', model: 'gpt-5', runId: `run-${id}` }),
    'utf8'
  );
  return { id, dir };
}

test('rebuild 本地重编译：报告与 ProjectRecord 生成 Context JSON 并更新状态', async () => {
  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'pvc-svc-'));
  try {
    const projects = createProjectStore(async () => ({ defaultDataPath: tmp } as never));
    const { id } = await seedProject(tmp);
    const service = createProjectContextService({ projects });
    const ctx = await service.rebuild(id);
    assert.equal(ctx.schemaVersion, '1.0');
    assert.equal(ctx.identity.brandName, '测试品牌');
    assert.equal(ctx.source.provider, 'openai-compatible');

    const file = path.join(
      tmp,
      'projects',
      `${id.slice(0, 8)}-${id}`,
      'outputs',
      'project-visual-context.json'
    );
    const onDisk = JSON.parse(await fs.readFile(file, 'utf8'));
    assert.equal(onDisk.projectId, id);

    const updated = await projects.get(id);
    assert.equal(updated.visualContextStatus, 'ready');
    assert.equal(updated.visualContextFilename, 'project-visual-context.json');

    const readBack = await service.get(id);
    assert.equal(readBack.projectId, id);
  } finally {
    await fs.rm(tmp, { recursive: true, force: true });
  }
});

test('rebuild 源缺失时：标记 Context 失败，但项目（与报告）仍可读', async () => {
  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'pvc-svc-'));
  try {
    const projects = createProjectStore(async () => ({ defaultDataPath: tmp } as never));
    const { id, dir } = await seedProject(tmp);
    await fs.rm(path.join(dir, 'outputs', '视觉方案升级报告.md'), { force: true });
    const service = createProjectContextService({ projects });
    await assert.rejects(
      () => service.rebuild(id),
      (error: Error & { code?: string }) => (error.code ?? '').includes('SOURCE_MISSING')
    );
    const updated = await projects.get(id);
    assert.equal(updated.visualContextStatus, 'failed');
    assert.equal(updated.projectName, '测试项目');
  } finally {
    await fs.rm(tmp, { recursive: true, force: true });
  }
});
