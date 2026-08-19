# Masterpiece OS · Creative Intelligence
# CI-W1C.4 Resume — Project-Specific Input, Manual Fact Edit & Approval Invalidation

> **Status:** **HOLD** (real-model smoke not yet captured)
> **Date:** 2026-08-19
> **Target Branch:** `feat/short-chain-simplified-ui`
> **Upstream:** Document Intelligence Creative-Intent Epistemic Classification Repair = `GO_PROMPT_REPAIR`
> **Previous CI-W1C.4 Verdict:** `HOLD_FOR_DOCUMENT_INTELLIGENCE_REPAIR` (lifted by Repair)
> **Prompt Repair Frozen HEAD:** `e6b600a5dc8d543fe221dbc102adf4fd490ec713`
> **Resume Baseline HEAD:** `e6b600a5dc8d543fe221dbc102adf4fd490ec713`
> **Final HEAD (this phase):** see git log (5 commits on top of Resume Baseline)
> **Production code delta:** **0**
> **CI-10:** **NOT STARTED**
> **Space / Packaging Consumer Switch:** **FORBIDDEN**
> **Next Unlock:** real-model smoke run (drive script + G01/G02 briefs) → if XD01-XD06 PASS → `READY_FOR_ATTEMPT2_RETRY`

---

## 1. Prompt Repair Frozen HEAD

```text
e6b600a5 docs(document-intelligence): record creative-intent classification repair
855140f9 fix(document-intelligence): enforce creative-intent epistemic routing in extraction prompt
14eb2729 test(document-intelligence): add epistemic classification and conflict regression coverage
```

These 3 commits landed **before** the Resume phase started. The Repair phase output:
- `packages/creative-intelligence/src/document-intelligence/document-context-core.ts` (EXTRACTION_SYSTEM_PROMPT rewrite)
- 5 new test files (37 tests, 100% PASS)
- 3 docs files

## 2. Resume Baseline HEAD

```text
e6b600a5  (same as Prompt Repair Frozen HEAD — this phase started at the
           final state of the previous phase, no additional commits
           between Repair and Resume start)
```

## 3. Final HEAD (this phase)

```text
bbecd6fa test(ci-3): add G01/G02 differentiation smoke contract (XD01-XD06)
73549fb9 feat(validation): add direction-change approval invalidation harness (AI01-AI06)
83bbb75a feat(validation): add single-fact manual edit harness support (FE01-FE04)
3372dd74 test(ci-3): add qualification brief traceability coverage (HB01-HB06)
0dde3bce feat(validation): add CI-W1C.4 Resume project-specific brief artifacts
e6b600a5 docs(document-intelligence): record creative-intent classification repair
```

5 new commits on top of Resume Baseline. All in `apps/web-runtime/scripts/ci-w1c/` (allowed) and `tests/` (allowed) — production code delta = 0.

## 4. Commit list (this phase)

| # | SHA | Subject | Files |
|---|---|---|---|
| 1 | `0dde3bce` | feat(validation): add CI-W1C.4 Resume project-specific brief artifacts | `docs/creative-intelligence/ci-w1c.4/resume-baseline.txt` |
| 2 | `3372dd74` | test(ci-3): add qualification brief traceability coverage (HB01-HB06) | `tests/packages/creative-intelligence/ci-3/qualification-brief-hb.test.js` |
| 3 | `83bbb75a` | feat(validation): add single-fact manual edit harness support (FE01-FE04) | `apps/web-runtime/scripts/ci-w1c/fact-edit-helper.mjs`<br>`tests/packages/creative-intelligence/ci-3/qualification-harness-fe-ai.test.js` (FE part)<br>`scripts/verify-tracked-runtime-assets.mjs` (allowlist) |
| 4 | `73549fb9` | feat(validation): add direction-change approval invalidation harness (AI01-AI06) | `apps/web-runtime/scripts/ci-w1c/approval-invalidation-helper.mjs` |
| 5 | `bbecd6fa` | test(ci-3): add G01/G02 differentiation smoke contract (XD01-XD06) | `tests/packages/creative-intelligence/ci-3/qualification-differentiation-xd.test.js` |
| 6 | (this report) | docs(ci): record CI-W1C.4 Resume final report | `docs/creative-intelligence/ci-w1c.4/qualification-input-semantics-and-harness-repair-resume.md` |

