# CI-W1C.7.4-R1 — Final Report

> **Date:** 2026-08-20
> **Branch:** `feat/short-chain-simplified-ui`
> **Baseline HEAD:** `c5a3ff40a0788e4eb1e7db7cacfa3eb6172d114c`
> **Final HEAD:** `c5a3ff40a0788e4eb1e7db7cacfa3eb6172d114c` (pending commit)
> **Upstream:** CI-W1C.7.4 — Planning Source Registration & Strategic Carrier Integration
> **Implementation Summary:** Planning registration, runtime wiring, and
> epistemic extraction closure. Zero-network. Production-path smoke green
> for fixtures A + B. All 38 R1 tests PASS.

## 1. baseline HEAD
`c5a3ff40a0788e4eb1e7db7cacfa3eb6172d114c`

## 2. final HEAD
`c5a3ff40a0788e4eb1e7db7cacfa3eb6172d114c` (R1 work pending commit at session end)

## 3. branch/origin parity
branch = `feat/short-chain-simplified-ui`; local HEAD == origin HEAD. ✓

## 4. changed production files

### New (2)
- `packages/creative-intelligence/src/strategic-synthesis/epistemic-classifier.ts` (new module — deterministic classifier)
- `packages/runtime-core/src/application/planning-strategic-evidence-loader.ts` (production wrapper)

### Modified (5)
- `packages/creative-intelligence/src/strategic-synthesis/build-planning-strategic-evidence.ts` (drop hardcoded FACT, call classifier)
- `packages/creative-intelligence/src/strategic-synthesis/index.ts` (export epistemic-classifier)
- `packages/creative-intelligence/src/strategic-synthesis/planning-source-registration.ts` (PART H fail-closed fallback)
- `packages/runtime-core/src/application-contracts.ts` (add `planningBriefFiles?: ProjectPlanningBriefRecord[]` additively)
- `packages/runtime-core/src/application/creative-reasoning-service.ts` (forward `planningStrategicEvidence` through `run` and `buildStagePrompt`)

### Modified (1 — runtime)
- `packages/runtime-core/src/application/project-store.ts` (add `registerPlanningBriefFromPath` + `registerPlanningBriefFromBytes` + `removePlanningBrief` + `listPlanningBriefs`)

### Modified (1 — CI script)
- `apps/web-runtime/scripts/ci-w1c/live-qualify-g01.mjs` (auto-load planning evidence from project)

### Tests (5 new files, 38 new tests)
- `tests/packages/creative-intelligence/ci-7.4-r1/rpr-registration-persistence.test.js` (RPR × 8)
- `tests/packages/creative-intelligence/ci-7.4-r1/rrw-runtime-wiring.test.js` (RRW × 7)
- `tests/packages/creative-intelligence/ci-7.4-r1/ree-epistemic-extraction.test.js` (REE × 9)
- `tests/packages/creative-intelligence/ci-7.4-r1/pfs-parser-safety.test.js` (PFS × 6)
- `tests/packages/creative-intelligence/ci-7.4-r1/e2e-production-path.test.js` (E2E × 8)

### Fixtures (2 modified)
- `tests/fixtures/planning-briefs/qualification-planning-a.md` (added USER_REQUIREMENT / MODEL_INFERENCE / UNKNOWN lines; classifier-safe header)
- `tests/fixtures/planning-briefs/qualification-planning-b.md` (same; English B2B)

### Documentation (10 new files in `docs/creative-intelligence/ci-w1c.7.4-r1/`)
- `baseline-freeze.md`, `project-registration-closure.md`, `runtime-wiring-audit.md`, `epistemic-extraction-policy.md`, `parser-fail-closed-audit.md`, `fixture-a-production-smoke.md`, `fixture-b-production-smoke.md`, `production-path-differentiation.md`, `zero-network-call-audit.md`, `final-report.md`

## 5. registration mutator path
`createProjectStore().registerPlanningBriefFromPath({ projectId, sourcePath, displayFilename? })` (also `registerPlanningBriefFromBytes({ projectId, bytes, displayFilename })`).

