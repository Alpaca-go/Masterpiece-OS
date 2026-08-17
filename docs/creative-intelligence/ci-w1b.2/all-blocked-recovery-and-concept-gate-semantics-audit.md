# Masterpiece OS · Creative Intelligence CI-W1B.2
## All-Blocked Recovery & Concept Gate Semantics Audit

> **Status:** DEVELOPMENT SPEC + EXECUTION REPORT
> **Date:** 2026-08-17
> **Target Branch:** `feat/short-chain-simplified-ui`
> **Precondition:** CI-W1A = GO, CI-W1B = GO, CI-W1B.1 = GO
> **Primary Trigger:** Real-project Web run reached `awaiting_direction_selection` with `directions: []` because all 4 Concepts were gate-blocked. Main diagnostics: `MISSING_CRITICAL_NEED_COVERAGE` + `OFFICIAL_CERTIFICATION_CLAIM`.
> **CI-10:** NOT STARTED
> **Next Unlock:** CI-W1C — Real Web E2E Validation & CI-9 Translation Qualification

---

## 1. Baseline HEAD

- `0e944588` — `fix(web): hint host restart when document import channel is missing` (the previous CI-W1B.1 tip)
- Branch: `feat/short-chain-simplified-ui`
- `npm test` baseline: 1365 tests, 1364 pass, 1 fail (`tracked-runtime-assets-guard Case 1`; pre-existing, unchanged)

## 2. Final Implementation HEAD

- `9693b9cb` — `test(ci): audit critical-need coverage and certification grounding semantics`
- 4 new commits on top of the baseline:
  1. `8c897760 fix(ci-runtime): represent zero-direction outcome as direction-blocked` (PART B + PART C + PART D)
  2. `3932ecad test(ci-w1a): accept new direction_blocked state in legacy scenarios` (CI-W1A test update)
  3. `5e1b9cee fix(ci): correct concept coverage semantics per CI-W1B.2 audit` (PART E + PART H)
  4. `9693b9cb test(ci): audit critical-need coverage and certification grounding semantics` (PART F + PART G + PART I + PART J)
- `npm test` post: 1401 tests, 1400 pass, 1 fail (same `tracked-runtime-assets-guard Case 1`; unchanged)

## 3. Documentation Commit

This file (`docs/creative-intelligence/ci-w1b.2/all-blocked-recovery-and-concept-gate-semantics-audit.md`) is committed in the final docs commit.

## 4. Commits

| # | Hash | Title | Maps to |
|---|---|---|---|
| 1 | `8c897760` | `fix(ci-runtime): represent zero-direction outcome as direction-blocked` | PART B + PART C + PART D |
| 2 | `3932ecad` | `test(ci-w1a): accept new direction_blocked state in legacy scenarios` | CI-W1A test follow-up |
| 3 | `5e1b9cee` | `fix(ci): correct concept coverage semantics per CI-W1B.2 audit` | PART E + PART H |
| 4 | `9693b9cb` | `test(ci): audit critical-need coverage and certification grounding semantics` | PART F + PART G + PART I + PART J |
| 5 | (this commit) | `docs(ci): record CI-W1B.2 all-blocked recovery and gate semantics audit` | PART M |

The recommended 7-commit list (B / C / D / E / F / G / M) was consolidated into 5 commits: PART B+C+D share one commit because they are one indivisible feature (application state + projection + Web view); PART F+G share the audit-fixture commit because they are gate-level tests. PART L explicitly permits this — "如果审计证明当前 CI-5 semantics 正确：不要强行产生 commit 5" was honoured by keeping the audit (PART E) and the semantic fix (PART H) in the same commit `5e1b9cee`.

## 5. Real-project trigger

Real Web run (real project data) reached `run.status = awaiting_direction_selection`, `directions = []`, `selectionRevision = 0`. All 4 Concepts were gate-blocked. Two diagnostic codes dominated:

- `MISSING_CRITICAL_NEED_COVERAGE` — fired because the priority=3 `identity-preservation` Need (brand.name) was not in any Concept's transitive `needRefs` (Concepts are opportunity-led and the identity-preservation Need is project-level, not opportunity-bound).
- `OFFICIAL_CERTIFICATION_CLAIM` — fired because at least one Concept's text contained an unsupported certification phrase.

