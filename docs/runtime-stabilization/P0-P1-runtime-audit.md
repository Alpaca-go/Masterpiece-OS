# Masterpiece OS Runtime & Repository Stabilization

## Phase P0–P1 Runtime Audit

Audit date: 2026-08-11
Audit scope: runtime truth and Desktop dependency truth
Audit mode: observe → map → verify → document

## Safety snapshot

```text
Current Branch: codex/r10-4-regression-repair
Current Commit: 150f59e69995cab2f8f3f942cbc727baad751e2b
Working Tree Status: WORKTREE_NOT_CLEAN
```

The pre-existing worktree contained 27 modified tracked files and 2 untracked files before P0–P1 began. No reset, checkout, clean, or stash operation was performed. P0–P1 did not delete or move any file.

## Baseline entries

| Entry | Confirmed path |
|---|---|
| Web start command | root `npm run web:dev` → `apps/desktop` `web:dev` → `scripts/run-web-dev.mjs` → `electron-vite dev` with `MASTERPIECE_WEB_MODE=1` |
| Web renderer entry | `apps/desktop/src/renderer/src/main.tsx` |
| Web API bridge | `apps/desktop/src/renderer/src/web-api.ts` |
| Web backend entry | `apps/desktop/src/main/index.ts` → `startWebRpcServer()` |
| Desktop start command | root `npm run desktop:dev` → `apps/desktop` `electron-vite dev` |
| Desktop main entry | `apps/desktop/src/main/index.ts` |
| Desktop preload entry | `apps/desktop/src/preload/index.ts` |
| Desktop renderer entry | `apps/desktop/src/renderer/src/main.tsx` |
| Analysis entry | renderer `analysis.start()` → channel `analysis:start` → `createPipelineService().start()` |
| Generation entry | renderer image-generation calls → registered image-generation handlers → `image-generation/service.ts` |
| Reference First entry | `VNextGenerationWorkspace.tsx` → `image-generation:vnext-compile` / `vnext-start-validated` → `vnext-service.ts` |
| Prompt compiler | `@masterpiece/image-generation-runtime/vnext` `compileVNextImageGeneration()` |
| Smoke test entry before P0 | Electron launchers and direct service/compiler/provider scripts under `apps/desktop/scripts` |
| Web smoke entry after P0 | `npm --prefix apps/desktop run smoke:web` → `scripts/run-web-primary-smoke.mjs` |

No standalone `apps/web` runtime exists.

## Runtime decision

```text
Primary Runtime: Web
Legacy Runtime: Desktop
```

This is a product policy decision. It does not describe the present code ownership: the current Web backend still runs inside Electron and is implemented by Desktop main modules.

## Actual Web call path

```text
npm run web:dev
  → apps/desktop/scripts/run-web-dev.mjs
  → electron-vite dev (MASTERPIECE_WEB_MODE=1)
  → apps/desktop/src/main/index.ts
      → registerIpc()/registerHandler() populates a shared channel map
      → startWebRpcServer()
      → hidden BrowserWindow loads the renderer for an internal probe
  → external browser loads apps/desktop/src/renderer/src/main.tsx
  → createWebDesktopApi()
  → HTTP POST /_masterpiece/rpc/<channel> or SSE /_masterpiece/events
  → web-rpc-server.ts
  → invokeWebRpc()
  → the same handler/service objects used by Desktop
```

The Web UI and Desktop UI are the same React tree. Only their transport bridge differs:

- Web: `createWebDesktopApi()` over HTTP/SSE.
- Desktop: preload `contextBridge` over Electron IPC.

## Actual Desktop call path

```text
npm run desktop:dev
  → electron-vite dev
  → apps/desktop/src/main/index.ts
      → BrowserWindow + preload/index.ts
      → registerIpc()/registerImageGenerationIpc()
  → apps/desktop/src/renderer/src/main.tsx
  → window.masterpiece preload API
  → Electron IPC
  → the registered main services
```

## Capability paths

### Visual analysis

```text
App.tsx
→ analysis:start
→ pipeline-service.ts
→ project-store.ts / local assets
→ @masterpiece/model-runtime/qwen-reasoner.js
→ apps/cli/src/v5/bootstrap.js (dynamic import)
→ apps/cli/prompts/v5/*
→ analysis/runtime validation + Project Visual Context writers
```

Web and Desktop reach this exact service. Web therefore depends transitively on Desktop storage, Electron `app` paths/safeStorage, CLI implementation files, and shared packages.

### Reference First / space generation

```text
VNextGenerationWorkspace.tsx
→ vnext compile/startValidated RPC or IPC
→ image-generation/vnext-service.ts
→ project-context-service.ts
→ @masterpiece/image-generation-runtime/vnext compile
→ space target projection / route gates / reference policy
→ reference-asset-resolver.ts
→ image-generation/service.ts
→ @masterpiece/image-generation-adapter
→ selected image Provider
```

### Packaging and other V1 generation