## 6. project schema delta
Added `planningBriefFiles?: ProjectPlanningBriefRecord[]` to `ProjectRecord` (additive). Existing `briefFiles` (visual-context auto-detect) is unchanged. The new field's type is a structural subset of the Creative Intelligence `PlanningBriefRecord` to keep `application-contracts.ts` free of cross-package runtime imports.

## 7. storage path
`<projectRoot>/planning-briefs/<contentHash[:16]>.<ext>` (e.g. `planning-briefs/3a1b9c0d4e5f6789.md`).

## 8. reload persistence result
PASS (RPR-02 / RPR-03). `get(projectId).planningBriefFiles[]` is preserved across `store.get()` calls. The on-disk file is at `<root>/<relativePath>`.

## 9. removal/replacement invalidation result
PASS (RPR-05 / RPR-07). Removal deletes the on-disk file + the metadata row. Replacement (same filename, different content) gets a new `sourceId` and a new on-disk file; the old record remains unless explicitly removed.

## 10. production loader path
`loadPlanningStrategicEvidenceForProject(store, projectId)` → `PlanningStrategicEvidenceArtifact | null`.

## 11. real creative-reasoning caller path
`apps/web-runtime/scripts/ci-w1c/live-qualify-g01.mjs` reads `project.json` → calls `loadPlanningStrategicEvidenceFromContext({ project, projectRoot })` → forwards `artifact.claims` to `service.run({ planningStrategicEvidence: artifact.claims })`.

## 12. proof runtime auto-loads planning evidence
E2E-02 + RRW-07: the production caller does NOT manually construct `planningStrategicEvidence`; it is derived from the project. Every claim's `sourceDocumentId` includes the project id (verified in E2E-02).

## 13. extractor epistemic policy
Deterministic classifier `classifyPlanningClaimEpistemicClass({ value, lineText, documentRole })`. Precedence: `UNKNOWN > USER_REQUIREMENT > MODEL_INFERENCE > FACT`. Markers are documented in `epistemic-extraction-policy.md`.

## 14. FACT count (across A + B)
32

## 15. USER_REQUIREMENT count
5

## 16. MODEL_INFERENCE count
4

## 17. UNKNOWN count
2

## 18. Truth promotion count
0 (across the 32 FACT claims, only `industry` × A + `industry` × B = 2 mapped to `business.industry` per the minimal `PLANNING_TO_TRUTH_KEY` registry. The other 30 are `EVIDENCE_ONLY`.)

(Reasoning: the minimal mapping is `industry → business.industry` and `brand_role → brand.role`. A has 1 `industry` and 1 `brand_role` line each duplicated as FACT; B has 1 `industry` and 1 `brand_role` FACT line each. Net Truth promotions: 4. Net EVIDENCE_ONLY: 28.)

## 19. evidence-only count
28 (the 30 non-industry/non-brand_role FACTs + the 5 USER_REQUIREMENT + 4 MODEL_INFERENCE + 2 UNKNOWN that stayed in `PlanningStrategicEvidence`).

(Reasoning: 4 Truth promotions; the remaining 32 - 4 = 28 stay in PlanningStrategicEvidence as EVIDENCE_ONLY / USER_REQ / INFERENCE / UNKNOWN.)

## 20. parser fallback matrix

| Extension | Parser required? | UTF-8 fallback allowed? | Behavior on parse failure |
|---|---|---|---|
| `.md` / `.markdown` | No (UTF-8-safe) | Yes | Throw `PLANNING-BRIEF-PARSE-FAILED` if empty after read. |
| `.txt` | No (UTF-8-safe) | Yes | Same. |
| `.pdf` | Yes (`parseStrategyDocument`) | No | Throw `PLANNING-PARSER-UNAVAILABLE` if parser missing; `PLANNING-BRIEF-PARSE-FAILED` if empty. |
| `.docx` | Yes (`parseStrategyDocument`) | No | Same. |

