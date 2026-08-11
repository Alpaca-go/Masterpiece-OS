# Desktop Dependency Classification

## Scope and method

Scanned scope:

- `apps/desktop/src/main`: 89 files
- `apps/desktop/src/renderer`: 21 files
- `apps/desktop/src/preload`: 1 file
- `apps/desktop/src/shared`: 1 file
- `apps/desktop/scripts`, configuration, packaging, and tests

Total production source files classified: **112**.

Classification is based on static imports plus confirmed runtime construction in `main/index.ts`. Directory location was not treated as ownership evidence. Dynamic imports, package scripts, baselines, and tests were checked before considering a legacy classification.

## Summary

| Category | Result |
|---|---|
| DESKTOP_ONLY | Electron preload/native integration and packaging concerns |
| SHARED_CORE | Analysis, schemas, creative production, Reference First, generation, validation, and the shared React presentation |
| RUNTIME_ADAPTER | Web/IPC bridges, Electron config/credentials, filesystem project/run storage, path/load/resolution adapters |
| LEGACY_CANDIDATE | **0 proven production source modules** |
| UNKNOWN | Historical/archive/smoke scripts whose future need is not fully proven; KEEP |

`LEGACY_CANDIDATE = 0` is intentional. The required proof threshold was not met for any source module. In particular, `vnext-evidence-scanner.ts` has no production static importer but is part of current evidence tests and acceptance tooling, so it remains `SHARED_CORE / KEEP`.

## Important module matrix

| File / Module | Purpose | Imported / reached by | Key imports | Runtime dependency | Business logic | Category | Migration risk | Future action |
|---|---|---|---|---|---:|---|---|---|
| `src/main/index.ts` | Constructs all services, registers IPC/Web RPC, creates windows | Electron entry | every main service, Electron | Electron | Mixed | RUNTIME_ADAPTER + HIDDEN_CORE bootstrap | CRITICAL | Split only after Golden Regression |
| `src/preload/index.ts` | Desktop IPC bridge | BrowserWindow preload | Electron contextBridge | Electron only | No | DESKTOP_ONLY | LOW | Keep until Desktop retirement |
| `src/main/web-rpc-server.ts` | HTTP/SSE bridge | Web mode in main index | Node HTTP | Web host inside Electron | No | RUNTIME_ADAPTER | HIGH | Future standalone Web host adapter |
| `src/renderer/src/web-api.ts` | Browser API proxy to Web RPC | renderer `main.tsx` | fetch/EventSource | Browser | No | RUNTIME_ADAPTER | MEDIUM | Keep; expand Web tests |
| `src/main/settings-store.ts` | API profiles, config, encrypted keys | main index/services | Electron safeStorage/app, model registry | Electron | Some routing metadata | RUNTIME_ADAPTER | CRITICAL | Define credential/config interface later |
| `src/main/project-store.ts` | Local project/assets persistence | almost all services | fs/path/Electron settings | Local filesystem | Some lifecycle rules | RUNTIME_ADAPTER + HIDDEN_CORE | HIGH | Separate storage interface later |
| `src/main/pipeline-service.ts` | Full visual-analysis orchestration | analysis handlers/smokes | Qwen reasoner, CLI v5, analysis runtime, schemas | Electron app path + filesystem | Yes | SHARED_CORE / HIDDEN_CORE | CRITICAL | Extract only after analysis Golden tests |
| `src/main/model-schema/*` | Structured analysis schemas/validation | pipeline and tests | local schema code | None inherent | Yes | SHARED_CORE / HIDDEN_CORE | HIGH | Candidate for future contracts package |
| `src/main/project-visual-context-compiler.ts` | Analysis → generation context | pipeline/project context | project contracts | Filesystem writer | Yes | SHARED_CORE / HIDDEN_CORE | CRITICAL | Preserve schema and source mapping |
| `src/main/reference-first/*` | Reference selection/reconstruction protocol | analysis/reference services | schemas/inspector | Mostly none inherent | Yes | SHARED_CORE / HIDDEN_CORE | CRITICAL | Behavior-sensitive; do not merge |
| `src/main/locked-assets-service.ts` | Locked Asset lifecycle | creative bootstrap/services | project store/contracts | Filesystem store | Yes | SHARED_CORE / HIDDEN_CORE | CRITICAL | Extract only with locked-asset regression |
| `src/main/image-generation/vnext-service.ts` | Short-Chain, Reference First, Continuation orchestration | Web RPC and IPC handlers | runtime compiler/gates, resolver, image service | Project filesystem | Yes | SHARED_CORE / HIDDEN_CORE | CRITICAL | Core extraction candidate, not now |
| `src/main/image-generation/service.ts` | Generation compile/start/retry/provider/run orchestration | vNext and legacy handlers | runtime packages/adapters/run store | Filesystem + credentials | Yes | SHARED_CORE + RUNTIME_ADAPTER | CRITICAL | Split orchestration/storage after baselines |
| `src/main/reference-asset-resolver.ts` | Resolves/validates explicit references | vNext service | fs, image inspection | Project filesystem | Yes | RUNTIME_ADAPTER + HIDDEN_CORE | HIGH | Define resolver port later |
| `src/main/image-generation/vnext-deliverable-validator-service.ts` | Output validation/correction | vNext service | model runtime/contracts | Provider profile/files | Yes | SHARED_CORE / HIDDEN_CORE | HIGH | Keep behavior intact |
| `src/main/image-generation/vnext-similarity-audit-service.ts` | Cross-scene similarity audit | vNext service | model reasoner/assets | Provider/files | Yes | SHARED_CORE / HIDDEN_CORE | HIGH | Keep trigger/fail-soft semantics |
| `src/main/image-generation/vnext-evidence-scanner.ts` | Evidence binding/integrity scan | tests/acceptance tooling | runtime evidence gate | Filesystem | Yes | SHARED_CORE / KEEP | MEDIUM | Wire in a future acceptance service if authorized |
| `src/renderer/src/App.tsx` + components | Shared Web/Desktop UI | renderer main | React + DesktopApi contract | Browser/Electron renderer | Presentation | SHARED_CORE (shared presentation) | HIGH | Preserve one UI tree while transports differ |
| `src/shared/types.ts` | Web/Desktop/API data contracts | main, preload, renderer | contracts packages | None inherent | Contract | SHARED_CORE | CRITICAL | Future contracts extraction candidate |

