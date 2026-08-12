# P0-2 — Shared vs Target-Specific Matrix

**Phase:** Packaging V1 / P0 — Architecture & Reuse Audit
**Date:** 2026-08-12
**Status:** `P0_SHARED_TARGET_MATRIX_FROZEN`
**Spec:** Packaging V1 Revised Development Specification §P0
**Predecessor:** `P0-architecture-map.md`

## 1. Purpose (per P0 spec)

Spell out, layer by layer, what is **Shared Generation Core** (used
by both `space` and `packaging`), what is **Space-only**
(consumed only by `space` because Space has architectural
primitives packaging does not need), and what is **Packaging-
specific** (to be added in P1–P4 without leaking into Space).

## 2. Matrix (production code only)

Legend:
- **S** = Shared (both `space` and `packaging` consume it today)
- **S\*** = Shared but currently Space is the only consumer
  (Packaging will adopt in P1–P4)
- **Sp** = Space-only (must NOT be touched by Packaging)
- **Pk** = Packaging-specific (P1–P4 introduce; Space ignores)
- **n/a** = not in this layer

| Module / Capability | `space` | `packaging` |
|---|---|---|
| **Provider model layer** | | |
| `@masterpiece/model-registry` | S | S |
| `@masterpiece/image-generation-contracts` | S | S |
| `@masterpiece/image-generation-adapter` | S | S |
| `@masterpiece/image-provider-dashscope` | S | S |
| **Shared Generation Core (facade)** | | |
| `core/space-generation-core.js` | S | S\* |
| `core/packaging-generation-core.js` | n/a | S |
| `task-builder.js` (`compileImageGenerationTask` / `migrateImageGenerationSourcesV2`) | S | S |
| `deliverables/compile-fingerprint.js` | S | S |
| `gates/deliverable-gate.js` (`evaluateDeliverableGate`) | S | S |
| `gates.js` (`evaluateArtifactGate` / `evaluateIdentityGate`) | S | S |
| `redact.js` | S | S |
| `policies.js` (`IMAGE_GENERATION_PRESET_CAPABILITIES`) | S | S |
| `download-verify.js` | S | S |
| **Prompt layer** | | |
| `prompt/creative-core.js` | S | S\* |
| `prompt/prompt-composer.js` | S | S\* |
| **Reference plan layer** | | |
| `reference-engine/reference-asset-resolver.ts` | S | S |
| `reference-plan/{compiler,materializer,validator}.js` | S | S\* |
| `prompt-contracts/reference-asset-resolver.ts` | S | S |
| **Space-only** | | |
| `space/compiler.js` (`compileSpacePrompt`, `SPACE_PROMPT_COMPILER_ID`) | Sp | n/a |
| `space/source-adapter.js` (`adaptSpaceSource`, `isSpaceSourceInsufficient`) | Sp | n/a |
| `space/architecture-context.js` (`selectArchitectureAnchors` etc.) | Sp | n/a |
| `space/reference-policy.js` (`resolveSpaceReferences`, `assertSpaceReferenceAvailable`) | Sp | n/a |
| `space/space-quality-gate.js` (`runSpaceQualityGate`) | Sp | n/a |
| `space/space-reference-policy.js` | Sp | n/a |
| `space/prompt-budget.js` (`measurePromptBudget`, `assertPromptBudget`, `resolveProviderPromptLimit`) | Sp | n/a |
| `space/trace.js` (`buildTrace`, `fingerprint`) | Sp | n/a |
| `space/product-policy.js` | Sp | n/a |
| `space/gates/{compile,generation-route,provider-prompt}-*.js` | Sp | n/a |
| `space/quality-baselines/active-space-route-baseline.js` | Sp | n/a |
| **Generation flow (already multi-target)** | | |
| `generation/compile.js` (`compileShortChainGeneration`) | S | S |
| `generation/task-contract.js` | S | S |
| `generation/template-{registry,router}.js` | S | S |
| `generation/user-confirmed-visual-decision.js` | S | S |
| `generation/golden-backtrace-audit.js` | S | S |
| `generation/seedream-adapter.js` | S | S |
| **Runtime-core image-generation services** | | |
| `runtime-core/application/image-generation/service.ts` | S | S\* |
| `runtime-core/application/image-generation/short-chain-service.ts` | S | S\* |
| `runtime-core/application/image-generation/run-store.ts` | S | S\* |
| `runtime-core/application/image-generation/context-loader.ts` | S | S\* |
| `runtime-core/application/image-generation/deliverable-validator-service.ts` | S | S\* |
| `runtime-core/application/image-generation/similarity-audit-service.ts` | S | S\* |
| `runtime-core/application/image-generation/logo-post-composite.ts` | S | S\* |
| **Web UI** | | |
| `apps/web/src/components/ShortChainGenerationWorkspace.tsx` (primary) | S | S |
| `apps/web/src/components/ImageGenerationWorkspace.tsx` (legacy) | S | S |
| `apps/web/src/components/ReferenceAnchorWorkspace.tsx` | S | S |
| **Tests (currently)** | | |
| `tests/image-generation/packaging-contract.test.js` | n/a | S |
| `tests/image-generation/packaging-generation-core-facade.test.js` | n/a | S |
| `tests/image-generation/space-r9-packaging-isolation.test.js` | S (asserts no cross-target leak) | S (asserts no cross-target leak) |
| `tests/image-generation/space-r*.test.js` (R9 / R10 / R11 / 2-b*) | Sp | n/a |
| `tests/image-generation/space-r11.2*-test.js` | Sp | n/a |
| `tests/image-generation/space-action-verb-rewrite.test.js` | Sp | n/a |
| `tests/image-generation/space-*-semantic-gate.test.js` | Sp | n/a |
| `tests/image-generation/space-quality-gate.test.js` | Sp | n/a |
| `tests/image-generation/space-final-acceptance-artifact-integrity.test.js` | Sp | n/a |
| `tests/image-generation/space-*-baseline.test.js` | Sp | n/a |
| `tests/image-generation/space-motif-stripping.test.js` | Sp | n/a |

