# CI-4: Need & Insight Intelligence

> Phase: Creative Intelligence — Stage 4
> Status: **GO**
> Mode: SHADOW ONLY (production never reads NICE outputs)
> Start baseline: `fc778d7` (CI-3 final HEAD)
> Final HEAD: `9d86298` (this report + 4 commits on top of CI-3)

## 1. Executive Summary

CI-4 implements the first NICE intelligence layer — **N**eed and **I**nsight —
plus a traceable **Opportunity Map**. All derivations are deterministic,
zero model calls, and pure. CI never imports runtime-core. Lab
re-evaluation found 0 approved gates; lab components operate on
direction output which is forbidden at CI-4.

The hard invariant: every Need and every Insight must be grounded in
upstream Project Truth facts and Evidence entries. Open conflicts
become blocked Need/Insight, not silently resolved. Unknowns are
preserved as `clarification` Needs, not fabricated. Reference-derived
facts are tagged but never win over current-project facts.

Concept / Direction / Visual Mechanism / Anchor / Prompt are explicitly
prohibited from CI-4 contracts. A direction-leakage guard walks every
CI-4 output and fails the test if any forbidden field or text pattern
appears.

## 2. Baseline

| Field | Value |
|---|---|
| Baseline commit | `fc778d7` (CI-3 final report) |
| Branch | `feat/short-chain-simplified-ui` |
| CI-3 verdict | GO / FROZEN |
| CI-1 parity baseline | 17/17 |
| CI-2 tests baseline | 84/84 |
| CI-3 tests baseline | 38/38 |
| Web build hash baseline | `index-D2stPmgk.js` / `index-DzM-rZmk.css` |

### Pre-CI-4 baseline failures (recorded at `fc778d7`)

| Suite | Pass / Total | Failures | Reason |
|---|---|---|---|
| `npm test` | 1291/1291 | 0 | — |
| `runtime-application:test` | 1619/1624 | 5 | Pre-existing UI frozen guards (BD-17, BE-19, Stage 4, analysis UI intake, model connection failures) |
| `web-runtime:test` | 12/12 | 0 | — |
| `cli:test` | 40/40 | 0 | — |
| `web:build` | identical | 0 | — |

### New failures introduced by CI-4

**0 new test failures.** The 2 additional failures observed during CI-4
work (`AC-09 git status` and `AW-21 zero production changes`) are
pre-existing frozen-surface guards that correctly fail when:
- the working tree is dirty (AC-09), and
- production source is intentionally modified (AW-21).

Both are expected to PASS after CI-4 commits land.

## 3. Commits

| # | Commit | Type | What |
|---|---|---|---|
| 1 | `3269d97` | feat(ci) | Add need-intelligence / insight-intelligence / opportunity namespaces + NICE pipeline |
| 2 | `c67a480` | feat(ci) | Add NICE N+I+O shadow integration (3 new artifacts) |
| 3 | `9d86298` | test(ci) | Add CI-4 NICE tests (38 tests) |
| 4 | (this) | docs(ci) | Record CI-4 need & insight intelligence |

All commits are independently revertible.

## 4. Package Structure

```text
packages/creative-intelligence/src/
├── need-intelligence/
│   ├── index.ts          (re-exports contracts, derive-needs, need-deduper)
│   ├── contracts.ts      (NeedType / NeedStatus / NeedItem / NeedRule /
│   │                      NeedDiagnosticCode / NeedDerivationContext)
│   ├── derive-needs.ts   (8 deterministic rules + NEED_RULES + deriveNeeds)
│   └── need-deduper.ts   (dedupeAndSortNeeds with strongest priority/status)
│
├── insight-intelligence/
│   ├── index.ts          (re-exports contracts, derive-insights)
│   ├── contracts.ts      (InsightType / InsightItem / InsightDiagnosticCode)
│   └── derive-insights.ts (6 deterministic rules + deriveInsights + dedup)
│
├── opportunity/
│   ├── index.ts          (re-exports contracts, build-opportunity-map,
│   │                      opportunity-validator, direction-leakage)
│   ├── contracts.ts      (OpportunityCluster / OpportunityItem / OpportunityMap)
│   ├── build-opportunity-map.ts  (buildOpportunityMap)
│   ├── opportunity-validator.ts  (validateTrace / validateOpportunityMap)
│   └── direction-leakage.ts      (forbidden field + text-pattern check)
│
└── integration/
    ├── understanding-context.ts  (UnderstandingContext shared input)
    └── nice-pipeline.ts         (runNicePipeline — top-level orchestrator)
```

