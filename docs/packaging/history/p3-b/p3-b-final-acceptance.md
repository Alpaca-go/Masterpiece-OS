# P3-B Final Acceptance — P3-B6.3 Production Flow Revalidation

Date: 2026-08-14

Branch: `codex/visual-analysis-a1-multi-provider`

Acceptance type: final production-flow revalidation
External Provider: **SANCTIONED LOCAL** (`0` external calls)

## A. Git

P3-B6.3 started from `1d008c6b6096170f6f77758febcfb9685c5ef838`.
The acceptance changes only add this report and the B6.3 integration guard.
No production file is modified.

## B. Current baselines

| Layer | Commit |
|---|---|
| P2 original production | `335405342951fedae5d4d6816444c2b4d2402787` |
| P2 current production (P2-K) | `a593278b55e437fac59d768c5cee734d9a9fc201` |
| P2 current freeze | `e59af67fd4c2b75811ffffc012497a2d628da675` |
| P3-A original production | `dd4570a3a6f056e339ef4176e1af7e34167ff5af` |
| P3-A original freeze | `71490c7a061889de9598f3d11e9520436264c218` |
| P3-A10 production | `b1716db7322f51939958ff2b1c97dc0a8b97fb9a` |
| P3-A10 freeze | `d4e4ac0fd7b9a72c8e4777c3b43609e349c13071` |
| P3-A11 current production | `f95c145b9b1e37430ac68315c9e039f1f3262ae4` |
| P3-A11 current freeze | `1d008c6b6096170f6f77758febcfb9685c5ef838` |
| P3-B UI baseline | `27575a0` |
| P3-B Renderer corrective | `92a8008` |
| P3-B final acceptance | this commit |

These are layered baselines; none is described as the sole baseline for all of
P3.

## C–H. Production Prepare and READY evidence

The B6.3 guard drives the registered `packaging:*` operations with the real
Workspace service and real P2 `preparePackagingGeneration`. Both
`reference_first` and `analysis_led` reach `READY`; the main execution flow is
`reference_first`.

| Evidence | Observed value |
|---|---|
| Workspace `intent.providerModelId` | `seedream-5.0-pro` |
| P2 translation input `modelId` | `seedream-5.0-pro` |
| capability resolved `modelId` | `seedream-5.0-pro` |
| first Shot Contract | `PKG-HERO-SINGLE` |
| first canonical aspect ratio | `4:5` |
| re-Prepare Shot Contract | `PKG-SERIES-GROUP` |
| re-Prepare canonical aspect ratio | `16:9` |
| `structure.formFactor` | `cylindrical glass bottle with dropper` |
| `structuralFeatures` | `cylindrical body`, `screw cap`, `pipette dropper` |
| `visualDirection.summary` | `Calm botanical care expressed through restrained material contrast.` |
| `view.status` | `ready` |
| `view.readiness.canExecute` | `true` |
| P2 compile fingerprint | present; changes after the Shot semantic edit |

Authority proof:

- aspect ratio is projected from the current P2 Shot Contract; B6.3 adds no
  ratio map;
- form factor is projected from the Locked Asset
  `packaging_structure` authority;
- structural features are projected from Project Visual Context
  `packageStructures`;
- visual direction is projected from the canonical
  `mediaTranslations.packaging.packagingConcept`;
- the Reference is an explicit canonical assignment with
  `product_identity_reference`; no ratio, structure, or direction is inferred
  from the image.

Eliminated blockers:

| Blocker | Result |
|---|---|
| `modelId is required` | ELIMINATED |
| `structure_form_factor_missing` | ELIMINATED |
| `provider_hints_aspect_ratio_missing` | ELIMINATED |
| `visual_direction_summary_missing` | ELIMINATED |
| new translation blocker | NONE |

## I–P. Execute, run registration, artifact, and preview

The external paid Provider is replaced only at its adapter seam by
`sanctioned-local@1.0.0`. The rest of the path is real:

`packaging:* operation -> P3-A Workspace -> P2 executor -> artifact lifecycle
-> saveRun -> canonical createRunStore -> preview operation`.

The local adapter returns one PNG and the real artifact lifecycle writes 70
non-empty bytes to both the full-image and thumbnail targets.