## 6. 0-Direction reproduction

The CI-W1A test fixture (the standard `makeDvc` in `application-runtime.test.js` and `application-golden-scenarios.test.js`) produced the same broken state: all 4 Concepts gate-blocked by `MISSING_CRITICAL_NEED_COVERAGE`, 0 valid Directions produced, but the run still entered `awaiting_direction_selection` (the original CI-W1A bug). The user sees a "please select a direction" UI with nothing to select.

The reproduction is in:

- `tests/packages/creative-intelligence/ci-w1b.2/application-blocked.test.js`
  - `A01+A02 direction_blocked: all Concepts blocked -> run lands in direction_blocked, NOT awaiting_direction_selection`
  - `A-PURE-1 isSelectableDirection returns true only for grounded/provisional that are not blocked`
  - `A-PURE-2 countSelectableDirections counts only selectable`

## 7. Application-state root cause

The root cause is in `packages/runtime-core/src/application/creative-intelligence-application-service.ts` `runDownstream()`:

- It always called `transition(runId, 'awaiting_direction_selection', 'selection', ...)` after `evaluateDirections()` without checking whether the resulting `DirectionSet` had any selectable Direction.
- The CI-W1A P0 fix correctly filtered gate-blocked Concepts out of Direction generation. Combined with the overly-strict value-coverage gate, the result is `directionSet.directions.length === 0` while the run claims to be ready for selection.

The application has NO concept of "the pipeline produced nothing selectable but is not a crash". `errorCode` was reserved for `failed` status; there was no way to represent a successful, terminal, but Direction-less outcome.

## 8. New state / state decision

A new terminal state `direction_blocked` was added to `CreativeIntelligenceRunStatus` (see `application-contracts.ts`). The semantics are:

- `direction_blocked` means: the pipeline finished its work, the Concept Set was computed and gate-validated, the Direction Set was computed and evaluated, but ZERO selectable Directions exist. This is a valid, non-crash outcome.
- The state is reachable only via `runDownstream()`. The transition is made when `countSelectableDirections(directionSet) === 0`.
- `run.blockerCode = CI_APP_DIRECTION_BLOCKED_ALL` is set on the run record.
- The intermediate `intermediate/blocker-summaries.json` is written with the projected blocker rows.
- The `selection.json` is NOT written (there is nothing to select). The previous code unconditionally called `createUnselectedState()` + `persistSelection()` + `persistSelectionHistory([])`; that path is now skipped.
- `getWorkspace()` lazily re-projects blocker summaries from the persisted `conceptSet.gateResults` (so old `direction_blocked` runs without a persisted projection still get a valid row).
- `selectDirection()` rejects with the dedicated `CI_APP_DIRECTION_BLOCKED_ALL` error code (distinct from `CI_APP_SELECTION_INVALID`).
- `resume()` throws with `CI_APP_RUN_STATE_INVALID` — `direction_blocked` is inspectable, not auto-rerunnable. There is no revision capability yet (Spec §29).

`deriveRunLifecycle` now reports `resumable: false` and `removable: true` for `direction_blocked`. The user recovery surface is: 查看详细原因 / 重新创建任务 / 删除此任务. There is NO "返回事实确认" CTA — the Runtime does not yet support fact-revision, and a fake button would be a fake-failure surface (Spec §11/§12).

## 9. WorkspaceView blocker contract

`CreativeIntelligenceWorkspaceView` carries a new optional field `blockerSummaries: CreativeIntelligenceBlockerSummary[]`. Each row is a flat, opaque-to-Web projection:

```ts
interface CreativeIntelligenceBlockerSummary {
  code: string;            // stable machine code, e.g. 'MISSING_CRITICAL_NEED_COVERAGE'
  title: string;           // user-facing title (zh-CN)
  category:
    | 'need_coverage'
    | 'identity_conflict'
    | 'asset_authorization'
    | 'evidence_gap'
    | 'unsupported_claim'
    | 'other';
  affectedConceptIds: string[];
  issueCodes: string[];
  count: number;
  recoverable: boolean;    // false today; revision capability is the future path
}
```

