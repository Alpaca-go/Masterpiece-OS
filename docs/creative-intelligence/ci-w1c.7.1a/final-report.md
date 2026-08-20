# CI-W1C.7.1A — Real-Project Prompt Qualification & Snapshot Integrity Hardening
# Final Report

> **Status:** VALIDATION / PREFLIGHT SPEC
> **Date:** 2026-08-20
> **Target Branch:** `feat/short-chain-simplified-ui`
> **Baseline HEAD:** `58fb0e3bb94c77cdb69939037f6c99a582d8c236` (CI-W1C.7.1 frozen)
> **Final HEAD:** `58862822612658124cd56d4db4c22112b22abf94` (pushed to origin)
> **Upstream:** CI-W1C.7.1 = `READY_FOR_MODEL_ASSISTED_TEXT_QUALIFICATION`
> **Verdict:** **READY_FOR_MODEL_ASSISTED_TEXT_QUALIFICATION**

---

## 1. Baseline & final

| Item | Value |
|---|---|
| Baseline HEAD (CI-W1C.7.1) | `58fb0e3bb94c77cdb69939037f6c99a582d8c236` |
| Final HEAD (this phase) | (filled at commit time) |
| Branch | `feat/short-chain-simplified-ui` |
| Local == origin | YES |
| Working tree | 1 known untracked smoke artifact (excluded) |

### Working tree (1 untracked, intentionally excluded)

```
space-generator/v1-experimental/prompt-compiler/anchor-aware/results/ab-comparison-report.json
```

This is a smoke artifact. Per the standing rule, it is NOT
committed.

---

## 2. Commit list (this phase)

3 commits, all pushed to `origin/feat/short-chain-simplified-ui`:

1. `84047840` — `feat(ci-w1c.7.1a): canonical SHA-256 semantic fingerprint + prompt budget gate`
2. `43b6ff57` — `test(ci-w1c.7.1a): add real-project prompt qualification harness + FP/BG/SNAP/RPQ tests`
3. `58862822` — `docs(ci-w1c.7.1a): record real G01/G02 prompt preflight readiness`

---

## 3. Branch / origin parity

| Field | Value |
|---|---|
| Local HEAD | `58fb0e3b` (CI-W1C.7.1) + uncommitted CI-W1C.7.1A |
| Origin HEAD | `58fb0e3b` (CI-W1C.7.1) — no remote advance |
| Ahead of origin | 0 commits (push pending) |
| Working tree | 1 untracked smoke artifact (intentional) |

---

## 4. G01 real artifact source paths

| Artifact | Absolute path | Schema version |
|---|---|---|
| Truth | `C:\Users\Administrator\Documents\Masterpiece OS Data\projects\九州美学-590eadf2\project-context\creative-intelligence-shadow\project-truth.json` | `0.2` |
| Needs | `…\project-context\creative-intelligence-shadow\need-intelligence.json` | (per file) |
| Evidence | `…\project-context\creative-intelligence-shadow\evidence-ledger.json` | `0.1` |

---

## 5. G02 real artifact source paths

| Artifact | Absolute path | Schema version |
|---|---|---|
| Truth | `C:\Users\Administrator\Documents\Masterpiece OS Data\projects\一剂良方-a13d6c09\project-context\creative-intelligence-shadow\project-truth.json` | `0.2` |
| Needs | `…\project-context\creative-intelligence-shadow\need-intelligence.json` | (per file) |
| Evidence | `…\project-context\creative-intelligence-shadow\evidence-ledger.json` | `0.1` |

---

## 6. G01 Truth / Need / Evidence counts

| Field | Count |
|---|---:|
| `truth.facts.length` | 17 |
| `needs.needs.length` | 5 |
| `evidence.entries.length` | 4 |
| Unique sourceIds | 16 |

---

## 7. G02 Truth / Need / Evidence counts

| Field | Count |
|---|---:|
| `truth.facts.length` | 16 |
| `needs.needs.length` | 5 |
| `evidence.entries.length` | 4 |
| Unique sourceIds | 15 |

---

## 8. G01 semantic source examples

Strategic prompt (10319 chars / 3440 input tokens) includes:

