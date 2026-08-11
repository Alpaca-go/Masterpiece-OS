# Masterpiece OS Current Baseline

Baseline Record Status: ACTIVE  
Freeze Status: DOCUMENTED_NOT_FROZEN  
Baseline Date: 2026-08-11  
Git Commit: `322ae676c546340fd7a9d467bca66ebe3fd023f7`  
Git Branch: `codex/r10-4-regression-repair`  
Git Tag: NOT_CREATED — worktree was dirty at S1 start  
Product Version: `5.0.0-rc.1`  
Primary Runtime: Web  
Legacy Runtime: Desktop  
Reference First Status: STABLE / CURRENT BASELINE

> This file records the exact current implementation. It does not authorize cleanup, renaming, consolidation or deletion. Read it together with `BASELINE_LOCK.md` before changing a core path.

## 1. Runtime baseline

```text
npm run web:dev
  -> apps/desktop/scripts/run-web-dev.mjs
  -> electron-vite dev with MASTERPIECE_WEB_MODE=1
  -> apps/desktop/src/renderer/index.html
  -> apps/desktop/src/renderer/src/main.tsx
  -> apps/desktop/src/renderer/src/App.tsx
  -> apps/desktop/src/renderer/src/web-api.ts
  -> /_masterpiece RPC proxy
  -> apps/desktop/src/main/web-rpc-server.ts
  -> apps/desktop/src/main/index.ts
  -> Desktop-hosted shared services and @masterpiece/* packages
```

Desktop is the Legacy Runtime shell, but currently still hosts shared runtime services for the Primary Web Runtime. `apps/desktop/src/main` is therefore baseline-critical shared core, not removable legacy code.

Web start command: `npm run web:dev`  
Web entry configuration: `apps/desktop/electron.vite.config.ts`  
Renderer entry: `apps/desktop/src/renderer/src/main.tsx`  
RPC client: `apps/desktop/src/renderer/src/web-api.ts`  
RPC server: `apps/desktop/src/main/web-rpc-server.ts`  
Backend service host: `apps/desktop/src/main/index.ts`

## 2. Visual Analysis baseline

```text
analysis:start
  -> apps/desktop/src/main/pipeline-service.ts
  -> @masterpiece/model-runtime/qwen-reasoner.js
  -> dynamic import apps/cli/src/v5/bootstrap.js
  -> apps/cli/prompts/v5/*
  -> structured parsing, validation and repair
  -> Visual Decision Packet + project contexts + report
```

| Concern | Current truth |
|---|---|
| Default provider/model | Qwen / `qwen3.6-plus` registry default |
| Analysis entry | `apps/desktop/src/main/pipeline-service.ts` |
| Reasoner | `packages/model-runtime/src/qwen-reasoner.js` |
| Prompt namespace | `apps/cli/prompts/v5/` |
| Pipeline | `apps/cli/src/v5/bootstrap.js` |
| Parser | `packages/model-runtime/src/response-parser.js` |
| Validation/repair | `packages/analysis-runtime/src/*` and Desktop `model-schema/*` |
| Decision/context | `visual-decision-packet.ts`, `project-context-vnext-builder.ts` |
| Provider coupling | B — Partial Qwen Coupling |

The model/base URL/API key are profile-driven, but the pipeline constructs `createQwenReasoner` directly. CLI `v5` is a current hidden dependency. Analysis prompts, schemas, parser, repair, decision packet and project context are `BASELINE_CRITICAL`.

## 3. Reference First baseline

```text
VNextGenerationWorkspace upload/selection
  -> project asset import
  -> reference-asset-resolver.ts
  -> image-generation/vnext-service.ts
  -> explicit reference policy and scene relation
  -> target-scene projection / authority gate
  -> compileVNextImageGeneration
  -> Phase9B Space compiler
  -> Reference Boundary + Seedream adapter
  -> image-generation/service.ts
  -> configured Seedream Provider
```

Current contract: explicit references only; role `high_fidelity_visual_reference`; visual world follows the reference, functional program follows the target scene; no implicit project-asset fallback; target-scene authority fails closed; Logo stays post-composite where required. See `docs/baseline/reference-first-contract.md`.

## 4. Space Generator baseline

```text
vnext orchestration
  -> default mode r8_6_golden
  -> packages/image-generation-runtime/src/space/ Phase9B compiler
  -> frozen R8.6 Golden parity / R9 production route
  -> R10 semantic and route repairs
  -> R11 continuation
  -> R11.2 target-scene authority and cross-scene behavior
```

