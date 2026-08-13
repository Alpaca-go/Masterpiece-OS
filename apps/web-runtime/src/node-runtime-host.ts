import path from 'node:path';
import {
  createSharedRuntime,
  type createOperationRegistry,
} from '@masterpiece/runtime-core';
import { createRuntimeServices } from '@masterpiece/runtime-core/application/runtime-services.ts';
import {
  deleteApiProfile,
  getProviderCredentials,
  getSettings,
  saveApiProfile,
  saveSettings,
  setApiProfileEnabled,
  setDefaultApiProfile,
  testApiProfile,
} from './node-settings-store.ts';
import { createCurrentBusinessOperations } from './current-operation-graph.ts';
import { startLocalRpcServer, type LocalRpcServer } from './local-rpc-server.ts';
import { createNodeNativeOperations, openNodePath } from './node-native-operations.ts';
import { createNodeRuntimePaths } from './runtime-paths.ts';

export interface NodeRuntimeHostOptions {
  host?: string;
  port?: number;
  allowedOrigin: string;
  environment?: NodeJS.ProcessEnv;
  currentDirectory?: string;
}

export interface NodeRuntimeHost {
  url: string;
  operationCount: number;
  registry: ReturnType<typeof createOperationRegistry>;
  close(): Promise<void>;
}

export async function startNodeRuntimeHost(options: NodeRuntimeHostOptions): Promise<NodeRuntimeHost> {
  const runtimePaths = createNodeRuntimePaths(options.environment, options.currentDirectory);
  const settings = await getSettings();
  let rpcServer: LocalRpcServer | null = null;
  const services = createRuntimeServices({
    dataPath: path.resolve(settings.defaultDataPath),
    readSettings: getSettings,
    readCredentials: getProviderCredentials,
    analysisRuntime: { resolvePromptRoot: () => runtimePaths.promptRoot },
    showSaveDialog: async (defaultPath: string) => ({
      canceled: false,
      filePath: path.join(
        path.resolve(process.env.MASTERPIECE_WEB_EXPORT_DIR || path.join(runtimePaths.userData, 'exports')),
        path.basename(defaultPath),
      ),
    }),
    openPath: openNodePath,
    emitAnalysisProgress: (progress) => rpcServer?.emit('analysis:progress', progress),
    emitDocumentProgress: (progress) => rpcServer?.emit('document-context:progress', progress),
    emitReferenceProgress: (progress) => rpcServer?.emit('reference-anchor:progress', progress),
    emitImageRunUpdated: (progress) => rpcServer?.emit('image-generation:run-updated', progress),
  });
  const runtime = createSharedRuntime();
  runtime.registerOperations(createCurrentBusinessOperations(services, {
    settings: {
      get: getSettings,
      save: saveSettings,
      saveProfile: saveApiProfile,
      deleteProfile: deleteApiProfile,
      setDefaultProfile: setDefaultApiProfile,
      setProfileEnabled: setApiProfileEnabled,
      testProfile: testApiProfile,
    },
    // P3-B2: the existing Shared Core credential resolver
    // is the SOLE authority the Packaging operations layer
    // uses to fill the P2 frozen `executePackagingGeneration`
    // deps seam. The credential secret NEVER crosses the Web
    // RPC boundary.
    readCredentials: getProviderCredentials,
  }));
  runtime.registerOperations(createNodeNativeOperations(services, runtimePaths));
  await runtime.start();
  rpcServer = await startLocalRpcServer({
    host: options.host,
    port: options.port,
    allowedOrigin: options.allowedOrigin,
    invoke: (channel, args) => runtime.registry.execute(channel, args, { host: 'node-web' }),
  });
  let closed = false;
  return Object.freeze({
    url: rpcServer.url,
    operationCount: runtime.registry.size,
    registry: runtime.registry,
    async close(): Promise<void> {
      if (closed) return;
      closed = true;
      await rpcServer?.close();
      await runtime.dispose();
    },
  });
}
