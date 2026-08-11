# S5-E Electron Main Manifest

## Removed

- `apps/desktop/src/main/index.ts`
  - Electron app lifecycle
  - `BrowserWindow` and window management
  - native menus/dialog and shell dispatch
  - Electron IPC handler assembly
  - Desktop process boot and shutdown

## Not removed in this batch

Compatibility-only re-exports under `apps/desktop/src/main/` remain for the
consumer-zero sweep in S5-H. They contain no current business implementation.

## Current lifecycle owner

`apps/web-runtime/scripts/run-web-dev.mjs` starts the Node Web Host and the
independent Vite Web Renderer. The Primary Web smoke must continue to prove
Electron process count 0 and Desktop Main process count 0.

