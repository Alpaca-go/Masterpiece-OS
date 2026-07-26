// 生图功能 V1 Phase 6：ImageGenerationService 直测（不依赖 Electron / 不触达真实网络）。
// 直接装配 createImageGenerationService，注入 mock loadContext + 可注入 fetchImpl 模拟 Provider 全流程，
// 验证 compile / start / retry / cancel / saveReview / getRun / listRuns / onRunUpdated。
// 运行：node --test tests/image-generation/service.test.js

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import fsSync from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

import { createImageGenerationService } from '../../apps/desktop/src/main/image-generation/service.ts';

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '..', '..');

const PROJECT_ID = '22222222-3333-4444-5555-666666666666';
const REF_RUN_ID = 'ref-run-service-1';
const PROJECT_NAME = '冯烫烫';

// ── 与 headless-cli 一致的 upstream 上下文（保证 Gate 真实通过）──
function resolvedContext() {
  return {
    schemaVersion: '1.0',
    projectId: PROJECT_ID,
    generatedAt: '2026-01-01T00:00:00.000Z',
    identity: { projectName: PROJECT_NAME, brandName: PROJECT_NAME, industry: '餐饮' },
    lockedAssets: { logoLocked: true, logoAssetIds: ['logo-1'], lockedFacts: ['主色为暖橙'] },
    products: ['招牌烫菜'],
    services: ['堂食'],
    targetAudience: ['年轻上班族'],
    pricePositioning: '中端',
    businessModel: '连锁',
    brandPersonality: ['热闹'],
    visualPreferences: ['可调整版式'],
    currentVisualSystem: {
      existingVisualAssets: [],
      primaryColors: ['#E8622D'],
      supportingColors: [],
      graphicAssets: [],
      typographySignals: [],
      materialSignals: [],
      photographySignals: [],
    },
    packaging: { structures: [], status: 'unknown', evidenceSources: [] },
    businessTouchpoints: { packaging: ['外卖盒'], viApplications: [], spatial: [], digital: [] },
    prohibitedDirections: ['禁止冷淡性冷淡风'],
    uncertainties: [],
    conflicts: [],
    sourceVersions: { resolverVersion: '1.0' },
  };
}
function capsule() {
  return {
    schemaVersion: '1.0',
    sourceRunId: REF_RUN_ID,
    currentProjectId: PROJECT_ID,
    generatedAt: '2026-01-01T00:00:00.000Z',
    currentProject: {
      brandName: PROJECT_NAME,
      industry: '餐饮',
      logoLocked: true,
      logoAssetIds: ['logo-1'],
      lockedFacts: ['主色为暖橙'],
      coreProducts: ['招牌烫菜'],
      businessTouchpoints: ['外卖盒'],
    },
    projectFacts: {
      coreProducts: ['招牌烫菜'],
      services: ['堂食'],
      touchpoints: { packaging: ['外卖盒'], viApplications: [], serviceMaterials: [], spatial: [], digital: [] },
      designAdvice: [],
      uncertainties: [],
    },
    inheritedStyle: {
      color: ['暖橙主色 + 米白背景'],
      layoutAndTypography: ['大标题 + 网格'],
      graphicLanguage: ['手绘食材图形'],
      materialAndPhotography: ['哑光纸质感'],
      extensionMechanism: ['图形可平铺'],
    },
    userPreference: '希望更有烟火气',
    userAvoidance: ['避免高冷极简'],
    prohibitedReferenceIdentity: {
      brandNames: ['某参考品牌X'],
      logos: ['参考品牌X的圆形logo'],
      slogans: ['参考品牌X的slogan'],
      signatureGraphics: ['参考品牌X的波浪纹'],
      proprietaryPatterns: [],
    },
    anchorGoal: '确立冯烫烫的暖橙烟火气主视觉',
    aspectRatio: '16:9',
    humanNotes: [],
    uncertainties: [],
  };
}

// 构造最小项目目录（供 resolveProjectRoot 定位），loadContext 走 mock。
async function buildProject(dataPath) {
  const projectDir = path.join(dataPath, 'projects', `${PROJECT_NAME}-${PROJECT_ID.slice(0, 8)}`);
  await fs.mkdir(path.join(projectDir, 'input'), { recursive: true });
  const logoBuf = await sharp({ create: { width: 64, height: 64, channels: 4, background: { r: 232, g: 98, b: 45, alpha: 1 } } })
    .png()
    .toBuffer();
  await fs.writeFile(path.join(projectDir, 'input', 'logo.png'), logoBuf);
  await fs.writeFile(
    path.join(projectDir, 'project.json'),
    JSON.stringify({ id: PROJECT_ID, projectName: PROJECT_NAME }, null, 2),
  );
  return projectDir;
}