## Complete production-source coverage manifest

The following groups account for all 112 source files.

### DESKTOP_ONLY

- `src/preload/index.ts`

Native-only portions inside mixed files are also Desktop-only but the files themselves are not safe to classify that way:

- `BrowserWindow`, `dialog`, `shell`, app lifecycle, and single-instance handling in `src/main/index.ts`;
- packaging settings in `electron-builder.yml` and `scripts/package-win.mjs`.

### RUNTIME_ADAPTER or mixed adapter/core

- Bootstrap/transport: `src/main/index.ts`, `src/main/web-rpc-server.ts`, `src/renderer/src/main.tsx`, `src/renderer/src/web-api.ts`, `src/renderer/src/global.d.ts`.
- Config/storage: `src/main/settings-store.ts`, `src/main/project-store.ts`, `src/main/project-intake.ts`, `src/main/project-assets.ts`.
- Runtime writes: `src/main/runtime/atomic-write.ts`, `event-log.ts`, `run-write-coordinator.ts`.
- Image runtime persistence: `src/main/image-generation/ipc.ts`, `paths.ts`, `run-store.ts`, `context-loader.ts`.
- Context loader adapters: all seven files under `src/main/image-generation/context-loaders/*`.
- File/provider adapters: `src/main/reference-asset-inspector.ts`, `reference-asset-resolver.ts`, `provider-connection-test.ts`, `project-context-service.ts`.
- Mixed service adapters: `document-context-service.ts`, `reference-anchor-service.ts`, `image-generation/service.ts`, `logo-post-composite.ts`.

These files are used by Web as well as Desktop. `RUNTIME_ADAPTER` therefore does not mean Desktop-only.

### SHARED_CORE / HIDDEN_CORE — analysis and context

- `analysis-contract.ts`, `analysis-repair-store.ts`, `pipeline-service.ts`.
- `asset-selection-protocol/index.ts`, `asset-selection-protocol/prompts.ts`.
- `unified-visual-understanding.ts`, `visual-understanding-core.ts`.
- `visual-decision-packet.ts`, `visual-decision-report-compiler.ts`.
- `project-context-vnext-builder.ts`, `project-identity.ts`, `project-visual-context-compiler.ts`.
- all eleven files under `src/main/model-schema/*`.
- `context-integration-service.ts`, `context-resolver.ts`.
- `document-context-core.ts`, `document-processing.ts`, `document-project-name.ts`.

### SHARED_CORE / HIDDEN_CORE — Reference, anchor, and assets

