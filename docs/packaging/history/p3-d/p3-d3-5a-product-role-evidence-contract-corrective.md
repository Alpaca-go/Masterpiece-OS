# P3-D3.5A — Packaging Product Role Evidence Contract Corrective

**Date:** 2026-08-15
**Branch:** `codex/visual-analysis-a1-multi-provider`
**Start HEAD:** `faad9406d4dad5e457ad636a4aa09380fa97e455` (P3-D3.4 audit HEAD, resolved via `git rev-parse HEAD`)
**Phase Class:** NARROW PRODUCTION CORRECTIVE (offline)
**External Provider HTTP calls:** 0
**Golden:** unchanged

---

## 1. P3-D3.4 Audit Consumed

P3-D3.4 (`faad940`) identified: `prompt-preflight-gate.js` required `packagingTranslation.productRoleEvidenceRefs` non-empty, but `normalizePackagingTranslationV2` never emits that field → `buildPackagingTranslation` always yields `[]` → `PACKAGING_PRODUCT_ROLE_MISSING` structurally blocks every packaging task, with `UNSUPPORTED_PRODUCT_INVENTION` as a downstream consequence. `LOCKED_ASSET_OMITTED` is `warn` (not the block cause). Auto-recompile exists but re-compiles with the same project truth. The UI falsely described the whole `PROMPT_PREFLIGHT_BLOCKED` as "可自动恢复".

## 2. Original Structural Block

```
prompt-preflight-gate.js:184   requires productRoleEvidenceRefs non-empty
packaging-translation-contract.ts  normalizePackagingTranslationV2 does NOT emit it
creative-production-runtime/packaging-translation.js  buildPackagingTranslation: list(source.productRoleEvidenceRefs) = []
→ PACKAGING_PRODUCT_ROLE_MISSING (block) → UNSUPPORTED_PRODUCT_INVENTION (block)
```

## 3. Canonical Evidence Owner

`productRoleEvidenceRefs` is **not** part of `PackagingTranslationV2` (`packages/project-contracts/src/index.ts:1355-1385`). No producer in `packages/**` emits it. The canonical product-role authority is **`productAndCategoryRole`**:

- `analysis-runtime/src/deliverable-sufficiency.ts:142-146` — maps `mediaTranslations.packaging.productAndCategoryRole` (minimumItems 1) to `PACKAGING_PRODUCT_ROLE_MISSING`
- `image-generation-runtime/src/prompt-contracts/packaging-contract.js:56-57` — `productAndCategoryRole` in missingRequiredFields → `PACKAGING_PRODUCT_ROLE_MISSING` (and `productRoleEvidenceRefs` was already excluded as evidence-only at line 50)

## 4. Before Contract

| Layer | Product-role check | Result |
|---|---|---|
| analysis-runtime deliverable-sufficiency | `productAndCategoryRole` ≥ 1 | canonical |
| packaging-contract.js (prompt compiler) | `productAndCategoryRole` in missing fields | canonical |
| prompt-preflight-gate.js | `productRoleEvidenceRefs` non-empty (orphan) | **inconsistent → always block** |

## 5. Root Cause

The preflight gate read a field that is not part of the canonical contract and has no producer. The gate and the canonical contract disagreed on what "product role evidence" means.

## 6. Production Correction

**Primary — `packages/image-generation-runtime/src/gates/prompt-preflight-gate.js`:**
- `PACKAGING_PRODUCT_ROLE_MISSING` now keys on `productAndCategoryRole` empty (aligned with deliverable-sufficiency + packaging-contract).
- `UNSUPPORTED_PRODUCT_INVENTION` fires only when `productAndCategoryRole` is empty AND the instruction names a product/container (瓶/罐/管/安瓶/精华/面膜/注射/器械/bottle/jar/tube/ampoule/serum).
- The legacy field is no longer read.

**Primary — `packages/creative-production-runtime/src/packaging-translation.js`:**
- `validatePackagingTranslation` / `assertPackagingTranslation` use `productAndCategoryRole`; the legacy field is no longer emitted from `buildPackagingTranslation` output.

**Secondary — `apps/web/src/utils.ts` (recoverability UI):**
- `errorIsAutoRecoverable` returns false when the preflight message carries `PACKAGING_PRODUCT_ROLE_MISSING` or `UNSUPPORTED_PRODUCT_INVENTION` (data-gap findings that recompile cannot repair). Genuine auto-recompile cases remain recoverable. Classification is on structured code tokens, never Chinese text.

## 7. After Contract

| Layer | Product-role check | Result |
|---|---|---|
| analysis-runtime deliverable-sufficiency | `productAndCategoryRole` ≥ 1 | canonical (unchanged) |
| packaging-contract.js (prompt compiler) | `productAndCategoryRole` in missing fields | canonical (unchanged) |
| prompt-preflight-gate.js | `productAndCategoryRole` empty → block | **reconciled** |

## 8. No-Fabrication Proof

- No `productRoleEvidenceRefs: ['synthetic'|'project'|'analysis']` anywhere in production.
- No fixed sentinel evidence refs.
- The gate reads only the canonical `productAndCategoryRole` (structured producer output).
- BB-03 / BB-06 assert the legacy field is absent from the normalizer contract, the build output, and the gate logic.

