# P3-D3.7B — Reference Creative Task Path Binding Corrective

**Date:** 2026-08-15
**Branch:** `codex/visual-analysis-a1-multi-provider`
**Start HEAD:** `dfffa19b1b909e1146065785914cd6f724b0d8fd` (P3-D3.7A HEAD, resolved via `git rev-parse HEAD`)
**Phase Class:** NARROW PRODUCTION CORRECTIVE (offline acceptance)
**External Provider HTTP calls:** 0
**Image generation:** 0
**Golden:** unchanged

---

## 1. P3-D3.7A Consumed

D3.7A audit (`dfffa19`) located the first broken boundary RC-09: `short-chain-service.ts` built `reference.projectRelativePath` as `input/${asset.relativePath}` unconditionally. The D3.6B web upload path persists `generation_reference` assets whose `relativePath` is already project-root-relative (`generation-references/<id>.png`), so the prefix produced a nonexistent path and the correct existence guard (`service.ts` `REFERENCE_ASSET_NOT_FOUND` — "Creative Task 参考图不存在: 22e161bb-…") fired.

## 2. Real-Web Error

```
Creative Task 参考图不存在: 22e161bb-136f-4942-ad78-6564d23fbe26
```

Reproduced offline with a generic fixture (real production functions): resolver resolves the uploaded asset (fileExists=true at the correct path); the `input/`-prefixed path does not exist.

## 3. Original Wrong Path

```js
projectRelativePath: `input/${asset.relativePath}`,
// generation_reference -> input/generation-references/<id>.png  (WRONG)
```

## 4. Usage Reference Frames (canonical)

| usage | asset.relativePath | reference frame | Creative Task projectRelativePath |
|---|---|---|---|
| `analysis_source` | `assets/<id>.png` | relative to `<projectRoot>/input` | `input/assets/<id>.png` |
| `generation_reference` | `generation-references/<id>.png` | relative to `<projectRoot>` | `generation-references/<id>.png` |

## 5. Corrected Path Authority

`resolveExplicitReferencesOrThrow` now surfaces the asset `usage` (additive field). The packaging reference construction derives `projectRelativePath` per usage:

```js
const projectRelativePath = asset.usage === 'generation_reference'
  ? asset.relativePath
  : `input/${asset.relativePath}`;
```

One interpretation authority (the usage semantics documented in D3.7A §L) — no duplicated evolving `if usage` chain beyond this single derivation point.

## 6. Resolver Alignment

`resolveReferenceAsset` (`reference-asset-resolver.ts:216-221`) already derived the absolute path usage-aware. The corrected Creative Task path matches it exactly (BD-06):

```
path.resolve(projectRoot, creativeReference.projectRelativePath)
  === resolveReferenceAsset(...).absolutePath
```

## 7. Analysis Source Regression

`analysis_source` keeps the `input/` prefix → `input/assets/<id>.png`, file exists → PASS (BD-08). Old analysis-material references unaffected.

## 8. Generation Reference Legal Case

`generation_reference` → `generation-references/<id>.png` (no `input/`), file exists → PASS, no `REFERENCE_ASSET_NOT_FOUND` (BD-06/07).

## 9. Missing-Reference Negatives

Missing `generation_reference` and missing `analysis_source` files still fail existence (BD-09/10). The guard is untouched — fail-closed preserved.

## 10. BD Guards

`tests/runtime-application/creative-task-reference-path-binding.test.ts` (BD-01..BD-25): **25/25 PASS**.

## 11. UA / BC / BB Preservation

UA (14/14), BC (30/30), BB (25/25) — all retained PASS.

## 12. Full Regression

```
npm test                  1259/1259 PASS
npm run runtime-application:test   PASS (1598/1598 incl. BD)
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

## 13. Production Changed Files

- `packages/runtime-core/src/application/image-generation/short-chain-service.ts` (only)
- `tests/runtime-application/creative-task-reference-path-binding.test.ts` (new)

Not touched: Web upload, import-file-bytes, body cap, project-store persistence, persistBufferAsset, sha256 dedup, referenceAssetIds, PACKAGING_REFERENCE_ROLES, referenceAssignments, Seedream adapter, credential, prompt preflight, P3-A stale core, P2 Shot Contract, Golden.

## 14. Provider Calls

```
External Provider HTTP:   0
Image generation:         0
```

## 15. Golden

```
Golden auto-update:       NO
Golden changed:           NO
```

## 16. Historical Preservation

- D3.7A audit preserved (root cause + classification).
- P3-D3.5A LIVE VALIDATED, P3-D3.6B PASS, reference upload LIVE PASS — all preserved.
- P3-C frozen guards untouched by this corrective (short-chain-service.ts is not in the P3-C frozen allowlist scope that these guards pin; no allowlist change needed).

## 17. Real-Web Retest Required

The user must re-run `npm run web:dev` and repeat the Reference-First flow (upload reference → thumbnail → 生成). Expected: **no more "Creative Task 参考图不存在"**; if it reaches the Provider, the user's result determines Reference-First LIVE PASS or a new downstream blocker.

## 18. Final Decision

```
P3-D3.7B:                          PASS
REFERENCE-FIRST TASK BINDING:      OFFLINE CORRECTED
REFERENCE-FIRST UPLOAD:            LIVE VALIDATED
STANDARD:                          LIVE VALIDATED
P3-D3:                             HOLD — REFERENCE-FIRST REAL WEB RETEST REQUIRED
P3-D4:                             LOCKED
P3-E:                              LOCKED
```

**STOP. No automatic Provider call.**
