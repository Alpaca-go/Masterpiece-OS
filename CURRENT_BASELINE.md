# Masterpiece OS Current Baseline

Baseline Record Status: ACTIVE  
Recorded 2026-08 freeze label: FROZEN  
Tip integration status: VM1 CONDITIONAL PASS / NOT FROZEN  
Baseline Date (content pin): 2026-08-11  
Baseline Content Commit (PIN only): `deb1cba8b40b22bf9c026ae5ec40f5b46389d6e2`  
2026-08 branch name: `codex/r10-4-regression-repair` — absent on origin  
2026-08 tag / recovery anchor name: `masterpiece-reference-first-stable-2026-08` — absent on origin  
Navigation tip: `codex/visual-migration-vm1-integration-freeze`  
Product Version: `5.0.0-rc.1`  
Primary Runtime: Web  
Legacy Runtime: Desktop — removed in S5; `apps/desktop/` is not on this tip  
Reference First Status: STABLE / CURRENT BASELINE

> This file records the implementation on the navigation tip. It does not authorize cleanup, renaming, consolidation, or deletion. Read it together with `BASELINE_LOCK.md` before changing a core path.
>
> Path authority for capability ownership is `config/repository-contract/current-authorities.json`. Compatibility string identifiers stay in `config/repository-contract/compatibility-registry.json` and in code. This document does not edit those registries.
>
> Freeze inconsistency, recorded and not resolved here: the 2026-08 baseline text labeled the Reference First content pin `FROZEN`. The VM1 integration record on this tip is **CONDITIONAL PASS / NOT FROZEN** (`docs/runtime/visual-migration-vm1-integrated-baseline.md`). This file does not declare a new freeze and does not promote the VM1 branch.
>
> Recovery inconsistency, recorded and not resolved here: commit `deb1cba8b40b22bf9c026ae5ec40f5b46389d6e2` exists and is the content PIN. Tag `masterpiece-reference-first-stable-2026-08` and branch `codex/r10-4-regression-repair` are absent on origin. A replacement anchor is pending a Kyries decision. Do not invent one.

## 1. Runtime baseline

Desktop/Electron was removed in S5. This tip has no `apps/desktop/` tree and no `apps/desktop/out/` artifact directory. Primary Runtime is `apps/web-runtime/` (Node WebSocket host) plus `apps/web/` (Vite renderer). `BASELINE_LOCK.md` still requires regression before changes to baseline-critical behavior (Visual Analysis, Reference First, Space generation, Packaging, Provider). The 2026-08-25 audit note is `docs/baseline/runtime-reconciliation-2026-08-25.md`; its inventory of `apps/desktop/out/` described that date, not this tip.

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

Primary Runtime: Node + Web.  
Web start command: `npm run web:dev`  
Web runtime entry: `apps/web-runtime/src/main.ts`  
Renderer entry: `apps/web/src/main.tsx`  
Renderer proxy: `apps/web/vite.config.mjs`  
RPC client: `apps/web/src/web-api.ts`  
RPC host: `apps/web-runtime/src/node-runtime-host.ts` (`local-rpc-server.ts` + `current-operation-graph.ts` + `node-native-operations.ts`)  
Backend service host: runtime-core operation registry in `packages/runtime-core/src/operations/`

## 2. Visual Analysis baseline

```text
analysis:start
  -> packages/runtime-core/src/operations/analysis-operations.js
  -> packages/runtime-core/src/application/pipeline-service.ts
  -> packages/model-runtime/src/analysis-provider-registry.js
  -> dynamic import apps/cli/src/analysis-engine/bootstrap.js
  -> apps/cli/prompts/analysis/*
  -> structured parsing, validation and repair
  -> Visual Decision Packet + project contexts + report
```

| Concern | Current truth |
|---|---|
| Analysis provider policy | `packages/runtime-core/src/application/provider-policy.js`: default Volcengine / `doubao-seed-2.1-turbo`; registered alternative Qwen / `qwen3.6-plus` |
| Analysis entry | `packages/runtime-core/src/application/pipeline-service.ts` |
| Reasoner | registry `createReasoner`; Qwen factory `packages/model-runtime/src/qwen-reasoner.js`; Volcengine factory `packages/model-runtime/src/volcengine-reasoner.js` |
| Prompt namespace | `apps/cli/prompts/analysis/` (`MASTERPIECE_PROMPT_ROOT` default in `apps/web-runtime/src/runtime-paths.ts`) |
| Pipeline | `apps/cli/src/analysis-engine/bootstrap.js` |
| Parser | `packages/model-runtime/src/response-parser.js` |
| Validation/repair | `packages/analysis-runtime/src/*` and `packages/runtime-core/src/application/model-schema/*` |
| Decision/context | `packages/runtime-core/src/application/visual-decision-packet.ts`, `packages/runtime-core/src/application/project-visual-context-builder.ts` |
| Provider coupling | Pipeline calls `analysisProviders.createReasoner(credentials)`. It does not construct `createQwenReasoner` inline |

