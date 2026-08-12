# P0-1 — Packaging Architecture Map

**Phase:** Packaging V1 / P0 — Architecture & Reuse Audit
**Date:** 2026-08-12
**Status:** `P0_ARCHITECTURE_MAP_FROZEN` (audit only; no code change)
**Spec:** Packaging V1 Revised Development Specification §P0
**Predecessor:** A4 `VISUAL_ANALYSIS_PRODUCTION_BASELINE_FROZEN` at commit `f94c51a`

## 1. Purpose (per P0 spec)

Map the current Space / short-chain / generation runtime and
identify the existing packaging-related assets, so P1 / P2 can
build on top of them rather than create a parallel pipeline.

## 2. Top-level layout (actual CURRENT paths)

```text
packages/
├── image-generation-contracts/        # package: @masterpiece/image-generation-contracts
│   └── src/
│       ├── index.ts                    # TypeScript contracts (source of truth)
│       ├── index.js                    # compiled re-export
│       ├── multi-model.js              # multi-model adapter types
│       └── wan.js                      # Wan provider specifics
│
├── image-generation-runtime/           # package: @masterpiece/image-generation-runtime
│   └── src/
│       ├── core/                       # Shared Generation Core facade
│       │   ├── space-generation-core.js
│       │   └── packaging-generation-core.js
│       ├── space/                      # Space-only modules
│       │   ├── architecture-context.js
│       │   ├── compiler.js
│       │   ├── product-policy.js
│       │   ├── prompt-budget.js
│       │   ├── reference-boundary.js
│       │   ├── source-adapter.js
│       │   ├── space-quality-gate.js
│       │   ├── space-reference-policy.js
│       │   ├── trace.js
│       │   ├── index.js
│       │   └── gates/
│       │       ├── compile-integrity-gate.js
│       │       ├── generation-route-integrity-gate.js
│       │       └── provider-prompt-gate.js
│       ├── core/                       # already listed above
│       ├── prompt/                     # prompt composer
│       │   ├── creative-core.js
│       │   ├── prompt-composer.js
│       │   └── index.js
│       ├── prompt-contracts/           # cross-target reference assets
│       │   └── reference-asset-resolver.ts
│       ├── reference-engine/           # continuation / mode-boundary / scene-projection / semantic / quality-baselines / gates
│       ├── reference-plan/             # reference-plan-compiler / materializer / validator
│       ├── creative-director/          # creative-director-compiler / parser / prompt / repair / validation
│       ├── gates/                      # deliverable-gate / prompt-preflight-gate
│       ├── prompt-templates/           # deliverable-template-system / prompt-template-compiler
│       ├── generation/                 # short-chain compile, deliverable validator, space-quality shim, golden backtrace
│       │   ├── compile.js
│       │   ├── deliverable-validator.js
│       │   ├── golden-backtrace-audit.js
│       │   ├── project-prompt-asset.js
│       │   ├── prompt-compiler.js
│       │   ├── seedream-adapter.js
│       │   ├── task-contract.js
│       │   ├── template-registry.js
│       │   ├── template-router.js
│       │   ├── user-confirmed-visual-decision.js
│       │   ├── index.js
│       │   └── space-quality/           # compatibility shim → ../../space/index.js
│       ├── deliverables/               # compile-fingerprint, policies, validator, reference-policy, etc.
│       ├── vnext/                      # compatibility shim (R9 productionization)
│       ├── continuation/
│       ├── mode-boundary/
│       ├── scene-projection/
│       ├── semantic/
│       ├── quality-baselines/
│       ├── gates/                      # already listed above
│       ├── task-builder.js             # the actual compiler; re-exported by core facade
│       ├── context-snapshot.js
│       ├── download-verify.js
│       ├── evaluation.js
│       ├── gates.js
│       ├── index.js                    # package barrel
│       ├── pipeline-mode.js
│       ├── policies.js
│       ├── prompt-compiler.js
│       └── redact.js
│
├── image-generation-adapter/           # image provider adapters
│   └── src/
│       ├── index.js
│       ├── multi-model.js
│       └── wan.js
│
└── image-provider-dashscope/           # DashScope (Qwen) image provider
    └── src/...
```

Plus the runtime-core image-generation services:

```text
packages/runtime-core/src/application/image-generation/
├── service.ts                          # image-generation facade
├── short-chain-service.ts              # short-chain compile / start / confirm / revoke
├── deliverable-validator-service.ts
├── similarity-audit-service.ts
├── logo-post-composite.ts
├── run-store.ts                        # image generation run persistence
├── context-loader.ts                   # V3 source bundle resolution
├── paths.ts                            # output path helpers
├── evidence-scanner.ts
└── context-loaders/                    # split per-loader
```

## 3. Web UI / short-chain generation flow (CURRENT)

```text
apps/web/src/components/
├── ImageGenerationWorkspace.tsx        # legacy entry; lists 'packaging_render' deliverable
├── ShortChainGenerationWorkspace.tsx   # primary entry (Reference First)
├── DocumentContextWorkspace.tsx
├── ReferenceAnchorWorkspace.tsx
└── ...
```

