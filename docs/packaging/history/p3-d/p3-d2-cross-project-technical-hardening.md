# P3-D2 Cross-Project Technical Validation & Generic Hardening

Date: 2026-08-15

Branch: `codex/visual-analysis-a1-multi-provider`

Authorized start: `25dd8997c4adfce49460ea3241d3ad5ad70d2934`
Decision: **HOLD — FROZEN SURFACE CORRECTIVE REOPEN REQUIRED**

## A. Git

P3-D2 started from the authorized commit and produced two completed, independently scoped commits before the Renderer STOP was found:

- `c60785e` — `fix(packaging): reconcile effective reference capability`
- `0ba5d45` — `test(packaging): validate cross-project hardening matrix`

No P3-C corrective production change was made.

## B. D1 baseline

The D1 audit in `p3-d1-cross-project-hardening-audit.md` was consumed as the governing contract. P2 remains re-frozen, P3-A remains re-frozen, P3-B remains accepted, and P3-C remains accepted/frozen. D2 did not start D3.

## C. Real Provider policy

- Real Provider validation: **NOT AUTHORIZED**.
- External Provider calls: **0**.
- Sanctioned-local Provider calls: **0**; Renderer preparation failed before execution.
- Random retries: **0**.

## D. User project safety

- Original user projects modified: **NO**.
- Original corpus file count after the audit: **927**.
- All rebuild work used the ignored copy under `.codex-smoke/p3-d2/sandbox-data/projects`.
- No original project record, analysis output, asset, run or credential was written.

## E. Real-project readiness matrix

| Project | Copy | Official upstream rebuild | analysisLed | referenceFirst | Locked truth sufficient | Packaging-ready | Classification |
|---|---|---|---|---|---|---|---|
| 一剂良方 | YES | ATTEMPTED | produced but invalid: `structureStrategy` required | NOT AVAILABLE | NO | NO | BLOCKED |
| 九州美学 | YES | ATTEMPTED | ready and valid | NOT AVAILABLE | NO: category, structure and product identity missing | NO | BLOCKED |
| 冯烫烫 | YES | ATTEMPTED | ready and valid | NOT AVAILABLE | NO: category, structure and product identity missing | NO | BLOCKED; project status cancelled |

No Packaging translation or Locked truth was hand-injected into a real-project copy.

## F. Upstream rebuild

Rebuild used the official `createProjectStore`, `createProjectContextService.rebuildShortChain`, `createLockedAssetsService.compile` and canonical validator paths. The honest post-rebuild Packaging-ready count remains **0/3**.

## G. Synthetic technical matrix

The sanctioned-local application harness covers SYN-D1-01 through SYN-D1-05. It validates bottle, carton, gift/open, series/group and missing-truth pouch behavior, both generation modes where applicable, canonical run/artifact/preview persistence, and fail-closed behavior. Result: **AO 31/31 PASS**.

This evidence is synthetic technical evidence only. It is not real-project readiness evidence and is not real-image quality evidence.

## H. Shot matrix

| Shot | Canonical ratio | Technical lifecycle |
|---|---:|---|
| `PKG-HERO-SINGLE` | `4:5` | PASS in sanctioned-local application harness |
| `PKG-SERIES-GROUP` | `16:9` | PASS in sanctioned-local application harness |
| `PKG-GIFT-OPEN` | `4:3` | PASS in sanctioned-local application harness |

## I. Structure matrix

- container/bottle: PASS.
- carton: PASS.
- gift/open: PASS.
- series/group: PASS.
- pouch with missing required truth: FAIL-CLOSED.
- new structure semantics: DEFERRED/UNSUPPORTED; none were introduced.

## J. Reference count matrix

Counts `0`, `1`, `2`, `6`, `10` and `11` were covered. Analysis-led plus zero references is legal when otherwise valid. Reference-first plus zero references fails closed. Ten is accepted at preflight; eleven is rejected before executor/network invocation.

## K. D-PROVIDER-01

| Field | Result |
|---|---|
| Before | Registry omitted `maxReferenceImages`; capability preflight was effectively unbounded while the Seedream adapter rejected above 10 |
| Root cause | Missing declarative cap in the canonical Model Registry record |
| Authority owner | Model Registry for preflight; adapter for defensive transport validation |
| Effective maximum | 10 |
| Registry value | 10 |
| Adapter value | 10 |
| Limit case | 10 accepted |
| Limit + 1 | 11 rejected before execution |
| Invalid-case executor calls | 0 |
| Production changed files | `packages/model-registry/src/index.js` only |
| Targeted verification | 89/89 PASS |
| Decision | CLOSED |

## L. Locked Assets matrix

Complete, partial-but-valid, missing-required, analysis-conflict and reference-conflict cases are covered. Complete and permitted partial truth pass without invention; missing truth fails closed; Locked truth retains authority for conflicts.

## M. Visual Context richness

Minimal valid analysis, rich analysis, rich reference-first, optional arrays absent and optional arrays present are covered by AO. Raw upstream objects do not leak into canonical run records.

## N. Cross-project truth isolation

PASS in the sanctioned-local application harness: Project A truth and translation cannot satisfy Project B.

## O. Reference isolation

PASS: active Reference authority is project-bound; mismatched project/run/fingerprint authority fails closed.

## P. Run isolation

PASS: run discovery and reads are project-bound.

## Q. Artifact / preview isolation

PASS: artifact records and preview resolution cannot cross project boundaries.

## R. Project switching

