// r2.0 §4.11 / Phase C-3: UI preflight IPC test.
// The renderer needs a fail-soft way to ask the main process whether a set
// of project asset IDs are resolvable as references BEFORE the user clicks
// "use as reference". The handler is registered as
// `image-generation:preflight-reference-assets` and forwards to
// `vnextService.preflightReferenceAssets(input)`. This test pins:
//   - the channel is registered when vnextService.preflightReferenceAssets
//     is present (Phase C-3 wiring is conditional on the method existing);
//   - the handler forwards { projectId, assetIds } to the service unchanged;
//   - the handler returns the per-ID { resolved / failed } map and does NOT
//     throw (fail-soft semantics are a hard requirement for the UI).
//
// The preflight does not require ImageGenerationService; only the vnext
// service is exercised, so the test mirrors the vnext-only path in
// registerImageGenerationIpc.

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

function makeFakeImageGenService() {
  return {
    getCapabilities: async () => ({}),
    getPresetCapabilities: async () => [],
    getSourcePreview: async () => ({}),
    compile: async () => ({ run: {}, result: {}, context: {} }),
    start: async () => ({ runId: 'r' }),
    getRun: async () => ({}),
    listRuns: async () => [],
    cancel: async () => true,
    retry: async () => ({ runId: 'r' }),
    saveReview: async (r: unknown) => r,
    openFolder: async () => undefined,
    readImageDataUrl: async () => ({ mimeType: 'image/png', dataUrl: '' }),
  };
}

function makeFakeVNextService() {
  const calls: any = {};
  return {
    calls,
    svc: {
      listOptions: async () => ({}),
      compile: async () => ({}),
      start: async () => ({}),
      startValidated: async () => ({}),
      getSession: async () => ({}),
      confirmDirection: async () => ({}),
      continueSameType: async () => ({}),
      confirmGeneratedOutput: async () => ({}),
      revokeGeneratedOutput: async () => ({}),
      getConfirmedGeneratedOutputs: async () => ({}),
      postCompositeLogo: async () => ({}),
      saveProjectPromptAsset: async () => ({}),
      preflightReferenceAssets: async (input: {
        projectId: string;
        assetIds: string[];
      }) => {
        calls.preflightReferenceAssets = [input];
        return {
          projectId: input.projectId,
          results: input.assetIds.map((assetId) => ({
            status: 'resolved',
            assetId,
            record: {
              assetId,
              role: 'high_fidelity_visual_reference',
              relativePath: `input/${assetId}.png`,
              absolutePath: `/abs/${assetId}.png`,
              mime: 'image/png',
              sizeBytes: 1024,
              sha256: 'deadbeef',
            },
          })),
        };
      },
    },
  };
}

test('C-3: preflight channel is registered when vnextService.preflightReferenceAssets is present', () => {
  const { ipcMain, handlers } = makeFakeIpcMain();
  const ig: any = makeFakeImageGenService();
  const { svc: vnextSvc } = makeFakeVNextService();
  registerImageGenerationIpc(ig, ipcMain, vnextSvc as any);
  assert.ok(
    handlers['image-generation:preflight-reference-assets'],
    '应注册 image-generation:preflight-reference-assets',
  );
});

test('C-3: preflight channel is NOT registered when vnextService lacks the method', () => {
  // Backward-compat: a vnext service built before Phase C-3 (no
  // preflightReferenceAssets) must not crash the IPC registration. The
  // channel is simply absent; the renderer should feature-detect.
  const { ipcMain, handlers } = makeFakeIpcMain();
  const ig: any = makeFakeImageGenService();
  const vnextSvcNoPreflight: any = {
    listOptions: async () => ({}),
    compile: async () => ({}),
    start: async () => ({}),
  };
  registerImageGenerationIpc(ig, ipcMain, vnextSvcNoPreflight);
  assert.equal(
    handlers['image-generation:preflight-reference-assets'],
    undefined,
    'vnext service without preflight must not register the channel',
  );
});

test('C-3: preflight handler forwards { projectId, assetIds } unchanged and returns the result map', async () => {
  const { ipcMain, handlers } = makeFakeIpcMain();
  const ig: any = makeFakeImageGenService();
  const { svc: vnextSvc, calls } = makeFakeVNextService();
  registerImageGenerationIpc(ig, ipcMain, vnextSvc as any);
  const input = { projectId: 'p-c3', assetIds: ['a-1', 'a-2', 'a-3'] };
  const out = await handlers['image-generation:preflight-reference-assets']!({}, input);
  assert.deepEqual(calls.preflightReferenceAssets[0], input, 'handler 必须把入参原样转发给 vnextService.preflightReferenceAssets');
  assert.equal(out.projectId, 'p-c3');
  assert.equal(out.results.length, 3);
  for (const r of out.results) {
    assert.equal(r.status, 'resolved');
    assert.match(r.assetId, /^a-[123]$/);
  }
});

test('C-3: preflight handler does NOT throw on per-asset failures (fail-soft)', async () => {
  const { ipcMain, handlers } = makeFakeIpcMain();
  const ig: any = makeFakeImageGenService();
  const vnextSvc: any = {
    listOptions: async () => ({}),
    compile: async () => ({}),
    start: async () => ({}),
    preflightReferenceAssets: async (input: { projectId: string; assetIds: string[] }) => ({
      projectId: input.projectId,
      results: input.assetIds.map((assetId) =>
        assetId === 'bad'
          ? {
              status: 'failed',
              assetId,
              failure: {
                assetId,
                code: 'REFERENCE_ASSET_FORMAT_UNSUPPORTED',
                message: 'file signature is not PNG/JPEG/WebP',
              },
            }
          : {
              status: 'resolved',
              assetId,
              record: {
                assetId,
                role: 'high_fidelity_visual_reference',
                relativePath: `input/${assetId}.png`,
                absolutePath: `/abs/${assetId}.png`,
                mime: 'image/png',
                sizeBytes: 1024,
                sha256: 'deadbeef',
              },
            },
      ),
    }),
  };
  registerImageGenerationIpc(ig, ipcMain, vnextSvc as any);
  const out = await handlers['image-generation:preflight-reference-assets']!(
    {},
    { projectId: 'p-c3', assetIds: ['good-1', 'bad', 'good-2'] },
  );
  // Handler must not throw — the renderer relies on fail-soft behaviour to
  // show per-asset badges. The result is a mix of resolved and failed.
  assert.equal(out.results.length, 3);
  assert.equal(out.results[0].status, 'resolved');
  assert.equal(out.results[1].status, 'failed');
  assert.equal(out.results[2].status, 'resolved');
  assert.equal(out.results[1].failure.code, 'REFERENCE_ASSET_FORMAT_UNSUPPORTED');
});