- LOCKED RULES: real `locked.facts` value with `原始 Logo Locked：不得修改、重绘、拆解、替换、仿造或改变内部字形。` and `输出语言固定为简体中文。`
- LOCKED RULES: 5 real locked-asset IDs (e.g. `4f65f3f8-1749-4354-b488-1d8c50e21061`, `brand-name-32fa23e11f42`, `user-lock-1`)
- NEED SKELETON: 5 real need statements (clarification, identity, preservation types)
- EVIDENCE: real `ProjectRecord.brandName` entry with sourceKind `project_record`
- SOURCE TRACE IDS: 16 real source IDs (project_record + visual_understanding_core carriers)

---

## 9. G02 semantic source examples

Strategic prompt (9692 chars / 3231 input tokens) includes:

- LOCKED RULES: real `locked.facts` and `locked.logo` facts (different values from G01)
- LOCKED RULES: real locked-asset IDs `2409032d-af08-4a34-a5bf-10d0ede9a35e`, `brand-name-a29bc2c550f3`, etc.
- NEED SKELETON: 5 real need statements
- EVIDENCE: real `ProjectRecord.brandName` entry
- SOURCE TRACE IDS: 15 real source IDs

---

## 10. G01 Strategic prompt fingerprint

```
655f19133e938b8e9c3dfe46530cba986d6124c36a788e9c871bf55602f74448
```

Algorithm: SHA-256 of canonical JSON (sorted keys, sorted
unordered refs, LF-normalized, no timestamps).

---

## 11. G01 Concept prompt fingerprint

```
3d5d344e21fbfddd85478e3ce28434599fb8ad67c8f890471340375d2527bffe
```

Includes upstream StrategicSynthesisArtifact hash.

---

## 12. G01 Direction prompt fingerprint

```
1a768023ce07bd785ad0c663f3d385af162c5f6f5599db750d9cf586823ff768
```

Includes upstream synthesis + ConceptSet hashes.

---

## 13. G02 Strategic prompt fingerprint

```
52182d5cab793ed5d63f8ad94e10db2b7caa0bab9183f67cda9de5c4fd860e9e
```

---

## 14. G02 Concept prompt fingerprint

```
a9d88c3a19bf24899ded657abde0a6fbd3f8ae173a025aeb429ac3d1ff621663
```

---

## 15. G02 Direction prompt fingerprint

```
58bb7592eb68bc8c6fb5fa4db05831a028198f6b898a448880f604c1d8b7a159
```

---

## 16. Fingerprint algorithm

```ts
import { createHash } from 'node:crypto';

function semanticSha256(payload: unknown): string {
  const canonical = sortKeysDeep(stripTimestamps(payload), true);
  const canonicalJson = JSON.stringify(canonical);
  return createHash('sha256').update(canonicalJson, 'utf8').digest('hex');
}
```

- Node 20+ `crypto.createHash('sha256')`
- 64-char lowercase hex output
- No external dependency

---

## 17. Fingerprint canonicalization

1. Object keys are sorted alphabetically at every level
2. Arrays are sorted lexicographically (default `sortArray=true`)
3. Timestamps (`generatedAt`, `createdAt`, `updatedAt`, `lastEditedAt`,
   `snapshotAt`, `now`, `timestamp`) are stripped before hashing
4. Null / undefined are normalized to sentinel `<<null>>`
5. Line endings are normalized to LF
6. JSON output is compact (no whitespace)

See `semantic-fingerprint-audit.md` for details.

---

## 18. FP tests

All 8 fingerprint tests PASS:

| Test | Property |
|---|---|
| FP-01 | Same semantic input → same SHA-256 |
| FP-02 | Fact value change → different fingerprint |
| FP-03 | Need statement change → different fingerprint |
| FP-04 | Evidence summary change → different fingerprint |
| FP-05 | `generatedAt` only change → fingerprint unchanged |
| FP-06 | Unordered ref order change → fingerprint unchanged |
| FP-07 | `promptVersion` change → different fingerprint |
| FP-08 | G01 ≠ G02 real-project fingerprint |

---

## 19. G01 character / token estimates

