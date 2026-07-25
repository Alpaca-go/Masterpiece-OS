import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createVisualTranslationService } from '../src/main/visual-translation-service.ts';
import { createReferenceTranslationService } from '../src/main/reference-translation-service.ts';
import type { PublicSettings, ReferenceTranslationRunRecord, VisualTranslationRunRecord } from '../src/shared/types';

function settingsFor(temporary: string): PublicSettings {
  return {
    profiles: [],
    defaultProfileId: null,
    provider: '',
    baseUrl: '',
    model: '',
    hasApiKey: false,
    defaultDataPath: temporary,
    cacheEnabled: true,
    logLevel: 'info',
    connectionStatus: 'untested'
  } as unknown as PublicSettings;
}

function createVisualService(temporary: string) {
  return createVisualTranslationService(
    async () => ({ profileId: 'profile-test', provider: 'mock', baseUrl: 'https://example.test/v1', model: 'mock-model', apiKey: 'secret' }),
    async () => settingsFor(temporary),
    () => {},
    () => async () => ({ text: '{}' })
  );
}

async function writeVisualZombieRun(temporary: string, overrides: Partial<VisualTranslationRunRecord> = {}): Promise<string> {
  const runId = crypto.randomUUID();
  const runtimeRoot = path.join(temporary, 'visual-translation-v1', runId, 'runtime');
  await fs.mkdir(runtimeRoot, { recursive: true });
  // 模拟真实僵尸记录：老格式，无 analysisStatus / revision（应用异常退出时遗留）
  const record = {
    id: runId,
    analysisRunId: crypto.randomUUID(),
    projectName: '01-01-九州美学',
    status: 'running',
    apiProfileId: 'profile-test',
    provider: 'mock',
    model: 'mock-model',
    documentCount: 1,
    documentNames: ['策略文档.md'],
    createdAt: '2026-07-21T08:00:00.000Z',
    startedAt: '2026-07-21T08:00:01.000Z',
    ...overrides
  };
  await fs.writeFile(path.join(runtimeRoot, 'run.json'), `${JSON.stringify(record, null, 2)}\n`, 'utf8');
  return runId;
}

test('应用异常退出遗留的 running 视觉转译任务在读取时自动降级为 failed 并可删除', async () => {
  const temporary = await fs.mkdtemp(path.join(os.tmpdir(), 'orphaned-vt-'));
  try {
    const runId = await writeVisualZombieRun(temporary, { step4Status: 'running' });
    const service = createVisualService(temporary);

    // 列表读取即触发降级
    const runs = await service.listRuns();
    assert.equal(runs.length, 1);
    assert.equal(runs[0]?.status, 'failed');
    assert.equal(runs[0]?.analysisStatus, 'failed_before_completion');
    assert.equal(runs[0]?.step4Status, 'failed');
    assert.match(runs[0]?.lastError || '', /异常退出/);

    // 降级已持久化到磁盘（重启后不再回到 running）
    const onDisk = JSON.parse(await fs.readFile(path.join(temporary, 'visual-translation-v1', runId, 'runtime', 'run.json'), 'utf8')) as VisualTranslationRunRecord;
    assert.equal(onDisk.status, 'failed');

    // 单条读取保持 failed，且随后可正常删除（原来会被“运行中任务不能删除”永久卡死）
    const fetched = await service.getRun(runId);
    assert.equal(fetched.status, 'failed');
    await service.remove(runId);
    const remains = await fs.readdir(path.join(temporary, 'visual-translation-v1')).catch(() => []);
    assert.equal(remains.length, 0);
  } finally {
    await fs.rm(temporary, { recursive: true, force: true });
  }
});

test('非 running 状态的视觉转译任务不会被降级逻辑改写', async () => {
  const temporary = await fs.mkdtemp(path.join(os.tmpdir(), 'orphaned-vt-completed-'));
  try {
    const runId = await writeVisualZombieRun(temporary, { status: 'completed', analysisStatus: 'completed', completedAt: '2026-07-21T08:10:00.000Z', reportFilename: 'report.md' } as Partial<VisualTranslationRunRecord>);
    const service = createVisualService(temporary);
    const runs = await service.listRuns();
    assert.equal(runs[0]?.status, 'completed');
    assert.equal(runs[0]?.lastError ?? null, null);
    const onDisk = JSON.parse(await fs.readFile(path.join(temporary, 'visual-translation-v1', runId, 'runtime', 'run.json'), 'utf8')) as VisualTranslationRunRecord;
    assert.equal(onDisk.status, 'completed');
  } finally {
    await fs.rm(temporary, { recursive: true, force: true });
  }
});

test('应用异常退出遗留的 running 参考转译任务在读取时自动降级为 failed 并可删除', async () => {
  const temporary = await fs.mkdtemp(path.join(os.tmpdir(), 'orphaned-rt-'));
  try {
    const runId = crypto.randomUUID();
    const runRoot = path.join(temporary, 'reference-translation-v1', runId);
    await fs.mkdir(runRoot, { recursive: true });
    const record: ReferenceTranslationRunRecord = {
      id: runId,
      status: 'running',
      createdAt: '2026-07-21T08:00:00.000Z',
      cacheHit: false,
      visualAnalysisFilename: '视觉分析.md',
      projectContextFilename: 'project-context.json',
      preference: '',
      stage: 'ANALYZING_REFERENCE',
      progress: 45,
      lastError: null
    };
    await fs.writeFile(path.join(runRoot, 'run.json'), `${JSON.stringify(record, null, 2)}\n`, 'utf8');

    const service = createReferenceTranslationService(async () => settingsFor(temporary));
    const runs = await service.listRuns();
    assert.equal(runs.length, 1);
    assert.equal(runs[0]?.status, 'failed');
    assert.equal(runs[0]?.stage, 'FAILED');
    assert.match(runs[0]?.lastError || '', /异常退出/);

    const onDisk = JSON.parse(await fs.readFile(path.join(runRoot, 'run.json'), 'utf8')) as ReferenceTranslationRunRecord;
    assert.equal(onDisk.status, 'failed');

    await service.remove(runId);
    const remains = await fs.readdir(path.join(temporary, 'reference-translation-v1')).catch(() => []);
    assert.equal(remains.length, 0);
  } finally {
    await fs.rm(temporary, { recursive: true, force: true });
  }
});

test('已完成的参考转译任务不会被降级逻辑改写', async () => {
  const temporary = await fs.mkdtemp(path.join(os.tmpdir(), 'orphaned-rt-completed-'));
  try {
    const runId = crypto.randomUUID();
    const runRoot = path.join(temporary, 'reference-translation-v1', runId);
    await fs.mkdir(runRoot, { recursive: true });
    const record: ReferenceTranslationRunRecord = {
      id: runId,
      status: 'completed',
      createdAt: '2026-07-21T08:00:00.000Z',
      completedAt: '2026-07-21T08:12:00.000Z',
      cacheHit: false,
      visualAnalysisFilename: '视觉分析.md',
      projectContextFilename: 'project-context.json',
      preference: '',
      stage: 'COMPLETED',
      progress: 100,
      lastError: null
    };
    await fs.writeFile(path.join(runRoot, 'run.json'), `${JSON.stringify(record, null, 2)}\n`, 'utf8');
    const service = createReferenceTranslationService(async () => settingsFor(temporary));
    const runs = await service.listRuns();
    assert.equal(runs[0]?.status, 'completed');
    assert.equal(runs[0]?.lastError ?? null, null);
  } finally {
    await fs.rm(temporary, { recursive: true, force: true });
  }
});
