# S5 Desktop Dependency Closure Audit

Status: `CLOSED_FOR_REMOVAL`  
Date: 2026-08-11  
Entry commit: `1880da7`  
Recovery tag: `pre-s5-desktop-removal-20260811`

## Entry proof

- Primary start and smoke use `apps/web-runtime` and `apps/web`.
- Node Host, Web Renderer, Shared Runtime, and Operation Registry each have zero imports from Desktop or Electron.
- Entry regression: Unit 736/736, CLI 40/40, Runtime 14/14, Web Smoke Node PASS, Golden 5/5.
- Actual `web:dev`: health `host=node`, renderer HTTP 200, five Node/Vite descendants, Electron 0, Desktop Main 0.

## Inventory

`apps/desktop` contains 429 files in 109 directories:

| Area | Count / classification | Decision |
|---|---|---|
| `src/main` | 90 files: 85 `COMPATIBILITY_ONLY`, 5 Electron host/adapter files | DELETE after consumer closure |
| `src/preload` | Electron `contextBridge` / IPC bridge | DELETE |
| `src/shared` | compatibility export to Runtime contracts | DELETE after tests retarget |
| Renderer | source already moved to `apps/web`; only Desktop build config remains | DELETE build config |
| Tests | 78 test cases + helper + 4 fixtures | retain 75 current-behavior tests outside Desktop; delete 3 IPC/RPC host-only tests |
| Scripts | 45 Desktop/legacy smoke, packaging, and historical calibration files | DELETE, except current offline AB helper moved to root test tooling |
| Package/build | package, Electron Vite, builder, tsconfig, Desktop README | DELETE |

## Dependency classification

| Match class | Classification | Closure evidence |
|---|---|---|
| Electron lifecycle, window, IPC, preload, dialogs, shell, safeStorage | `DELETE_WITH_DESKTOP` | Node adapters/RPC/native operations passed S4.1R |
| 85 Desktop business-path re-exports | `DELETE_WITH_DESKTOP` | implementations and consumers are owned by `@masterpiece/runtime-core` |
| Current business tests under Desktop | `KEEP_TEST` | retarget to package exports and move to root Runtime tests before deletion |
| Web component/API tests under Desktop | `KEEP_TEST` | retarget to `apps/web` and run from root Runtime test suite |
| IPC registration and Electron HTTP-host tests | `DELETE_WITH_DESKTOP` | Node Host contract + Web Smoke are replacements |
| Current phase9b offline AB test runner | `KEEP_TOOLING` | move beside root image-generation tests |
| Version/build/production verification scripts | `KEEP_TOOLING` | remove Desktop assumptions, preserve the gates |
| Root Headless generation tool | `KEEP_TOOLING` | retarget to Shared Runtime exports |
| README/AGENTS/current architecture | `KEEP_SHARED` | update current technical facts |
| Baseline, archive, changelog, phase reports | `HISTORICAL_DOC_ONLY` | retain unchanged |
| User app data and Electron safeStorage payloads outside repository | `KEEP_SHARED` | never read, migrate, or delete in S5 |

Unknown dependencies: `0`. Current business logic found only in Desktop: `0`.

## External closures required before directory deletion

1. Retarget root tests that inspect Desktop compatibility files.
2. Move and retarget the 75 current-behavior Desktop test cases plus fixtures/helper.
3. Move the single offline phase9b AB runner referenced by root tests.
4. Retarget `scripts/image-generation/generate-image.ts` to Shared Runtime.
5. Remove root Desktop commands and Desktop assumptions from version/current-flow/boundary gates.
6. Regenerate the lockfile after removing the Desktop workspace.

No deletion begins until these closures are represented in the removal manifest below.