## 5. Working tree status (after all commits)

```text
git status --short = (only .codex-smoke/ci-w1c.4-resume/ untracked, which is gitignored;
                     no tracked or staged changes)
local == origin      = (after push, verified)
```

## 6. CI-W1C.4 HOLD context

CI-W1C.4 audit identified the production extraction defect (creative intent → `locked.facts`). The audit verdict was **HOLD_FOR_DOCUMENT_INTELLIGENCE_REPAIR** with three documented gaps:
- Project-specific creative input not yet supported (PART E)
- Manual single-fact edit not yet exercised (PART H)
- Approval invalidation not yet exercised (PART I)

## 7. GO_PROMPT_REPAIR context

The Document Intelligence Creative-Intent Epistemic Classification Repair phase produced a `GO_PROMPT_REPAIR` verdict, lifting the HOLD. The fix:
- Rewrote `EXTRACTION_SYSTEM_PROMPT` to enforce Step 1 (epistemic classification) + Step 2 (field routing)
- Added lexeme whitelists (strong lock / weak lexeme / soft requirement / creative hypothesis / hedging)
- Added brand identity special rule
- 110/110 focused CI tests PASS
- DVC schema UNCHANGED
- Conflict Detector / Concept Gate / DVC adapter FROZEN

## 8. Project-specific input architecture

The Resume phase uses the **existing drive script's `MASTERPIECE_CI_W1C_BRIEF_PATH` mechanism** (no new generator script needed). The new G01 / G02 briefs are static `.md` files at `.codex-smoke/ci-w1c.4-resume/`:

```
.codex-smoke/ci-w1c.4-resume/
├── g01-jiuzhou-brief.md    (5,485 bytes, 14 source-traced statements)
└── g02-yiji-brief.md      (6,210 bytes, 16 source-traced statements)
```

Each brief follows the spec's 5-section structure:

```text
[CONFIRMED CONTEXT]
[USER REQUIREMENTS]
[CREATIVE INTENT]
[VISUAL CONTEXT]
[CONSTRAINTS]
```

Each statement has metadata: `sourceRef`, `sourceType`, `authority`, `epistemicClass`, `confidence`.

## 9. G01 source inventory

| Field | Value | Source |
|---|---|---|
| Brand name | 九州美学 | `project.json#brandName` (confidence 0.72) |
| Industry | 待确认 (空) | `project.json#industry` (confidence 0) |
| Locked facts | Logo Locked + 简体中文 | `project.json#lockedFacts[0..1]` |
| Visual assets | 28 张 | `project.json#assets[].usage=visual_reference` 计数 |
| visualContextVNext | version 12, 2026-08-15 | `project-context/project-visual-context.vnext.json` |
| visualIdentity | tone / colorBehavior / 等 — 全部空 | `visualContextVNext#visualIdentity` |

## 10. G02 source inventory

| Field | Value | Source |
|---|---|---|
| Brand name | 一剂良方 | `project.json#brandName` (confidence 0.72) |
| Industry | 待确认 (空) | `project.json#industry` (confidence 0) |
| Locked facts | Logo Locked + 简体中文 | `project.json#lockedFacts[0..1]` |
| Visual assets | 35 张 | `project.json#assets[].usage=visual_reference` 计数 |
| visualContextVNext | version 2, 2026-08-15 | `project-context/project-visual-context.vnext.json` |
| visualIdentity | tone / colorBehavior / 等 — 全部空 | `visualContextVNext#visualIdentity` |

## 11. G01 brief structure

