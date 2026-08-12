import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { createProjectStore } from '@masterpiece/runtime-core/application/project-store.ts';
import { createProjectContextService } from '@masterpiece/runtime-core/application/project-context-service.ts';

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

// r2.0 / r10.4 UX: getGenerationContextReadiness — the unified
// predicate that decides whether the persisted Project + Visual
// Context already has the minimum data needed to start a vnext
// image generation, without going through the full LLM analysis
// report. This test pins the contract for the project page
// "继续创作 / 直接创作" entry: a project where every precondition
// is satisfied MUST report ready=true with an empty reasons array;
// a project missing any precondition MUST report ready=false with
// the offending condition named in the reasons array.
function minimalValidShortChainContext(projectId: string): Record<string, unknown> {
  return {
    schemaVersion: '2.0',
    projectId,
    version: 1,
    brandCore: { name: '测试品牌' },
    lockedAssets: { mustPreserve: [] },
    sourceAssetRefs: [],
    provenance: { sourceFingerprint: 'fp-fixture' },
  };
}

async function seedProjectWithShortChain(root: string, vnextBody: Record<string, unknown> | null) {
  const seeded = await seedProject(root);
  const projects = createProjectStore(async () => ({ defaultDataPath: root } as never));
  const updates: Record<string, unknown> = {
    visualContextStatus: 'ready',
    visualContextSchemaVersion: '1.0',
    visualContextFilename: 'project-visual-context.json',
  };
  if (vnextBody !== null) {
    updates.visualContextVNextStatus = 'ready';
    updates.visualContextVNextFilename = 'project-visual-context.vnext.json';
    updates.visualContextVNextVersion = (vnextBody as { version?: number }).version ?? 1;
    updates.visualContextVNextLastBuiltAt = new Date().toISOString();
    const dir = path.join(root, 'projects', `${seeded.id.slice(0, 8)}-${seeded.id}`);
    await fs.mkdir(path.join(dir, 'project-context'), { recursive: true });
    await fs.writeFile(
      path.join(dir, 'project-context', 'project-visual-context.vnext.json'),
      `${JSON.stringify(vnextBody, null, 2)}\n`,
      'utf8'
    );
  }
  await projects.update(seeded.id, updates);
  return { id: seeded.id };
}

test('getGenerationContextReadiness: project with valid vnext context + legacy visual context returns ready=true', async () => {
  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'pvc-readiness-ready-'));
  try {
    const { id } = await seedProjectWithShortChain(tmp, minimalValidShortChainContext('project-id'));
    const projects = createProjectStore(async () => ({ defaultDataPath: tmp } as never));
    const service = createProjectContextService({ projects });
    const readiness = await service.getGenerationContextReadiness(id);
    assert.equal(readiness.ready, true);
    assert.deepEqual(readiness.reasons, []);
    assert.equal(readiness.vnextSchemaVersion, 1);
    assert.ok(readiness.vnextBuiltAt, 'vnextBuiltAt must be set when ready');
  } finally {
    await fs.rm(tmp, { recursive: true, force: true });
  }
});

test('getGenerationContextReadiness: legacy visual context status != ready surfaces a precise reason', async () => {
  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'pvc-readiness-legacy-'));
  try {
    const seeded = await seedProject(tmp);
    const projects = createProjectStore(async () => ({ defaultDataPath: tmp } as never));
    const service = createProjectContextService({ projects });
    // No visualContextStatus update; project.visualContextStatus stays
    // 'missing' (undefined-coerced), so the predicate must surface
    // the legacy reason.
    const readiness = await service.getGenerationContextReadiness(seeded.id);
    assert.equal(readiness.ready, false);
    assert.ok(
      readiness.reasons.some((r) => r.includes('视觉上下文')),
      `expected a legacy-context reason, got: ${JSON.stringify(readiness.reasons)}`,
    );
  } finally {
    await fs.rm(tmp, { recursive: true, force: true });
  }
});

test('getGenerationContextReadiness: missing Project Visual Context surfaces a precise reason and returns ready=false', async () => {
  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'pvc-readiness-vnext-missing-'));
  try {
    // vnextBody=null => do NOT seed the vnext file or status.
    const { id } = await seedProjectWithShortChain(tmp, null);
    const projects = createProjectStore(async () => ({ defaultDataPath: tmp } as never));
    const service = createProjectContextService({ projects });
    const readiness = await service.getGenerationContextReadiness(id);
    assert.equal(readiness.ready, false);
    assert.ok(
      readiness.reasons.some((r) => r.includes('Project Visual Context')),
      `expected a Project Visual Context reason, got: ${JSON.stringify(readiness.reasons)}`,
    );
  } finally {
    await fs.rm(tmp, { recursive: true, force: true });
  }
});

test('getGenerationContextReadiness: malformed vnext file surfaces the validation errors', async () => {
  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'pvc-readiness-vnext-invalid-'));
  try {
    // Seed the vnext status/filename but write a file that fails
    // validateProjectVisualContext (schemaVersion !== '2.0').
    const seeded = await seedProject(tmp);
    const projects = createProjectStore(async () => ({ defaultDataPath: tmp } as never));
    const dir = path.join(tmp, 'projects', `${seeded.id.slice(0, 8)}-${seeded.id}`);
    await fs.mkdir(path.join(dir, 'project-context'), { recursive: true });
    await fs.writeFile(
      path.join(dir, 'project-context', 'project-visual-context.vnext.json'),
      `${JSON.stringify({ schemaVersion: '9.9', projectId: seeded.id, version: 1 }, null, 2)}\n`,
      'utf8'
    );
    await projects.update(seeded.id, {
      visualContextStatus: 'ready',
      visualContextSchemaVersion: '1.0',
      visualContextFilename: 'project-visual-context.json',
      visualContextVNextStatus: 'ready',
      visualContextVNextFilename: 'project-visual-context.vnext.json',
      visualContextVNextVersion: 1,
      visualContextVNextLastBuiltAt: new Date().toISOString(),
    });
    const service = createProjectContextService({ projects });
    const readiness = await service.getGenerationContextReadiness(seeded.id);
    assert.equal(readiness.ready, false);
    assert.ok(
      readiness.reasons.some((r) => r.includes('文件校验失败') || r.includes('不可读')),
      `expected a file-validation reason, got: ${JSON.stringify(readiness.reasons)}`,
    );
  } finally {
    await fs.rm(tmp, { recursive: true, force: true });
  }
});

test('getGenerationContextReadiness: nonexistent project returns ready=false with project-not-found reason', async () => {
  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'pvc-readiness-missing-'));
  try {
    const projects = createProjectStore(async () => ({ defaultDataPath: tmp } as never));
    const service = createProjectContextService({ projects });
    const readiness = await service.getGenerationContextReadiness('00000000-0000-0000-0000-000000000000');
    assert.equal(readiness.ready, false);
    assert.ok(
      readiness.reasons.some((r) => r.includes('不存在')),
      `expected a not-found reason, got: ${JSON.stringify(readiness.reasons)}`,
    );
  } finally {
    await fs.rm(tmp, { recursive: true, force: true });
  }
});