- `anchor-candidate-service.ts`, `anchor-generation-service.ts`.
- `reference-anchor-core.ts`, `quick-style-extraction-service.ts`.
- all six files under `src/main/reference-first/*`.
- `reference-first-beta-closure.ts`, `reference-first-reconstruction.ts`.
- `reference-pack-service.ts`, `reference-reconstruction-prompts.ts`, `reference-style-reconstruction.ts`.
- `locked-assets-service.ts`.

### SHARED_CORE / HIDDEN_CORE — creative production

- `creative-direction-service.ts`, `creative-generation-service.ts`, `creative-production-bootstrap-service.ts`.
- `creative-reading-service.ts`, `creative-session-service.ts`.
- `formal-assets-service.ts`.
- `generation-blueprint-service.ts`, `generation-prompt-service.ts`.
- `generation-series-execution-service.ts`, `generation-series-service.ts`.
- `style-profile-service.ts`, `visual-canon-service.ts`, `visual-exploration-service.ts`, `visual-memory-service.ts`.

### SHARED_CORE / HIDDEN_CORE — generation and validation

- `src/main/image-generation/vnext-service.ts`.
- `vnext-deliverable-validator-service.ts`, `vnext-similarity-audit-service.ts`, `vnext-evidence-scanner.ts`.
- Core portions of `image-generation/service.ts`, `reference-asset-resolver.ts`, and `logo-post-composite.ts`.

### SHARED_CORE — shared presentation

- `src/renderer/index.html`, `src/renderer/src/App.tsx`, `styles.css`, `utils.ts`.
- all twelve files under `src/renderer/src/components/*`.
- `src/renderer/src/reference-first/state.js`, `src/renderer/src/continuation/ui-state.js`.
- `src/shared/types.ts`.

The same presentation tree is loaded by Web and Desktop. It is not Desktop-only merely because it is stored under `apps/desktop`.

## Scripts, tests, and configuration

| Group | Classification | Used by Web | Used by Desktop | Risk | Action |
|---|---|---:|---:|---|---|
| `scripts/run-web-dev.mjs`, `run-web-primary-smoke.mjs` | RUNTIME_ADAPTER | YES | NO | HIGH | Keep as current Web entry/smoke |
| `scripts/package-win.mjs`, Electron/Vite builder configs | DESKTOP_ONLY | NO | YES | LOW | Keep until Desktop removal phase |
| `scripts/run-real-provider-*.mjs` + paired TS files | Legacy Compatibility / Core smoke | NO | YES/direct | HIGH | Keep; label non-Web |
| `scripts/run-r2-b4*`, `run-r8.6*`, `run-r85*`, `phase-9b/*`, `space-quality*` | Evaluation/Golden/behavior-sensitive | NO | Direct Core/Desktop | CRITICAL | Keep; no consolidation |
| `scripts/space-r10-archive/*` and historical version-named runners | UNKNOWN / KEEP | NO | Not current main path | HIGH | Inventory in S0; not deletion candidates yet |
| `tests/*.test.ts` | Test evidence | PARTIAL | PARTIAL | HIGH | Keep; identify Web coverage separately |

## Web → Desktop dependency audit

No `apps/web` static import exists because no `apps/web` exists. The violation is stronger at runtime:

```text
Browser Web
→ renderer/web-api.ts
→ main/web-rpc-server.ts
→ main/index.ts registry
→ Desktop main services
```

Status: `ARCHITECTURE_VIOLATION` / `STOP-01`.

No extraction or move was attempted.

## Duplicate candidates

| Candidate | Observation | Classification | Action |
|---|---|---|---|
| Web API proxy vs preload API | Same `DesktopApi` surface over HTTP vs IPC; side effects and file semantics differ | RUNTIME_ADAPTER pair | Keep separate |
| CLI v5 analysis pipeline vs Desktop pipeline wrapper | Desktop wraps CLI pipeline and adds structured extraction/context writes | BEHAVIOR_SENSITIVE_DUPLICATION / composition | Keep both |
| V1 image service vs vNext service | Overlapping generation orchestration but different task/compile/reference/validation semantics | BEHAVIOR_SENSITIVE_DUPLICATION | Do not merge |
| Direct smoke compilers vs production service path | Same compiler/provider pieces, different config/storage/transport | FALSE_GREEN_RISK | Keep, relabel |

## Final classification decision

Desktop cannot be deleted. It currently contains both runtime adapters and production-critical hidden core, and it is the backend host for Primary Web. The next safe action is S0 repository inventory, not cleanup or extraction.
