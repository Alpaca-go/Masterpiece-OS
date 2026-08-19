# CI-W1C.7.1 — Live Creative Reasoning Context & Prompt Wiring Repair (Final Report)

**STATUS: READY_FOR_MODEL_ASSISTED_TEXT_QUALIFICATION**

**Branch**: `feat/short-chain-simplified-ui`
**Baseline (CI-W1C.7 Frozen HEAD)**: `9eb3d52df234487708fc339b562ed07eb0d8b537`
**Final HEAD**: (this commit)
**Spec**: `Masterpiece-OS-Creative-Intelligence-CI-W1C.7.1-...md`

---

## 1. Baseline HEAD

- `9eb3d52d feat(ci-w1c.7): planning-first model-assisted creative reasoning + visual direction exploration`
- `e7100982 test(ci-w1c.5.1): NI-02..NI-07 Insight unit coverage + XD2-01..XD2-07 contract`
- `c9db663e feat(ci-w1c.5): project-specific visual evidence propagation repair`
- `b52a0d40 feat(ci-w1c.6): planning-first creative authority + demote legacy visual evidence`

## 2. Final HEAD

(this commit; HEAD on `feat/short-chain-simplified-ui`)

## 3. Commit plan

Per spec §67, the suggested commits are:

1. `test(ci-w1c.7.1): capture live prompt wiring baseline`
2. `feat(ci-w1c.7.1): add deterministic planning-first reasoning prompt builders`
3. `fix(runtime): wire full strategic/concept/direction context into creative reasoning live path`
4. `fix(runtime): make live qualification fail-closed and honor analysis profile metadata`
5. `test(ci-w1c.7.1): add prompt snapshot and counterfactual qualification`
6. `docs(ci-w1c.7.1): record live-context wiring readiness`

CI-W1C.7.1 combines these into fewer logical commits at the actual commit time.

## 4. Branch / origin parity

After the final commit, the local branch and origin will be in sync. CI-W1C.7.1 does not reset newer user work.

## 5. Working tree

After the final commit, the only untracked file will be the `space-generator/.../ab-comparison-report.json` smoke artifact (excluded from CI-W1C.7.1 scope).

## 6. CI-W1C.7 inherited status

CI-W1C.7 was `READY_FOR_MODEL_ASSISTED_TEXT_QUALIFICATION` (mock/fixture level) — all 56 new tests PASS but live text qualification was deferred because:
- The analysis profiles used in the 2310 smoke are not in the current credentials directory
- The user had not authorized live API consumption
- The runtime wiring had a defect (count-only ctxSummary)

CI-W1C.7.1 inherits the CI-W1C.7 status and addresses the third issue (the runtime wiring defect).

## 7. Discovered live-context gap

Direct code audit of `creative-reasoning-service.ts` at CI-W1C.7 revealed that:
- `compileStrategicReasoningContext` already contained rich planning data (authoritative facts, user requirements, locked rules, prohibited directions, needs, evidence, legacy visual exclusions, source IDs)
- BUT the runtime compressed this into a count-only `ctxSummary`: `{ planningTruth: count, needs: count, evidence: count, lockedIdentity: ids }`
- The Strategic Synthesis prompt thus sent: `Strategic Synthesis for projectId=...` + `Context: { counts only }` — 201 chars
- The Concept prompt sent: `Model-Assisted Concept Ideation for projectId=...` + `Synthesis ref: <timestamp>` — 186 chars
- The Direction prompt sent: `Model-Assisted Direction Ideation for projectId=...` + `Synthesis ref: <timestamp>` + `ConceptSet ref: <timestamp>` — 231 chars

The three `.prompt.before.txt` files (now in `docs/creative-intelligence/ci-w1c.7.1/baseline-prompts/`) document this defect.

## 8. Strategic Context compiler status

`compileStrategicReasoningContext` was already correct. CI-W1C.7.1 does not modify it. The repair is in the runtime's `runStage` path: instead of building a count-only `ctxSummary`, the runtime now calls the deterministic prompt builders (which use the full `StrategicReasoningContext`).

## 9. Old Strategic prompt snapshot

`docs/creative-intelligence/ci-w1c.7.1/baseline-prompts/strategic-synthesis.prompt.before.txt` (201 chars)

```
[system]
You are a strategic synthesizer. Output strict JSON only.

[user]
Strategic Synthesis for projectId=proj-baseline-A
Context: {"planningTruth":4,"needs":1,"evidence":1,"lockedIdentity":["f4"]}
```

