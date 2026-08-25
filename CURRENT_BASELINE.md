# Masterpiece OS Current Baseline

Baseline Record Status: ACTIVE  
Freeze Status: FROZEN  
Baseline Date: 2026-08-11  
Baseline Content Commit: `deb1cba8b40b22bf9c026ae5ec40f5b46389d6e2`  
Git Branch: `codex/r10-4-regression-repair`  
Baseline Tag: `masterpiece-reference-first-stable-2026-08`  
Recovery Anchor: `masterpiece-reference-first-stable-2026-08`  
Product Version: `5.0.0-rc.1`  
Primary Runtime: Web  
Legacy Runtime: Desktop  
Reference First Status: STABLE / CURRENT BASELINE

> This file records the exact current implementation. It does not authorize cleanup, renaming, consolidation or deletion. Read it together with `BASELINE_LOCK.md` before changing a core path.

## 1. Runtime baseline

> **Documented 2026-08-25 (audit reconciliation).** This section previously
> described an Electron Desktop shell + renderer under `apps/desktop/src/*`
> and listed it as baseline-critical. The current `masterpiece-reference-first-stable-2026-08`
> baseline no longer ships that Electron tree — `apps/desktop/` today only
> contains historical `out/` build artifacts (smoke fixtures). The Primary
> Runtime is now `apps/web-runtime/` (Node WebSocket host) plus
> `apps/web/` (Vite renderer). The text has been rewritten to match reality;
> `BASELINE_LOCK.md` continues to govern P0 baseline-critical paths (Visual
> Analysis, Reference First, Space Generator, Packaging, Provider) which
> are unchanged.

```text
npm run web:dev
  -> apps/web-runtime/scripts/run-web-dev.mjs
  -> apps/web-runtime/src/main.ts
  -> startNodeRuntimeHost() in apps/web-runtime/src/node-runtime-host.ts
  -> ws RPC on MASTERPIECE_WEB_RPC_PORT (default 4317)
  -> apps/web (Vite dev, separate process) at MASTERPIECE_WEB_RENDERER_ORIGIN
  -> apps/web/src/main.tsx
  -> apps/web/src/App.tsx
  -> apps/web/src/web-api.ts
  -> fetch POST /_masterpiece/rpc/<channel>  (proxy → ws)
  -> EventSource /_masterpiece/events        (proxy → ws broadcast)
  -> local-rpc-server.ts / current-operation-graph.ts / node-native-operations.ts
  -> runtime-core operation registry → @masterpiece/* packages
```

Primary Runtime: Node + Web. Desktop Electron shell is no longer part of the
shipped surface and `apps/desktop/` is a historical artifacts directory, not
baseline-critical code. See `docs/baseline/runtime-reconciliation-2026-08-25.md`
for the audit notes.

Web start command: `npm run web:dev`  
Web runtime entry: `apps/web-runtime/src/main.ts`  
Renderer entry: `apps/web/src/main.tsx`  
RPC client: `apps/web/src/web-api.ts`  
RPC host: `apps/web-runtime/src/node-runtime-host.ts` (`local-rpc-server.ts` + `current-operation-graph.ts` + `node-native-operations.ts`)  
Backend service host: `runtime-core` operation registry in `packages/runtime-core/src/operations/`

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

Run `node scripts/audit/check-baseline-drift.mjs` before changing or reviewing core paths. The annotated engineering tag `masterpiece-reference-first-stable-2026-08` is the formal comparison and recovery reference. It is not an automatic reset target; any destructive recovery operation still requires an explicit decision.
