# P3-C3 — Dual-Mode Production Execution & Cross-Workflow Acceptance

Decision: **PASS — P3-C4 READY**  
Date: 2026-08-14  
Branch: `codex/visual-analysis-a1-multi-provider`

## A. Git

- Starting/full C2 HEAD: `456ec3a9d0273b599ed15bcd424fde1f36b8ce1b`.
- Test commit: `4e04a8c` (`test(packaging): validate dual-mode production integration`).
- Production source changes: **0**.

## B. C2 Baseline Consumed

P3-C3 consumes the frozen C2 selector at `456ec3a9d0273b599ed15bcd424fde1f36b8ce1b`. `generationMode` remains the sole selector authority. No fallback, preferred source, default producer, latest-run discovery, or new selector semantics were added.

## C. Execution Strategy

- Execution Provider: **SANCTIONED LOCAL**.
- External Provider calls: **0**.
- Production path under acceptance: Runtime operations → canonical C2 context selector → truth snapshot → P3-A → P2 → sanctioned local executor → artifact lifecycle → canonical run store → preview bridge.
- The local adapter only replaces the paid image-generation endpoint. READY/EXECUTING/EXECUTED, run registration, files, and previews are not injected.

## D. Analysis-led Production Flow

PASS: session → project truth → `analysisLed` slot → Prepare → READY → Execute → observed EXECUTING → EXECUTED → `pkg-*` canonical run → persisted artifact → safe preview.

## E. Analysis-led Source Evidence

PASS. The selected evidence records `sourceKind=analysis_led`, project binding, producer-owned fingerprint `analysis-fp-a`, `PackagingTranslationV2`, packaging concept, and structure semantics. The selector never reads `referenceFirst` to complete analysis-led truth.

## F. Reference-first Production Flow

PASS: session → explicit active Reference source → `referenceFirst` slot → project/run/fingerprint validation → Prepare → READY → Execute → observed EXECUTING → EXECUTED → `pkg-*` canonical run → artifact → preview.

## G. Reference-first Independence

PASS. A project context with `analysisLed` absent and a valid `referenceFirst` plus explicit active source completed the full production lifecycle.

## H. Active Reference Binding

PASS. Reference-first resolves only the explicit project metadata pointer. Run A and Run B are selected only after an explicit active-source change.

## I. Project / Run / Fingerprint Validation

PASS. Project mismatch, producer-run mismatch, fingerprint mismatch, missing active source, and missing selected slot all fail closed before Prepare.

## J. Both-producer Coexistence

PASS. With analysis A and Reference R present together, `analysis_led` selects A and `reference_first` selects R. Timestamps and insertion order have no authority.

## K. Analysis → Reference Switch

PASS. The mode edit produces `intent_changed` STALE, retains the previous analysis execution for presentation, rejects Execute, and requires explicit re-Prepare before Reference execution.

## L. Reference → Analysis Switch

PASS. The reverse edit produces `intent_changed` STALE; explicit re-Prepare returns READY from the analysis slot. A redundant image execution was not required.

## M. Active Source A → B

PASS. Truth refresh after explicit A → B selection produces `truth_surface_changed` STALE. Re-Prepare validates and selects current source B.

## N. Same-semantic Re-run

PASS. Changing only `producerRunId` while preserving source fingerprint and canonical translation does not cause false semantic STALE. Current active binding is still validated.

## O. Fingerprint Drift

PASS. Producer-owned fingerprint X → Y produces `truth_surface_changed` STALE and blocks use of the prior prepared context.

## P. Revoked Source

PASS. Removing the active Reference source makes the next Prepare fail with `PACKAGING_ACTIVE_REFERENCE_SOURCE_MISSING`; there is no cached, analysis-led, or latest-run fallback.

## Q. Cross-project Protection

PASS. A Project B active source is rejected for a Project A Workspace with `PACKAGING_CONTEXT_PROJECT_MISMATCH`.

## R. STALE / Re-Prepare

PASS. Existing `intent_changed` and `truth_surface_changed` paths remain the only stale semantics. Execute is fail-closed until explicit Prepare resolves current truth.

## S. Second Execution

PASS. Re-Prepare followed by Execute creates a distinct `pkg-*` run while preserving prior canonical runs.

## T. Canonical Runs

PASS. `readRun`, `listRuns`, `run.json`, and the Packaging sidecar all use the existing canonical image-generation run store. No producer-specific store was added.

Current run metadata does not persist a new upstream semantic-source provenance field. This is recorded as a future enhancement only; C3 does not expand the downstream run schema or embed a raw Reference object.

## U. Artifacts

PASS. Image bytes, thumbnail, sidecar, and canonical run metadata are persisted through the production artifact lifecycle.

## V. Preview

PASS. Both modes return a canonical `data:image/png;base64,...` preview. Responses expose no absolute path, `file://`, run root, or relative storage path.