| Check | Result |
|---|---|
| transition | `READY -> EXECUTING -> EXECUTED` observed |
| P2 executor invocation | 1 for first run; 0 for rejected STALE execute |
| first run | `pkg-b63-01` |
| result status | `succeeded` |
| canonical `readRun` | non-null |
| canonical `listRuns` | includes run |
| physical authority | `run.json` exists |
| Packaging extension | `packaging-generation-result.json` exists |
| `outputType` | `packaging_render` |
| `providerId` | `volcengine` |
| `taskId` | `pkg-b63-01` (documented short-run correlation rule) |
| `downloadedAt` | captured adapter timestamp present |
| canonical status/images | truthful `succeeded`, one persisted image |
| MIME | `image/png` |
| preview | safe `data:image/png;base64,...` |
| path exposure | no absolute path, `file://`, `runRoot`, or `relativePath` |

The S MIME/security suite remains 14/14 PASS: HTML, SVG, JavaScript, unknown
MIME, traversal, invalid image identity, and orphan-sidecar access fail closed;
canonical run authority is required.

## Q–R. Reference flow and Locked Assets

The integrated flow resolves an actual PNG through the artifact store and
preserves its explicit `assetId`, role, and source. The real Renderer was also
opened against project `590eadf2-76cb-4042-a034-db93481b06c9`; its asset scan
loaded the project's real reference rows and role selector.

The same Renderer showed the upstream Locked Assets exactly as available. The
selected real project currently has missing Packaging Locked Asset values, and
the UI truthfully presents `未提供`; it does not insert the former B1 seed.
The integrated READY path uses a complete upstream-shaped truth snapshot to
exercise the compiler and execution contract.

## S–U. STALE, re-Prepare, and new run

After the first successful execution, changing the Shot Contract through
`packaging:update-intent` produces:

- `EXECUTED -> STALE`;
- canonical reason `intent_changed`;
- previous `view.execution` and its preview remain available;
- direct Execute is rejected and the P2 executor call count remains unchanged;
- explicit Prepare observes `STALE -> PREPARING -> READY`;
- the new P2 user-intent fingerprint differs;
- explicit second Execute creates `pkg-b63-02` and a new preview;
- both first and second runs remain discoverable in the canonical store.

## V. Reset and Retry

`canRetry` is exposed by the frozen View Model. Retry uses the same Execute
operation and creates `pkg-b63-03`, not a reused run id. Reset is taken from the
RPC-returned View, returns `UNPREPARED`, retains the previous execution
projection, and does not delete any of the three canonical runs or artifacts.
No History UI or retention policy is added.

## W–X. Both production modes

| Mode | Result |
|---|---|
| `analysis_led` Prepare | READY |
| `reference_first` Prepare | READY; explicit canonical Reference |
| full Execute mode | `reference_first` |

## Y–AA. Renderer, responsive, and accessibility sanity

The real Node Web Host and Renderer were launched, not a component-only UI
fixture. The production Packaging route mounted and opened a real project.
Runtime state truth is proven by the integrated operations test; the frozen
Renderer projection for READY/EXECUTED/STALE is covered by the Y/AD/AE guards,
without injecting an EXECUTED browser fixture.

| Check | Result |
|---|---|
| 1440 × 900 | no horizontal overflow; CTA, tiles, and status hierarchy visible |
| 1024 × 768 | no horizontal overflow; all three lifecycle CTAs present |
| 390 × 844 | no horizontal overflow; Prepare CTA and Result tile visible |
| Reference dialog | real project assets loaded; dialog semantics present |
| Reference Escape/focus | Escape closes; focus returns to `+ 添加参考图` |
| Preview modal contract | Escape and focus-return guards PASS |
| native buttons | Enter/Space semantics retained |
| disabled Execute | native disabled state observed before READY |
| STALE text | explicit non-color-only copy guarded |
| visible focus | observed on returned Reference CTA |
| `web:build` | PASS |
| `web:smoke` | PASS; provider calls 0, business writes 0 |
| browser graph | no `node:crypto`, `node:fs`, or `node:path` contamination |

## AB. 20-step final user-flow matrix