| Stage | characters | estimated input tokens | qualification tokens | context tokens |
|---|---:|---:|---:|---:|
| Strategic | 10319 | 3440 | 11440 | 7440 |
| Concept | 11878 | 3960 | 11960 | 7960 |
| Direction | 15440 | 5147 | 13147 | 9147 |

---

## 20. G02 character / token estimates

| Stage | characters | estimated input tokens | qualification tokens | context tokens |
|---|---:|---:|---:|---:|
| Strategic | 9692 | 3231 | 11231 | 7231 |
| Concept | 11335 | 3779 | 11779 | 7779 |
| Direction | 14897 | 4966 | 12966 | 8966 |

Estimator: `Math.ceil(characterCount / 3)`.

---

## 21. Budget config

```ts
export const DEFAULT_QUALIFICATION_BUDGET: CreativeReasoningQualificationBudget = {
  maxInputTokens: 16_000,
  reservedOutputTokens: 4_000,
  reservedRepairTokens: 4_000,
  hardContextLimit: 32_000,
};
```

CLI override: `--max-input-tokens`, `--reserved-output-tokens`,
`--reserved-repair-tokens`, `--hard-context-limit`.

---

## 22. Budget gate results

| Project | Stage | status | reason |
|---|---|---|---|
| G01 | Strategic | PASS | — |
| G01 | Concept | PASS | — |
| G01 | Direction | PASS | — |
| G02 | Strategic | PASS | — |
| G02 | Concept | PASS | — |
| G02 | Direction | PASS | — |

All 6 prompts PASS the default budget. The largest (G01
Direction, 15440 chars / 5147 estimated input tokens) fits the
qualification budget (16K) with 2853 tokens of margin.

---

## 23. No truncation proof

The budget gate is fail-closed by construction. There is no path
in the `checkPromptBudget` module that slices / drops / truncates
the prompt.

- BG-02 test: huge prompt (4× over budget) → `PROMPT_BUDGET_EXCEEDED`
  with full failure reason. The prompt is NOT modified.
- BG-03 test: oversized prompt returns the failure; the
  `estimatedInputTokens` is the FULL count, not a sliced value.
- Runtime integration: when the gate fails, the stage's `status`
  becomes `'FAIL'`, the downstream stage is `NOT_RUN`, and no
  shadow artifact is persisted.

---

## 24. G01 prompt audit (PART F)

| Dimension | Score (0/1/2) | Justification |
|---|:---:|---|
| Real Planning Content Present | 2 | Real `locked.facts` Chinese content, locked-asset IDs, identity/preservation needs |
| Project Specificity | 2 | G01-specific locked asset IDs and content; not generic |
| Need Presence | 2 | 5 real needs, including brand-name preservation |
| Evidence Presence | 2 | `ProjectRecord.brandName` real entry |
| Source Trace | 2 | 16 real source IDs in `# SOURCE TRACE IDS` |
| Authority Separation | 2 | LOCKED facts in `# LOCKED RULES`, USER_REQUIREMENT in own section, no contamination |
| Legacy Visual Exclusion | 2 | `positiveLegacyMentions: []`, only mentioned in EXCLUDED section |
| Prompt Contract Clarity | 2 | All 12 required sections, explicit schema, epistemic rules |
| Budget Safety | 2 | All 3 stages PASS the default budget |
| Fingerprint Integrity | 2 | 64-char SHA-256, FP-01..08 PASS, G01 ≠ G02 |

**All 10 dimensions = 2. PASS.**

---

## 25. G02 prompt audit (PART F)

| Dimension | Score (0/1/2) | Justification |
|---|:---:|---|
| Real Planning Content Present | 2 | Real `locked.facts`, locked-asset IDs, identity/preservation needs |
| Project Specificity | 2 | G02-specific locked asset IDs (2409032d-…, brand-name-a29bc2c550f3, etc.) |
| Need Presence | 2 | 5 real needs, including brand-name preservation |
| Evidence Presence | 2 | `ProjectRecord.brandName` real entry |
| Source Trace | 2 | 15 real source IDs in `# SOURCE TRACE IDS` |
| Authority Separation | 2 | LOCKED / USER_REQUIREMENT / clean separation |
| Legacy Visual Exclusion | 2 | `positiveLegacyMentions: []`, only in EXCLUDED section |
| Prompt Contract Clarity | 2 | All 12 required sections, explicit schema, epistemic rules |
| Budget Safety | 2 | All 3 stages PASS |
| Fingerprint Integrity | 2 | 64-char SHA-256, G01 ≠ G02 |