## 3. Decision rules

### 3.1 A module is **Shared (S)** if

- It is consumed by both `space` and `packaging` today
  (verified by the existing tests), OR
- It is already designed to be target-agnostic (provider
  adapters, contracts, redactors, run stores, fingerprint,
  image download).

### 3.2 A module is **Shared-adopt (S\*)** if

- It is currently consumed only by `space` in production code,
  BUT its API is target-agnostic and Packaging can adopt it in
  P1–P4 without modification.

Example: `core/space-generation-core.js` exports
`assertSpaceGenerationRouteGateA` etc. — Space-specific names,
but the **shape** (gate functions returning pass/fail + version
constant) is target-agnostic. Packaging will write a parallel
gate in P3 (Packaging Validator) without copying
`space/space-quality-gate.js`.

### 3.3 A module is **Space-only (Sp)** if

- It references architectural primitives (building / floor /
  reception / entrance view) that Packaging does not need, OR
- Its golden baseline is a Space-only Golden (e.g.
  `phase9b-recovered/_packets/<brand>/visual-decision-packet.json`),
  OR
- It enforces a Space-specific reference policy
  (e.g. `resolveSpaceReferences` rejects references that would
  be valid for Packaging).

### 3.4 A module is **Packaging-specific (Pk)** if

- It is introduced in P1–P4 for the `packaging` target, AND
- It does not mutate any Space-only module, AND
- It is named per the spec discipline (`packaging-contract`,
  `packaging-translation`, `packaging-compiler`,
  `packaging-validator`, `packaging-generation-service`).

## 4. Cross-target isolation invariants

These are the invariants P0 freezes; P1–P4 must not violate:

1. **`deliverableFamily: 'space' | 'packaging'` is the single
   dispatch field.** The `compileShortChainGeneration` /
   `compileImageGenerationTask` functions read it and route to
   the target-specific shape. (Verified: existing packaging
   test passes with `deliverableFamily: 'packaging'`.)
2. **Space-only modules must not be importable from
   Packaging-specific code paths.** The runtime-core
   `short-chain-service.ts` is the orchestrator; if it ever
   `import from '.../space/index.js'`, Packaging inherits Space
   assumptions. The existing `space-r9-packaging-isolation.test.js`
   already pins this; P3 will add an explicit guard.
3. **The 14-block contract is the shared contract.** Both `space`
   and `packaging` produce / consume the same 14-block schema
   (the 14 blocks are listed in `P0-domain-schema.md`). Block
   content differs (Space fills architecture_*; Packaging fills
   packaging_structure_*); the schema is shared.
4. **Provider capabilities are a Shared preset.** `IMAGE_GENERATION_PRESET_CAPABILITIES` enumerates the cross-target
   capability matrix. Packaging does not duplicate it.
5. **Locked Asset precedence is Shared.** `task-builder.js` reads
   Locked Assets from the visual decision packet; the precedence
   rules (Locked > User Constraints > Reference > Translation >
   Analysis > Model Defaults) are the same for both targets.
   Packaging does not re-implement this.
6. **Fingerprint is Shared.** `createCompileFingerprint` +
   `stableHash` + `verifyCompileFingerprint` are the cross-target
   determinism primitive. Packaging Compiler uses them; no new
   fingerprint module.

## 5. P0-2 acceptance

- [x] Shared Generation Core enumerated
- [x] Space-only assumptions enumerated
- [x] Cross-target isolation invariants frozen (6 invariants)
- [x] No packaging module in production code (P0 is audit only)
- [x] Reuse decision documented for each shared module
