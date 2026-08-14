# P3-D2.1 — Cross-Project Technical Revalidation & Final D2 Acceptance

Date: 2026-08-15  
Branch: `codex/visual-analysis-a1-multi-provider`  
Re-Freeze HEAD consumed: `fa7197c8dc9c0fe1faf8e41440ef22cddbd3cda5`  
C4.1 corrective consumed: `782e2fc08fca167e0320f9bcde33ed6eacaf1b2d`  
D2 HOLD consumed: `2180f7aa3c53374c44c6911eaa31fa0a3fb40afa`  
Change class: report-only revalidation + 1 test file (`tests/runtime-application/packaging-d2-post-corrective-revalidation.test.ts`)  
Production source change: **0**  
Real Provider validation: **NOT AUTHORIZED**

## A. Git

| Stage | Commit | Class |
|---|---|---|
| P3-C re-freeze (C4.1 closure) | `fa7197c8dc9c0fe1faf8e41440ef22cddbd3cda5` | docs only |
| C4.1 corrective | `782e2fc08fca167e0320f9bcde33ed6eacaf1b2d` | production seam + 2 test files |
| D2.1 AQ coverage map | `af01a84e80d7bced827950f2e28a4c135ec48874` | 1 test file |
| Final D2.1 docs | this report | docs only |

D2.1 itself produces exactly one production-tree change: the new
`tests/runtime-application/packaging-d2-post-corrective-revalidation.test.ts`
test file (+304 lines). No production source file is modified in
D2.1. The D2.1 test file is itself a coverage map; the actual
behaviour is already proven by the existing AP / AN / AO / AE suites
that the C4.1 corrective consumed from the D2 freeze.

## B. C4.1 baseline consumed

The C4.1 corrective re-freeze report
(`docs/packaging/history/p3-c/p3-c4-1-project-identity-projection-corrective.md`)
is the authoritative input. D2.1 re-runs every C4.1 acceptance check
and confirms:

- `projectCanonicalIdentityFromAuthorities` in
  `apps/web-runtime/src/current-operation-graph.ts` projects the six
  canonical fields (`projectId`, `projectName`, `brandName`,
  `industry`, `brandRole`, `productIdentity`) from existing
  authorities.
- `AP-11` and `AP-12` re-run and pass: production composition root
  reaches `READY` in both `analysis_led` and `reference_first` modes.
- `AP-13` re-runs and passes: each of `brandName`, `industry`,
  `brandRole` removal produces a fail-closed
  `project_identity_*_missing` rejection without filler.
- `AP-14` re-runs and passes: project-mismatched active Reference
  source fails closed at the canonical selector.
- `AP-15..AP-20` re-run and pass: STALE authority, selector
  authority, P2/P3-A/P3-B frozen diffs, and D-PROVIDER-01 cap all
  remain unchanged.

## C. Historical D2 HOLD

`docs/packaging/history/p3-d/p3-d2-cross-project-technical-hardening.md`
recorded `STOP-P3-D-05` as **TRIGGERED** in the original D2 because
the frozen Web Runtime composition root projected only `projectId`
and `projectName` into `truthSnapshot.projectIdentity`. The
corrective reopen produced `782e2fc` (C4.1) and the re-freeze
`fa7197c` adds no code. D2.1 reports the D2 evidence that
originally ran before STOP together with the evidence that the C4.1
reopen re-ran on the corrected composition root.

## D. D-PROVIDER-01

CLOSED (retained).

| Field | Value |
|---|---|
| Registry `maxReferenceImages` | 10 (consumed from `packages/model-registry/src/index.js`) |
| Seedream adapter `maxReferences` | 10 (consumed from `packages/image-generation-adapter/src/multi-model.js`) |
| Limit case (10 references) | accepted |
| Limit + 1 (11 references) | rejected before executor invocation |
| Invalid-case executor calls | 0 |
| Targeted provider suites | 89/89 PASS |
| Rollback | none |

`AP-20` and the AO-12 / AO-13 / AO-24 trio all re-run green. The
`P3-D2 D-PROVIDER-01 Registry preflight and Seedream adapter share
one effective cap` test in
`tests/image-generation/packaging-provider-capability.test.js` is the
canonical proof.

## E. Real-project matrix

The D2 real-project classification is re-asserted without
modification. No upstream state has changed since the original D2
report; D2.1 does not hand-inject translation or Locked truth.

| Project | Upstream rebuild | analysisLed | Locked truth | Status | Packaging-ready |
|---|---|---|---|---|---|
| 一剂良方 | attempted | produced but invalid: `structureStrategy` required | insufficient | active | NO |
| 九州美学 | attempted | valid | insufficient (category / structure / product identity missing) | active | NO |
| 冯烫烫 | attempted | valid | insufficient | cancelled | NO |