function identityReferences(projectDir) {
  return [{ role: 'current_project_logo', kind: 'image', assetId: 'logo-1', localPath: path.join(projectDir, 'input', 'logo.png') }];
}

// ── mock fetch：模拟 DashScope 提交 → 轮询 → 下载 全流程 ──
function makeResponse(obj, { status = 200 } = {}) {
  return { ok: status >= 200 && status < 300, status, text: async () => JSON.stringify(obj) };
}
async function realPngBuffer(size = 32) {
  return sharp({ create: { width: size, height: size, channels: 4, background: { r: 232, g: 98, b: 45, alpha: 1 } } })
    .png()
    .toBuffer();
}
function makeFetchResponder({ finalImageUrl = 'https://cdn.example/x.png' } = {}) {
  let statusCalls = 0;
  const calls = [];
  const fetchImpl = async (url, options = {}) => {
    const u = String(url);
    calls.push({ url: u, method: options.method });
    if (u.includes('image-synthesis')) {
      return makeResponse({ output: { task_id: 'dash-task-1' }, request_id: 'req-sub' });
    }
    if (u.includes('/tasks/') && !u.includes('cancel')) {
      statusCalls += 1;
      if (statusCalls === 1) {
        return makeResponse({ request_id: 'req-poll', output: { task_status: 'RUNNING', results: [] } });
      }
      return makeResponse({
        request_id: 'req-done',
        output: { task_status: 'SUCCEEDED', results: [{ url: finalImageUrl }] },
        usage: { image_count: 1 },
      });
    }
    if (u.includes(finalImageUrl)) {
      const buf = await realPngBuffer(32);
      return {
        ok: true,
        status: 200,
        headers: { get: (k) => (k.toLowerCase() === 'content-type' ? 'image/png' : null) },
        arrayBuffer: async () => buf,
      };
    }
    return makeResponse({});
  };
  return { fetchImpl, calls };
}

function makeService(dataPath, { fetchImpl, emitRunUpdated }) {
  const projectDir = path.join(dataPath, 'projects', `${PROJECT_NAME}-${PROJECT_ID.slice(0, 8)}`);
  return createImageGenerationService({
    loadContext: async () => ({
      resolvedContext: resolvedContext(),
      capsule: capsule(),
      anchorBriefMarkdown: '# Anchor Generation Brief\n\n暖橙烟火气主视觉方向。',
      anchorApproved: true,
      references: identityReferences(projectDir),
    }),
    dataPath,
    fetchImpl,
    readCredentials: async () => ({ apiKey: 'sk-test' }),
    fileReader: async () => Buffer.from(''),
    sleepMs: 0,
    now: () => '2026-01-01T00:00:00.000Z',
    emitRunUpdated,
  });
}

const COMPILE_OPTS = { projectId: PROJECT_ID, referenceAnchorRunId: REF_RUN_ID };

test('compile dry-run：anchor 已批准 → 状态 ready 且落盘 task.json', async () => {
  const dataPath = await fs.mkdtemp(path.join(os.tmpdir(), 'ig-svc-compile-'));
  await buildProject(dataPath);
  const svc = makeService(dataPath, { fetchImpl: async () => makeResponse({}) });

  const { run } = await svc.compile({ ...COMPILE_OPTS, dryRun: true });
  assert.equal(run.status, 'ready');
  assert.equal(run.gate.blocked, false);
  assert.equal(run.projectId, PROJECT_ID);

  const projectDir = path.join(dataPath, 'projects', `${PROJECT_NAME}-${PROJECT_ID.slice(0, 8)}`);
  const runDir = path.join(projectDir, 'image-generation', run.runId);
  assert.equal(fsSync.existsSync(path.join(runDir, 'task.json')), true, '应落盘 task.json');
  assert.equal(fsSync.existsSync(path.join(runDir, 'compiled-prompt.md')), true, '应落盘 compiled-prompt.md');

  await fs.rm(dataPath, { recursive: true, force: true });
});