## 9. Analysis-led Legal Case

A fully-populated canonical packaging translation (generic fixture, not project-specific) with `productAndCategoryRole` non-empty:
- `buildPackagingTranslation` preserves the role.
- Preflight: **no** `PACKAGING_PRODUCT_ROLE_MISSING`, **no** `UNSUPPORTED_PRODUCT_INVENTION`.
- Verified with the real production functions (BB-04, BB-07).

## 10. Reference-first Regression

The reference-first producer shares `normalizePackagingTranslationV2`. A legal reference-first translation with `productAndCategoryRole` passes preflight; the normalizer contract is unchanged except that the legacy field is not emitted. Selector / authority / fingerprint are untouched (BB-05, BB-20).

## 11. Legal Preflight PASS

BB-07: container/product wording with a confirmed canonical product role does not trigger the role blockers.

## 12. Illegal No-Evidence FAIL (fail-closed preserved)

BB-09: `productAndCategoryRole: []` → `PACKAGING_PRODUCT_ROLE_MISSING` still blocks.
BB-10: no role + container wording → `UNSUPPORTED_PRODUCT_INVENTION` still blocks.

## 13. Unsupported Invention Fail-closed

Preserved: a task with no product authority that names a product/container still blocks (BB-10). A legal role no longer causes a false positive (BB-08).

## 14. Warning Semantics

`LOCKED_ASSET_OMITTED` remains `warn` — not removed, not promoted to block (BB-11). Blocking vs warning distinction preserved (BB-12).

## 15. Recoverability UI Change

`apps/web/src/utils.ts`: `PROMPT_PREFLIGHT_BLOCKED` with data-gap findings (`PACKAGING_PRODUCT_ROLE_MISSING` / `UNSUPPORTED_PRODUCT_INVENTION`) is no longer "可自动恢复". Genuine recompile-recoverable cases (fingerprint staleness, rule drift, normalization) keep the hint (BB-13/14/15).

## 16. BB Guards

New `BB — Packaging Product Role Evidence Contract Corrective` group (BB-01..BB-25) in `tests/image-generation/packaging-product-role-evidence-contract.test.js`. All 25 PASS.

## 17. Full Regression

```
npm test                  1259/1259 PASS   (was 1234; +25 BB)
npm run runtime-application:test   PASS (1528/1528 after commit)
npm run runtime:test               PASS (after commit)
npm run test:image-generation      1007/1007 PASS   (+25 BB)
npm run cli:test                   40/40 PASS
npm run web:typecheck              PASS (0 errors)
npm run web:build                  PASS
npm run web-runtime:typecheck      PASS
npm run web-runtime:test           10/10 PASS
npm run web:smoke                  PASS
npm run repo:verify                PASS
npm run repo:check                 PASS
npm run verify:current-flows       PASS
npm run verify:version-consistency PASS
npm run verify:version-naming      PASS
npm run verify:workspace-boundaries PASS
npm run verify:no-obsolete-code    PASS
npm run verify:production-boundaries PASS
npm run verify:no-project-specific-production-rules PASS
npm run verify:golden-boundary     PASS
npm run verify:space-compiler-baseline PASS
npm run verify:space-r8.6-golden-boundary PASS
npm run golden:test                PASS (Provider calls 0, auto-update NO)
```

## 18. Production Changed Files

- `packages/image-generation-runtime/src/gates/prompt-preflight-gate.js`
- `packages/creative-production-runtime/src/packaging-translation.js`
- `apps/web/src/utils.ts`
- `tests/image-generation/packaging-product-role-evidence-contract.test.js` (new)
- `tests/image-generation/prompt-preflight-gate.test.js`
- `tests/runtime-application/utils-error-hints.test.ts`

Not touched: `node-native-operations.ts`, Reference upload UI, Provider adapter, P3-A12, Shot Contract, Registry identity, Golden.

## 19. Provider Calls

```
External Provider HTTP:   0
Image generation:         0
```

## 20. Golden

```
Golden auto-update:       NO
Golden changed:           NO
```

## 21. Historical Preservation

P2 / P3-A12 / P3-B / P3-C / D3.1 / D3.2 / D3.3 / #2 / #2A / #2B / D3.4 — all preserved.

## 22. Reference Upload Blocker

**STILL BLOCKED — SEPARATE CORRECTIVE REQUIRED** (Corrective B, P3-D3.5B). Not touched by this phase.

## 23. Final Decision

```
P3-D3.5A:                          PASS
STANDARD / ANALYSIS-LED:           OFFLINE READY
PRODUCT ROLE EVIDENCE CONTRACT:    CORRECTED
FALSE RECOVERABILITY CLAIM:        CORRECTED
REFERENCE-FIRST UPLOAD:            STILL BLOCKED — SEPARATE CORRECTIVE REQUIRED
P3-D3:                             HOLD — REFERENCE UPLOAD CORRECTIVE + WEB REAL VALIDATION REQUIRED
P3-D4:                             LOCKED
P3-E:                              LOCKED
```

## 24. Next Step

P3-D3.5B — Web Reference File Picker Corrective. **Do not start automatically.**