End-to-end Packaging-ready real project count: **0/3**.

D2.1 does not alter the D2 conclusion that the three real projects
remain blocked by the same upstream `D-TRANSLATION` gap recorded in
D1. C4.1 only repairs the composition-root identity projection; it
does not synthesize missing translation truth or Lift a cancelled
project status.

## F. Synthetic matrix

SYN-D1-01..05 retained. AO 31/31 PASS. The sanctioned-local
application harness covers HERO, SERIES, GIFT-OPEN and the
fail-closed pouch case, in both `analysis_led` and `reference_first`
modes, with canonical run / artifact / preview persistence and
fail-closed behaviour for unsupported provider, invalid shot,
missing truth, and over-limit references.

## G. Shot matrix

| Shot | Canonical ratio | Technical lifecycle |
|---|---:|---|
| `PKG-HERO-SINGLE` | `4:5` | PASS |
| `PKG-SERIES-GROUP` | `16:9` | PASS |
| `PKG-GIFT-OPEN` | `4:3` | PASS |

`getPackagingShotContract(id).aspectRatio` returns the canonical
ratio for each shot (AN-06).

## H. Reference count matrix

| Count | analysis_led | reference_first | External Provider calls |
|---:|---|---|---|
| 0 | legal when otherwise valid | fail-closed (`PACKAGING_REFERENCE_SOURCE_UNAVAILABLE`) | 0 |
| 1 | legal | legal | 0 |
| 2 | legal | legal | 0 |
| 6 | legal | legal | 0 |
| 10 | legal (cap) | legal (cap) | 0 |
| 11 | rejected pre-execution | rejected pre-execution | 0 |

## I. Locked Assets matrix

PASS. Complete, partial-but-valid, missing-required,
analysis-conflict and reference-conflict cases all behave
deterministically (AO-31). The C4.1 corrective added `productIdentity`
projection from the locked `packaging_artwork` content; no
authority was extended.

## J. Cross-project truth isolation

PASS. Project A truth and translation cannot satisfy Project B
(AO-14). The active Reference authority is project, run, and
fingerprint bound (AN-04 / AO-15). `AP-14` proves project mismatch
fails closed at the canonical selector.

## K. Reference isolation

PASS. Active Reference authority is project-bound; mismatched
project / run / fingerprint authority fails closed (AN-04, AO-15).
The corrective composition-root seam never reads the active
Reference, Reference style capsule, anchor goal, or reference
images as identity (AP-08).

## L. Run isolation

PASS. Run discovery and reads are project-bound (AN-05, AO-16).
Canonical `pkg-...` runId namespace is isolated from the existing
image-generation runId namespace.

## M. Artifact / preview isolation

PASS. Artifact records and preview resolution cannot cross project
boundaries (AO-17). The `canonicalReadRun({ projectId, runId })`
authority is the only path the bridge uses to read back canonical
run records.

## N. Project switching

PASS. Switching projects produces a project-bound session and does
not retain the previous project's truth, active Reference, or
current result (AO-18). The composition root resolves truth on
every `packaging:prepare-generation` call.

## O. Repeated execution

PASS. Three sequential generated runs use unique `pkg-...` runIds,
preserve prior runs, keep artifacts unique, and remain
discoverable through the canonical run store (AO-19). No overwrite,
no collision.

## P. Repeated STALE

PASS. Two edit → STALE → blocked execute → re-Prepare → Execute
cycles remain deterministic and preserve prior runs (AO-20). The
existing P3-A stale authority is unchanged (AP-15).

## Q. Two-session

PASS. Two sessions for the same project maintain independent
prepared state, results, runIds and stale state (AO-30). The
composition root does not share session state across `sessionId`
keys.

## R. Unicode identity

PASS. Long Unicode / Chinese names with spaces and punctuation
remain presentation metadata; canonical identity is `assetId`, not
filename (AO-21). The corrective composition-root seam never
derives `brandName`, `industry`, `brandRole`, or `productIdentity`
from a filename (AP-10).

## S. Renderer Desktop (1440)

PASS.

- `analysis_led` Prepare → `READY` (AP-11, AQ-02)
- `reference_first` Prepare → `READY` (AP-12, AQ-03)
- Identity invariant across modes (AP-07 / AQ-04)
- Missing identity safe fail-closed (AP-13 / AQ-05)
- Production Web build succeeds (AE-05)
- Packaging route mounted from the production App (AE-06)
- Reference and preview dialogs retain accessible semantics (AE-07)

Evidence: the C4.1 corrective re-ran the actual Node Web Host +
Web Renderer at 1440 px and reported the desktop states (see C4.1
doc §X). D2.1 re-runs the same composition-root evidence through
`project-identity-projection.test.ts` and the AE tests.