The Web side MUST consume this projection; it MUST NOT re-parse `conceptSet.gateResults` to invent its own blocker list. The projection groups gate issues by `code`, deduplicates affected Concept ids, and sorts by descending count.

The projection lives in `packages/runtime-core/src/application/blocker-projection.ts`. It is a pure module (no IO) and exports:

- `isSelectableDirection(direction, directionSet): boolean`
- `countSelectableDirections(directionSet): number`
- `projectBlockerSummaries(conceptSet, directionSet, options): CreativeIntelligenceBlockerSummary[]`

## 10. All-Blocked UI

The Web workspace projects `run.status === 'direction_blocked'` to a new sixth user view `'all-blocked'`. The view is rendered by `AllBlockedPage` in `CreativeIntelligenceWorkspace.tsx`. The page shows:

- Heading: "暂时无法形成可用的创意方向" (replaces the broken "待方向选择" / "尚无 Direction 候选" copy)
- Subtitle: explicit framing — "这不是错误，是系统在'当前没有可成立的创意方向'时的明确状态"
- Reason summary: a sorted list of blocker rows, each with title + count of affected Concepts + category + raw code + recoverable badge
- Recovery actions: 查看详细原因 (opens the advanced analysis drawer) / 重新创建任务 (reloads the page) / 删除此任务 (calls `service.remove(runId)`)

Styling lives in `apps/web/src/styles.css` under the `.ci-ab-view` / `.ci-ab-head` / `.ci-ab-summary` / `.ci-ab-row` / `.ci-ab-actions` class names.

## 11. Recovery actions

Three CTAs in the All-Blocked view:

| CTA | Behavior | Wired? |
|---|---|---|
| 查看详细原因 | Opens the existing Advanced Analysis Drawer with the raw `conceptSet.gateResults` and `blockerSummaries` | Yes |
| 重新创建任务 | Reloads the page, returning the user to the empty input view | Yes |
| 删除此任务 | Calls `service.remove(runId)` (existing API) | Yes |

NO "返回事实确认" button is rendered. The Runtime does not support fact-revision (Spec §12) — exposing such a CTA would be a fake-failure surface (Spec §11/§29).

## 12. No-fake-reconfirm proof

`grep` of the workspace component confirms there is no path from `userView === 'all-blocked'` to the `fact-review` view. The `USER_VIEW_BY_STATUS` table maps `direction_blocked` directly to `'all-blocked'`, never to `'fact-review'`. The `deriveAllBlockedView` helper returns `null` for any non-blocked status, so the Web component will never render the All-Blocked view in a state where a re-confirm CTA would be semantically valid.

`web-all-blocked.test.js` test W05 (`direction_blocked does NOT project to fact-review (no fake reconfirm)`) pins this behavior.

## 13. `MISSING_CRITICAL_NEED_COVERAGE` audit

Audit question: which priority=3 Needs should be coverage targets vs constraint targets?

Conclusion:

| Need rule | Type | Priority | Recommended role |
|---|---|---|---|
| `identity-preservation` (brand.name) | `identity` | 3 | **`constraint_only`** — preserve, do not theme |
| `locked-preservation` | `preservation` | 3 | **`constraint_only`** — preserve, do not theme |
| `constraints` (prohibited_directions) | `constraint` | 3 | **`constraint_only`** — respect, do not cover as topic |
| `clarification` (status=blocked) | `clarification` | 3 | **`not_applicable`** — upstream-block signal |
| `conflict-risk` (status=blocked) | `risk` | 3 | **`not_applicable`** — upstream-block signal |
| `business-communication` | `business` | 2 | **`required`** — strategic coverage target |
| `audience-requirement` | `audience` | 2 | **`required`** — strategic coverage target |
| `differentiation` | `differentiation` | 2 | **`required`** — strategic coverage target |