## 10. New Strategic prompt snapshot

`docs/creative-intelligence/ci-w1c.7.1/baseline-prompts/strategic-synthesis.prompt.after.txt` (3840 chars)

Contains: `# PROJECT`, `# AUTHORITATIVE PROJECT FACTS` (with VALUES), `# USER REQUIREMENTS`, `# LOCKED RULES`, `# PROHIBITED DIRECTIONS`, `# NEED SKELETON` (with STATEMENTS), `# EVIDENCE` (with SUMMARIES), `# SOURCE TRACE IDS`, `# EXCLUDED LEGACY VISUAL AUTHORITIES`, `# TASK`, `# OUTPUT JSON SCHEMA`, `# EPISTEMIC RULES`.

## 11. Old Concept prompt snapshot

`docs/creative-intelligence/ci-w1c.7.1/baseline-prompts/concept-ideation.prompt.before.txt` (186 chars)

```
[system]
You are a model-assisted concept ideator. Output strict JSON only.

[user]
Model-Assisted Concept Ideation for projectId=proj-baseline-A
Synthesis ref: 2026-08-19T19:39:19.618Z
```

## 12. New Concept prompt snapshot

`docs/creative-intelligence/ci-w1c.7.1/baseline-prompts/concept-ideation.prompt.after.txt` (5789 chars)

Contains: `# VALIDATED STRATEGIC SYNTHESIS` (full JSON), `# AUTHORITATIVE CONSTRAINTS` (LOCKED + PROHIBITED), `# ALLOWED SOURCE IDS`, `# EXCLUDED LEGACY VISUAL AUTHORITIES`, `# TASK`, `# OUTPUT JSON SCHEMA`, `# EPISTEMIC RULES`.

## 13. Old Direction prompt snapshot

`docs/creative-intelligence/ci-w1c.7.1/baseline-prompts/direction-ideation.prompt.before.txt` (231 chars)

```
[system]
You are a model-assisted direction ideator. Output strict JSON only.

[user]
Model-Assisted Direction Ideation for projectId=proj-baseline-A
Synthesis ref: 2026-08-19T19:39:19.618Z
ConceptSet ref: 2026-08-19T19:39:19.620Z
```

## 14. New Direction prompt snapshot

`docs/creative-intelligence/ci-w1c.7.1/baseline-prompts/direction-ideation.prompt.after.txt` (9345 chars)

Contains: `# VALIDATED STRATEGIC SYNTHESIS` (full JSON), `# VALIDATED CONCEPT SET` (full JSON), `# AUTHORITATIVE CONSTRAINTS` (LOCKED + PROHIBITED), `# ALLOWED SOURCE IDS`, `# EXCLUDED LEGACY VISUAL AUTHORITIES`, `# VISUAL LANGUAGE REQUIREMENTS (MD-11)`, `# TASK`, `# OUTPUT JSON SCHEMA`, `# EPISTEMIC RULES`.

## 15. Prompt source map

`CreativeReasoningPromptSourceMap` (from CI-W1C.7) is preserved. The runtime service persists prompt snapshots at:

- `intermediate/prompt-snapshots/strategic-synthesis.prompt.json`
- `intermediate/prompt-snapshots/concept-ideation.prompt.json`
- `intermediate/prompt-snapshots/direction-ideation.prompt.json`

Each snapshot contains `promptVersion`, `messages` (system + user), `sourceMap` (character count, section count), `inputFingerprint`, `size` diagnostics. No secrets are persisted (asserted by `RW-10`).

## 16. Planning authority fields serialized

The Strategic Synthesis prompt serializes the following fields (per PS-01..12):
- `id`, `key`, `value`, `authority` for facts
- `id`, `type`, `coverage`, `statement`, `factRefs` for needs
- `id`, `sourceKind`, `confidence`, `summary`, `factRefs` for evidence
- `planningTruth`, `userRequirements`, `lockedIdentity`, `prohibitedDirections`, `needs`, `evidence` for source IDs

## 17. Excluded authorities

The `# EXCLUDED LEGACY VISUAL AUTHORITIES` section appears in every prompt. The spec minimum set is:

- `visualAsset.*`
- `old_visual_style`
- `old_VI`
- `old_poster`
- `old_packaging`
- `old_spatial`
- `style_reference`
- `structure_reference`
- `spatial_reference`
- `current_project_identity`