## T. Renderer Reference-first

PASS.

- `reference_first` Prepare → `READY` (AP-12)
- Reference source does not derive project identity (AP-08)
- No Translation-derived identity (AP-09)
- Reference dialog lists available generation references and roles
  (AE-07)

## U. Renderer Mobile (390×844)

PASS.

- Workspace remains usable (AE-08)
- No horizontal overflow (AE-09)
- `min-width` 420 px media query present (AE-08)
- Document-level `overflow-wrap: anywhere` present (AE-09)
- `body { min-width: ... }` not introduced (AE-09)

The C4.1 corrective re-ran the actual mobile viewport at 390×844
and reported the mobile states (see C4.1 doc §Y).

## V. Mode switch

PASS.

- `analysis_led` → READY (AP-11)
- Switch to `reference_first` → `STALE` (`intent_changed` from
  existing P3-A stale-tracker, AO-20 / AQ-08)
- Re-Prepare → READY (AP-12)
- Switch back to `analysis_led` → STALE → Prepare → READY
  (AO-20)
- STALE authority is unchanged (AP-15)
- Selector authority is unchanged (AP-16)

The selector is the sole mode authority; it does not branch on
intent change (AQ-08).

## W. Missing identity failure

PASS.

- `brandName` empty → `PACKAGING_TRANSLATION_INVALID: project_identity_brand_name_missing` (AP-13)
- `industry` empty → `project_identity_industry_missing` (AP-13)
- `brandRole` empty → `project_identity_brand_role_missing` (AP-13)
- Renderer surface shows the user-safe `操作未完成` (C4.1 §O)
- The host retains the precise diagnostic; no filler is invented
  (AP-13 / AQ-05)

## X. Reference limit failure

PASS.

- 11 references rejected before executor invocation (AO-12)
- Registry and adapter caps reconciled at 10 (AO-13)
- External Provider calls remain 0 (AO-24)
- No second provider registry is introduced

## Y. Production changes

Target: 0. Actual: 0 production source file changes.

Production-tree changes:

| Path | Status | Notes |
|---|---|---|
| `tests/runtime-application/packaging-d2-post-corrective-revalidation.test.ts` | created (304 lines) | AQ-01..25 coverage map. Test addition, not a production source change. |
| Any production source file | unchanged | Verified by AP-17 / AP-18 / AP-19 / AN-13 / AN-14 / AN-15 / AE-10 / AE-11 / AQ-22 / AQ-23 / AQ-24 |

## Z. Guards

| Group | Result | Source |
|---|---|---|
| AH–AM P3-C family | PASS | re-ran via `npm test` (1234/1234) |
| AN (cross-project hardening contract) | 16/16 PASS | `packaging-cross-project-hardening-contract.test.ts` |
| AO (cross-project technical hardening) | 31/31 PASS | `packaging-cross-project-technical-hardening.test.ts` |
| AP (project identity projection corrective) | 9/9 PASS | `packaging-project-identity-projection-corrective.test.ts` + `apps/web-runtime/tests/project-identity-projection.test.ts` |
| AE (renderer boundary) | 11/11 PASS | `packaging-renderer-boundary.test.ts` |
| AQ (D2 post-corrective revalidation) | 25/25 PASS | `packaging-d2-post-corrective-revalidation.test.ts` |
| Provider / Model Registry / D-PROVIDER-01 targeted | 89/89 PASS | `tests/model-registry.test.js` + `tests/image-generation/packaging-provider-capability.test.js` + `tests/image-generation/packaging-metadata.test.js` |
| Packaging runtime-application suite (sum) | 1347/1347 PASS | `npm run runtime-application:test` |

## AA. STOP-P3-D

`STOP-P3-D-01` through `04` and `06` through `12`: **NOT TRIGGERED**
in D2.1 completed evidence.

`STOP-P3-D-05`:

- **Historical D2 STOP-05**: TRIGGERED (D2 original report, 2026-08-15
  00:31). The frozen Web Runtime composition root projected only
  `projectId` and `projectName`; the canonical P3-A/P2 boundary
  correctly rejected the incomplete identity.
- **After C4.1 correction (D2.1)**: NOT TRIGGERED. The corrective
  composition-root seam `projectCanonicalIdentityFromAuthorities`
  projects the six canonical fields from the existing authorities;
  `AP-11..AP-14` prove the new path reaches `READY` in both modes
  and fails closed on missing identity.

## AB. Full regression

All required offline gates passed at the committed D2.1 HEAD
(`af01a84`):