`apps/cli/src/v5/` and `apps/cli/prompts/v5/` are not on this tip. The analysis-engine pipeline, prompts, schemas, parser, repair, decision packet, and project context remain `BASELINE_CRITICAL`. The 2026-08 text named Qwen / `qwen3.6-plus` as the analysis default. The tip policy file names Volcengine / `doubao-seed-2.1-turbo` as the default and keeps Qwen as the registered alternative. That sentence records the policy file. It does not declare a new product freeze.

Project-local analysis config discovery still uses the compatibility filename `masterpiece-os-v5.json` (`apps/cli/src/analysis-engine/bootstrap.js`). That filename is an identifier, not a `prompts/v5` directory. The repository template file on this tip is `apps/cli/templates/masterpiece-os.json`.

## 3. Reference First baseline

```text
Short-Chain workspace (apps/web/src/pages/ShortChainPage.tsx)
  and reference intake (apps/web/src/components/ReferenceAnchorWorkspace.tsx)
  -> project asset import
  -> packages/image-generation-runtime/src/reference-engine/reference-asset-resolver.ts
  -> packages/runtime-core/src/application/image-generation/short-chain-service.ts
  -> packages/runtime-core/src/application/reference-first-reconstruction.ts
  -> explicit reference policy and scene relation
  -> target-scene projection / authority gate
  -> compileShortChainGeneration in packages/image-generation-runtime/src/generation/compile.js
  -> packages/image-generation-runtime/src/space/compiler.js
  -> Reference Boundary + packages/image-generation-runtime/src/generation/seedream-adapter.js
  -> packages/runtime-core/src/application/image-generation/service.ts
  -> configured Seedream Provider
```

Current contract: explicit references only; role `high_fidelity_visual_reference`; visual world follows the reference, functional program follows the target scene; no implicit project-asset fallback; target-scene authority fails closed; Logo stays post-composite where required. See `docs/baseline/reference-first-contract.md`.

Capability authority: `packages/runtime-core/src/application/reference-first-reconstruction.ts`.

## 4. Space Generator baseline

```text
short-chain orchestration (generation/compile.js)
  -> default mode r8_6_golden
  -> packages/image-generation-runtime/src/space/compiler.js
  -> source adapter packages/image-generation-runtime/src/space/source-adapter.js
  -> continuation packages/image-generation-runtime/src/space/continuation/
  -> target-scene projection packages/image-generation-runtime/src/space/scene-projection/
```

- Orchestrator: `packages/image-generation-runtime/src/generation/compile.js` (`compileShortChainGeneration`).
- Compiler file: `packages/image-generation-runtime/src/space/compiler.js`. Compiler string id remains `phase9b-quality-compiler`. That id is not a filename.
- Default: `MASTERPIECE_SPACE_COMPILER_MODE` absent or unknown resolves to `r8_6_golden`.
- Alias: `phase9b_quality` selects the same production compiler.
- Fallback: `vnext_legacy` selects `packages/image-generation-runtime/src/generation/prompt-compiler.js` (`compileShortChainPrompt`) and remains an active compatibility dependency.
- Generator/provider payload: `packages/image-generation-runtime/src/generation/seedream-adapter.js`, then `packages/runtime-core/src/application/image-generation/service.ts`.

Mode aliases `r8_6_golden`, `phase9b_quality`, and `vnext_legacy` stay documented compatibility identifiers. `packages/image-generation-runtime/src/vnext/` and `phase9b-space-compiler.js` are not files on this tip.

## 5. Packaging Generator baseline

```text
Short-Chain packaging family
  and apps/web/src/components/ImageGenerationWorkspace.tsx
  and apps/web/src/features/packaging/PackagingWorkspace.tsx
  -> packages/runtime-core/src/application/image-generation/service.ts
  -> packages/image-generation-runtime/src/task-builder.js
     (compileImageGenerationTask routes source bundle 3.0)
  -> packages/image-generation-runtime/src/deliverables/deliverable-prompt-compiler.js
  -> packages/image-generation-runtime/src/prompt-contracts/packaging-contract.js
  -> packages/image-generation-runtime/src/generation/prompt-compiler.js
  -> deliverable/reference gates + fingerprint
  -> configured provider adapter
```

Task/source bundle `3.0` is current. Task `1.0` and `2.0` remain baseline dependencies for persistence, migration and retry. Packaging is intentionally isolated from the Space compiler (`packages/image-generation-runtime/src/space/compiler.js`). Packaging capability authority is `packages/image-generation-runtime/src/prompt-contracts/packaging-contract.js`.

## 6. Provider baseline