- Orchestrator: `packages/image-generation-runtime/src/vnext/compile.js`.
- Compiler: `src/space/phase9b-space-compiler.js` plus source adapter.
- Default: `MASTERPIECE_SPACE_COMPILER_MODE` absent/unknown resolves to `r8_6_golden`.
- Alias: `phase9b_quality` uses the same production compiler.
- Fallback: `vnext_legacy` selects `vnext/prompt-compiler.js` and remains an active compatibility dependency.
- Generator/provider payload: `vnext/seedream-adapter.js` then Desktop image-generation service.

Do not reduce this baseline to the name “vNext”; its cross-version layers are intentional and protected.

## 5. Packaging Generator baseline

```text
ImageGenerationWorkspace source bundle 3.0
  -> image-generation/service.ts
  -> task-builder.js::compileImageGenerationTaskV3
  -> deliverables/deliverable-prompt-compiler.js
  -> deliverable/reference gates + fingerprint
  -> configured provider adapter
```

Task/source bundle `3.0` is current. Task `1.0` and `2.0` remain baseline dependencies for persistence, migration and retry. Packaging is intentionally isolated from the Space compiler.

## 6. Provider baseline

- Active analysis baseline: Qwen-compatible analysis through `createQwenReasoner`; registry default `qwen3.6-plus`.
- Active current Short-Chain generation baseline: Seedream protocol; registry model `seedream-5.0-pro`, with runtime profile supplying concrete endpoint/model credentials.
- Registered/configurable but not Primary UI baseline: GPT Image, Nano Banana.
- Legacy-compatible and disabled by default: DashScope Wan.
- No secret value belongs in this baseline.

## 7. Configuration and environment baseline

- Product version: `/VERSION` and version synchronization scripts.
- Runtime/profile config: `settings-store.ts`, encrypted local profile data, `model-registry` validation.
- Web: `MASTERPIECE_WEB_MODE`, `MASTERPIECE_WEB_RPC_PORT`, `MASTERPIECE_WEB_RPC_URL`, `MASTERPIECE_WEB_OPEN_BROWSER`.
- Analysis: profile `protocol/model/baseUrl/apiKey`; direct CLI may use `MASTERPIECE_PROVIDER`; prompt path uses `MASTERPIECE_PROMPT_ROOT`.
- Space: `MASTERPIECE_SPACE_COMPILER_MODE=r8_6_golden|phase9b_quality|vnext_legacy`.
- Legacy Wan fallback may use `MASTERPIECE_DASHSCOPE_API_KEY`.

Environment variable names are documented; secret values are never frozen or committed.

## 8. Schema and compatibility baseline

- Current packaging/source contracts: image-generation task/source bundle `3.0`.
- Compatibility: image-generation task `1.0` and `2.0`, run `1.0`, source context `2.0`.
- Reference/space vNext task contract: `packages/image-generation-contracts/src/index.ts` plus vNext task contract builder.
- Analysis schemas: Desktop `model-schema/*`, analysis-runtime validation and project contracts.
- Creative production schema `6.0` is an independent schema namespace, not product v6.

See `docs/baseline/schema-baseline.md` and `compatibility-baseline.md`.

## 9. Smoke and acceptance baseline

| Level | Current baseline |
|---|---|
| 01 Core Smoke | `npm test` — 710/710 PASS on 2026-08-11 |
| 02 Pipeline Smoke | `npm run cli:test` — 40/40 PASS |
| 03 Web Smoke | `npm run web:smoke` — PASS, 0 Provider calls, 0 business writes |
| 04 Integration/E2E | existing real-provider smoke evidence; not rerun in S1 |
| 05 Golden Regression | reserved for S2; NOT_STARTED |

Web smoke entry `apps/desktop/scripts/run-web-primary-smoke.mjs` is `CURRENT_WEB_SMOKE / PROTECTED_BASELINE_INFRASTRUCTURE`. Old Desktop smokes are `LEGACY_COMPATIBILITY_SMOKE`, never Primary Acceptance.

Manual Product Acceptance — Reference First: PASS (existing accepted JZMX Reception -> Consultation evidence; no new visual claim created in S1).

## 10. Protection rule

Paths in `docs/baseline/baseline-files-manifest.md` are baseline-sensitive. Prompt ordering, constraints, reference injection, Locked Assets, payload construction, parsing, schemas and fallback selection are `BEHAVIOR_SENSITIVE_BASELINE`.

Run `node scripts/audit/check-baseline-drift.mjs` before changing or reviewing core paths. S1 documents commit `322ae67`, but it is not formally tagged because the worktree was already dirty with S0 documentation.