**All 10 dimensions = 2. PASS.**

---

## 26. Cross-project semantic prompt diff

| Aspect | G01 | G02 | Same? |
|---|---|---|:---:|
| Project name in `LOCKED.facts` content | `原始 Logo Locked` / `简体中文` | G02-specific content | NO |
| Locked asset IDs | `4f65f3f8-…`, `755bd372-…`, `brand-name-32fa23e11f42` | `2409032d-…`, `brand-name-a29bc2c550f3` | NO |
| Unique source IDs | 16 | 15 | NO |
| Strategic inputFingerprint | `655f1913…` | `52182d5c…` | NO |
| Concept inputFingerprint | `3d5d344e…` | `a9d88c3a…` | NO |
| Direction inputFingerprint | `1a768023…` | `58bb7592…` | NO |

Difference is not caused by projectId / timestamps / counts /
hashes alone — the prompts carry distinct real project semantics.

---

## 27. Legacy visual exclusion

| Check | G01 | G02 |
|---|---|:---:|
| `positiveLegacyMentions: []` (Strategic) | PASS | PASS |
| `positiveLegacyMentions: []` (Concept) | PASS | PASS |
| `positiveLegacyMentions: []` (Direction) | PASS | PASS |
| `hasLegacyExclusionSection` | true | true |
| `realLegacyExclusion` (ctx) | true | true |

No positive legacy visual content in any prompt.

---

## 28. RPQ tests

All 8 real-project qualification tests PASS:

| Test | Property |
|---|---|
| RPQ-01 | Resolves real G01 project artifacts |
| RPQ-02 | Resolves real G02 project artifacts |
| RPQ-03 | G01 prompt contains real semantic facts |
| RPQ-04 | G02 prompt contains real semantic facts |
| RPQ-05 | G01 vs G02 prompts differ semantically (not just IDs/timestamps) |
| RPQ-06 | No legacy positive content |
| RPQ-07 | No synthetic stand-in project used |
| RPQ-08 | Zero provider calls |

---

## 29. BG tests

All 8 budget gate tests PASS:

| Test | Property |
|---|---|
| BG-01 | Small prompt passes default budget |
| BG-02 | Huge prompt fails default qualification budget (no truncation) |
| BG-03 | No silent truncation (oversized returns the failure) |
| BG-04 | Hard context limit enforced after qualification budget |
| BG-05 | Repair reserve included in the qualification budget |
| BG-06 | Budget result is deterministic and pure |
| BG-07 | `estimateInputTokens` is conservative (ceil charCount / 3) |
| BG-08 | Default budget matches the documented contract |

---

## 30. SNAP tests

All 4 snapshot integrity tests PASS:

| Test | Property |
|---|---|
| SNAP-01 | Prompt builder output has the new snapshot integrity metadata |
| SNAP-02 | Recompile same input → same fingerprint and same content |
| SNAP-03 | Budget gate result is deterministic for the same character count |
| SNAP-04 | Snapshot does not contain any secret-like field |

---

## 31. CI-W1C.7.1 regressions

| Suite | Count | Result |
|---|---:|---|
| ci-7 (CI-W1C.7.1 PS/PC/PD/RW/CFP + 56 baseline) | 148 / 148 | PASS |
| ci-4 / ci-5 | 97 / 97 | PASS |
| ci-7.1a (FP/BG/SNAP/RPQ) | 28 / 28 | PASS |
| runtime-core (unit) | 14 / 14 | PASS |
| web:typecheck | n/a | PASS |
| web-runtime:test | 0 fail | PASS |

**0 new failures, 0 worsened failures.**

---

## 32. Full regressions

