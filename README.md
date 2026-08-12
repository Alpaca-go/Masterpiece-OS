# Masterpiece OS

Masterpiece OS 5 是以 Web Renderer + Node Web Host 为唯一生产运行时的视觉
分析、文档上下文、Reference Anchor 与受控生图系统。

## Repository topology

```text
apps/web           React product UI
apps/web-runtime   Node lifecycle, local RPC, credentials and native operations
apps/cli           Visual Analysis engine and prompt templates
packages/*         Shared Runtime/Core, contracts, compilers and providers
labs/*             isolated experiments
evaluation/*       isolated evaluation and Golden assets
```

Legacy Desktop/Electron workspace, IPC/preload, lifecycle, packaging and
runtime dependencies were removed in Phase S5. Historical reports retain the
old paths as repository history.

## Requirements

- Node.js 20.9 or newer
- npm with the single root `package-lock.json`

```bash
npm ci
npm run web:dev
```

The development command starts the Node Web Host and independent Vite Web
Renderer. It does not start Electron.

## Main commands

```bash
npm run web:dev
npm run web:smoke
npm run web:typecheck
npm run web:build
npm run runtime:test
npm run cli:test
npm test
npm run golden:test
npm run verify:current-flows
```

`web:smoke` is offline: it verifies Node Host boot, a real browser-rendered UI,
the 147-operation graph, provider/config resolution, and zero Electron/Desktop
Main processes without calling a real Provider or writing business data.

## Release gates

Run the offline boundary and behavior gates documented in `AGENTS.md`. Changes
to document ingestion, analysis, checkpoints or report delivery must pass
`npm run verify:current-flows`. Real-provider runs require explicit user
authorization and credentials supplied only through environment variables.

Current architecture: `CURRENT_ARCHITECTURE.md` and
`docs/core/RUNTIME_OWNERSHIP.md`.

Current capability navigation and compatibility exceptions are documented in
`docs/repository/CURRENT_REPOSITORY_MAP.md` and
`docs/repository/CURRENT_NAMESPACE_DICTIONARY.md`. Current development does
not require knowing historical vNext, Phase9B, R-series, or CLI v5 names.