The runtime service includes the spec minimum set in `sourceMap.legacyVisualEvidenceExcluded` and the prompt builder adds the spec minimum to whatever the caller provided.

## 18. Prompt fingerprint policy

Each builder computes a stable `inputFingerprint` based on:
- `projectId`
- `factCount`
- `needCount`
- `evidenceCount`
- `lockedCount`
- `prohibitedCount`

The fingerprint is a 32-char hex (16 bytes) of SHA-256 over a sorted-key JSON of the input. Same input → same fingerprint.

## 19. Prompt size diagnostics

Each builder returns:
- `characterCount` — user message length
- `sectionCount` — number of `# ` sections
- `factCount` / `needCount` / `evidenceCount` — for synthesis
- `synthesisInsightCount` / `synthesisOpportunityCount` — for concept
- `synthesisInsightCount` / `conceptCount` — for direction

The runtime service does NOT enforce a hard size limit; the caller is responsible for monitoring. If the prompt exceeds a safe threshold, the caller can add a diagnostic and stop.

## 20. analysisProfileId wiring

`input.analysisProfileId` is forwarded to `readCredentials(input.analysisProfileId)` in the live path. Asserted by `RW-01`.

## 21. Provider / model metadata

In live mode, the service resolves credentials and persists `provider` / `model` in:
- `result.provider` / `result.model`
- Each stage's gate report (if applicable)

In mock mode, both are `null`. Asserted by `RW-07`.

## 22. Execution mode metadata

- `useMock: true` (or not set) → `mode: 'model_assisted_mock'`
- `useMock: false` → `mode: 'model_assisted_live'`

The old `deterministic_baseline` label is REMOVED. The old `model_assisted_shadow` label is REPLACED with `model_assisted_mock`.

## 23. Fail-closed behavior

Per spec §36, live qualification fails closed:
- Attempt 1 → Attempt 2 (repair) → STOP
- No mock fallback in live mode
- No downstream stage runs after upstream failure
- No fake valid report

Asserted by `RW-04`, `RW-05`, `RW-06`.

## 24. Repair prompt behavior

The repair call (attempt 2) appends:
- `# REPAIR` section
- `## BLOCKED GATE CODES` list
- `## PREVIOUS INVALID OUTPUT (bounded excerpt)` (max 2000 chars)

Asserted by `RW-09`.

## 25. Raw attempt persistence

Per spec §38, the service persists:
- `intermediate/live-attempts/{stage}.attempt-1.raw.txt`
- `intermediate/live-attempts/{stage}.attempt-2.raw.txt`
- `intermediate/live-attempts/{stage}.gate.json`
- `intermediate/live-attempts/{stage}.failure.json` (live-mode failure)

No secrets are persisted (asserted by `RW-10`).

## 26. Mock fallback prohibition

The mock fallback in `runStage` is gated by `if (liveMode) { return FAIL; }`. Mock fallback is allowed only in mock mode.

## 27. G01 prompt dry-run

`g01-g02-prompt-dry-run.md` documents the dry-run. The G01 fixture uses distinct planning data; the resulting prompt contains the planning semantics (asserted by `CFP-01`).

## 28. G02 prompt dry-run

The G02 fixture uses distinct planning data; the resulting prompt contains the planning semantics and differs from G01 (asserted by `CFP-01`).

## 29. Planning sensitivity

Per `CFP-01`, A's prompt contains `Alpha Studio` and B's prompt contains `Bravo School`. The prompts differ semantically because planning differs.

## 30. Legacy-swap invariance

Per `CFP-02`, the same planning context with a different `legacyVisualEvidenceExcluded` list produces a prompt that is identical except for the EXCLUDED section.

## 31. Planning-swap sensitivity

Per `CFP-03`, swapping the projectId between two planning contexts produces a prompt whose `projectId` reflects the input, not the context.

## 32. Prompt counterfactual tests

Per `CFP-01..04`, the four counterfactual tests pass.

## 33. PS tests

`PS-01..12` — 12 tests PASS.

## 34. PC tests

`PC-01..08` — 8 tests PASS.

## 35. PD tests

`PD-01..09` — 9 tests PASS.

## 36. RW tests

`RW-01..10` — 10 tests PASS.

## 37. Prior 56/56 regression

All CI-W1C.7 tests (SR / MC / MD / RP / counterfactual / creative-reasoning-service mock) are preserved and PASS.

## 38. Full regression