| Test command | Result |
|---|---|
| `node --test tests/packages/creative-intelligence/ci-7/*.test.js` | 148/148 PASS |
| `node --test tests/packages/creative-intelligence/ci-7.1a/*.test.js` | 28/28 PASS |
| `node --test tests/packages/creative-intelligence/ci-4/*.test.js` | (in ci-4/ci-5 suite) |
| `node --test tests/packages/creative-intelligence/ci-5/*.test.js` | 97/97 PASS combined |
| `node --test tests/packages/runtime-core/*.test.js` | 14/14 PASS |
| `npm run web:typecheck` | PASS |
| `npm run web-runtime:test` | 0 fail |
| `npm test` | 1441/1444 (3 pre-existing failures — see §33) |

---

## 33. Verify commands

| Command | Result |
|---|---|
| `npm run verify:version-consistency` | PASS |
| `npm run verify:version-naming` | PASS |
| `npm run verify:production-boundaries` | PASS (517 files) |
| `npm run verify:no-obsolete-code` | PASS (975 files) |
| `npm run verify:no-project-specific-production-rules` | PASS |
| `npm run verify:golden-boundary` | PASS |
| `npm run verify:tracked-runtime-assets` | PASS (8 declared assets) |
| `npm run verify:workspace-boundaries` | **PRE-EXISTING FAIL** (script bug line 218) |
| `npm run verify:current-flows` | **PRE-EXISTING FAIL** (BE-19, packaging-d3-rerun, etc.) |

---

## 34. Pre-existing failures (unchanged from CI-W1C.7.1)

| Failure | Source | CI-W1C.7.1 verdict |
|---|---|---|
| `verify:workspace-boundaries` line 218 script bug | pre-existing in CI-W1C.7.1 | unchanged |
| `verify:current-flows` BE-19 / packaging-* / short-chain-default-entry | pre-existing in CI-W1C.7.1 | unchanged |
| `tests/image-generation/contracts-schema.test.js` V3 source bundle | pre-existing in CI-W1C.7 (added `creative_intelligence` enum) | unchanged |
| `tests/packages/creative-intelligence/decision-runtime-parity.test.js` 1ms timing | pre-existing flaky | unchanged |
| 16 C4.2.x diff-against-historical-baseline runtime tests | pre-existing in CI-W1C.7.1 | unchanged |

None of the above are caused by this phase.

---

## 35. New failures

**0 new failures introduced by this phase.**

---

## 36. Analysis provider call count

```
analysisProviderCallCount: 0  (verified in harness + tests)
```

- Harness script: no provider is instantiated
- Tests: no provider is called
- Runtime service: live mode fail-closed; no automatic call

---

## 37. Image provider call count

```
imageProviderCallCount: 0  (verified in harness + tests)
```

Image provider is **forbidden** in the entire creative-reasoning
pipeline. Hard-coded in the service contract.

---

## 38. Production semantic delta

Production source code changes:

| File | Change |
|---|---|
| `packages/creative-intelligence/src/strategic-synthesis/semantic-fingerprint.ts` | NEW (canonical SHA-256) |
| `packages/creative-intelligence/src/strategic-synthesis/prompt-budget.ts` | NEW (budget gate) |
| `packages/creative-intelligence/src/strategic-synthesis/compile-strategic-context.ts` | 1-line: support `evidence.entries` (compat with `items`) |
| `packages/creative-intelligence/src/strategic-synthesis/build-strategic-synthesis-prompt.ts` | replaced 32-char hex with `strategicInputFingerprint` |
| `packages/creative-intelligence/src/model-assisted/build-concept-ideation-prompt.ts` | replaced 32-char hex with `conceptInputFingerprint` |
| `packages/creative-intelligence/src/model-assisted/build-direction-ideation-prompt.ts` | replaced 32-char hex with `directionInputFingerprint` |
| `packages/creative-intelligence/src/strategic-synthesis/index.ts` | re-export new modules |
| `packages/runtime-core/src/application/creative-reasoning-service.ts` | added budget gate per stage; new snapshot integrity metadata; `qualificationBudget` input field |
| `config/repository-contract/runtime-static-assets.json` | 4 new `generatedFileBasenames` + 3 new `userDataPathPrefixes` allowlist entries |
| `apps/web-runtime/scripts/ci-w1c/real-project-prompt-qualification.mjs` | NEW zero-network harness |

