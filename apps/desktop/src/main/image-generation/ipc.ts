/**
 * 生图功能：Desktop IPC 注册（§16.1）。
 *
 * 把原本内联在 main/index.ts 的 image-generation:* handler 抽离为独立函数，
 * 便于在测试中用假 ipcMain 注入并断言参数转发（不依赖 Electron 运行时）。
 *
 * 不在此文件 import `electron` 运行时（仅类型导入），以保证单测环境可加载。
 * 打开文件夹的能力下沉到 service.openFolder（由 index.ts 注入 openRunFolder，
 * 底层用 shell.openPath），本模块保持纯净。
 */
import type { IpcMain } from 'electron';
import type { ImageGenerationService } from './service';
import type {
  CompileShortChainGenerationInput,
  PostCompositeShortChainLogoInput,
  PostCompositeShortChainLockedAssetsInput,
  SaveShortChainProjectPromptAssetInput,
  StartShortChainGenerationInput,
  StartValidatedShortChainGenerationInput,
  StartImageGenerationInput,
  RetryImageGenerationInput,
  ImageGenerationReview,
} from '../../shared/types';
import type { ShortChainImageGenerationService } from './short-chain-service.ts';

export function registerImageGenerationIpc(
  service: ImageGenerationService,
  ipcMain: IpcMain,
  shortChainService?: ShortChainImageGenerationService,
): void {
  ipcMain.handle('image-generation:get-capabilities', async () => service.getCapabilities());
  ipcMain.handle('image-generation:get-preset-capabilities', async () => service.getPresetCapabilities());
  ipcMain.handle('image-generation:get-source-preview', async (_event, input: StartImageGenerationInput) =>
    service.getSourcePreview(input));

  ipcMain.handle('image-generation:compile', async (_event, input: StartImageGenerationInput) => {
    const compiled = await service.compile(input);
    return compiled.result;
  });

  ipcMain.handle('image-generation:start', async (_event, input: StartImageGenerationInput) =>
    service.start(input));

  ipcMain.handle('image-generation:get-run', async (_event, runId: string) => service.getRun(runId));
  ipcMain.handle('image-generation:list-runs', async (_event, projectId?: string) => service.listRuns(projectId));
  ipcMain.handle('image-generation:cancel', async (_event, runId: string) => service.cancel(runId));

  ipcMain.handle('image-generation:retry', async (_event, input: RetryImageGenerationInput) =>
    service.retry({
      runId: input.runId,
      mode: input.mode,
      editedPrompt: input.editedPrompt,
      apiProfileId: input.apiProfileId,
    }));

  ipcMain.handle('image-generation:save-review', async (_event, review: ImageGenerationReview) =>
    service.saveReview(review));

  ipcMain.handle('image-generation:open-folder', async (_event, runId: string) => service.openFolder(runId));

  ipcMain.handle('image-generation:get-image-data-url', async (_event, runId: string, imageId: string) =>
    service.readImageDataUrl(runId, imageId));
  if (shortChainService) {
    ipcMain.handle('image-generation:short-chain-options', async () => shortChainService.listOptions());
    ipcMain.handle('image-generation:short-chain-compile', async (_event, input: CompileShortChainGenerationInput) =>
      shortChainService.compile(input));
    ipcMain.handle('image-generation:short-chain-start', async (_event, input: StartShortChainGenerationInput) =>
      shortChainService.start(input));
    ipcMain.handle(
      'image-generation:short-chain-start-validated',
      async (_event, input: StartValidatedShortChainGenerationInput) =>
        shortChainService.startValidated(input),
    );
    ipcMain.handle('image-generation:short-chain-session', async (_event, projectId: string) =>
      shortChainService.getSession(projectId));
    ipcMain.handle(
      'image-generation:short-chain-confirm-direction',
      async (_event, projectId: string, runId: string, imageId: string) =>
        shortChainService.confirmDirection(projectId, runId, imageId),
    );
    ipcMain.handle(
      'image-generation:short-chain-continue-same-type',
      async (
        _event,
        projectId: string,
        currentInstruction: string,
        apiProfileId?: string,
        dryRun?: boolean,
      ) => shortChainService.continueSameType(projectId, currentInstruction, apiProfileId, dryRun),
    );
    ipcMain.handle(
      'image-generation:short-chain-save-prompt-asset',
      async (_event, input: SaveShortChainProjectPromptAssetInput) =>
        shortChainService.saveProjectPromptAsset(input),
    );
    ipcMain.handle(
      'image-generation:short-chain-post-composite-logo',
      async (_event, input: PostCompositeShortChainLogoInput) =>
        shortChainService.postCompositeLogo(input),
    );
    ipcMain.handle(
      'image-generation:short-chain-post-composite-locked-assets',
      async (_event, input: PostCompositeShortChainLockedAssetsInput) =>
        shortChainService.postCompositeLockedAssets(input),
    );
  }
}