`ShortChainGenerationWorkspace` is the production entry; it
calls the runtime-core short-chain-service which routes to
`compileShortChainGeneration` in
`@masterpiece/image-generation-runtime/generation/index.js`.

## 4. Existing packaging assets (CURRENT)

| Path | Role | Source of truth |
|---|---|---|
| `packages/image-generation-runtime/src/core/packaging-generation-core.js` | **Shared Packaging facade** (re-exports `compileImageGenerationTask` + `migrateImageGenerationSourcesV2` + `createCompileFingerprint` + `evaluateDeliverableGate` + `redactProviderRequest/Response` + `IMAGE_GENERATION_PRESET_CAPABILITIES` + `PACKAGING_GENERATION_CORE_ID = 'packaging-generation-core@1.0.0'`) | SHARED — re-export only |
| `tests/image-generation/packaging-contract.test.js` | 14-block packaging contract test + `PACKAGING_STRUCTURE_EVIDENCE_MISSING` validation | TEST (current contract) |
| `tests/image-generation/packaging-generation-core-facade.test.js` | facade re-export identity test (facade ≡ historical compiler) | TEST (no-drift contract) |
| `tests/image-generation/space-r9-packaging-isolation.test.js` | Space / Packaging isolation test | TEST (no cross-target leak) |
| `apps/web/src/components/ImageGenerationWorkspace.tsx` | `packaging_render` deliverable option in legacy workspace | UI (legacy; production uses ShortChainGenerationWorkspace) |
| `compileShortChainGeneration` in `packages/image-generation-runtime/src/generation/index.js` | already accepts `deliverableFamily: 'packaging'` and emits 14-block contract | SHARED — used today |

## 5. Reuse map (current vs. future P1–P4)

P1–P4 must **reuse** the SHARED layer below. They must not
duplicate any Space-only module.

| Module | Current layer | Reuse target |
|---|---|---|
| `compileImageGenerationTask` | `task-builder.js` (re-exported by `core/packaging-generation-core.js`) | Packaging Compiler (P2) |
| `migrateImageGenerationSourcesV2` | `task-builder.js` | Packaging schema migration (P1) |
| `createCompileFingerprint / stableHash / verifyCompileFingerprint` | `deliverables/compile-fingerprint.js` | Packaging Compiler determinism (P2) |
| `evaluateDeliverableGate` | `gates/deliverable-gate.js` | Packaging Validator (P3) |
| `redactProviderRequest / redactProviderResponse` | `redact.js` | Packaging Translation (P2) + Provider adapter (shared) |
| `IMAGE_GENERATION_PRESET_CAPABILITIES` | `policies.js` | Packaging preset wiring (P2) |
| `downloadAndVerifyImage` | `download-verify.js` | Packaging output persistence (shared) |
| `prompt-preflight-gate.js` | `gates/prompt-preflight-gate.js` | Packaging preflight (shared) |
| Reference Asset resolution | `prompt-contracts/reference-asset-resolver.ts` | Packaging Reference Roles (P2) |
| Locked Asset precedence | `task-builder.js` + `context-loader.ts` | Locked Asset precedence (P2) |
| Run store | `run-store.ts` (runtime-core) | Packaging run persistence (P2 + P3) |

## 6. Packaged Architecture decision: do NOT duplicate Space

Per spec P0 Exit: "不复制 Space runtime".

Concretely:
- Packaging does **not** get a new `compilation` module that
  mirrors `space/compiler.js`. Packaging uses
  `compileImageGenerationTask` (already shared) plus a
  Packaging Translation step (P2) that produces the same 14-block
  contract that the existing packaging-contract test already
  pins.
- Packaging does **not** get a new quality gate that mirrors
  `space-quality-gate.js`. Packaging uses
  `evaluateDeliverableGate` (already shared) plus a Packaging
  Validator (P3) layered on top.
- Packaging does **not** get a new reference policy that mirrors
  `space-reference-policy.js`. Packaging uses the same
  `reference-asset-resolver.ts` plus a Packaging Reference Role
  table (P2).
- Packaging does **not** get a new fingerprint module. Packaging
  uses `createCompileFingerprint`.

## 7. Phase / version namespace compliance

P0 only. No production code added in P0. The audit confirms:

- No new `P0` / `P1` / `P2` / `P3` / `P4` runtime namespace.
- No `p2-packaging-compiler` / `P3_PACKAGING_VERSION` /
  `packaging-vnext-runtime` / `packaging-p4` package.
- All new files in P1–P4 will use:
  - `packaging-translation`
  - `packaging-compiler`
  - `packaging-contract`
  - `packaging-validator`
  - `packaging-generation-service`

Verified by `scripts/verify-a4-version-namespace.mjs` (existing
guard; A4 freeze). P0 does not add new code; P1 will add
`scripts/verify-packaging-naming.mjs` if needed (deferred — A4
guard already covers the same patterns).

## 8. P0-1 acceptance

- [x] Current Space / short-chain / generation runtime audited
- [x] Shared Generation Core listed
- [x] Space-only assumptions listed
- [x] Existing packaging schema / sufficiency / contracts / tests inventoried
- [x] Reuse map (current → P1–P4) recorded
- [x] No Space runtime duplication decided
- [x] Phase / version namespace compliance confirmed
