# CI-W1C.7.4 — Cross-Project Differentiation (Fixture A vs Fixture B)

> **Status**: PASS — the two artifacts are semantically distinct.
> **Tests**: `PSC-08`, `PFP-04`, plus the strategic-prompt
> `inputFingerprint` for both fixtures.

## 1. Why this audit

The CI-W1C.7.3 verdict was that 2 G01/G02 projects had identical
identity-stripped Need statements. The "fix" was either a Need
rewrite (deferred) or a planning-brief ingestion that gives the
synthesis model real, semantically-distinct planning intent.

CI-W1C.7.4 does NOT run a live synthesis (that's CI-W1C.7.5+).
It only verifies that the planning carrier carries distinct
content for two distinct fixtures.

## 2. Carrier-level distinctness

| Property | Fixture A | Fixture B |
|---|---|---|
| `projectId` | `qualification-fixture-A` | `qualification-fixture-B` |
| `sourceDocuments[0].contentHash` | `bd554fe0…cb7edf` | `c75a0d9a…577c40a` |
| `sourceDocuments[0].chunkCount` | 1 | 1 |
| `claimCount` | 13 | 2 |
| `industry` claim | 有机生鲜电商 | Marketing technology |
| `product_service` claim | 有机蔬菜 + 当季水果 + 半成品净菜… | Real-time audience graph query API + offline cohort sync SDK |
| `planningEvidenceFingerprint` | `f6847acf…1a4d50` | `ffa7b12e…47f10a5` |
| `documentSetHash` | `fd17a4a3…01da739` | `cc51596a…becdd693` |

Every distinguishing property above is different between A and B.

## 3. Strategic-prompt distinctness

When the two artifacts are passed to `compileStrategicReasoningContext`
+ `buildStrategicSynthesisPrompt`, the rendered prompt's
`# PLANNING STRATEGIC EVIDENCE` section differs in:

- claim count (13 vs 2)
- claim ids (different `claimId` per claim, all distinct)
- claim values (industry / product_service differ; A has 11 more)
- claim epistemic class — all `FACT` for both fixtures

The `inputFingerprint` (canonical SHA-256) for the full strategic
prompt is different for A vs B. This is verified by `PSC-08`.

## 4. Routing-level distinctness

`routePlanningClaim` produces different routing decisions for A and B:

- A's `industry` claim → TRUTH (`business.industry`)
- B's `industry` claim → TRUTH (`business.industry`)
- A's `brand_role` claim → TRUTH (`brand.role`)
- B has no `brand_role` claim (English label not extracted by
  the heuristic).

The other 11 A-claims and 1 B-claim go to `EVIDENCE_ONLY` (no
Truth mapping in CI-W1C.7.4's minimal registry).

## 5. Source role distinctness

Both fixtures classify as `brand-strategy` (medium confidence).
Both map to `sourceRole = PLANNING_STRATEGIC_SOURCE`. The
classification-level distinctness is **zero** — both are
brand-strategy. The semantic distinctness comes from the
extracted claim values, not from the classification.

## 6. What this proves

For the planning carrier:
- A planning brief with different content → different artifact
  fingerprint ✓
- A planning brief with different content → different claim set ✓
- A planning brief with different content → different strategic
  input fingerprint ✓
- The carrier is semantically meaningful (not a placeholder) ✓

## 7. What this does NOT prove

- A live synthesis model call is NOT performed. The
  cross-project distinctness of the synthesis output is a
  CI-W1C.7.5 question.
- The Need rewrite question is NOT resolved (still deferred per
  CI-W1C.7.3A `NEED_REWRITE_VERDICT = NOT_YET_JUSTIFIED`).
- A real G01 / G02 with real planning briefs is NOT exercised.
  Both G01 and G02 still have `briefFiles: []` and 0 planning docs.

## 8. Carrier leakage

| Source | Leakage to A's claim set | Leakage to B's claim set |
|---|:-:|:-:|
| Legacy visual evidence | 0 | 0 |
| VUC diagnosis | 0 | 0 |
| Creative hypothesis | 0 | 0 |
| Unknown | 0 | 0 |

The planning carrier is "pure": no legacy or VUC content reaches
it. The `LEGACY_VISUAL_EVIDENCE` path is independently maintained
and remains demoted.