- `verify:version-consistency` — PASS
- `verify:version-naming` — PASS
- `verify:workspace-boundaries` — PRE-EXISTING script bug (unchanged)
- `verify:production-boundaries` — PASS (515 production files checked)
- `verify:no-obsolete-code` — PASS (972 files scanned)
- `verify:no-project-specific-production-rules` — PASS
- `verify:golden-boundary` — PASS
- `verify:tracked-runtime-assets` — PASS
- `verify:current-flows` — PRE-EXISTING failures (unchanged)
- `web:typecheck` — PASS

## 39. Verify commands

All 8 verify commands PASS or PRE-EXISTING state.

## 40. Pre-existing failures

- `verify:workspace-boundaries` script bug at line 218 (unchanged)
- `verify:current-flows` pre-existing failures (BE-19, packaging-d3-rerun, packaging-renderer-boundary, packaging-workspace-architecture-guards, short-chain-default-entry — unchanged from CI-W1C.6 / CI-W1C.7)

## 41. New failures

0 new failures. 0 worsened failures.

## 42. Analysis provider call count

0 (CI-W1C.7.1 does not call any real analysis model in tests; all tests use the in-file mock or injected reasoner factories)

## 43. Image provider call count

0 (HARD RULE preserved; `imageProviderCallCount: 0` is hard-coded in the report contract)

## 44. Production delta

- 3 new files in `packages/creative-intelligence/src/strategic-synthesis/` (build-strategic-synthesis-prompt.ts, index.ts, updated contracts)
- 2 new files in `packages/creative-intelligence/src/model-assisted/` (build-concept-ideation-prompt.ts, build-direction-ideation-prompt.ts, updated index.ts)
- 1 modified file: `packages/runtime-core/src/application/creative-reasoning-service.ts` (full rewrite of `run` + `runStage` + new `persistPromptSnapshot`)
- 1 new test file: `tests/packages/creative-intelligence/ci-7/live-prompt-baseline-recorder.test.js` (re-captures baseline + after-repair)
- 1 new test file: `tests/packages/creative-intelligence/ci-7/live-prompt-wiring-ps-pc-pd-rw-cfp.test.js` (43 tests)
- 5 new docs in `docs/creative-intelligence/ci-w1c.7.1/`

## 45. Frozen surfaces

All CI-W1C.7 / CI-W1C.6 frozen surfaces are preserved:
- Document Intelligence, DVC, Truth taxonomy / precedence, Conflict Detector
- Concept Gate critical semantics, CI-7 Evaluation, Selection, Canon
- Anchor Production, Image Runtime, Translation, Consumers
- CI-10 NOT STARTED, Recommendation != Selection
- LEGACY_VISUAL_EVIDENCE demoted (CI-W1C.6 PART B)

## 46. Final verdict

**READY_FOR_MODEL_ASSISTED_TEXT_QUALIFICATION**

CI-W1C.7.1 repairs the live-context gap found in CI-W1C.7. The runtime now passes full Planning-First semantic authority to the analysis model at every stage. The live path is fail-closed: no mock fallback, no downstream after upstream failure, no fake valid report. The user is free to authorize live text qualification in a follow-up phase (CI-W1C.7.2).

## 47. Live text qualification readiness

The live text qualification is now technically capable of consuming a real analysis model API. The user must:
- Re-create the analysis profile in the credentials directory (the 2310 smoke profiles are not in the current credentials dir)
- Authorize live API consumption
- Run the qualification with G01 (九州美学) + G02 (一剂良方) using the same analysis model + same prompt version
- Capture artifacts at the 5 expected paths
- Run the human rubric (Strategic Fidelity / Project Specificity / Conceptual Distinctness / Visual Discussability / Traceability / Non-Genericness, each ≥ 2, average ≥ 2.3, hard fail = 0)

## 48. CI-W1C.6.1 status

NOT STARTED. The CI-W1C.6.1 follow-up (which would activate the `creative_intelligence` image source preset, wire the CI Anchor reference runtime gate, and pass `planningText` to `compilePromptFromContract`) is NOT part of CI-W1C.7.1. It remains deferred.

## 49. CI-10 status

NOT STARTED. Consumer switch remains FORBIDDEN.

---

## 50. Post-READY STOP

CI-W1C.7.1 ends here. **No automatic CI-W1C.6.1, no live smoke, no CI-10, no consumer switch.** Awaiting user authorization for the next step (CI-W1C.7.2 — Live Model-Assisted Text Qualification & Human Direction Review).