| # | Step | Result | Evidence |
|---:|---|---|---|
| 01 | Open Packaging Workspace | PASS | production Renderer route |
| 02 | Bootstrap session | PASS | `packaging:create-session` |
| 03 | Project identity visible | PASS | real Renderer project region |
| 04 | Locked Assets resolved | PASS | truthful values/missing state |
| 05 | Reference assets available | PASS | real project scan |
| 06 | Add Reference | PASS | explicit integration assignment + Renderer dialog |
| 07 | Assign canonical role | PASS | `product_identity_reference` |
| 08 | Update intent | PASS | registered operation |
| 09 | Prepare | PASS | real P2 Prepare |
| 10 | READY | PASS | returned authoritative View |
| 11 | Execute | PASS | registered operation |
| 12 | EXECUTED | PASS | EXECUTING observed before authoritative result |
| 13 | canonical run registered | PASS | `readRun`/`listRuns`/`run.json` |
| 14 | artifact preview visible | PASS | safe image data URL; Gallery bridge guarded |
| 15 | semantic edit | PASS | Shot Contract update |
| 16 | STALE | PASS | `intent_changed` |
| 17 | previous result visible | PASS | execution + preview retained |
| 18 | re-Prepare | PASS | explicit operation, no auto Execute |
| 19 | READY | PASS | new fingerprint and `16:9` geometry |
| 20 | second Execute/new run | PASS | `pkg-b63-02 != pkg-b63-01` |

## AC–AF. Guards and regression

| Gate | Result |
|---|---:|
| P3-A7 A–L | PASS — 71/71 |
| W | PASS — 10/10 |
| T (architecture group) | PASS — 3/3 |
| X | PASS — 20/20 |
| Y | PASS — 20/20 |
| Z canonical | PASS — 41/41 |
| Z historical retained | PASS — 1/1, reported separately |
| AA | PASS — 15/15 |
| AB | PASS — 10/10 |
| AC | PASS — 10/10 |
| AD | PASS — 18/18 |
| AE | PASS — 11/11 |
| AF | PASS — 14/14 |
| AG | PASS — 16/16 |
| AH B6.3 integrated flow | PASS — 1/1 |
| P2 focused geometry | PASS — 288/288 |
| P2 full image generation | PASS — 981/981 |
| Runtime Core | PASS — 14/14 |
| Runtime Application | PASS — 1119/1119 |
| CLI | PASS — 40/40 |
| Web Runtime | PASS — 4/4 |
| full repository and release gates | PASS |

The authoritative final clean-tree run includes `npm test`,
`runtime-application:test`, `runtime:test`, `test:image-generation`, both Web
typechecks, Web build/smoke, repository verification, every named repository
boundary, both Space boundaries, `git diff --check`, and final status.

## AG. Provider calls

- External Provider calls: **0**.
- Sanctioned local Provider executions: **3** (first run, second run, Retry).
- Model identity: `seedream-5.0-pro`.
- No secret is recorded; `LOCAL_TEST_ONLY` exists only in process memory.

## AH–AJ. Frozen diff, changed files, and working tree

- P2 protected production diff from
  `a593278b55e437fac59d768c5cee734d9a9fc201`: **0**.
- P3-A production diff from
  `f95c145b9b1e37430ac68315c9e039f1f3262ae4`: **0**.
- Production changes in B6.3: **0**.
- Changed files:
  - `tests/runtime-application/packaging-workspace-production-flow-acceptance.test.ts`
  - `docs/packaging/history/p3-b/p3-b-final-acceptance.md`
- Final working tree after the acceptance commit: **EMPTY**.

## AK. Corrective history retained

P3-B was not a straight-line acceptance. The preserved sequence is:

1. P3-B1 — UI Shell.
2. P3-B2 — RPC Binding.
3. P3-B3 — Reference / Truth.
4. P3-B4 — Execution / Gallery.
5. P3-B5 — Persistence / Preview.
6. P3-B5.1 — MIME / Authority Cleanup.
7. P3-B5.2 — Run-store Gap Audit: HOLD.
8. P3-B5.3 — Canonical Registration Bridge.
9. P3-B5.3.1 — Canonical Contract Closure.
10. P3-B5.3.2 — Record Hygiene.
11. P3-B6 — UI polish; HOLD due Renderer.
12. P3-B6.1 — Renderer repaired; HOLD due `modelId`.
13. P3-A10 — model identity correction.
14. P3-B6.2 — Prepare revalidation; HOLD due translation truth.
15. P3-A11 audit — aspect-ratio authority gap.
16. P2-K — Shot Contract geometry correction.
17. P3-A11 resumed — translation completeness closed.
18. P3-B6.3 — final production acceptance.

## AL–AM. Final status and next step

- P2 STATUS: **RE-FROZEN**
- P3-A STATUS: **RE-FROZEN**
- P3-B STATUS: **ACCEPTED**
- P3-C STATUS: **UNLOCKED**

Next step: **P3-C**. It is not started by this acceptance.