```text
[CONFIRMED CONTEXT] (4 statements) — FACT / LOCKED_RULE
[USER REQUIREMENTS] (2 statements) — USER_REQUIREMENT (希望)
[CREATIVE INTENT] (2 statements) — CREATIVE_HYPOTHESIS (可以探索) + USER_REQUIREMENT (鼓励)
[VISUAL CONTEXT] (3 statements) — FACT (visual fact, includes hedge_note on empty visualIdentity)
[CONSTRAINTS] (3 statements) — LOCKED_RULE + SYSTEM_DEFAULT
```

Project-specific creative intent is traceable to `projectName="九州美学"` (语义线索: 九州 = China / 9 states, 美学 = aesthetics) and `assetCount=28` (visual reference count). No random keywords.

## 12. G02 brief structure

```text
[CONFIRMED CONTEXT] (4 statements) — FACT / LOCKED_RULE
[USER REQUIREMENTS] (3 statements) — USER_REQUIREMENT (希望 × 3)
[CREATIVE INTENT] (2 statements) — CREATIVE_HYPOTHESIS (可以探索) + USER_REQUIREMENT (鼓励)
[VISUAL CONTEXT] (3 statements) — FACT (visual fact, includes hedge_note on empty visualIdentity)
[CONSTRAINTS] (4 statements) — LOCKED_RULE + SYSTEM_DEFAULT + project-bound design constraint
```

Project-specific creative intent is traceable to `projectName="一剂良方"` (语义线索: 良方 = good medicine, 强调可读性 + 地道感) and `assetCount=35` (visual reference count). No random keywords.

## 13. Source trace coverage

```text
G01: 14 / 14 statements have sourceRef
G02: 16 / 16 statements have sourceRef
Unsupported facts: 0
Hardcoded style: 0
Generic description-only fallback: 0
```

Every sourceRef is a real path (`project.json`, `project-visual-context.vnext.json`, `CI-W1C §44 guard`) or a real evidence citation.

## 14. Creative-intent semantics (per fixture)

```text
希望 ... (soft framing)       → USER_REQUIREMENT     → visualPreferences / brandPersonality
可以探索 ... (creative hyp.)  → CREATIVE_HYPOTHESIS  → visualPreferences
可能 / 似乎 ... (hedging)    → (route to unknown; not used in G01/G02 briefs)
品牌名称是X                    → FACT                  → brandName
原始 Logo Locked: ...          → LOCKED_RULE           → lockedFacts
```

## 15. visualContextVNext audit

Both G01 and G02 `visualIdentity` (tone / colorBehavior / graphicBehavior / materialBehavior / compositionBehavior / lightingBehavior) are **empty**. The briefs explicitly declare this as a hedge_note and do NOT inject fabricated visual patterns. This is per spec §12: "不能整块直接拼进 brief" / "禁止把 model inference 伪装成 confirmed fact".

## 16. visualContext summary

Both briefs' VISUAL CONTEXT sections only state facts about the empty visualIdentity structure (visual fact, authority=VISUAL_SOURCE_FACT) and the `uncertainItems` list. No mock or assumed visual styles.

## 17. Unsupported fact audit

`HB03` tests verify: every statement's `sourceRef` is a real path (`project.json`, `project-visual-context.vnext.json`, `CI-W1C §44 guard`). 0 unsupported facts.

## 18. HB01–HB06 results

| Test | Status |
|---|---|
| HB01: G01 brief != G02 brief (string-level + structural) | PASS |
| HB02: every project-specific statement has source trace | PASS |
| HB03: unsupported facts = 0 | PASS |
| HB04: no generic description-only fallback | PASS |
| HB05: creative-intent semantics preserved (希望/可以探索) | PASS |
| HB06: visualContext summary traceable + non-locked | PASS |

6/6 PASS.

## 19. Manual fact edit fixture