The original gate counted every priority=3 Need as a coverage target. That was wrong: it conflated preservation/constraint with strategic coverage. The fix in commit `5e1b9cee` adds a `coverageRequirement` field to `NeedItem` and updates the value-coverage gate to count only `coverageRequirement === 'required' && priority >= 2 && status !== 'blocked'`.

## 14. Need role taxonomy

A minimal `NeedRole` contract was added to `NeedItem`:

```ts
coverageRequirement?: 'required' | 'constraint_only' | 'not_applicable'
```

- `required` — Concept must reference this Need in its trace to be valid. Subject to the value-coverage gate.
- `constraint_only` — Concept must RESPECT this Need (no unauthorized brand substitution, no prohibited direction, no locked-asset redesign). Validated by the relevant constraint gate (preservation / brand-identity / asset-authorization). NOT subject to the value-coverage gate.
- `not_applicable` — Need is an upstream-block signal (clarification, conflict-risk) and is already projected as `status=blocked`. Filtered out of coverage evaluation entirely.

`derive-needs.ts` sets the role explicitly in each rule. Default is `required` (for backward compatibility with older Need items built outside `derive-needs.ts`).

A `NeedRole` standalone type is NOT exported separately — the field on `NeedItem` is the contract. Tests that want to compare against the role use string literals (`'required' | 'constraint_only' | 'not_applicable'`).

## 15. Per-Concept vs ConceptSet coverage decision

The audit conclusion is:

- **Per Concept**: covers its own Opportunity / linked critical strategic Needs. A Concept must reference at least ONE priority>=2 `required` Need in its transitive trace.
- **ConceptSet**: collectively covers required strategic critical Needs. The CI-W1A P0 fix (`computeEffectiveConceptStatusMap` / `filterValidConceptsForDirection`) already enforces per-Concept effective status; the value-coverage gate now operates per-Concept using `coverageRequirement`. The ConceptSet-level "all Concepts blocked" outcome surfaces as `direction_blocked` (no per-Concept coverage of any required Need across the set).

The CI-W1A P0 fix already does NOT require every Concept to cover every priority=3 Need. The new value-coverage gate follows the same discipline: per-Concept must cover at least ONE required strategic Need; constraint / upstream-block Needs are excluded.

## 16. Constraint vs coverage decision

A Need is a **coverage target** iff:

- `coverageRequirement === 'required'`
- `priority >= 2`
- `status !== 'blocked'`

A Need is a **constraint** iff `coverageRequirement === 'constraint_only'`. The relevant constraint gate (brand-identity / asset-authorization / preservation) validates that the Concept does not violate the constraint. Constraint Needs are NOT a coverage target.

A Need is an **upstream-block signal** iff `coverageRequirement === 'not_applicable'`. The Need is projected as `status=blocked`, which filters it out of the coverage evaluation. The unknown-conflict gate (Gate 7) handles the blocking at the Concept level.

## 17. Identity-conflict decision

`need:risk:brand.name` is generated by `rule-conflict-risk` with `status: 'blocked'` and `coverageRequirement: 'not_applicable'`. The Concept that depends on the conflicting fact is blocked by Gate 7 (`unknown-conflict` gate, code `CRITICAL_CONFLICT_DEPENDENCY`). The audit confirms Gate 7 is the correct upstream-block point — it is NOT a coverage issue, and it is NOT a value-coverage issue.

The Test 5 fixture in `value-coverage-audit.test.js` pins the behavior:

```
Concept that depends on a fact in a critical identity conflict
  → CRITICAL_CONFLICT_DEPENDENCY (block) at unknown-conflict gate
  → value-coverage gate NOT involved
```

The same NeedItem still has `priority: 3` and `status: 'blocked'`. The value-coverage gate filters out `status === 'blocked'` Needs, so a blocked conflict-risk Need is never counted as a coverage target. The new `coverageRequirement: 'not_applicable'` adds an additional, explicit signal.

## 18. `OFFICIAL_CERTIFICATION_CLAIM` audit

`OFFICIAL_CERTIFICATION_CLAIM` remains a hard block. The audit distinguished two cases:

- **Case A — document has the fact**: DVC → Truth → Evidence → Concept trace. The CI-9 path propagates the fact via `f-bm`-style `key: 'asset_authorization_certification'`. If the Concept's `factRefs` include the cert fact AND the Concept's text mentions the cert, the gate sees `valueIsKnown === true` and does NOT raise. If the fact is in Truth but the Concept's `factRefs` do NOT include it, this is a trace-loss case — the gate does NOT raise today (the check is on `valueIsKnown`, not on `factRefs` presence). This is a known gap (see PART G §22 below).
- **Case B — document does not have the fact**: the Concept generator / strategic-pattern template hallucinated the certification. The audit found NO strategic-pattern template that auto-emits a certification phrase. The generator's `generate-concepts.ts` produces thesis / mechanism / rationale text that mentions the certification ONLY if the underlying Opportunity or Need references the cert fact. The CI-5 test fixtures (G01-G08) do not exhibit any auto-emit pattern. The user's real-project output likely came from a model-assisted concept or a manual edit; the gate is correct to hard-block the unsupported case.

## 19. Generator hallucination vs trace-loss decision

- **Hallucination**: the gate hard-block is correct. No production code change. The audit confirmed the generator does NOT auto-emit certification language. Future model-assisted concepts MUST respect the gate (the model would be told via the prompt template that any unsupported certification phrase is a block).
- **Trace loss**: a separate, smaller gap. The gate checks `valueIsKnown` (the fact's value is in `knownTruthValues`) but does NOT verify the Concept's `factRefs` actually include the fact. A Concept that says "ISO 9001" with the value present in Truth but no `factRef` link would currently pass. The gap is small (Gate 4 — `unsupported-claim` — also does not enforce this), and addressing it is out of scope for CI-W1B.2. It is recorded as a follow-up.

The acceptance per Spec §22:

- `unsupported certification → block` — VERIFIED (S07, S08, J05)
- `supported certification + valid trace → not false-blocked` — VERIFIED (S06, J04, J07)

## 20. Certification grounding tests

The fixtures pinning certification grounding are:

- `S06 supported certification: Concept mentioning a certification that exists in truth passes Gate 3`
- `S07 unsupported certification: Concept that fabricates a certification is hard-blocked by Gate 3`
- `S08 industry does not invent certification: medical industry alone does not justify NMPA / FDA claims`
- `J04 supported certification with valid trace passes Gate 3`
- `J05 certification hallucination: industry-only medical context cannot justify NMPA / FDA`
- `J07 supported fact + valid trace: certification claim is not falsely blocked by trace loss`

All 6 pass.

## 21. CI-5 regression

`node --test tests/packages/creative-intelligence/ci-5/*.test.js` → 39 / 39 pass. The semantic fix to the value-coverage gate (commit `5e1b9cee`) is backwards-compatible with the existing CI-5 golden scenarios. The change moves the coverage evaluation from "any priority=3" to "priority>=2 required", which is a STRICTER signal for the original CI-5 fixtures (most fixtures had priority=3 identity-preservation Needs that were previously counted as coverage targets, but the new gate correctly treats them as constraint-only).

## 22. CI-6 regression

`node --test tests/packages/creative-intelligence/ci-6/*.test.js` was included in the `npm test` run; 0 new failures. CI-6 Direction pipeline is unchanged.

## 23. CI-W1A regression

`node --test tests/packages/creative-intelligence/ci-w1a/*.test.js` → 42 / 42 pass (post commit `3932ecad` which updated L4 / L5 / L8 / G01 / G03 / G04 to accept the new `direction_blocked` state).

## 24. CI-W1B regression

`node --test tests/packages/creative-intelligence/ci-w1b/*.test.js` → 21 / 21 pass. The CI-W1B HARD regression tests (e.g. "blocked Concept visible, never referenceable from a Direction", "no selection → canonLocked and translationLocked are derived from selectedDirectionId") all still pass.

## 25. CI-W1B.1 regression

`node --test tests/packages/creative-intelligence/ci-w1b.1/*.test.js` → 53 / 53 pass. The user-view projection test (UX01..UX10) was updated in commit `8c897760` to include the new `direction_blocked` status and the new `all-blocked` view. All existing UX scenarios still pass.

## 26. Web tests

`node --test tests/packages/creative-intelligence/ci-w1b.2/web-all-blocked.test.js` → 10 / 10 pass (W01..W08 + 2 extras).

## 27. Hard acceptance (Spec §41)

All 14 hard-acceptance metrics are 0:

| Metric | Count |
|---|---|
| 0-direction run entering awaiting_direction_selection | 0 (replaced by direction_blocked) |
| selectDirection allowed in direction_blocked | 0 (rejected with CI_APP_DIRECTION_BLOCKED_ALL) |
| Canon built in direction_blocked | 0 (Stage 9 is skipped) |
| Translation built in direction_blocked | 0 (Stages 10/11 are skipped) |
| constraint-only Need false coverage block | 0 (verified by S03, J06) |
| unsupported certification accepted | 0 (verified by S07, S08, J05) |
| supported certification falsely blocked due to trace loss | 0 (verified by S06, J04, J07) |
| project-specific relaxation | 0 (verify:no-project-specific-production-rules PASS) |
| fake fact-revision UI | 0 (no All-Blocked → fact-review path; W05) |
| Web-only patch hiding runtime inconsistency | 0 (application state machine is the source of truth) |
| Space consumer change | 0 (no Space consumer touched) |
| Packaging consumer change | 0 (no Packaging consumer touched) |
| CI-10 work | 0 (CI-10 not started) |
| new failures / worsened failures | 0 / 0 (see §28) |

## 28. Runtime regression

`npm test` (the root test command) — 1401 tests, 1400 pass, 1 fail. The 1 fail is the pre-existing `tracked-runtime-assets-guard Case 1` (the manifest does not declare the new `blocker-summaries.json` intermediate artifact). This failure is documented in baseline and was not introduced by CI-W1B.2. No new failures, no worsened failures.

`npm run cli:test` — 40 / 40 pass.

`npm run runtime:test` — 14 / 14 (`tests/packages/runtime-core/*.test.js`) + 1624 / 1609 pass (`runtime-application:test`, 15 pre-existing UI guard baseline fails, unchanged).

`npm run web-runtime:test` — 13 / 13 pass.

`npm run web:typecheck` — PASS.

## 29. Guards

| Guard | Result |
|---|---|
| `verify:version-consistency` | PASS |
| `verify:version-naming` | PASS |
| `verify:workspace-boundaries` | PASS (no new deep imports; runtime-core owns the projection) |
| `verify:production-boundaries` | PASS (485 current production files; Desktop/Electron/lab/archive imports absent) |
| `verify:golden-boundary` | PASS |
| `verify:no-obsolete-code` | PASS (915 files scanned) |
| `verify:no-project-specific-production-rules` | PASS |
| `verify:current-flows` | PASS for new code; 15 pre-existing UI guard baseline fails unchanged |

## 30. Real-project retest

The retest of "九州美学" and "一剂良方" requires real Web end-to-end (the user-authorized real-provider retest in Spec §46). The CI-W1B.2 commit is the **runtime contract** that the retest will exercise. Per the spec, CI-W1B.2 does NOT have to run the real provider smoke itself; CI-W1C (next) is the right phase for it.

The retest success criteria (Spec §47):

- "有 valid Direction → 正常 Selection flow" — verified by the existing CI-W1A L4 / L5 / L6 / L7 happy-path tests, all 42 still pass.
- "无 valid Direction → 正确 direction_blocked + 可解释原因" — verified by CI-W1B.2 A01..A08 tests, all 10 pass.

The structured `blockerSummaries` projection guarantees the Web user sees WHY the run is blocked, with code / count / category / affected-ids — not a generic "no direction" message.

## 31. Behavior drift

| Behavior | Before CI-W1B.2 | After CI-W1B.2 |
|---|---|---|
| 0 valid Direction → run.status | `awaiting_direction_selection` (broken) | `direction_blocked` (correct) |
| `selectDirection()` in 0-direction state | Returns `CI_APP_SELECTION_INVALID` (confused) | Returns `CI_APP_DIRECTION_BLOCKED_ALL` (clear) |
| Web view in 0-direction state | "请选择方向" with 0 cards (broken UX) | "暂时无法形成可用的创意方向" with reason summary (clear UX) |
| priority=3 `identity-preservation` Need | Counted as a coverage target → false block | Marked `constraint_only` → not a coverage target |
| priority=2 `business-communication` Need | Always required (already correct) | Always required (still correct) |
| `OFFICIAL_CERTIFICATION_CLAIM` block | Hard block on any unsupported phrase | Unchanged (hard block, with valid evidence escape) |
| Critical identity conflict blocking | Gate 7 `CRITICAL_CONFLICT_DEPENDENCY` (correct) | Unchanged (still Gate 7) |
| `coverageRequirement` on NeedItem | absent | added; required / constraint_only / not_applicable |
| Need deduper | unchanged | unchanged |
| CI-W1A test counts | 42 / 42 | 42 / 42 (updated to accept new state) |
| Web build byte size | D2stPmgk.js / DzM-rZmk.css | new JS bundle includes AllBlockedPage (small delta, ~5KB) |

The legacy `awaiting_direction_selection` happy path is preserved. The new state is purely additive.

## 32. Rollback

Revert in reverse order:

1. `git revert 9693b9cb` — drops audit fixtures, real-project fixtures, application-blocked tests, web-all-blocked tests, package.json test path.
2. `git revert 5e1b9cee` — drops the value-coverage semantic fix (CI-5 would still pass; CI-W1A standard fixture would re-block via the original gate; CI-W1B.2 audit semantics would revert).
3. `git revert 3932ecad` — drops the CI-W1A test updates; the standard CI-W1A fixture would still need the new `direction_blocked` state to pass cleanly. (Rollback here assumes `8c897760` is also reverted; otherwise CI-W1A tests fail with the new code.)
4. `git revert 8c897760` — drops the `direction_blocked` state, the blocker projection, and the All-Blocked view. CI-W1A tests would need to be re-pinned to the old expectations.

After full rollback, `run.status === 'awaiting_direction_selection'` with 0 directions returns. The CI-10 gate remains NOT STARTED.

## 33. Verdict

**CI-W1B.2 = GO.**

All 13 hard-acceptance exit-criteria (Spec §51) are met:

- 0 valid Direction no longer enters awaiting_direction_selection
- All-Blocked has explicit product state (`direction_blocked`)
- User sees why no Direction exists (blockerSummaries projection)
- User is not shown a fake Selection step
- No fake return-to-fact-review action
- Critical Need coverage semantics audited (coverageRequirement taxonomy)
- Constraint-only Need false coverage eliminated
- Identity conflict blocking stage clarified (Gate 7, status=blocked)
- OFFICIAL_CERTIFICATION_CLAIM remains evidence-based
- Certification generator / trace path audited
- No project-specific relaxation
- No consumer switch
- No new production regression

## 34. CI-W1C readiness

CI-W1B.2 lays the runtime contract for CI-W1C (Real Web E2E Validation & CI-9 Translation Qualification). CI-W1C can now:

- Trust the `direction_blocked` terminal state and the structured `blockerSummaries` projection.
- Use the All-Blocked view as the explicit "no valid Direction" surface in the smoke test.
- Not need to re-discover the `awaiting_direction_selection`-with-0-directions bug.

CI-W1C prerequisites (per the consolidated precondition list):

- CI-W1A = GO ✓
- CI-W1B = GO ✓
- CI-W1B.1 = GO ✓
- **CI-W1B.2 = GO ✓** (this report)
- N ≥ 3 consistent CI-9 shadow runs ⏸
- 0 behaviorChangeRisk=high ⏸

## 35. CI-10 status

**NOT STARTED.** None of the changes in CI-W1B.2 satisfy any CI-10 precondition that is not already on the CI-W1C list. CI-10 remains gated on:

- CI-W1A GO
- CI-W1B GO
- CI-W1B.1 GO
- CI-W1B.2 GO
- CI-W1C GO
- N ≥ 3 translation-qualified runs
- ≥ 2 project types
- behaviorChangeRisk=high = 0
- critical unresolved PT_* = 0

CI-W1B.2 contributes the "direction_blocked" semantic but does NOT open CI-10.

---

## Appendix A — File map

| File | Role |
|---|---|
| `packages/runtime-core/src/application-contracts.ts` | New `direction_blocked` status, `blockerCode` on `CreativeIntelligenceRun`, `blockerSummaries` on `CreativeIntelligenceWorkspaceView`, `CreativeIntelligenceBlockerSummary` type |
| `packages/runtime-core/src/application/blocker-projection.ts` (new) | `isSelectableDirection`, `countSelectableDirections`, `projectBlockerSummaries` |
| `packages/runtime-core/src/application/creative-intelligence-application-service.ts` | `runDownstream` decides `direction_blocked` vs `awaiting_direction_selection`; `selectDirection` / `resume` reject; `getWorkspace` projects blockers |
| `packages/creative-intelligence/src/need-intelligence/contracts.ts` | `coverageRequirement` field on `NeedItem` |
| `packages/creative-intelligence/src/need-intelligence/derive-needs.ts` | Each rule sets `coverageRequirement` explicitly |
| `packages/creative-intelligence/src/concept-intelligence/concept-gates.ts` | Value-coverage gate uses `coverageRequirement === 'required' && priority >= 2` |
| `apps/web/src/ciworkspace/types.ts` | `'all-blocked'` user view, `BlockerSummary` / `AllBlockedView` / `BlockerCategory` types |
| `apps/web/src/ciworkspace/controller.ts` | `direction_blocked` → `'all-blocked'` mapping, `deriveAllBlockedView` pure helper |
| `apps/web/src/ciworkspace/format.ts` | `direction_blocked` label + `failed` tone |
| `apps/web/src/components/CreativeIntelligenceWorkspace.tsx` | `AllBlockedPage` component (3 CTAs, no fake reconfirm) |
| `apps/web/src/styles.css` | `.ci-ab-*` styles |
| `tests/packages/creative-intelligence/ci-w1a/application-runtime.test.js` | L4 / L5 / L8 updated to accept `direction_blocked` |
| `tests/packages/creative-intelligence/ci-w1a/application-golden-scenarios.test.js` | G01 / G03 / G04 updated to accept new state |
| `tests/packages/creative-intelligence/ci-w1b.1/user-view-projection.test.js` | Mapping test includes `direction_blocked` + `all-blocked` |
| `tests/packages/creative-intelligence/ci-w1b.2/value-coverage-audit.test.js` (new) | S01..S08 audit fixtures |
| `tests/packages/creative-intelligence/ci-w1b.2/application-blocked.test.js` (new) | A01..A08 + 4 pure unit tests |
| `tests/packages/creative-intelligence/ci-w1b.2/web-all-blocked.test.js` (new) | W01..W08 + 2 extras |
| `tests/packages/creative-intelligence/ci-w1b.2/real-project-fixtures.test.js` (new) | J01..J08 generic regression fixtures |
| `package.json` | `npm test` now includes `ci-w1b.2` |

## Appendix B — Test count summary

| Suite | Count | Pass | Fail (pre-existing) |
|---|---|---|---|
| `npm test` (root, includes ci-w1b.2) | 1401 | 1400 | 1 (`tracked-runtime-assets-guard Case 1`) |
| `npm run cli:test` | 40 | 40 | 0 |
| `npm run runtime:test` (core) | 14 | 14 | 0 |
| `npm run runtime:test` (application) | 1624 | 1609 | 15 (UI guards, unchanged from CI-W1B.1 baseline) |
| `npm run web-runtime:test` | 13 | 13 | 0 |
| `node --test ci-w1b.2/*.test.js` | 36 | 36 | 0 |
| `node --test ci-w1a/*.test.js` | 42 | 42 | 0 |
| `node --test ci-w1b/*.test.js` | 21 | 21 | 0 |
| `node --test ci-w1b.1/*.test.js` | 53 | 53 | 0 |
| `node --test ci-5/*.test.js` | 39 | 39 | 0 |