- Analysis provider policy on this tip is `packages/runtime-core/src/application/provider-policy.js`: default Volcengine / `doubao-seed-2.1-turbo`; registered alternative Qwen / `qwen3.6-plus` through `createQwenReasoner`. The 2026-08 text named Qwen / `qwen3.6-plus` as the analysis default. This bullet records the policy file and does not declare a new product freeze.
- Active current Short-Chain generation baseline: Seedream protocol; registry model `seedream-5.0-pro`, with runtime profile supplying concrete endpoint/model credentials.
- Registered/configurable but not Primary UI baseline: GPT Image, Nano Banana.
- Legacy-compatible and disabled by default: DashScope Wan.
- No secret value belongs in this baseline.

## 7. Configuration and environment baseline

- Product version: `/VERSION` and version synchronization scripts.
- Runtime/profile config: `apps/web-runtime/src/node-settings-store.ts`, encrypted local profile data, `packages/model-registry/src/index.js` validation. Credentials: `apps/web-runtime/src/node-credential-store.ts`.
- Web: `MASTERPIECE_WEB_MODE`, `MASTERPIECE_WEB_RPC_PORT`, `MASTERPIECE_WEB_RPC_URL`, `MASTERPIECE_WEB_OPEN_BROWSER`.
- Analysis: profile `protocol/model/baseUrl/apiKey`; direct CLI may use `MASTERPIECE_PROVIDER`; prompt path uses `MASTERPIECE_PROMPT_ROOT` (default `apps/cli/prompts/analysis`).
- Space: `MASTERPIECE_SPACE_COMPILER_MODE=r8_6_golden|phase9b_quality|vnext_legacy`.
- Legacy Wan fallback may use `MASTERPIECE_DASHSCOPE_API_KEY`.

Environment variable names are documented; secret values are never frozen or committed.

## 8. Schema and compatibility baseline

- Current packaging/source contracts: image-generation task/source bundle `3.0`.
- Compatibility: image-generation task `1.0` and `2.0`, run `1.0`, source context `2.0`.
- Reference/space task contract: `packages/image-generation-contracts/src/index.ts` plus `packages/image-generation-runtime/src/generation/task-contract.js`.
- Analysis schemas: `packages/runtime-core/src/application/model-schema/*`, `packages/analysis-runtime` validation, and project contracts.
- Creative production schema `6.0` is an independent schema namespace, not product v6.
- Persisted compatibility identifiers (`vnext-1.0`, `masterpiece-os-v5.json`, `r8_6_golden`, `phase9b_quality`, `vnext_legacy`, and Phase9B trace fields) remain registered. Their old directory names are not current paths.

See `docs/baseline/schema-baseline.md` and `docs/baseline/compatibility-baseline.md`.

## 9. Smoke and acceptance baseline

| Level | Record |
|---|---|
| 01 Core Smoke | `npm test` — 710/710 PASS recorded on the 2026-08-11 content pin. Not re-run for this path rewrite |
| 02 Pipeline Smoke | `npm run cli:test` — 40/40 PASS recorded on that content pin |
| 03 Web Smoke | `npm run web:smoke` — entry below. The 2026-08-11 record was PASS, 0 Provider calls, 0 business writes |
| 04 Integration/E2E | existing real-provider smoke evidence; not rerun for this path rewrite |
| 05 Golden Regression | reserved for S2; NOT_STARTED in the 2026-08 record |

Web smoke entry on this tip is `apps/web-runtime/scripts/run-web-primary-smoke.mjs` (`npm run web:smoke` → `apps/web-runtime` `smoke`). It remains `CURRENT_WEB_SMOKE / PROTECTED_BASELINE_INFRASTRUCTURE`. `apps/desktop/scripts/run-web-primary-smoke.mjs` is not on this tip.

The VM1 integration record has its own test matrix and is **CONDITIONAL PASS / NOT FROZEN** because gate G12 failed. See `docs/runtime/visual-migration-vm1-integrated-baseline.md`. That matrix is not a new product freeze.

Manual Product Acceptance — Reference First: PASS (existing accepted JZMX Reception -> Consultation evidence; no new visual claim created in S1).

## 10. Protection rule

Paths in `docs/baseline/baseline-files-manifest.md` are the tip locations of baseline-sensitive files. Prompt ordering, constraints, reference injection, Locked Assets, payload construction, parsing, schemas, and fallback selection are `BEHAVIOR_SENSITIVE_BASELINE`.

`node scripts/audit/check-baseline-drift.mjs` diffs the manifest table against content PIN `deb1cba8b40b22bf9c026ae5ec40f5b46389d6e2`. After this path rewrite, tip files that differ from that pin report drift. That result is a comparison against the pin. It is not permission to reset, and it is not a new recovery tag.

The 2026-08 text treated tag `masterpiece-reference-first-stable-2026-08` as the formal comparison and recovery reference. That tag is absent on origin. The content PIN commit is the comparison point until Kyries names a replacement. It is not an automatic reset target; any destructive recovery operation still requires an explicit decision.
