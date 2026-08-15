# P3-D3.7D — Space Reference Creative Task Path Corrective

**Date:** 2026-08-15
**Branch:** `codex/visual-analysis-a1-multi-provider`
**Start HEAD:** `2004f9a7bea0a213bd884a0d1c2d00316a3d8e4e` (P3-D3.7C HEAD, resolved via `git rev-parse HEAD`)
**Phase Class:** NARROW SPACE PRODUCTION CORRECTIVE — post-freeze Reference integration fix
**External Provider HTTP calls:** 0
**Image generation:** 0
**Golden:** unchanged

---

## 1. P3-D3.7C Consumed

D3.7C (`2004f9a`) inventoried all asset → Creative Task reference path construction sites and located the space defect at SR-10: `space-reference-policy.js:96` unconditionally prefixed `input/` onto `asset.relativePath`. For D3.6B web-uploaded assets (usage=`generation_reference`, project-root-relative `generation-references/<id>.png`) this produced a nonexistent path; the correct existence guard (`REFERENCE_ASSET_NOT_FOUND` — "Creative Task 参考图不存在: 550f5db8-…") fail-closed.

## 2. Space Real-Web Failure

User's `npm run web:dev` SPACE flow: Reference-First → upload → thumbnail → 生成 → `Creative Task 参考图不存在: 550f5db8-d67a-4a3d-9d4e-c0e095b3f9cd`.

## 3. Original Wrong Path

```js
projectRelativePath: `input/${asset.relativePath}`,
// generation_reference -> input/generation-references/<id>.png  (WRONG)
```

## 4. Corrected Usage-Aware Logic

```js
projectRelativePath: asset.usage === 'generation_reference'
  ? asset.relativePath
  : `input/${asset.relativePath}`,
```

## 5. Analysis Source Semantics

`analysis_source` → `input/<asset.relativePath>` → `<projectRoot>/input/<relativePath>` (unchanged, correct).

## 6. Generation Reference Semantics

`generation_reference` → `<asset.relativePath>` → `<projectRoot>/generation-references/<id>.png` (corrected).

## 7. Resolver Alignment

`resolveReferenceAsset` (unchanged, already usage-aware) and the corrected Space Creative Task path agree:

```
path.resolve(projectRoot, spaceCreativeReference.projectRelativePath)
  === resolveReferenceAsset(...).absolutePath
```

Verified with real production functions (BE-06).

## 8. Cross-Deliverable Invariant

For the same `generation_reference` asset, both Packaging (D3.7B) and Space (D3.7D) Creative Task paths resolve to `<projectRoot>/generation-references/<id>.png` (BE-06 + regression invariant; no shared helper extracted).

## 9. Missing Asset Fail-Closed

Missing `generation_reference` and missing `analysis_source` still fail existence (BE-09/10). The `REFERENCE_ASSET_NOT_FOUND` guard is untouched.

## 10. BE Guards

`tests/runtime-application/space-reference-path-binding.test.ts` (BE-01..BE-25): **25/25 PASS**.

## 11. BD / UA / BC / BB Preservation

BD (25/25), UA (14/14), BC (30/30), BB (25/25) — all retained PASS.

## 12. Space Frozen Baseline Preservation

Space prompt, Golden, R8.6 baseline, R9/R10 semantics, generation quality rules — **all unchanged**. This is a post-freeze Reference integration corrective; `space-generator/` and the space compiler are untouched (BE-21/22/23).

## 13. Packaging Preservation

Packaging D3.7B production code untouched (BE-18). Web upload / project-store / resolver untouched (BE-19/20).

## 14. Full Regression

```
npm test                  1259/1259 PASS
npm run runtime-application:test   PASS (1623/1623 incl. BE)
npm run runtime:test               PASS
npm run test:image-generation      1007/1007 PASS
npm run cli:test                   40/40 PASS
npm run web:typecheck              PASS (0 errors)
npm run web:build                  PASS
npm run web-runtime:typecheck      PASS
npm run web-runtime:test           12/12 PASS
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

## 15. Production Changed Files

- `packages/image-generation-runtime/src/space/space-reference-policy.js` (only)
- `tests/runtime-application/space-reference-path-binding.test.ts` (new)

## 16. Provider Calls

```
External Provider HTTP:   0
Image generation:         0
```

## 17. Golden

```
Golden auto-update:       NO
Golden changed:           NO
```

## 18. User Real-Web Retest Required

The user must re-run `npm run web:dev` and repeat the Space Reference-First flow (upload reference → thumbnail → 生成). Expected: no more "Creative Task 参考图不存在". If Seedream is called, let that one request complete; on success → SPACE REFERENCE-FIRST LIVE PROVIDER PASS; on a new downstream error → stop and record the new boundary.

## 19. Final Decision

```
P3-D3.7D:                          PASS
SPACE REFERENCE TASK BINDING:      OFFLINE CORRECTED
WEB ASSET UPLOAD:                  LIVE VALIDATED
PACKAGING REFERENCE PATH:          PRESERVED (D3.7B)
P3-D3:                             HOLD — SPACE REAL-WEB RETEST REQUIRED
P3-D4:                             LOCKED
P3-E:                              LOCKED
```

**STOP. No automatic Provider call.**