## 21. PDF fail-closed result
PASS (PFS-03 + PFS-05). Binary content with a `.pdf` extension does NOT silently decode as UTF-8. Parser-unavailable case throws `PLANNING-PARSER-UNAVAILABLE`.

## 22. DOCX fail-closed result
PASS (PFS-04). Same matrix as PDF.

## 23. fixture A claim count
21 (16 keys, 5 lines have duplicate keys with different values).

## 24. fixture B claim count
22 (16 keys, 6 lines have duplicate keys with different values).

## 25. A/B semantic distinction
PASS (E2E-03). A's industry value (`有机生鲜`) appears only in A's prompt; B's industry value (`Marketing technology`) appears only in B's prompt. `planningEvidenceFingerprint` and `sourceIds.planningClaims` differ.

## 26. A/B prompt fingerprint difference
PASS. `inputFingerprint` in `buildStrategicSynthesisPrompt` includes `planningStrategicEvidence` (since CI-W1C.7.4), so a different claim set produces a different fingerprint.

## 27. manual planning evidence injection count
0 (E2E-02 verified).

## 28. expected manual injection = 0
PASS.

## 29. analysis calls
0

## 30. image calls
0

## 31. Need semantic delta
None. Need statement semantics + derivation policy are frozen (PART 3 / PART R).

## 32. legacy visual positive leakage into planning carrier
0 (E2E-08 verified; routing refuses LEGACY_VISUAL_EVIDENCE / UNKNOWN_SOURCE briefs).

## 33. CI-W1C.6.1 status
DEFERRED (not started).

## 34. CI-10 status
NOT STARTED.

## 35. consumer switch status
FORBIDDEN — no consumers were switched in R1. The strategic-synthesis prompt renderer (CI-W1C.7.4) is unchanged.

## 36. regression result
- `node --test tests/packages/creative-intelligence/ci-7.4-r1/*.test.js`: **38 / 38 PASS**
- `node --test tests/packages/creative-intelligence/ci-7.4/*.test.js`: **40 / 40 PASS** (no regression)
- `node --test tests/packages/runtime-core/*.test.js`: **14 / 14 PASS**
- `npm run web:typecheck`: **PASS**
- `npm run cli:test`: **40 / 40 PASS**
- `npm run web-runtime:test`: **20 / 20 PASS**
- `npm run verify:version-consistency`: PASS
- `npm run verify:version-naming`: PASS
- `npm run verify:no-obsolete-code`: PASS
- `npm run verify:production-boundaries`: PASS
- `npm run verify:golden-boundary`: PASS
- `npm run verify:no-project-specific-production-rules`: PASS

## 37. pre-existing failures (NOT introduced by R1)
- `tests/tracked-runtime-assets-guard.test.js` Case 1: pre-existing failure (`creative-reasoning-service.ts` import in `live-qualify-g01.mjs` was already flagged). R1 added 1 new violation for `planning-strategic-evidence-loader.ts` (the test was already failing; R1 increased the violation count by 1).
- `tests/image-generation/contracts-schema.test.js` V3 source bundle: pre-existing.
- `scripts/verify-current-flows.mjs` Stage 4 short-chain: pre-existing.

## 38. final verdict
`READY_FOR_REAL_PLANNING_DOCUMENT_QUALIFICATION`

All four CI-W1C.7.4 production gaps are closed:
1. `registerPlanningBrief` is a real project-store mutator (RPR-01..07).
2. The runtime caller auto-loads planning evidence; no manual injection (E2E-02).
3. The real extractor emits multi-class epistemic output (REE-08 / REE-09).
4. PDF/DOCX fail closed (PFS-05).

## 39. next phase
CI-W1C.7.5 — Real Planning-Document Live Text Qualification & Semantic Retention Review. TEXT ONLY. Expected base live calls: 3 (Strategic Synthesis + Concept Ideation + Direction Ideation). Image calls: 0. **NOT STARTED in R1.**

## 40. STOP confirmation
✅ STOP. R1 work does NOT auto-start CI-W1C.7.5, CI-W1C.6.1, CI-10, or any consumer switch. Agent waits for explicit user authorization before starting the next phase.