PASS in the application harness: switching projects produces a project-bound session and does not retain the previous project's truth, active Reference or current result.

## S. Repeated execution

PASS: three sequential generated runs use unique `pkg-...` run IDs, preserve prior runs, keep artifacts unique and remain discoverable through the canonical store.

## T. Repeated STALE cycles

PASS: two edit → STALE → blocked execute → re-Prepare → Execute cycles remain deterministic and preserve prior runs.

## U. Two-session sanity

PASS: two sessions for the same project maintain independent prepared state, results, run IDs and stale state.

## V. Unicode / asset identity

PASS: long Unicode/Chinese names with spaces and punctuation remain presentation metadata; canonical identity is `assetId`, not filename.

## W. Unsupported cases

Unsupported Provider, invalid Shot/structure combinations, missing truth, new structure semantics and over-limit references are explicit and fail closed or remain deferred. There is no silent success.

## X. Renderer QA

Renderer QA used the actual Node Web Host and Web Renderer at desktop width 1440 with an isolated synthetic project and sanctioned-local profile.

Observed before STOP:

- Project opened successfully.
- Canonical Locked Assets rendered correctly.
- `analysis_led`, `PKG-HERO-SINGLE`, model ID and profile ID rendered correctly.
- Prepare failed safely before execution.
- Canonical backend error: `PACKAGING_TRANSLATION_INVALID: project_identity_brand_name_missing, project_identity_industry_missing, project_identity_brand_role_missing`.
- Local Provider calls remained 0.

Root cause: `apps/web-runtime/src/current-operation-graph.ts` constructs canonical `projectIdentity` with only `projectId` and `projectName`, while the frozen Packaging translation boundary requires `brandName`, `industry` and `brandRole`. The synthetic project had legitimate project metadata, canonical translations and complete Locked Assets; the production composition root did not project the required identity fields.

This is not a fixture defect and must not be hidden by supplying a caller-owned `truthSnapshot` or injecting a Packaging translation. The resolver was introduced in the P3-C canonical handoff and `truthSnapshot` integration is explicitly frozen by P3-C Final Freeze. D2 §34 therefore requires STOP before correction.

Reference-first Renderer execution, over-limit UI presentation, result gallery execution, and 390×844 mobile QA were **NOT RUN after STOP**.

## Y. Production hardening changes

One authorized generic hardening change was completed before STOP: the `seedream-5.0-pro` Model Registry capability now declares `maxReferenceImages: 10`. No project/brand/file-specific rule and no Provider expansion was added.

The Renderer-discovered identity projection defect was not repaired in D2.

## Z. Frozen surface impact

- P2 frozen production diff: 0.
- P3-A frozen production diff: 0.
- P3-B accepted semantic correction: 0.
- P3-C frozen `current-operation-graph.ts` diff: 0.

A correct repair requires an explicitly authorized P3-C frozen-surface corrective reopen, with the identity owner and projection contract settled before implementation.

## AA. STOP-P3-D

`STOP-P3-D-05` is treated as **TRIGGERED** because the required correction lies inside the frozen P3-C canonical handoff/truth projection. D2 did not change or bypass that authority.

`STOP-P3-D-01` through `04` and `06` through `12`: **NOT TRIGGERED in completed evidence**.

## AB. Guards

- AN: **16/16 PASS**.
- AO: **31/31 PASS**.
- Targeted Model Registry / provider capability / packaging metadata tests: **89/89 PASS**.

AO exposed a coverage gap: its injected canonical truth exercises the application boundary but does not prove the production Web Runtime composition root projects all identity fields. The corrective reopen must add composition-root coverage.

## AC. Full regression

The mandatory full regression set was **NOT RUN after the STOP**, as D2 §34 requires immediate HOLD rather than continuing toward acceptance. Completed targeted suites are listed in AB. No claim of full-regression acceptance is made.

## AD. Golden

- Golden auto-update: **NO**.
- Golden files changed: **NO**.

## AE. External Provider calls

**0**.

## AF. Production changed files

Exactly one non-frozen production file changed in D2:

- `packages/model-registry/src/index.js`

## AG. Frozen diffs

Frozen production semantics remain unchanged. The required P3-C correction is reported, not smuggled into D2.

## AH. Verification

Completed evidence:

- AO 31/31 PASS.
- AN 16/16 PASS.
- Provider targeted suites 89/89 PASS.
- Real project copy rebuild completed through official upstream paths.
- Original project corpus remained untouched.
- Actual Renderer reproduced the frozen handoff defect before any network execution.

## AI. Working tree

The report and completed D2 commits are intended to be committed and pushed. Ignored `.codex-smoke` evidence is not tracked.

## AJ. Final decision

**HOLD — FROZEN SURFACE CORRECTIVE REOPEN REQUIRED**

P3-D3 is not ready and was not started.

## AK. Recommended corrective reopen / later D3 scope

First authorize a narrow P3-C corrective reopen for canonical project identity projection in the Web Runtime composition root. The repair should:

1. Preserve `generationMode`, source selection, producer fingerprint and no-fallback authority.
2. Resolve `brandName`, `industry`, `brandRole` and product identity only from existing canonical project/upstream authorities.
3. Add production composition-root tests for both modes and missing identity.
4. Re-run desktop 1440 and mobile 390×844 Renderer QA, then the entire D2 regression set.

Only after that correction is re-frozen and D2 is re-accepted should a separately authorized D3 perform bounded real-Provider visual-quality validation.
