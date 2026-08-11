# S5-D Electron IPC Host Manifest

## Removed

- `apps/desktop/src/preload/index.ts`: Electron `contextBridge` /
  `ipcRenderer` bridge.
- `apps/desktop/src/main/image-generation/ipc.ts`: Electron image-generation
  handler registration.
- `apps/desktop/src/main/web-rpc-server.ts`: Desktop compatibility RPC server.

Electron handler registration embedded in Main is removed with S5-E.

## Preserved

- Shared Operation Registry: 136 business operations.
- Node native operation adapter: 11 native operations.
- Node Web Host: 147 reachable operations.
- Web transport: `apps/web-runtime/src/local-rpc-server.ts`.

