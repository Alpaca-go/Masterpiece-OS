# S5 Post-Removal Topology

```text
apps/web (React Web Renderer)
  -> HTTP RPC / event stream
apps/web-runtime (Node Web Host)
  -> 11 Node-native operations
  -> @masterpiece/runtime-core Shared Operation Registry (136 business ops)
  -> @masterpiece/runtime-core/application service graph
  -> Shared Core analysis/reference/generation/provider packages
```

## Removed topology

- Desktop workspace and compatibility paths
- Electron application lifecycle and `BrowserWindow`
- preload, `contextBridge`, `ipcRenderer` and `ipcMain` dispatch
- Desktop native/settings adapters and `safeStorage` integration
- Electron Vite, Electron Builder, packaging and Desktop scripts
- Electron runtime dependency graph

## Preserved behavior owners

Prompt templates, report compiler, schemas, reference engine, generation
compiler, provider adapters, checkpoint/persistence logic and Golden assets
remain in their pre-S5 Shared Runtime/Core owners. S5 changes hosting and
deletes obsolete adapters; it does not normalize historical implementation
names or change product semantics.

Ignored local data underneath an old `apps/desktop` filesystem path may remain
on a developer machine. It is not tracked workspace content and was not
deleted because S5 must not touch user data or historical credential payloads.