```text
ImageGenerationWorkspace.tsx
→ image-generation compile/start
→ image-generation/service.ts
→ @masterpiece/image-generation-runtime/task-builder.js
→ deliverable gates
→ @masterpiece/image-generation-adapter or image-provider-dashscope
```

## Runtime Path Matrix

| Capability | Web Path | Desktop Path | Shared | Different | Risk |
|---|---|---|---:|---|---|
| Visual Analysis | Web API → Web RPC → `pipeline-service.ts` | preload IPC → `pipeline-service.ts` | YES | Transport only | CRITICAL: Web core hosted under Desktop and imports CLI internals |
| Reference First | Web RPC → `vnext-service.ts` | IPC → `vnext-service.ts` | YES | Transport/file acquisition | CRITICAL: no independent Web backend |
| Prompt Compiler | `vnext-service` → runtime package | same | YES | No confirmed compiler difference | MEDIUM: safe behavior sharing, but orchestration hidden under Desktop |
| Space Generator | Web RPC → vNext service → image service | same | YES | Transport | HIGH |
| Packaging Generator | Web RPC → image service | same | YES | Transport | HIGH |
| Model Provider | Desktop settings/safeStorage + shared adapters | same | YES | None after service entry | CRITICAL: Web requires Electron credential runtime |
| Config | Web RPC → `settings-store.ts` | IPC → `settings-store.ts` | YES | Transport | CRITICAL: Electron `app.getPath` and `safeStorage` |
| Asset Handling | RPC to native dialogs/local filesystem | IPC to native dialogs/local filesystem | MOSTLY | Browser drag/drop path cannot expose local paths | CRITICAL |
| Schema Validation | Desktop model-schema + shared packages | same | YES | None confirmed | HIGH: hidden core location |

## P0 findings

1. **STOP-01 / ARCHITECTURE_VIOLATION:** Web depends on a large set of Desktop main services. Documented; no move attempted.
2. **STOP-02 / CRITICAL_FALSE_GREEN:** every pre-existing real-provider smoke bypassed Web RPC. Old smokes are retained and reclassified as Legacy Compatibility/Core tests.
3. **Web boot is not server-independent:** Electron starts the Web RPC backend and owns local credentials, paths, dialogs, and storage.
4. **Browser upload is partially native:** normal choose-file flows call an Electron native dialog over RPC. Browser drag/drop uses `files.getPathForFile`, which intentionally returns an empty string in Web mode; this path is not production-equivalent.
5. A minimal Web structural smoke was added without provider calls or business-project writes.

## P1 findings

1. Desktop contains substantial `HIDDEN_CORE`: analysis orchestration, schemas, Reference First, generation orchestration, validation, reference resolution, Locked Assets, and creative-production services.
2. `apps/desktop/src/main/index.ts` is a mixed bootstrap: native window code, Web RPC hosting, handler registration, and construction of shared business services coexist.
3. `pipeline-service.ts` dynamically imports `apps/cli/src/v5/bootstrap.js` and reads `apps/cli/prompts/v5`; runtime ownership spans Desktop, CLI, and packages.
4. Static production imports show every main module is reachable except `vnext-evidence-scanner.ts`; that scanner remains required by current tests/evidence gates and is not a deletion candidate.
5. No source module met the proof threshold for `LEGACY_CANDIDATE`. Historical scripts remain `UNKNOWN/KEEP` or compatibility/evaluation assets.
6. Visual analysis is not model-ID locked to Qwen3.6 Plus, but the analysis service directly constructs the Qwen reasoner. Architecture level: **B — Partial Qwen coupling**.

## P0 completion

- [x] Web formally defined as Primary Runtime.
- [x] Desktop defined as Legacy Runtime.
- [x] Web and Desktop entries confirmed.
- [x] Current smoke runtimes confirmed.
- [x] False-green risks identified.
- [x] Web-first structural smoke executable and passing.
- [x] Agent runtime rules established.
- [x] Desktop-only PASS excluded from final acceptance policy.

## P1 completion

- [x] Desktop source and script groups classified.
- [x] DESKTOP_ONLY, SHARED_CORE, RUNTIME_ADAPTER, UNKNOWN/KEEP identified.
- [x] No proven LEGACY_CANDIDATE falsely promoted to deletion status.
- [x] Web → Desktop dependency and hidden core recorded.
- [x] Visual Analysis/Qwen coupling audited and Level B established.
- [x] Future provider adapter proposal documented, not implemented.
- [x] No Desktop/history deletion, directory move, consolidation, or provider refactor.

## Repository safety result

```text
Files deleted: 0
Files moved: 0
Core logic modified: 0
Prompt modified: 0
Compiler modified: 0
Generator behavior modified: 0
```

P0–P1 adds policy/audit documents and Web smoke infrastructure only. The default `web:dev` behavior is unchanged; `MASTERPIECE_WEB_OPEN_BROWSER=0` is used only by the automated smoke.
