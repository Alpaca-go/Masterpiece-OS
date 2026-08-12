# P0-5 — Reuse Decision Log

**Phase:** Packaging V1 / P0 — Architecture & Reuse Audit
**Date:** 2026-08-12
**Status:** `P0_REUSE_DECISIONS_FROZEN`
**Spec:** Packaging V1 Revised Development Specification §P0 ("确定 Locked Assets / reference asset / provider adapter / run store / Packaging Translation·Compiler·Validator 边界")
**Predecessor:** `P0-domain-schema.md`

## 1. Purpose (per P0 spec)

Record, item by item, the **reuse** decision for each
Packaging-facing capability. P0 commits to "reuse, do not
duplicate" for every cross-target capability; P1–P4 must
implement against this log.

## 2. Decision format

Each row records:

- **Capability** (what)
- **Current path** (where it lives today)
- **Decision** (REUSE / ADAPT / NEW)
- **Rationale** (why)
- **Phase that consumes it** (P1 / P2 / P3 / P4)
- **Boundary risk** (what must not leak across)

## 3. Reuse decisions

### 3.1 Locked Assets

| Field | Value |
|---|---|
| Capability | Locked Asset precedence: Locked > User Constraints > Reference > Translation > Analysis > Model Defaults |
| Current path | `packages/image-generation-runtime/src/task-builder.js` reads from `visualDecisionPacket.lockedAssets`; the precedence is implemented in the same module. |
| Decision | **REUSE** |
| Rationale | Locked Asset is a generic concept in Visual Analysis; the precedence rule is project-level, not target-level. |
| Phase | P1 (record the precedence in Packaging golden), P2 (consume in Packaging Translation) |
| Boundary risk | Packaging-specific code MUST NOT re-implement the precedence; it MUST read the result of the existing implementation. |

### 3.2 Reference assets

| Field | Value |
|---|---|
| Capability | Reference asset selection + role assignment |
| Current path | `packages/image-generation-runtime/src/prompt-contracts/reference-asset-resolver.ts`; `runtime-core/.../reference-asset-*` services |
| Decision | **REUSE + ADAPT** |
| Rationale | The resolver is target-agnostic (it returns role-tagged assets). Packaging adds a Packaging-specific role table on top. |
| Phase | P2 (Packaging Reference Role table) |
| Boundary risk | The Packaging role table MUST NOT modify the underlying resolver. The role table is a *consumer* of the resolver output. |

### 3.3 Provider adapter

| Field | Value |
|---|---|
| Capability | Image generation provider dispatch |
| Current path | `@masterpiece/image-generation-adapter`, `@masterpiece/image-provider-dashscope`, `@masterpiece/model-registry` |
| Decision | **REUSE** |
| Rationale | Provider adapter is target-agnostic. Packaging uses the same provider dispatch as Space. |
| Phase | P2 (Packaging Compiler calls the existing adapter through the same dispatch) |
| Boundary risk | Packaging MUST NOT register a parallel provider; the adapter registry is the single source. |

### 3.4 Run store

| Field | Value |
|---|---|
| Capability | Image generation run persistence + status |
| Current path | `packages/runtime-core/src/application/image-generation/run-store.ts` |
| Decision | **REUSE** |
| Rationale | Run store is target-agnostic; both `space` and `packaging` runs go through the same `run-store`. |
| Phase | P3 (Packaging UI reads from the same store) |
| Boundary risk | Packaging MUST NOT add a parallel run store. If new metadata is required, it goes into the existing run record with a new field; the store schema grows in-place. |

### 3.5 Image download + verify

| Field | Value |
|---|---|
| Capability | `downloadAndVerifyImage` |
| Current path | `packages/image-generation-runtime/src/download-verify.js` |
| Decision | **REUSE** |
| Rationale | The downloader is target-agnostic. |
| Phase | P2 / P3 |
| Boundary risk | None |

### 3.6 Redaction

| Field | Value |
|---|---|
| Capability | `redactProviderRequest` / `redactProviderResponse` |
| Current path | `packages/image-generation-runtime/src/redact.js` |
| Decision | **REUSE** |
| Rationale | Redaction is target-agnostic and security-critical. A4 G-A4-10 secret-safety guard already covers the contract. |
| Phase | P2 / P3 / P4 |
| Boundary risk | Packaging MUST NOT add a parallel redactor. |

### 3.7 Compile fingerprint

| Field | Value |
|---|---|
| Capability | `createCompileFingerprint` / `stableHash` / `verifyCompileFingerprint` |
| Current path | `packages/image-generation-runtime/src/deliverables/compile-fingerprint.js` |
| Decision | **REUSE** |
| Rationale | Determinism primitive is target-agnostic. |
| Phase | P2 |
| Boundary risk | None. |

### 3.8 Deliverable gate

