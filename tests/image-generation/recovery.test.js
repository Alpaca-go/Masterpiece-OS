// 生图功能 V1 Phase 6：恢复路径测试（resume / recoverAll）。
// 离线构造执行中运行（含 task.json），注入 mock fetch 模拟 Provider 恢复，
// 验证 §12.3：submitting 无 providerTaskId → failed；executing 有 taskId → resume 成功。
// 运行：node --test tests/image-generation/recovery.test.js

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import fsSync from 'node:fs';
import os from 'node:os';
import path from 'path';

import { createImageGenerationService } from '@masterpiece/runtime-core/application/image-generation/service.ts';

const PROJECT_ID = '33333333-4444-5555-6666-777777777777';
const REF_RUN_ID = 'ref-run-recovery-1';
const PROJECT_NAME = '冯烫烫';

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
    currentProject: { brandName: PROJECT_NAME, industry: '餐饮', logoLocked: true, logoAssetIds: ['logo-1'], lockedFacts: ['主色为暖橙'], coreProducts: ['招牌烫菜'], businessTouchpoints: ['外卖盒'] },
    projectFacts: { coreProducts: ['招牌烫菜'], services: ['堂食'], touchpoints: { packaging: ['外卖盒'] }, designAdvice: [], uncertainties: [] },
    inheritedStyle: { color: ['暖橙主色'], layoutAndTypography: ['大标题'], graphicLanguage: [''], materialAndPhotography: [''], extensionMechanism: [''] },
    userPreference: '烟火气',
    userAvoidance: ['高冷'],
    prohibitedReferenceIdentity: { brandNames: [], logos: [], slogans: [], signatureGraphics: [], proprietaryPatterns: [] },
    anchorGoal: '暖橙主视觉',
    aspectRatio: '16:9',
    humanNotes: [],
    uncertainties: [],
  };
}

async function buildProject(dataPath) {
  const projectDir = path.join(dataPath, 'projects', `${PROJECT_NAME}-${PROJECT_ID.slice(0, 8)}`);
  await fs.mkdir(projectDir, { recursive: true });
  await fs.writeFile(path.join(projectDir, 'project.json'), JSON.stringify({ id: PROJECT_ID, projectName: PROJECT_NAME }, null, 2));
  return projectDir;
}

function makeResponse(obj, { status = 200 } = {}) {
  return { ok: status >= 200 && status < 300, status, text: async () => JSON.stringify(obj) };
}
async function realPngBuffer(size = 32) {
  const sharp = (await import('sharp')).default;
  return sharp({ create: { width: size, height: size, channels: 4, background: { r: 232, g: 98, b: 45, alpha: 1 } } }).png().toBuffer();
}
function makeFetchResponder({ finalImageUrl = 'https://cdn.example/x.png' } = {}) {
  const calls = [];
  const fetchImpl = async (url, options = {}) => {
    const u = String(url);
    calls.push({ url: u });
    if (u.includes('multimodal-generation/generation')) return makeResponse({ output: { task_id: 'dash-task-1' }, request_id: 'req-sub' });
    if (u.includes('/tasks/') && !u.includes('cancel')) {
      return makeResponse({
        request_id: 'req-done',
        output: { task_status: 'SUCCEEDED', results: [{ url: finalImageUrl }] },
        usage: { image_count: 1 },
      });
    }
    if (u.includes(finalImageUrl)) {
      const buf = await realPngBuffer(32);
      return { ok: true, status: 200, headers: { get: (k) => (k.toLowerCase() === 'content-type' ? 'image/png' : null) }, arrayBuffer: async () => buf };
    }
    return makeResponse({});
  };
  return { fetchImpl, calls };
}

function makeService(dataPath, { fetchImpl }) {
  return createImageGenerationService({
    loadContext: async () => ({ resolvedContext: resolvedContext(), capsule: capsule(), anchorBriefMarkdown: '# brief', anchorApproved: true, references: [] }),
    dataPath,
    readCredentials: async () => ({ apiKey: 'sk-test' }),
    fetchImpl,
    fileReader: async () => Buffer.from(''),
    sleepMs: 0,
    now: () => '2026-01-01T00:00:00.000Z',
  });
}