test('compile dry-run：anchor 未批准 → 状态 blocked 且 gate.blocked=true', async () => {
  const dataPath = await fs.mkdtemp(path.join(os.tmpdir(), 'ig-svc-block-'));
  const projectDir = await buildProject(dataPath);
  const svc2 = createImageGenerationService({
    loadContext: async () => ({
      resolvedContext: resolvedContext(),
      capsule: capsule(),
      anchorBriefMarkdown: '# brief',
      anchorApproved: false,
      references: identityReferences(projectDir),
    }),
    dataPath,
    fetchImpl: async () => makeResponse({}),
    sleepMs: 0,
  });

  const { run } = await svc2.compile({ ...COMPILE_OPTS, dryRun: true });
  assert.equal(run.status, 'blocked');
  assert.equal(run.gate.blocked, true);

  await fs.rm(dataPath, { recursive: true, force: true });
});

test('start 完整流程（mock fetch）→ succeeded 且图片落盘', async () => {
  const dataPath = await fs.mkdtemp(path.join(os.tmpdir(), 'ig-svc-start-'));
  await buildProject(dataPath);
  const { fetchImpl, calls } = makeFetchResponder();
  const svc = makeService(dataPath, { fetchImpl });

  const run = await svc.start(COMPILE_OPTS);
  assert.equal(run.status, 'succeeded', `应为 succeeded，实际 ${run.status}: ${run.errorMessage ?? ''}`);
  assert.equal(run.images.length, 1, '应产出 1 张图片');
  assert.equal(run.images[0].imageId, 'image-01');

  // 图片文件确实落盘
  const projectDir = path.join(dataPath, 'projects', `${PROJECT_NAME}-${PROJECT_ID.slice(0, 8)}`);
  const runDir = path.join(projectDir, 'image-generation', run.runId);
  assert.equal(fsSync.existsSync(path.join(runDir, 'images', 'image-01.png')), true, '图片应落盘');

  // 至少一次提交 + 一次轮询
  assert.ok(calls.some((c) => c.url.includes('image-synthesis')), '应调用提交接口');
  assert.ok(calls.some((c) => c.url.includes('/tasks/')), '应调用轮询接口');

  await fs.rm(dataPath, { recursive: true, force: true });
});

test('retry dryRun：新建独立 run，继承 parentRunId，父运行追加 retry-history', async () => {
  const dataPath = await fs.mkdtemp(path.join(os.tmpdir(), 'ig-svc-retry-'));
  await buildProject(dataPath);
  const svc = makeService(dataPath, { fetchImpl: async () => makeResponse({}) });

  const parent = await svc.compile({ ...COMPILE_OPTS, dryRun: true });
  const retried = await svc.retry({ runId: parent.run.runId, mode: 'same_prompt', dryRun: true });

  assert.notEqual(retried.runId, parent.run.runId, '新 run 应有独立 runId');
  assert.equal(retried.parentRunId, parent.run.runId, '应继承父 runId');

  const reloadedParent = await svc.getRun(parent.run.runId);
  const history = JSON.parse(
    fsSync.readFileSync(
      path.join(dataPath, 'projects', `${PROJECT_NAME}-${PROJECT_ID.slice(0, 8)}`, 'image-generation', parent.run.runId, 'retry-history.json'),
      'utf8',
    ),
  );
  assert.equal(history.length, 1);
  assert.equal(history[0].retryRunId, retried.runId);
  assert.equal(history[0].parentRunId, parent.run.runId);

  await fs.rm(dataPath, { recursive: true, force: true });
});

test('retry edited_prompt：改写 Prompt 并重新执行 Gate A', async () => {
  const dataPath = await fs.mkdtemp(path.join(os.tmpdir(), 'ig-svc-retry-edit-'));
  await buildProject(dataPath);
  const svc = makeService(dataPath, { fetchImpl: async () => makeResponse({}) });

  const parent = await svc.compile({ ...COMPILE_OPTS, dryRun: true });
  const retried = await svc.retry({
    runId: parent.run.runId,
    mode: 'edited_prompt',
    editedPrompt: '自由创作一张冯烫烫品牌图',
    dryRun: true,
  });
  const projectDir = path.join(dataPath, 'projects', `${PROJECT_NAME}-${PROJECT_ID.slice(0, 8)}`);
  const compiledPrompt = fsSync.readFileSync(path.join(projectDir, 'image-generation', retried.runId, 'compiled-prompt.md'), 'utf8');
  assert.match(compiledPrompt, /自由创作一张冯烫烫品牌图/, 'edited_prompt 应覆盖编译 Prompt');

  await fs.rm(dataPath, { recursive: true, force: true });
});