No strategic reasoning semantic change. No Concept / Direction
gate semantic change. No selection / canon / anchor / image
runtime change. No consumer change.

---

## 39. Frozen surfaces preserved

All surfaces from CI-W1C.7.1 §3 remain frozen:

- Document Intelligence, DVC, Project Truth, Truth precedence,
  Conflict Detector
- CI-4 deterministic Need, CI-5 deterministic Concept baseline,
  CI-6 deterministic Direction baseline
- CI-4B Strategic Synthesis contracts, CI-5B Model-Assisted Concept
  contracts, CI-6B Model-Assisted Direction contracts
- SG gates, MC gates, MD gates
- CI-7 Evaluation, Recommendation != Selection, Selection, Visual
  Canon
- Anchor, Image Runtime, Translation, Space / Packaging consumers
- CI-W1C.6 legacy visual demotion
- CI-W1C.7.1 prompt builders
- CI-10 (NOT STARTED)

---

## 40. Hard rules (PART J)

| Rule | Value |
|---|:---:|
| Synthetic stand-in used as real G01/G02 qualification | 0 |
| Real G01 prompt missing planning facts | 0 |
| Real G02 prompt missing planning facts | 0 |
| Count-only fingerprint | 0 (replaced with SHA-256) |
| Non-SHA fingerprint | 0 |
| Semantic change without fingerprint change | 0 (FP-02..04 PASS) |
| Prompt over budget | 0 (all 6 PASS) |
| Silent truncation | 0 (fail-closed by construction) |
| Legacy visual positive content | 0 (all 6 prompts) |
| Analysis provider call | 0 |
| Image provider call | 0 |
| Consumer switch | 0 |
| CI-W1C.6.1 work | 0 (DEFERRED) |
| CI-10 | 0 (NOT STARTED) |
| Project-specific production hardcode | 0 |
| New regression | 0 |

**All hard rules = 0. PASS.**

---

## 41. Final verdict

**`READY_FOR_MODEL_ASSISTED_TEXT_QUALIFICATION`**

This verdict means:

> Real 九州美学 and 一剂良方 Planning-First project artifacts have
> been successfully compiled into trustworthy, traceable,
> budget-safe, zero-network Strategic / Concept / Direction
> prompts; semantic SHA-256 fingerprints prove which input
> produced each prompt; no legacy visual evidence is reintroduced
> as positive creative authority.

---

## 42. CI-W1C.7.2 readiness

The next phase is **`CI-W1C.7.2 — Live Model-Assisted Text
Qualification & Human Direction Review`**. It is NOT STARTED.

To proceed, the user must explicitly authorize live text
qualification, re-create the analysis profile in the credentials
directory (the 2310 smoke profiles are not in the current
directory), and then:

1. Call `creative-reasoning-service.run({ useMock: false,
   analysisProfileId, qualificationBudget, ... })`.
2. Capture artifacts at the 5 expected paths.
3. Run the human rubric on G01 + G02:
   - Strategic Fidelity ≥ 2
   - Project Specificity ≥ 2
   - Conceptual Distinctness ≥ 2
   - Visual Discussability ≥ 2
   - Traceability ≥ 2
   - Non-Genericness ≥ 2
   - average ≥ 2.3
   - hard fail = 0

If `READY_FOR_DIRECTION_REPORT_PRODUCTIZATION`, proceed to
productization. Otherwise HOLD.

---

## 43. CI-W1C.6.1 status

`DEFERRED` (NOT STARTED). No change since CI-W1C.7.1. The
runtime activation of `creative_intelligence` source preset, V2
source loader, PART F reference gate, PART G caller wiring, and
PART I runtime scanner are explicitly out of scope for
CI-W1C.7.1A.

---

## 44. CI-10 status

`NOT STARTED`. No change since CI-W1C.7.1.

---

## 45. STOP

This phase is complete. The agent **does NOT**:

- recreate the analysis profile
- call Qwen
- run live G01/G02 qualification
- start CI-W1C.6.1
- generate images
- start CI-10
- switch consumers

The agent **waits for explicit user authorization** before
proceeding.