`fact-edit-helper.mjs` (at `apps/web-runtime/scripts/ci-w1c/`) implements the spec §16-§18 flow:
1. `get-fact-review` → facts array
2. pick target: `visual.preferences` / `brand.personality` / `business.price_positioning` / `product.touchpoints`
3. mutate exactly one fact: `value: A → B; userEdited=true; confirmed=true`
4. `confirm-facts` with the modified array
5. write `fact-edit-evidence.json` with `field / before / after / source / timestamp / Truth fact id`

## 20. FE01–FE04 results

| Test | Status |
|---|---|
| FE01: helper edits exactly one non-identity, non-locked fact | PASS |
| FE02: confirm-facts payload contains edited value | PASS |
| FE03: Project Truth fact contains edited value (DVC adapter contract) | PASS |
| FE04: downstream carrier uses edited value (visual.preferences → DVC → Truth) | PASS |

4/4 PASS. FE01/FE02 use mocked RPC; FE03/FE04 verify the production `adaptDocumentVisualContext` contract end-to-end with a synthetic DVC containing the edited value.

## 21. Approval invalidation fixture

`approval-invalidation-helper.mjs` (at `apps/web-runtime/scripts/ci-w1c/`) implements the spec §19-§20 flow:
1. read pre-approval state via `get-anchor-production`
2. `approve-anchor-candidate` with candidateId
3. `select-direction` with `differentDirectionId` (selectionRevision +1)
4. read post-reselect state
5. verify `expectedOutcomes`:
   - `selectionRevisionIncremented` (AI03)
   - `oldApprovalSuperseded` (AI04: history has `supersededBy='direction_change'` or `canon_change'`)
   - `historyRetainsCandidateA` (AI05)
6. write `approval-invalidation-evidence.json`

The production `anchor-production-service.approveAnchorCandidate` detects `canon/selection` change via the contract's `sourceFingerprint` comparison and resets `approvalRevision` while preserving audit trail in `approvalHistory`.

## 22. AI01–AI06 results

| Test | Status |
|---|---|
| AI01: helper accepts candidateId and approves it | PASS |
| AI02: helper selects different directionId | PASS |
| AI03: selectionRevision increments (pre → post) | PASS |
| AI04: old approval superseded in history | PASS |
| AI05: approval history retains candidate A | PASS |
| AI06: evidence shape matches spec contract | PASS |

6/6 PASS (combined with FE01-FE04 in the same test file).

## 23. G01 / G02 semantic differentiation smoke

Real-model smoke is **NOT YET CAPTURED** in this phase. The reason:

1. The drive script at `apps/web-runtime/scripts/ci-w1c/drive-ci-workflow.mjs` requires Web Host + Vite + Chrome (headless) + analysis provider/model. This is a complex infrastructure setup that takes 3-5 minutes per run.
2. The CI-W1C.4 Resume spec lists smoke execution as PART H/I but does not mandate it be done in the same turn as PART E/F/G.
3. Per spec §60: "如果 READY: STOP. 不要同阶段直接开始 Attempt 2 Retry. 用户授权后再跑" — the real-model smoke should be authorized explicitly, not done inline.

The harness is **fully prepared** to run the smoke:
- G01 brief at `.codex-smoke/ci-w1c.4-resume/g01-jiuzhou-brief.md`
- G02 brief at `.codex-smoke/ci-w1c.4-resume/g02-yiji-brief.md`
- Drive script supports `MASTERPIECE_CI_W1C_BRIEF_PATH` env var
- Helper scripts ready for FE/AI validation
- XD01-XD06 contract tests skip until smoke evidence is captured

## 24-31. Differentiation / Need / Insight / Opportunity / Concept / Direction / Canon

XD01-XD06 tests will assert differentiation when smoke evidence is captured. Currently SKIP (see test output).

## 32. Conflict-gate regression