test('cancel：取消执行中运行 → 状态 cancelled 返回 true', async () => {
  const dataPath = await fs.mkdtemp(path.join(os.tmpdir(), 'ig-svc-cancel-'));
  await buildProject(dataPath);
  const svc = makeService(dataPath, { fetchImpl: async () => makeResponse({}) });

  const { run } = await svc.compile({ ...COMPILE_OPTS, dryRun: true });
  // 手动把 run 置为 executing（真实执行中状态由 start 产生，此处直接落盘以测 cancel 逻辑）
  const projectDir = path.join(dataPath, 'projects', `${PROJECT_NAME}-${PROJECT_ID.slice(0, 8)}`);
  const runDir = path.join(projectDir, 'image-generation', run.runId);
  const executing = { ...JSON.parse(fsSync.readFileSync(path.join(runDir, 'run.json'), 'utf8')), status: 'running', providerTaskId: 'dash-task-x' };
  fsSync.writeFileSync(path.join(runDir, 'run.json'), JSON.stringify(executing));

  const ok = await svc.cancel(run.runId);
  assert.equal(ok, true);
  const reloaded = await svc.getRun(run.runId);
  assert.equal(reloaded.status, 'cancelled');

  // 取消非执行中运行应返回 false
  const ok2 = await svc.cancel(run.runId);
  assert.equal(ok2, false);

  await fs.rm(dataPath, { recursive: true, force: true });
});

test('saveReview：保存设计师评价 → run.review 更新', async () => {
  const dataPath = await fs.mkdtemp(path.join(os.tmpdir(), 'ig-svc-review-'));
  await buildProject(dataPath);
  const svc = makeService(dataPath, { fetchImpl: async () => makeResponse({}) });

  const { run } = await svc.compile({ ...COMPILE_OPTS, dryRun: true });
  const updated = await svc.saveReview({ runId: run.runId, decision: 'approved', notes: '主视觉符合暖橙烟火气' });
  assert.equal(updated.review.decision, 'approved');
  assert.equal(updated.review.notes, '主视觉符合暖橙烟火气');
  const reloaded = await svc.getRun(run.runId);
  assert.equal(reloaded.review.decision, 'approved');

  await fs.rm(dataPath, { recursive: true, force: true });
});

test('onRunUpdated：start 期间多次广播进度', async () => {
  const dataPath = await fs.mkdtemp(path.join(os.tmpdir(), 'ig-svc-emit-'));
  await buildProject(dataPath);
  const { fetchImpl } = makeFetchResponder();
  const emitted = [];
  const svc = makeService(dataPath, { fetchImpl, emitRunUpdated: (p) => emitted.push(p) });

  const run = await svc.start(COMPILE_OPTS);
  assert.equal(run.status, 'succeeded');
  assert.ok(emitted.length >= 2, `应广播多次进度，实际 ${emitted.length}`);
  const last = emitted[emitted.length - 1];
  assert.equal(last.status, 'succeeded');
  // 至少包含 submitting 与 downloading 阶段
  const statuses = emitted.map((e) => e.status);
  assert.ok(statuses.includes('submitting'), '应广播 submitting');
  assert.ok(statuses.includes('downloading'), '应广播 downloading');

  await fs.rm(dataPath, { recursive: true, force: true });
});

test('getRun / listRuns 读写一致', async () => {
  const dataPath = await fs.mkdtemp(path.join(os.tmpdir(), 'ig-svc-list-'));
  await buildProject(dataPath);
  const svc = makeService(dataPath, { fetchImpl: async () => makeResponse({}) });

  const { run } = await svc.compile({ ...COMPILE_OPTS, dryRun: true });
  const got = await svc.getRun(run.runId);
  assert.equal(got.runId, run.runId);
  const list = await svc.listRuns();
  assert.ok(list.some((r) => r.runId === run.runId), 'listRuns 应含该运行');
  const byProject = await svc.listRuns(PROJECT_ID);
  assert.ok(byProject.some((r) => r.runId === run.runId));

  await fs.rm(dataPath, { recursive: true, force: true });
});
