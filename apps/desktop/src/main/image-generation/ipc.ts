/** Desktop-only IPC adapter for Shared Image Generation operations. */
import type { IpcMain } from 'electron';
import {
  createImageGenerationOperations,
  createOperationRegistry,
} from '@masterpiece/runtime-core';
import type { ImageGenerationService } from './service.ts';
import type { VNextImageGenerationService } from './vnext-service.ts';

export function registerImageGenerationIpc(
  service: ImageGenerationService,
  ipcMain: IpcMain,
  vnextService?: VNextImageGenerationService,
): void {
  const registry = createOperationRegistry();
  const operations = createImageGenerationOperations({ service, vnextService });
  registry.registerAll(operations);
  for (const operationId of Object.keys(operations)) {
    ipcMain.handle(operationId, (_event, ...args) => registry.execute(operationId, args));
  }
  ipcMain.handle('image-generation:open-folder', (_event, runId: string) => service.openFolder(runId));
}