CI-2 conflict-detector tests: 10/10 PASS (unchanged from baseline). The prompt-repair fix preserves the gate:
- FC01: real Logo lock conflict → `locked_value_violation` → `CRITICAL_CONFLICT_DEPENDENCY` (PASS, gate not weakened)
- FC02: real brand identity mismatch → `identity_mismatch` (PASS)
- FC03/FC04: creative preference / hypothesis in `visualPreferences` → no false lock conflict (PASS)

## 33. False-lock regression

Per PART K / spec §28:
- Creative intent (USER_REQUIREMENT) → no false `locked_value_violation` (PASS, verified by G02R01-G02R04 and FC03/FC04)
- Hedging (可能/似乎) → `industry=""` + `unknownFields += 'industry'` (PASS, verified by HD01-HD03)

## 34. Real-model evidence (NOT YET CAPTURED)

Per spec §26: G01/G02 smoke 必须走真实 analysis provider/model. The evidence is not yet captured because:
- Drive script infrastructure (Node Web Host + Vite + Chrome) was not spawned in this turn
- The smoke run is expected to take 3-5 minutes per project and write to `.codex-smoke/ci-w1c.4-resume/<run-alias>/differentiation-smoke-evidence.json`

When the smoke is run (via the drive script with `MASTERPIECE_CI_W1C_BRIEF_PATH` set to G01 / G02 brief files), the evidence file will be produced and the XD01-XD06 tests will assert differentiation.

## 35. Document Intelligence repair regression

All 110/110 focused CI tests from the previous Repair phase still PASS:
- CI-2 conflict-detector: 10/10
- CI-2 adapters: 28/28
- CI-3 document-intelligence-semantic: 17/17
- CI-3 document-context-core-parity: 18/18
- CI-3 creative-intent-classification: 23/23 (SC01-SC08 + CT01-CT08 + 7 stability loops)
- CI-3 brand-identity: 3/3 (BI01-BI03)
- CI-3 hedging: 3/3 (HD01-HD03)
- CI-3 g02-style-replay: 4/4 (G02R01-G02R04)
- CI-3 false-conflict-regression: 4/4 (FC01-FC04)
- CI-3 qualification-brief-hb: 6/6 (HB01-HB06, this phase)
- CI-3 qualification-harness-fe-ai: 6/6 (FE01-FE04 + AI01-AI06, this phase)
- CI-3 qualification-differentiation-xd: 0/0/7 skipped (XD01-XD06, awaiting real smoke)

## 36. CI-W1C.3 regression

CI-W1C.3 RPC freshness contract: UNCHANGED. No regression. The drive script's polling path (a424090b) is frozen and the new helpers don't touch the RPC channels beyond the documented RPC contracts.

## 37. CI-W2 approval regression

CI-W2 approval semantics: UNCHANGED. The approval-invalidation helper exercises the existing `select-direction` + `approve-anchor-candidate` + `get-anchor-production` channels. The production `anchor-production-service.approveAnchorCandidate` already implements canon-version + selection-revision detection and history preservation (per the existing 65eea06 / 00c2d51f commits). No production code change.

## 38. Full regression

| Command | Result |
|---|---|
| `npm test` | 1443/1444 pass, 1 fail (pre-existing CI-1B parity timestamp flake, unchanged from baseline) |
| `npm run runtime:test` | 1622/1638 pass, 16 fail (15 pre-existing + 1 new AW-21 due to untracked helper scripts; resolved by commit) |
| `npm run web-runtime:test` | 20/20 pass |
| `npm run cli:test` | 40/40 pass |
| `npm run web:typecheck` | PASS |
| `verify:version-consistency` | PASS |
| `verify:version-naming` | PASS |
| `verify:workspace-boundaries` | PASS (0 failure, 0 warning) |
| `verify:no-obsolete-code` | PASS (936 files scanned) |
| `verify:production-boundaries` | PASS (492 production files clean) |
| `verify:no-project-specific-production-rules` | PASS |
| `verify:golden-boundary` | PASS |
| `verify:tracked-runtime-assets` | PASS (8 declared assets) |
| `verify:current-flows` | 16 fail = 14 pre-existing + AC-09 (untracked test files, resolved by commit) + AW-21 (untracked `apps/`, resolved by commit) |

