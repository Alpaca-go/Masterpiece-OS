# P3-C4.1 — Canonical Project Identity Projection Corrective Reopen & Re-Freeze

Date: 2026-08-15

Branch: `codex/visual-analysis-a1-multi-provider`

D2 HOLD consumed at: `2180f7aa3c53374c44c6911eaa31fa0a3fb40afa`

Corrective production baseline: `782e2fc08fca167e0320f9bcde33ed6eacaf1b2d`

## A. Git

The corrective work started from the recorded D2 HOLD head, on the same branch. The production correction and its direct regression coverage are isolated in:

`782e2fc08fca167e0320f9bcde33ed6eacaf1b2d fix(packaging): project canonical project identity into workspace truth`

This document is added by the subsequent re-freeze commit `docs(packaging): refreeze P3-C after project identity correction`; its exact object id is the commit containing this report and is reported in the final handoff.

## B. D2 HOLD consumed

P3-D2 Renderer QA found the following safe P2 validation failures:

- `project_identity_brand_name_missing`
- `project_identity_industry_missing`
- `project_identity_brand_role_missing`

The discovery correctly triggered `STOP-P3-D-05`. D2 was not continued past the frozen-surface defect, and this correction does not convert D2 to PASS.

## C. Corrective scope

The only production behavior changed is the projection of already-owned canonical project identity into the existing `truthSnapshot.projectIdentity` at the Web Runtime composition root.

There is no new identity store, identity version, precedence engine, fallback, inference, or project-specific rule. P2, P3-A, P3-B, the canonical selector, source selection, fingerprints, STALE handling, Locked Assets precedence, Shot Contract, run/artifact/preview flows, Provider selection, and Reference policy retain their existing semantics.

## D–J. Identity authority audit

| Field | Canonical owner | Exact production path read by the composition root | Required | Fallback allowed |
| --- | --- | --- | --- | --- |
| `projectId` | Project Store / `ProjectRecord` identity | `ProjectRecord.id` | Yes | Only the already-bound operation `projectId` when no record object is supplied to the narrow helper; never another project or derived content |
| `projectName` | Project Store / `ProjectRecord` | `ProjectRecord.projectName` | Yes | No |
| `brandName` | Project Store / `ProjectRecord` brand fact | `ProjectRecord.brandName` | Yes | No; specifically not `projectName`, filenames, assets, Reference, or Translation |
| `industry` | Project Store / `ProjectRecord` industry fact | `ProjectRecord.industry` | Yes | No; specifically not analysis guesses, Reference, filenames, or Translation |
| `brandRole` | Project Visual Context canonical prompt-source project facts | `ProjectVisualContextShortChain.promptSourceObject.projectFacts.brandRole` | Yes | No generic filler and no Reference/Translation inference |
| `productIdentity` | Locked Assets canonical packaging-artwork truth | `LockedAssetsService.resolve(...).assets.packaging_artwork.content.productIdentityName` | Yes | No; missing locked truth remains a failure |

`projectId`, `projectName`, `brandName`, and `industry` are ProjectRecord facts. `brandRole` is an evidence-backed upstream project-context fact; the real pipeline places it in `promptSourceObject.projectFacts`, so the composition root consumes that real schema instead of assuming an optional display-oriented `brandCore` projection. `productIdentity` remains the one field explicitly owned by existing Locked Assets packaging truth. Display metadata and derived analysis fields are not identity authorities.

## K. Before projection

Before this correction, `current-operation-graph.ts` populated only:

```text
truthSnapshot.projectIdentity = {
  projectId,
  projectName
}
```

The downstream P3-A/P2 contract was correct to reject the incomplete identity. The D2 fixture was valid because its ProjectRecord, Project Visual Context, and Locked Assets already contained the required canonical facts; the composition root simply failed to project them.

## L. After projection

The same existing truth surface now receives:

```text
truthSnapshot.projectIdentity = {
  projectId,
  projectName,
  brandName,
  industry,
  brandRole,
  productIdentity
}
```

The projection is implemented by the narrow `projectCanonicalIdentityFromAuthorities` seam in `apps/web-runtime/src/current-operation-graph.ts`, then passed unchanged through the existing truth snapshot to P3-A and P2.

## M. `analysis_led` composition evidence

The real `createRuntimeServices` → `createCurrentBusinessOperations` composition root was exercised with persisted ProjectRecord, Project Visual Context, Locked Assets, packaging intent, and P2 Prepare. AP-11 reached `READY` with the complete canonical identity.

Desktop Renderer QA at 1440 px also reached `READY` in `analysis_led` mode without references.

## N. `reference_first` composition evidence

The same production composition root and the same project identity were exercised with a bound active Reference. AP-12 reached `READY`; AP-07 proves the six identity fields are mode-invariant.

Desktop Renderer QA switched the actual workspace intent to `reference_first`, observed the existing `STALE / intent_changed` state, prepared again, and reached `READY` with one required Reference. The Reference dialog listed the available generation references and roles.

## O. Missing identity failure

AP-13 removes each required canonical field (`brandName`, `industry`, and `brandRole`) and proves P2 remains fail-closed without filler. Renderer QA with canonical `brandName` removed produced the user-safe `操作未完成` surface; the host retained the precise diagnostic:

`PACKAGING_WORKSPACE_PREPARE_FAILED: PACKAGING_TRANSLATION_INVALID: project_identity_brand_name_missing`

No missing truth was inferred or fabricated.

## P. Project binding

AP-14 binds an active Reference from another project and proves the canonical selector fails closed. Identity never crosses the project boundary.

## Q. No Reference-derived identity

AP-08 statically guards the composition root against reading active Reference, `ReferenceStyleCapsule`, `anchorGoal`, or reference images as identity owners. Reference mode changes source selection, not project identity.