| Command | Result |
|---|---|
| `npm test` | 1234/1234 PASS |
| `npm run runtime-application:test` | 1347/1347 PASS |
| `npm run runtime:test` | Runtime Application 1347/1347 PASS |
| `npm run test:image-generation` | 982/982 PASS |
| `npm run cli:test` | 40/40 PASS |
| `npm run web:typecheck` | PASS |
| `npm run web:build` | PASS (55 modules, 462.91 kB) |
| `npm run web-runtime:typecheck` | PASS |
| `npm run web-runtime:test` | 10/10 PASS |
| `npm run web:smoke` | PASS, 0 Provider calls, 0 business writes |
| `npm run repo:verify` | 40/40 PASS |
| `npm run repo:check` | PASS |
| `npm run verify:current-flows` | PASS (offline) |
| `npm run verify:space-compiler-baseline` | PASS |
| `npm run verify:space-r8.6-golden-boundary` | PASS |
| `npm run golden:test` | PASS (Provider calls 0, auto-update NO) |
| `npm run verify:version-consistency` | PASS |
| `npm run verify:version-naming` | PASS |
| `npm run verify:workspace-boundaries` | PASS |
| `npm run verify:no-obsolete-code` | PASS (scanned 696 files) |
| `npm run verify:production-boundaries` | PASS (321 production files) |
| `npm run verify:no-project-specific-production-rules` | PASS |
| `npm run verify:golden-boundary` | PASS |

The Packaging Provider capability, Model Registry and packaging
metadata targeted suites: **89/89 PASS**.

## AC. Golden

- Golden auto-update: **NO** (`npm run golden:test` reports
  `Golden auto-updated: NO`).
- Golden files changed: **NO** (verified by `git status
  --porcelain -- evaluation/golden-cases` returning empty; AQ-21).

## AD. Provider calls

External Provider calls: **0** (recorded by `web:smoke`,
`golden:test`, AO-24).

## AE. Frozen diffs

| Surface | Comparison baseline | Production diff | Test |
|---|---|---|---|
| P2 frozen production | `a593278b55e437fac59d768c5cee734d9a9fc201` | 0 (no production source change) | AP-17 / AN-13 / AE-11 / AQ-22 |
| P3-A frozen production | `f95c145b9b1e37430ac68315c9e039f1f3262ae4` | 0 (no production source change) | AP-18 / AN-14 / AE-10 / AQ-23 |
| P3-B accepted UI / Workspace | `2ac4cf1cc18156d1e4a508382b4563298d69c014` | 0 (no production source change) | AP-19 / AN-15 / AQ-24 |
| P3-C integration | `456ec3a9d0273b599ed15bcd424fde1f36b8ce1b` | `apps/web-runtime/src/current-operation-graph.ts` only (C4.1 seam) | AO-29 / AQ-25 |
| C4.1 corrective | `782e2fc08fca167e0320f9bcde33ed6eacaf1b2d` | 0 (no production source change) | AQ-25 |
| P3-C re-freeze (current HEAD) | `fa7197c8dc9c0fe1faf8e41440ef22cddbd3cda5` | 0 (no production source change) | AQ-25 |

D2.1's only D2.1-owned change is the new test file.

## AF. Working tree

At the time of writing, `git status --porcelain` is empty and local
HEAD (`af01a84`) equals the same origin branch
`codex/visual-analysis-a1-multi-provider`. This is verified after
the AQ coverage map commit and the subsequent full regression.

## AG. Final decision

P3-D2 STATUS: **ACCEPTED**

P3-D3 STATUS: **READY**

D2.1 satisfies all required D2 acceptance conditions:

- D-PROVIDER-01 CLOSED, with the canonical 10-cap, 11 rejected
  pre-execution, 0 invalid-case executor calls.
- Synthetic matrix PASS (AO 31/31), three Shot Contracts PASS,
  reference count matrix PASS, cross-project isolation 100%,
  run/artifact isolation 100%, repeated execution PASS, STALE
  cycles PASS, two-session PASS, Unicode identity PASS.
- Renderer desktop PASS, Renderer mobile PASS, identity correction
  verified by `AP-01..AP-14`.
- Full regression PASS, Provider calls 0, Golden unchanged, no
  P0/P1 technical blocker, working tree empty.

The STOP-P3-D-05 historical trigger was repaired by the C4.1
corrective and is not triggered in the D2.1 evidence path.

## AH. Recommended P3-D3 scope

D2.1 only reports READY. It does not start P3-D3. P3-D3 is bounded
real-Provider visual-quality validation:

- **Maximum** 5 calls / 5 images, single model / single profile.
- **Zero** random retries.
- **Single** canonical Packaging model path
  (`seedream-5.0-pro`).
- Real visual quality is scored only on the 5 generated images
  against the D1 rubric; no Golden update, no synthetic evidence
  substitution.

P3-D3 must be authorized separately. Until then P3-D3 is
**LOCKED**.