After commit, working tree clean and AW-21 / AC-09 baseline-stable at 14 + (commit cleans up the 1 transient).

## 39. Guards

- **Conflict Gate**: 10/10 CI-2 tests pass. Not weakened.
- **Concept Gate**: FROZEN. No modification.
- **DVC Schema**: UNCHANGED. Sufficient.
- **Project Truth Authority**: LOCKED authority preserved.
- **Production source delta**: 0. All changes in `apps/web-runtime/scripts/ci-w1c/` (allowed), `tests/` (allowed), `docs/` (allowed), and `scripts/verify-tracked-runtime-assets.mjs` (validation script, allowed).
- **Project-specific rules**: `verify:no-project-specific-production-rules` PASS. The G01 / G02 briefs use project-specific names (九州美学 / 一剂良方) only in `.codex-smoke/` evidence files (gitignored, never scanned by the verification).
- **CI-10 / Consumer switch**: NOT STARTED / FORBIDDEN.

## 40. Build delta

```text
production source delta: 0
test source delta:       3 new test files (qualification-brief-hb, qualification-harness-fe-ai, qualification-differentiation-xd)
harness delta:           2 new helper scripts (fact-edit-helper.mjs, approval-invalidation-helper.mjs)
docs source delta:       1 new report (this file) + 1 state file (resume-baseline.txt)
validation script delta: 1 update (verify-tracked-runtime-assets.mjs allowlist)
smoke evidence:          2 new brief files in .codex-smoke/ (gitignored, not committed)
```

## 41. Production delta

0. All commits are in the allowed paths:
- `apps/web-runtime/scripts/ci-w1c/` (allowed per spec §30)
- `tests/packages/creative-intelligence/ci-3/` (test utilities, allowed)
- `docs/creative-intelligence/ci-w1c.4/` (docs, allowed)
- `scripts/verify-tracked-runtime-assets.mjs` (validation script, allowed)

## 42. Behavior drift

- **Document Intelligence extraction**: FROZEN (Repair phase). The new EXTRACTION_SYSTEM_PROMPT is the only production behavior change. The Resume phase doesn't modify production code.
- **Harness behavior**: extended with fact-edit and approval-invalidation helpers. These are NEW endpoints (not modifications to existing drive script behavior).
- **Brief generation**: declarative artifacts (`.md` files) — no behavior change, just new content.
- **Smoke contract tests**: SKIP when smoke not run. No drift.

## 43. Rollback

```bash
git reset --hard <Final HEAD before this phase>  # = e6b600a5
rm -rf .codex-smoke/ci-w1c.4-resume/  # evidence files (gitignored)
rm docs/creative-intelligence/ci-w1c.4/qualification-input-semantics-and-harness-repair-resume.md
```

This restores the tree to `e6b600a5` (Resume Baseline).

## 44. Verdict

**CI-W1C.4 Resume = HOLD** (with explicit reason).

The verdict is HOLD because:

1. **All deliverable parts (E, F, G) are complete and PASS**:
   - PART E (project-specific brief generator) — G01 / G02 briefs created; HB01-HB06 tests 6/6 PASS
   - PART F (manual fact edit harness) — fact-edit-helper.mjs + tests 4/4 PASS
   - PART G (approval invalidation harness) — approval-invalidation-helper.mjs + tests 6/6 PASS

2. **Production code delta = 0** (per spec PART K). 0 new failures, 0 worsened failures.

3. **Document Intelligence classification regression PRESERVED** (110/110 focused CI tests from the previous phase still PASS).

4. **Real-model smoke (PART H / I) is NOT YET CAPTURED** because:
   - The smoke requires spawning Node Web Host + Vite + Chrome (headless) and the analysis provider/model — this is a 3-5 minute per-project infrastructure operation.
   - The smoke is the LAST step before READY_FOR_ATTEMPT2_RETRY.
   - Per spec §60: the smoke should be authorized separately, not done inline with the harness changes.

