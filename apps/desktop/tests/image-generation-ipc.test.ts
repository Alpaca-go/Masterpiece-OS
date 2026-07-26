// 生图功能 V1 Phase 6：Desktop IPC 注册测试（§16.1）。
// 用 fake ipcMain + fake service 验证 registerImageGenerationIpc 注册了全部 handler，
// 且每个 handler 正确解析入参并转发到 service 对应方法。不依赖 Electron 运行时。
// 运行：npm --prefix apps/desktop test（tsx --test）

import test from 'node:test';
import assert from 'node:assert/strict';
import { registerImageGenerationIpc } from '../src/main/image-generation/ipc';

function makeFakeIpcMain() {
  const handlers: Record<string, (...args: any[]) => any> = {};
  const ipcMain: any = {
    handle(channel: string, fn: (...args: any[]) => any) {
      handlers[channel] = fn;
      return { dispose() {} };
    },
  };
  return { ipcMain, handlers };
}

function makeFakeService() {
  const calls: any = {};
  const svc: any = {
    getCapabilities: async () => 'CAPS',
    compile: async (input: any) => {
      calls.compile = [input];
      return { run: { runId: 'r-compile' } };
    },
    start: async (input: any) => {
      calls.start = [input];
      return { runId: 'r-start' };
    },
    getRun: async (runId: string) => {
      calls.getRun = [runId];
      return { runId };
    },
    listRuns: async (projectId?: string) => {
      calls.listRuns = [projectId];
      return [{ runId: 'r1' }];
    },
    cancel: async (runId: string) => {
      calls.cancel = [runId];
      return true;
    },
    retry: async (input: any) => {
      calls.retry = [input];
      return { runId: 'r-retry' };
    },
    saveReview: async (review: any) => {
      calls.saveReview = [review];
      return review;
    },
    openFolder: async (runId: string) => {
      calls.openFolder = [runId];
      return undefined;
    },
    readImageDataUrl: async (runId: string, imageId: string) => {
      calls.getImageDataUrl = [runId, imageId];
      return { mimeType: 'image/png', dataUrl: 'data:image/png;base64,xxx' };
    },
  };
  return { svc, calls };
}

const EXPECTED_CHANNELS = [
  'image-generation:get-capabilities',
  'image-generation:compile',
  'image-generation:start',
  'image-generation:get-run',
  'image-generation:list-runs',
  'image-generation:cancel',
  'image-generation:retry',
  'image-generation:save-review',
  'image-generation:open-folder',
  'image-generation:get-image-data-url',
];

test('registerImageGenerationIpc 注册全部 §16.1 handler', () => {
  const { ipcMain, handlers } = makeFakeIpcMain() as any;
  const { svc, calls } = makeFakeService();
  registerImageGenerationIpc(svc, ipcMain);
  for (const ch of EXPECTED_CHANNELS) {
    assert.ok(handlers[ch], `应注册 ${ch}`);
  }
});

test('get-capabilities 转发', async () => {
  const { ipcMain, handlers } = makeFakeIpcMain() as any;
  const { svc, calls } = makeFakeService();
  registerImageGenerationIpc(svc, ipcMain);
  const result = await handlers['image-generation:get-capabilities']({}, undefined);
  assert.equal(result, 'CAPS');
});

test('compile 转发并映射 StartImageGenerationInput 字段', async () => {
  const { ipcMain, handlers } = makeFakeIpcMain() as any;
  const { svc, calls } = makeFakeService();
  registerImageGenerationIpc(svc, ipcMain);
  const input = { projectId: 'p1', referenceAnchorRunId: 'ref1', outputType: 'master_anchor_image', apiProfileId: 'prof1', size: '1024*1024', region: 'beijing' };
  const result = await handlers['image-generation:compile']({}, input);
  assert.equal(result.run.runId, 'r-compile');
  assert.equal(calls.compile[0].projectId, 'p1');
  assert.equal(calls.compile[0].referenceAnchorRunId, 'ref1');
  assert.equal(calls.compile[0].apiProfileId, 'prof1');
  assert.equal(calls.compile[0].size, '1024*1024');
  assert.equal(calls.compile[0].region, 'beijing');
});

test('start 转发并映射字段', async () => {
  const { ipcMain, handlers } = makeFakeIpcMain() as any;
  const { svc, calls } = makeFakeService();
  registerImageGenerationIpc(svc, ipcMain);
  const input = { projectId: 'p1', referenceAnchorRunId: 'ref1', apiProfileId: 'prof1' };
  await handlers['image-generation:start']({}, input);
  assert.equal(calls.start[0].projectId, 'p1');
  assert.equal(calls.start[0].referenceAnchorRunId, 'ref1');
});

test('get-run / list-runs / cancel 转发参数', async () => {
  const { ipcMain, handlers } = makeFakeIpcMain() as any;
  const { svc, calls } = makeFakeService();
  registerImageGenerationIpc(svc, ipcMain);
  const run = await handlers['image-generation:get-run']({}, 'r-x');
  assert.equal(run.runId, 'r-x');
  assert.equal(calls.getRun[0], 'r-x');

  const list = await handlers['image-generation:list-runs']({}, 'p1');
  assert.equal(list.length, 1);
  assert.equal(calls.listRuns[0], 'p1');

  const cancelled = await handlers['image-generation:cancel']({}, 'r-y');
  assert.equal(cancelled, true);
  assert.equal(calls.cancel[0], 'r-y');
});

test('retry 转发并映射 RetryImageGenerationInput 字段', async () => {
  const { ipcMain, handlers } = makeFakeIpcMain() as any;
  const { svc, calls } = makeFakeService();
  registerImageGenerationIpc(svc, ipcMain);
  const input = { runId: 'r-parent', mode: 'edited_prompt', editedPrompt: '改写', apiProfileId: 'prof1' };
  const result = await handlers['image-generation:retry']({}, input);
  assert.equal(result.runId, 'r-retry');
  assert.equal(calls.retry[0].runId, 'r-parent');
  assert.equal(calls.retry[0].mode, 'edited_prompt');
  assert.equal(calls.retry[0].editedPrompt, '改写');
  assert.equal(calls.retry[0].apiProfileId, 'prof1');
});

test('save-review / open-folder / get-image-data-url 转发参数', async () => {
  const { ipcMain, handlers } = makeFakeIpcMain() as any;
  const { svc, calls } = makeFakeService();
  registerImageGenerationIpc(svc, ipcMain);

  const review = { runId: 'r1', decision: 'approved', notes: 'ok' };
  const saved = await handlers['image-generation:save-review']({}, review);
  assert.equal(saved.decision, 'approved');
  assert.equal(calls.saveReview[0].runId, 'r1');

  await handlers['image-generation:open-folder']({}, 'r2');
  assert.equal(calls.openFolder[0], 'r2');

  const dataUrl = await handlers['image-generation:get-image-data-url']({}, 'r3', 'image-01');
  assert.equal(dataUrl.mimeType, 'image/png');
  assert.equal(calls.getImageDataUrl[0], 'r3');
  assert.equal(calls.getImageDataUrl[1], 'image-01');
});