## W. Locked Assets Across Modes

PASS. Captured P2 Prepare inputs carry identical Locked Assets for analysis-led and reference-first.

## X. Shot Contract Across Modes

PASS. `PKG-HERO-SINGLE` projects canonical `4:5` geometry and the same locked structure in both modes. Reference context does not own or override aspect ratio.

## Y. Reference Assignment Separation

PASS. The active upstream Reference source is not inserted into Packaging `referencePolicy.references`. Analysis-led remains at zero assignments; reference-first contains exactly the one explicit user assignment.

## Z. Renderer QA

PASS, using the actual Web Renderer and Node Host at `http://127.0.0.1:5173` plus the production acceptance harness:

- The real Renderer opened an actual Packaging Workspace through Local RPC.
- Unsupported upstream context produced a safe user-level alert without raw runtime detail.
- The reference picker rendered as a real modal with `aria-modal=true`, focused its close control, closed with Escape, and returned focus to the trigger.
- READY, EXECUTED, mode/source STALE, previous-result retention, canonical preview, and safe errors are driven by the real production view envelopes proven in AL and the existing P3-B Renderer guards; no mock READY/EXECUTED view is accepted as authority.

## AA. Responsive / Accessibility Sanity

PASS.

- 1440 × 1000: `scrollWidth === clientWidth` (1425 CSS px after scrollbar), no horizontal overflow, all buttons labelled, no raw debug/provenance leak.
- 390 × 844: `scrollWidth === clientWidth` (375 CSS px after scrollbar), action stack and cards reflow correctly, Execute remains disabled when not ready, all buttons labelled.
- Dialog semantics, initial focus, Escape close, and trigger-focus restoration passed.

## AB. Failure UX

PASS. Missing source, fingerprint mismatch, project mismatch, and selected-slot-missing errors expose stable application codes and safe messages only. No absolute path, Provider payload, stack trace, credential, or API key is returned or rendered.

## AC. No Reasoning / No Run Discovery

PASS. The C3 graph contains no Visual Analysis call, Reference reasoning call, LLM summarization, `anchorGoal` reinterpretation, source-fingerprint recomputation, Reference `listRuns`, filesystem scan, sort, or latest selection.

## AD. New Store

**NO.** Multi-producer semantics remain in Project Visual Context; active Reference identity remains in project metadata; Packaging results remain in the canonical run store.

## AE. Architecture Guards

- AH: **14/14 PASS**
- AI: **16/16 PASS**
- AJ: **29/29 PASS**
- AK: **29/29 PASS**
- AL: **34/34 PASS**
- Combined focused guard run: **122/122 PASS**

## AF. Full Regression

PASS:

- `npm test`
- `npm run runtime-application:test`
- `npm run runtime:test`
- `npm run test:image-generation`
- P2 Shot Contract / geometry tests
- Reference workflow tests
- Visual Analysis facade tests
- Qwen and Volcengine Provider contract tests
- `npm run cli:test`
- `npm run web:typecheck`
- `npm run web:build`
- `npm run web-runtime:typecheck`
- `npm run web-runtime:test`
- `npm run web:smoke`
- `npm run repo:verify`
- `npm run repo:check`
- `npm run verify:current-flows`
- `npm run verify:space-compiler-baseline`
- `npm run verify:space-r8.6-golden-boundary`
- `npm run golden:test`

## AG. Golden / Provider Calls

- Golden Regression: **5/5 PASS**.
- Golden auto-updated: **NO**.
- External Provider calls: **0**.
- Web smoke Provider calls: **0**; business writes: **0**.

## AH. Frozen Diff

- P2 production diff from `a593278b55e437fac59d768c5cee734d9a9fc201`: **0**.
- P3-A production diff from `f95c145b9b1e37430ac68315c9e039f1f3262ae4`: **0**.
- P3-B accepted UI/Workspace semantic diff from `2ac4cf1cc18156d1e4a508382b4563298d69c014`: **0**.

## AI. Production Changed Files

**0.** P3-C3 changes only acceptance tests and this history document.

## AJ. Verification

All required offline gates and tests passed on 2026-08-14. No real paid Provider smoke was required or invoked for this acceptance phase.

## AK. Working Tree

Expected final state after the documentation commit and push: **EMPTY**, with local HEAD aligned to `origin/codex/visual-analysis-a1-multi-provider`.

## AL. Final Decision

**PASS — P3-C4 READY**

P3-C3 proves dual-mode production execution and cross-workflow invalidation without changing P2, P3-A, P3-B, C1.2, or C2 semantics.

## AM. Recommended P3-C4 Scope

Proceed only to final cross-workflow product acceptance and release evidence consolidation. P3-C4 should not reopen selector authority, upstream translation semantics, Locked Assets, Shot Contract geometry, stale tracking, or run-store ownership. A possible future provenance improvement may be evaluated separately through an explicit downstream run-contract phase.