const COMPILE_OPTS = { projectId: PROJECT_ID, referenceAnchorRunId: REF_RUN_ID };

function runJsonPath(dataPath, runId) {
  const projectDir = path.join(dataPath, 'projects', `${PROJECT_NAME}-${PROJECT_ID.slice(0, 8)}`);
  return path.join(projectDir, 'image-generation', runId, 'run.json');
}
function rewriteRun(dataPath, runId, patch) {
  const p = runJsonPath(dataPath, runId);
  const cur = JSON.parse(fsSync.readFileSync(p, 'utf8'));
  fsSync.writeFileSync(p, JSON.stringify({ ...cur, ...patch }, null, 2));
}

test('resume：running 且有 providerTaskId + task.json → 恢复为 succeeded', async () => {
  const dataPath = await fs.mkdtemp(path.join(os.tmpdir(), 'ig-rec-resume-'));
  const projectDir = await buildProject(dataPath);
  const { fetchImpl } = makeFetchResponder();
  const svc = makeService(dataPath, { fetchImpl });

  const { run } = await svc.compile({ ...COMPILE_OPTS, dryRun: true });
  rewriteRun(dataPath, run.runId, { status: 'running', providerTaskId: 'dash-task-x' });

  const recovered = await svc.resume(run.runId);
  assert.ok(recovered, '应返回恢复后的运行');
  assert.equal(recovered.status, 'succeeded', `应恢复成功，实际 ${recovered.status}: ${recovered.errorMessage ?? ''}`);
  assert.equal(recovered.images.length, 1);

  await fs.rm(dataPath, { recursive: true, force: true });
});

test('resume：submitting 但缺 providerTaskId → 标记为 failed（RUN_RECOVERY_FAILED）', async () => {
  const dataPath = await fs.mkdtemp(path.join(os.tmpdir(), 'ig-rec-fail-'));
  await buildProject(dataPath);
  const svc = makeService(dataPath, { fetchImpl: async () => makeResponse({}) });

  const { run } = await svc.compile({ ...COMPILE_OPTS, dryRun: true });
  rewriteRun(dataPath, run.runId, { status: 'submitting' }); // 不含 providerTaskId

  const recovered = await svc.resume(run.runId);
  assert.equal(recovered.status, 'failed');
  assert.equal(recovered.errorCode, 'RUN_RECOVERY_FAILED');

  await fs.rm(dataPath, { recursive: true, force: true });
});

test('recoverAll：混合状态 → submitting(无taskId)失败 / succeeded 不变 / running 恢复成功', async () => {
  const dataPath = await fs.mkdtemp(path.join(os.tmpdir(), 'ig-rec-all-'));
  await buildProject(dataPath);
  const { fetchImpl } = makeFetchResponder();
  const svc = makeService(dataPath, { fetchImpl });

  // A: submitting 无 taskId（将失败）
  const a = await svc.compile({ ...COMPILE_OPTS, dryRun: true });
  rewriteRun(dataPath, a.run.runId, { status: 'submitting' });

  // B: 已成功（不应被 resume）
  const b = await svc.compile({ ...COMPILE_OPTS, dryRun: true });
  rewriteRun(dataPath, b.run.runId, { status: 'succeeded' });

  // C: running 有 taskId（将恢复成功）
  const c = await svc.compile({ ...COMPILE_OPTS, dryRun: true });
  rewriteRun(dataPath, c.run.runId, { status: 'running', providerTaskId: 'dash-task-c' });

  const recovered = await svc.recoverAll();
  assert.equal(recovered.length, 2, '应恢复 A 与 C（执行中状态）');

  const ra = await svc.getRun(a.run.runId);
  assert.equal(ra.status, 'failed');
  assert.equal(ra.errorCode, 'RUN_RECOVERY_FAILED');

  const rb = await svc.getRun(b.run.runId);
  assert.equal(rb.status, 'succeeded', 'B 应保持 succeeded 不变');

  const rc = await svc.getRun(c.run.runId);
  assert.equal(rc.status, 'succeeded', 'C 应恢复成功');

  await fs.rm(dataPath, { recursive: true, force: true });
});