| Field | Value |
|---|---|
| Capability | `evaluateDeliverableGate` |
| Current path | `packages/image-generation-runtime/src/gates/deliverable-gate.js` |
| Decision | **REUSE + ADAPT** |
| Rationale | The gate is target-agnostic at the *interface* level (pass/fail + reason). Packaging adds a Packaging Validator (P3) that runs the existing gate first, then layers Packaging-specific rules on top. |
| Phase | P3 |
| Boundary risk | Packaging Validator MUST NOT modify the existing gate's behavior. The Packaging layer is a *consumer*. |

### 3.9 Prompt preflight

| Field | Value |
|---|---|
| Capability | `prompt-preflight-gate.js` |
| Current path | `packages/image-generation-runtime/src/gates/prompt-preflight-gate.js` |
| Decision | **REUSE** |
| Rationale | Preflight is target-agnostic (it runs on a 14-block compiled prompt regardless of target). |
| Phase | P2 |
| Boundary risk | None. |

### 3.10 Reference-plan compiler / materializer / validator

| Field | Value |
|---|---|
| Capability | `reference-plan-compiler.js` / `reference-plan-materializer.js` / `reference-plan-validator.js` |
| Current path | `packages/image-generation-runtime/src/reference-plan/` |
| Decision | **REUSE** |
| Rationale | Reference plan is target-agnostic; the role tags it produces are reusable. |
| Phase | P2 (consume) |
| Boundary risk | None. |

### 3.11 Image-generation-contracts (TypeScript)

| Field | Value |
|---|---|
| Capability | `@masterpiece/image-generation-contracts` |
| Current path | `packages/image-generation-contracts/src/index.ts` |
| Decision | **REUSE** |
| Rationale | All public types live here. Packaging types are added (in P1) as new exports, not by mutating existing ones. |
| Phase | P1 (add Packaging types), P2/P3 (consume) |
| Boundary risk | Adding Packaging types MUST NOT break any existing Space consumer. The contracts package is append-only. |

### 3.12 Runtime-core short-chain service

| Field | Value |
|---|---|
| Capability | `runtime-core/application/image-generation/short-chain-service.ts` |
| Current path | `packages/runtime-core/src/application/image-generation/short-chain-service.ts` |
| Decision | **REUSE** |
| Rationale | The orchestrator is target-agnostic at the entry point. It receives a `task` and routes to the compiler. |
| Phase | P1–P4 (consume) |
| Boundary risk | The service MUST NOT branch on `deliverableFamily` to do target-specific work; the dispatch lives in the compiler (Shared Core). |

### 3.13 Image Generation Provider Capabilities

| Field | Value |
|---|---|
| Capability | `IMAGE_GENERATION_PRESET_CAPABILITIES` |
| Current path | `packages/image-generation-runtime/src/policies.js` |
| Decision | **REUSE** |
| Rationale | Provider capability matrix is target-agnostic. |
| Phase | P2 |
| Boundary risk | None. |

## 4. Decisions deferred to later phases

These are intentionally NOT decided in P0. They will be
resolved in the named phase:

| Decision | Phase | Reason |
|---|---|---|
| Packaging Translation (semantic → generation bridge) | P2 | Spec: P2 implements it |
| Packaging Compiler (Translation + task → 14-block prompt) | P2 | Spec: P2 implements it |
| Packaging Validator (12 PKG-F codes + 7-axis rubric) | P3 | Spec: P3 implements it |
| Packaging generation metadata schema | P2 | Spec: P2 implements it |
| component semantic versioning | P2 | Spec: P2 introduces it |
| Golden Anchor / Prompt / Translation / Rubric for 九州美学 | P1 | Spec: P1 freezes the golden |
| UI flow: Project → Mode → Shot → Locked → References → Generate → Validation → Save | P3 | Spec: P3 implements it |

## 5. Boundary risks at a glance

The decisions above are all REUSE. The risk of "leakage" from
Space into Packaging is highest for the following items; P0
flags them for explicit guard in P3:

1. `space/index.js` re-exports `SPACE_PROMPT_COMPILER_ID`,
   `SPACE_REFERENCE_POLICY_VERSION`, etc. These names are
   Space-specific. If Packaging imports from `space/index.js`
   to get a generic utility, the import binds Packaging to a
   Space version namespace. **P3 must add a guard: Packaging
   code MUST NOT import from `space/index.js` (only from
   `core/space-generation-core.js` and `core/packaging-generation-core.js`).**
2. The existing `short-chain-service.ts` may have a Space
   default in some code paths. P1 will audit and remove any
   Space default; the service becomes target-agnostic.

## 6. P0-5 acceptance

- [x] Reuse decisions recorded for 13 cross-target capabilities
- [x] All decisions are REUSE or REUSE+ADAPT (no parallel pipelines)
- [x] Deferred decisions named with phase
- [x] Boundary risks flagged for P3 guards
- [x] No code change in P0