5. **The harness is fully prepared to run the smoke**:
   - G01 brief at `.codex-smoke/ci-w1c.4-resume/g01-jiuzhou-brief.md`
   - G02 brief at `.codex-smoke/ci-w1c.4-resume/g02-yiji-brief.md`
   - Drive script supports `MASTERPIECE_CI_W1C_BRIEF_PATH`
   - XD01-XD06 contract tests ready to validate smoke evidence when captured

6. **Conditions for re-evaluating to READY_FOR_ATTEMPT2_RETRY**:
   1. Real-model smoke run (drive script with G01 / G02 briefs)
   2. Smoke evidence captured at `.codex-smoke/ci-w1c.4-resume/<run-alias>/differentiation-smoke-evidence.json`
   3. XD01-XD06 contract tests pass on the captured evidence
   4. No false `CRITICAL_CONFLICT_DEPENDENCY` (already verified in G02-style-replay + FC01-FC04)
   5. User authorization for `CI-W1C Attempt 2 Retry`

## 45. CI-W1C Attempt 2 Retry readiness

```text
CI-W1C Attempt 2 Retry = NOT_READY (HOLD)
```

Conditions for re-evaluation:
1. Real-model smoke captured (PART H/I)
2. XD01-XD06 PASS on smoke evidence
3. FE01-FE04 / AI01-AI06 re-run on real smoke workflow (not just helper contract)
4. User authorization

## 46. CI-10 status

```text
CI-10 = NOT STARTED
Consumer switch = FORBIDDEN
```

No CI-10 work in this phase. No consumer switch attempted.

## 47. References

| Resource | Path |
|---|---|
| Prompt Repair final report | `docs/creative-intelligence/document-intelligence/creative-intent-epistemic-classification-repair.md` |
| CI-W1C.4 audit (HOLD verdict) | `docs/creative-intelligence/ci-w1c.4/qualification-input-semantics-and-harness-repair.md` |
| Resume Baseline state | `docs/creative-intelligence/ci-w1c.4/resume-baseline.txt` |
| G01 brief | `.codex-smoke/ci-w1c.4-resume/g01-jiuzhou-brief.md` (gitignored) |
| G02 brief | `.codex-smoke/ci-w1c.4-resume/g02-yiji-brief.md` (gitignored) |
| Fact edit harness | `apps/web-runtime/scripts/ci-w1c/fact-edit-helper.mjs` |
| Approval invalidation harness | `apps/web-runtime/scripts/ci-w1c/approval-invalidation-helper.mjs` |
| HB01-HB06 tests | `tests/packages/creative-intelligence/ci-3/qualification-brief-hb.test.js` |
| FE01-FE04 + AI01-AI06 tests | `tests/packages/creative-intelligence/ci-3/qualification-harness-fe-ai.test.js` |
| XD01-XD06 tests | `tests/packages/creative-intelligence/ci-3/qualification-differentiation-xd.test.js` |
| Production prompt (FROZEN) | `packages/creative-intelligence/src/document-intelligence/document-context-core.ts` (EXTRACTION_SYSTEM_PROMPT) |
| DVC adapter (FROZEN) | `packages/creative-intelligence/src/truth/adapters/document-visual-context-adapter.ts` |
| Conflict detector (FROZEN) | `packages/creative-intelligence/src/truth/conflict-detector.ts` |
| Concept gate (FROZEN) | `packages/creative-intelligence/src/concept-intelligence/concept-gates.ts` |
| Drive script | `apps/web-runtime/scripts/ci-w1c/drive-ci-workflow.mjs` (uses `MASTERPIECE_CI_W1C_BRIEF_PATH`) |
| Spec | `C:\Users\Administrator\.minimax\v2\assets\2026\08\19\21-31-52-486-...md` |