## R. No Translation-derived identity

AP-09 guards against deriving `brandName`, `industry`, `brandRole`, or `productIdentity` from `PackagingTranslationV2`. Translation remains a creative packaging semantics surface, not project identity authority.

## S. Selector authority

`canonical-packaging-context-selector.ts` is unchanged. AP-16 confirms generation mode remains the sole mode authority, active-Reference validation remains exact, project/run/fingerprint checks remain fail-closed, and no fallback/latest-run/reasoning path was introduced.

## T. STALE authority

No STALE tracker or manual STALE mutation was added. AP-15 confirms existing P3-A STALE authority is unchanged. Renderer revalidation observed the existing `intent_changed` transition naturally when switching modes.

## U. Locked Assets authority

Locked Assets precedence and service semantics are unchanged. The composition root only continues to read the existing canonical `packaging_artwork.content.productIdentityName`; Locked Assets did not become a general identity resolver.

## V. Shot Contract authority

Shot Contract selection, geometry, identity, and validation are unchanged. No P2 production file changed.

## W. D-PROVIDER-01 retention

AP-20 and the targeted Provider suites prove the registered Seedream capability and adapter still share `maxReferenceImages = 10`. The generic D-PROVIDER-01 hardening was retained and not rolled back. Targeted result: 89/89 PASS.

## X. Renderer desktop

At 1440 px:

- `analysis_led` Prepare: `READY`
- `reference_first` Prepare: `READY`
- Reference dialog: available generation assets and six roles visible
- Readiness and empty result surfaces: safe and coherent
- Missing identity: safe application failure

## Y. Renderer mobile

At 390×844, the packaging workspace, `READY` tiles, Reference-first dialog, readiness, and result surfaces remained usable. The inspected document width had no horizontal overflow. No Provider execution was requested.

## Z. Architecture guards

- Existing AH–AM P3-C guard families: PASS
- AP corrective group: PASS
- AP-01–07: exact canonical projection and mode invariance
- AP-08–10: no Reference, Translation, filename, or project-name heuristic
- AP-11–12: real composition-root Prepare reaches `READY` in both modes
- AP-13–14: missing identity and project mismatch fail closed
- AP-15–16: STALE and selector authorities unchanged
- AP-17–19: P2, P3-A, and P3-B frozen/accepted surfaces unchanged
- AP-20: D-PROVIDER-01 cap retained

## AA. Full regression

All required offline gates passed:

- `npm test`: 1234/1234
- `npm run runtime-application:test`: 1322/1322
- `npm run runtime:test`: Shared Runtime 14/14 plus Runtime Application 1322/1322
- `npm run test:image-generation`: 982/982
- `npm run cli:test`: 40/40
- `npm run web:typecheck`: PASS
- `npm run web:build`: PASS
- `npm run web-runtime:typecheck`: PASS
- `npm run web-runtime:test`: 10/10
- `npm run web:smoke`: PASS, Node host operation count 155, Provider calls 0
- `npm run repo:verify`: PASS
- `npm run repo:check`: PASS
- `npm run verify:current-flows`: PASS (also run inside both repository gates)
- `npm run verify:space-compiler-baseline`: PASS
- `npm run verify:space-r8.6-golden-boundary`: PASS
- `npm run golden:test`: PASS
- Reference workflow and Visual Analysis coverage in the repository/runtime suites: PASS
- Model Registry, packaging Provider capability, packaging metadata, and D-PROVIDER-01 targeted suites: 89/89 PASS

One initial `repo:check` invocation was terminated only by the command runner's 60-second limit. It emitted no assertion failure; the complete rerun with an adequate limit finished PASS in 142.7 seconds.

## AB. Provider calls

External Provider calls: **0**.

## AC. Golden

Golden auto-update: **NO**. Golden and evaluation production boundaries passed with no drift.

## AD. Frozen diffs

| Surface | Semantic production diff |
| --- | --- |
| P2 frozen baseline `a593278b55e437fac59d768c5cee734d9a9fc201` | 0 |
| P3-A frozen baseline `f95c145b9b1e37430ac68315c9e039f1f3262ae4` | 0 |
| P3-B accepted UI/RPC/workspace semantics | 0 |
| P3-C selector/source/fingerprint/STALE semantics | 0 |
| P3-C composition root | canonical identity projection only |

## AE. Changed production files

Exactly one production file changed:

- `apps/web-runtime/src/current-operation-graph.ts`

All other files in the production commit are direct regression guards/tests.

## AF. Old P3-C baselines

- Original P3-C production integration: `456ec3a9d0273b599ed15bcd424fde1f36b8ce1b`
- Original P3-C final freeze: `3da7a14424074b85d5fd3a735d006749cd5f03a9`

Both retain their historical meaning and were not rewritten.

## AG. New corrective production baseline

`782e2fc08fca167e0320f9bcde33ed6eacaf1b2d`

## AH. New P3-C re-freeze

The new re-freeze is the commit containing this report:

`docs(packaging): refreeze P3-C after project identity correction`

Its exact commit id is recorded in the final handoff because a commit cannot embed its own content-derived object id.

## AI. Working tree

Required final state: `git status --porcelain` empty and local HEAD equal to the same origin branch. This is verified after the re-freeze commit and push.

## AJ. Final decision

P3-C STATUS: **RE-FROZEN**

P3-D STATUS: **HOLD — D2.1 REVALIDATION REQUIRED**

This correction does not declare P3-D2 PASS and does not unlock P3-D3.

## AK. Next step

The next authorized stage is P3-D2.1 — Cross-Project Technical Revalidation. It is report-only from this handoff and was **not started**.