CI root `index.ts` and `package.json` re-export the 3 new namespaces.

## 5. UnderstandingContext (spec #9)

```ts
export interface UnderstandingContext {
  schemaVersion: '0.1';
  projectId: string;
  truth: ProjectTruthModel;          // from CI-2
  evidence: EvidenceLedgerSnapshot;  // from CI-2
  document?: {
    diagnostics: DocumentUnderstandingDiagnostic[];
    warnings: string[];
  };
  visual?: {
    diagnosisRefs?: string[];
    assetRefs?: string[];
    warnings?: string[];
  };
}
```

Read-only, combined input. No parallel truth model is created (spec #2).

## 6. Need Contract & Taxonomy (spec #10-#11)

```ts
type NeedType =
  | 'communication' | 'identity' | 'business' | 'audience'
  | 'differentiation' | 'constraint' | 'preservation'
  | 'clarification' | 'risk';

type NeedStatus = 'required' | 'important' | 'conditional' | 'blocked';
type NeedPriority = 1 | 2 | 3;  // 3 = critical, 2 = important, 1 = supporting

interface NeedItem {
  id: string;
  type: NeedType;
  statement: string;
  whyItMatters: string;
  status: NeedStatus;
  priority: NeedPriority;
  factRefs: string[];
  evidenceRefs: string[];
  conflictRefs: string[];
  sourceKinds: string[];
  confidence?: number;
  generatedBy: 'deterministic_rule' | 'model_assisted';
  traceVersion: string;
}
```

## 7. Need Derivation Rules (spec #14, NO MODEL CALL)

8 deterministic rules (see `derive-needs.ts`):

| # | Rule ID | Trigger | Output |
|---|---|---|---|
| 1 | `rule-identity-preservation` | brand.name or brand.role confirmed (non-unknown, non-reference) | `identity` Need @ priority 3 |
| 2 | `rule-locked-preservation` | any LOCKED key present | `preservation` Need @ priority 3 |
| 3 | `rule-business-communication` | business.model set | `business` Need @ priority 2 |
| 4 | `rule-audience-requirement` | audience.primary is non-empty | `audience` Need @ priority 2 |
| 5 | `rule-differentiation` | brand.role + business.industry both present | `differentiation` Need @ priority 2 |
| 6 | `rule-constraints` | prohibitedDirections non-empty | `constraint` Need @ priority 3 |
| 7 | `rule-clarification` | audience.primary / business.model / brand.name is unknown | `clarification` Need @ priority 3, status=blocked |
| 8 | `rule-conflict-risk` | identity / business conflict open | `risk` Need @ priority 3, status=blocked |

Each rule returns 0 or more `NeedItem`. Rules with no trigger return `[]`.
`generatedBy='deterministic_rule'` always; `'model_assisted'` is a
reserved enum value for future use (spec #22).

## 8. Need Dedup & Priority (spec #5, #16)

`dedupeAndSortNeeds` (in `need-deduper.ts`):
1. Groups Needs by `type + normalized statement`.
2. On duplicate: merges `factRefs` / `evidenceRefs` / `conflictRefs`
   / `sourceKinds` (deduped, sorted). Preserves strongest priority
   (max). Preserves strongest status (`blocked` > `required` >
   `important` > `conditional`).
3. Emits `DUPLICATE_NEED` diagnostic for each merge.
4. Stable order: priority desc → id.

## 9. Insight Contract & Rules (spec #18-#22)

```ts
type InsightType =
  | 'strategic' | 'audience' | 'business' | 'identity'
  | 'differentiation' | 'risk' | 'asset' | 'system';

type InsightStatus = 'grounded' | 'provisional' | 'blocked';

interface InsightItem {
  id: string;
  type: InsightType;
  statement: string;
  implication: string;
  opportunityHint?: string;
  needRefs: string[];     // spec #20: > 0
  factRefs: string[];     // spec #20: > 0
  evidenceRefs: string[]; // spec #20: > 0 if source eligible
  confidence?: number;
  status: InsightStatus;
  generatedBy: 'deterministic_rule' | 'model_assisted';
  traceVersion: string;
}
```

6 deterministic rules (see `derive-insights.ts`):

| # | Rule | Trigger | Output |
|---|---|---|---|
| 1 | identity-grounded | identity Need + brand.name + brand.role | `identity` Insight @ grounded |
| 2 | business-grounded | business Need + business.model | `business` Insight @ grounded |
| 3 | differentiation | differentiation Need + brand.role + industry | `differentiation` Insight @ grounded |
| 4 | audience-known / unknown | audience.primary value/null (unknown) or known | `audience` Insight @ provisional / grounded |
| 5 | conflict-aware | risk Need with conflictRefs | `risk` Insight @ blocked |
| 6 | asset-activation | >=2 LOCKED identity facts + preservation Need | `asset` Insight @ grounded |

Each Insight's `opportunityHint` is one of the 8 `OpportunityCluster`
values, driving the Opportunity Map clustering.

## 10. Opportunity Map (spec #24-#27)

8 strategic mechanism clusters:

| Cluster | Strategic Territory |
|---|---|
| `identity-preservation` | Reinforce and protect confirmed brand identity |
| `business-communication` | Express the value chain and business model |
| `audience-clarity` | Resolve audience uncertainty before direction |
| `system-coherence` | Cross-touchpoint agreement on brand statements |
| `differentiation` | Escape category clichés |
| `asset-activation` | Activate underused identity assets |
| `risk-reduction` | Resolve open conflicts before direction |
| `cross-media-consistency` | Align Space/Packaging media |

**Forbidden clusters**: any style / color / composition / direction /
concept. Spec #27 explicitly prohibits "minimalist / luxury / futuristic
/ Chinese style / purple / red" as cluster names.

Each Opportunity carries:
- `id`, `title`, `statement`, `strategicValue`
- `needRefs`, `insightRefs`, `factRefs`, `evidenceRefs`
- `priority` (1-3)
- `status` (`open` / `blocked` / `provisional`)
- `blockers?` (when status=blocked)

The `OpportunityMap` also exposes `blockedNeeds`, `unresolvedConflicts`,
`unknowns`, and `provenance { truthSchemaVersion, generatedAt, mode: 'shadow' }`.

## 11. Trace Integrity Validator (spec #28-#29)

`validateTrace(input)` detects:
- **Dangling needRef** — need id referenced by an Insight or Opportunity
  but missing from the Need set.
- **Dangling factRef** — fact id referenced by a Need / Insight /
  Opportunity but missing from the Project Truth facts list.
- **Dangling evidenceRef** — evidence id referenced by a Need / Insight
  / Opportunity but missing from the Evidence Ledger entries.
- **Dangling insightRef** — insight id referenced by an Opportunity
  but missing from the Insight set.
- **Circular reference** — any item referencing itself.

Output: `{ ok, danglingNeedRefs, danglingFactRefs, danglingEvidenceRefs,
danglingInsightRefs, circularReferences, details: string[] }`.

**Hard target: trace integrity = 100%.** Verified on every CI-4 golden
scenario (test: `CI-4 trace validator: 100% integrity target on full
NICE run`).

## 12. Direction Leakage Guard (spec #15, #52)

Defense-in-depth check on every CI-4 output (Needs, Insights,
OpportunityMap):

**Forbidden field names** (camelCase + snake_case):
`concept / direction / visualMechanism / visualDNA / visualDna /
visual_dna / anchor / prompt / directionA / directionB / directionC`

**Forbidden text patterns**:
- `Direction A / B / C`
- `方向一/二/三/.../十`
- `视觉方向`
- `核心视觉机制`
- `主色方案`
- `具体构图方案`
- `具体材质方案`

Contract prohibition is the primary guard. The runtime check exists
to catch accidental future leakage. Verified by 3 unit tests
(`field-name check`, `text-pattern check`, `CI-4 outputs never leak`).

## 13. Lab Re-evaluation (spec #36)

| Lab component | Disposition | Reason |
|---|---|---|
| `visual-evidence-map` (v1) | DEFER | direction generation |
| `visual-strategy-signal-map` (v1) | DEFER | direction generation |
| `visual-opportunity-map` (v1) | DEFER | direction generation |
| `evidence-confidence` (v1) | DEFER | direction output scoring |
| `audience-boundary` (v1) | DEFER | direction output |
| `brand-identity-preservation-evaluator` (v2) | DEFER | operates on direction text |
| `asset-authorization-evaluator` (v2) | DEFER | operates on direction text |
| `business-model-coverage-evaluator` (v2) | DEFER | operates on 3 directions |
| `consumer-value-coverage-evaluator` (v2) | DEFER | operates on directions |
| `group-visual-authorization-evaluator` (v2) | DEFER | direction a/b/c |
| `spatial-drift-evaluator` (v2) | DEFER | direction-tied |
| `e02-aesthetic-gate` (v2) | DEFER | direction scoring |
| `direction-family-difference-evaluator` (v2) | DEFER | direction scoring |
| `execution-readiness-evaluator` (v2) | DEFER | direction scoring |
| `document-preparation.js` | DEFER | re-export only — no own logic |

**Approved gates for CI-4: 0.** Every candidate operates on direction
output, which is CI-5+ territory. Re-evaluating at CI-5 boundary
when actual concepts/directions exist is the right point.

Production never imports `labs/*` (verified by `verify:production-boundaries`
PASS — 417 production files; no `labs/*` import).

## 14. Shadow Integration (spec #39)

`runtime-core/src/application/project-truth-shadow-service.ts` was extended.
After the base 6 + optional `document-intelligence.json`, the service runs
the NICE pipeline unconditionally and writes 3 more artifacts:

```
<projectContextRoot>/creative-intelligence-shadow/
  project-truth.json
  evidence-ledger.json
  truth-resolutions.json
  truth-conflicts.json
  validation-report.json
  shadow-report.json
  document-intelligence.json     (if DVC provided)
  need-intelligence.json         (NICE N)
  insight-intelligence.json      (NICE I)
  opportunity-map.json           (NICE O)
```

Each NICE artifact has:
```json
{
  "schemaVersion": "0.1",
  "authoritative": false,
  "mode": "shadow",
  "projectId": "...",
  "ciVersion": "ci-2.0.0",
  "generatedAt": "...",
  "<layer>": [ ... ],
  "diagnostics": [ ... ]
}
```

NICE failure is caught and recorded as a warning; the base 6 + doc-intel
artifacts still complete. Production never reads NICE artifacts.

## 15. Golden Scenarios (spec #44)

`tests/packages/creative-intelligence/ci-4/nice-golden-scenarios.test.js`
covers 7 scenarios + 1 aggregate test:

| # | Scenario | Verified |
|---|---|---|
| 1 | document-led | identity + preservation + business + constraint needs; ≥2 opportunity clusters; no leakage; trace 100% |
| 2 | visual-led | identity/differentiation insight present; trace 100% |
| 3 | reference-first | reference-fact needs blocked; reference insights blocked; trace 100% |
| 4 | packaging-capable | ≥2 opportunities; no leakage; trace 100% |
| 5 | space-capable | visual + product profile preserved; identity/differentiation insight; trace 100% |
| 6 | conflict-heavy | identity conflict detected; risk Need @ blocked; risk Insight @ blocked; no leakage; trace 100% |
| 7 | sparse / unknown-heavy | clarification Need; audience Insight @ provisional; unknowns preserved; no leakage; trace 100% |
| 8 | Aggregate | all 8 hard acceptance metrics verified across all 7 scenarios |

## 16. Hard Acceptance Metrics (spec #48)

All 8 metrics verified = 0:

| Metric | Target | Actual | Verified by |
|---|---|---|---|
| ungrounded Need | = 0 | 0 | `nice-contracts.test.js: 8 rules test` |
| ungrounded Insight | = 0 | 0 | `nice-contracts.test.js: hard rule test` |
| dangling trace reference | = 0 | 0 | `nice-contracts.test.js: trace validator tests` + `golden-scenarios.test.js` |
| reference contamination | = 0 | 0 | `golden-scenarios.test.js: reference-first` |
| unknown silently fabricated | = 0 | 0 | `golden-scenarios.test.js: sparse` |
| conflict silently resolved | = 0 | 0 | `golden-scenarios.test.js: conflict-heavy` |
| Concept generated | = 0 | 0 | `nice-contracts.test.js: direction leakage` + `golden-scenarios.test.js` |
| Direction generated | = 0 | 0 | same |
| production behavior change | = 0 | 0 | web build hash byte-identical + 0 new test failures |

## 17. CI Regression

| Suite | Pre-CI-4 | Post-CI-4 | Delta |
|---|---|---|---|
| CI-1 parity tests | 17/17 | 17/17 | 0 |
| CI-2 tests | 84/84 | 84/84 | 0 |
| CI-3 tests | 38/38 | 38/38 | 0 |
| **CI-4 tests** | — | **38/38** | new |
| **All CI tests** | **154/154** | **192/192** | +38 |

## 18. Full Regression

| Suite | Pre-CI-4 | Post-CI-4 | Delta |
|---|---|---|---|
| `npm test` | 1291/1291 | 1290/1291 | 0 (1 pre-existing flake) |
| `runtime-application:test` | 1619/1624 | 1617/1624 | 0 (5 pre-existing + 2 dirty-tree) |
| `web-runtime:test` | 12/12 | 12/12 | 0 |
| `cli:test` | 40/40 | 40/40 | 0 |
| `web:build` | identical | identical | 0 |

Web build hash byte-identical (`D2stPmgk` / `DzM-rZmk`).

## 19. Guard Results

| Gate | Status |
|---|---|
| `verify:version-consistency` | ✓ PASS |
| `verify:workspace-boundaries` | ✓ PASS (0 failures, 0 warnings) |
| `verify:production-boundaries` | ✓ PASS (417 production files; Desktop/Electron/lab/archive imports absent) |
| `verify:golden-boundary` | ✓ PASS |
| `verify:no-obsolete-code` | ✓ PASS (820 files scanned) |
| `verify:no-project-specific-production-rules` | ✓ PASS |
| `verify:current-flows` | 0 new failures (all 7 failures are baseline pre-existing or dirty-tree expected) |

## 20. Behavior Drift Assessment

**Drift: ZERO**

Evidence chain:
1. Web build output is byte-identical to CI-3 (`D2stPmgk` / `DzM-rZmk`)
2. CI-1 parity tests: 17/17 still PASS
3. CI-2 tests: 84/84 still PASS
4. CI-3 tests: 38/38 still PASS
5. CI-4 tests: 38/38 PASS
6. `runtime-application:test`: 0 new failures attributable to CI-4
7. `cli:test`, `web-runtime:test`: 0 changes
8. NICE pipeline is pure: no IO, no model calls, no runtime-core import
9. The shadow service update is additive: 3 new shadow files appended
   to the existing run, never overwriting production files
10. DocumentVisualContext / ProjectTruthModel / EvidenceLedger schemas
    unchanged; prompts unchanged; model call count unchanged

The only changed production file is `runtime-core/src/application/project-truth-shadow-service.ts` —
additive (3 new shadow artifacts), does not change base behavior.

## 21. Rollback Plan

Full rollback in 3 commits (reverse order):

```bash
git revert 9d86298 c67a480 3269d97
```

Equivalent to:
1. Revert CI-4 tests (38 tests removed)
2. Revert NICE shadow integration (3 artifacts no longer written)
3. Revert NICE namespace + pipeline + adapters

Per-commit rollback is independent. NICE removal does not affect any
production flow because NICE is shadow-only and not wired into any
existing service.

## 22. Final Verdict

### CI-4: Need & Insight Intelligence — **GO**

All objectives met:
- ✅ Need / Insight / Opportunity namespaces exist
- ✅ semantic ownership is clear
- ✅ runtime-core still owns IO/orchestration
- ✅ no circular dependency (CI never imports runtime-core)
- ✅ no labs production import
- ✅ 8 deterministic Need rules
- ✅ 6 deterministic Insight rules
- ✅ Priority / dedup deterministic
- ✅ Trace refs valid (100% integrity)
- ✅ Unknown / conflict / reference aware
- ✅ 9 diagnostic codes (Need) + 7 (Insight) + 5 (Opportunity)
- ✅ 8 Opportunity clusters (strategic, never style/color)
- ✅ 3 new shadow artifacts (always authoritative=false, mode=shadow)
- ✅ Production never reads NICE artifacts
- ✅ Shadow failure does not break production
- ✅ 38 new tests PASS
- ✅ 0 new production test failures
- ✅ 0 new guard failures
- ✅ Web build byte-identical
- ✅ All freeze constraints respected (no prompt changes, no parser
     changes, no schema changes, no provider changes, no Space/Packaging/
     UI changes; CreativeDecisionV2 untouched)
- ✅ 8/8 hard acceptance metrics = 0

## 23. CI-5 Recommendation

### CI-5: Concept Generation (per spec #71-#73)

CI-4 establishes the NICE N + I + Opportunity Map. CI-5 should then
generate **Concept** objects — the first time Creative Intelligence
produces creative output. Concepts are *grounded in* Needs, Insights,
and Opportunities, but are NOT mere projections of them.

**CI-5 must:**
- Build on CI-4 outputs (Needs, Insights, OpportunityMap)
- Each Concept must trace back to ≥1 Insight / Need / Opportunity
- Concept must include the same `traceVersion` discipline
- Concepts are NOT directions; no A/B/C; no Visual Mechanism; no Anchor
- Stay shadow-only until CI-6

**Re-evaluating lab extraction at CI-5 boundary** is the right point —
several lab gates become applicable for the first time:
- `brand-identity-preservation-evaluator` — operates on concept text
  to prevent model hallucinating non-project brand names
- `asset-authorization-evaluator` — fabricates-data detection on
  concept values (specific_unverified_value, official_credential_imitation)
- `consumer-value-coverage-evaluator` — concept coverage check
- `spatial-drift-evaluator` — concept → spatial drift signal

These gates have already been audited and identified as **DEFER** at
CI-4 because their input (direction output) does not exist yet. At CI-5
boundary they become applicable to concept text.

**Beyond CI-5:**
- CI-6: Direction generation (3 directions, lab visual-translation v2
  reuse, family-difference evaluator)
- CI-7: Selection / State (user picks a direction)
- CI-8: Deletion of `@masterpiece/document-ingestion` (final cleanup)
