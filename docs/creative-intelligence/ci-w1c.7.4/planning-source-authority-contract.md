# CI-W1C.7.4 — Planning Source Authority Contract

> **Mode**: Implementation phase · **HEAD**: 99b8344f (Documentation Tip)
> **Branch**: `feat/short-chain-simplified-ui`
> **Schema version**: `ci-w1c.7.4`
> **Status**: LOCKED for CI-W1C.7.4.

## 1. The hard rule: `sourceRole != epistemicClass`

A planning brief may contain any combination of:

| Epistemic class | Meaning | Example (Chinese) |
|---|---|---|
| `FACT` | a verifiable claim | "行业: 有机生鲜电商" |
| `USER_REQUIREMENT` | a user-stated rule | "输出语言: 简体中文" |
| `MODEL_INFERENCE` | a model-derived claim (NOT in human-authored briefs) | (not expected) |
| `UNKNOWN` | unresolved / cannot be classified | "受众: TBD" |

**A planning brief is NOT auto-FACT.** A planning-brief fact and a
USER_REQUIREMENT in a planning brief are different things.

## 2. `sourceRole` registry (3 values only)

| `sourceRole` | Triggered by `classifyDocumentRole` returning | Used in |
|---|---|---|
| `PLANNING_STRATEGIC_SOURCE` | `creative-brief` / `brand-strategy` / `market-research` / `product-information` | `PlanningStrategicEvidenceArtifact` |
| `LEGACY_VISUAL_EVIDENCE` | `visual-guideline` / `reference` | (NOT used in the planning artifact; the artifact builder defensively skips) |
| `UNKNOWN_SOURCE` | `unknown` (or any unclassified role) | (NOT used in the planning artifact; the artifact builder defensively skips) |

The classifier in production is the existing
`@masterpiece/document-ingestion/document-preparation.js`
`classifyDocumentRole`. We do NOT replace it; we only read its
output and map it to a `sourceRole`.

## 3. `TruthAuthority` separation

The `TruthAuthority` enum (which controls semantic precedence in
Project Truth) is **separate** from `sourceRole`. CI-W1C.7.4 does
NOT introduce a new `TruthAuthority` value. Promoted planning
claims (see §5) use the existing `AUTHORITATIVE_DOCUMENT_FACT`
authority. `USER_REQUIREMENT` claims use the existing
`USER_CONFIRMED` authority.

## 4. `SourceType` addition (additive)

`SourceType` gains a new member: `planning_document`. This is the
canonical way to identify the source of a planning-brief fact in
Project Truth. Existing `SourceType` values are unchanged.

## 5. Promotion rules (CI-W1C.7.4 minimal)

A claim is eligible for Truth promotion only if **all three** hold:

1. `epistemicClass === 'FACT'`
2. The claim key has a `PLANNING_TO_TRUTH_KEY` mapping
3. The source refs are resolvable

The CI-W1C.7.4 minimal `PLANNING_TO_TRUTH_KEY` mapping is:

| `PlanningClaimKey` | `TruthKey` |
|---|---|
| `industry` | `business.industry` |
| `brand_role` | `brand.role` |

The other 14 `PLANNING_CLAIM_KEYS` stay in
`PlanningStrategicEvidence` and do **NOT** auto-promote. They are
available to the synthesis model as positive context but do not
become Project Truth facts.

A future phase may extend `PLANNING_TO_TRUTH_KEY` to all 16 keys.
The contract is intentionally minimal in CI-W1C.7.4 so that
the carrier wiring is testable without doing a Truth-schema
broadening.

## 6. Refusal rules (defensive)

A claim is **refused** (and the artifact builder defensively
skips it) if any of:

- `sourceRole === 'LEGACY_VISUAL_EVIDENCE'`
- `sourceRole === 'UNKNOWN_SOURCE'`
- The brief's content hash does not match the registered record
- The classification cannot be performed (read error)

Refusal is **silent at the artifact level** (the artifact is
returned with an empty `sourceDocuments[]` / `claims[]`) but
**loud at the call-site**: a `PLANNING-BRIEF-CONTENT-HASH-MISMATCH`
or `PLANNING-BRIEF-READ-FAILED` error is thrown when a registration
goes stale.

## 7. Test coverage (PER + LVA)

| Test | Verifies |
|---|---|
| PER-01..04 | 4-way routing (TRUTH / EVIDENCE_ONLY / USER_REQ / INFERENCE / UNKNOWN) |
| PER-05 | `PLANNING_TO_TRUTH_KEY` registry is exactly industry + brand_role |
| PER-06 | `assertEpistemicClassPreserved` accepts planning source role |
| PER-07 | routePlanningClaim refuses unknown epistemic class |
| LVA-01..02 | `visual-guideline` / `reference` MUST NOT become planning |
| LVA-03..04 | real-world classifier output of VI / reference text → LEGACY_VISUAL_EVIDENCE |
| LVA-05 | only 3 source roles are valid; all others are refused |

All 12 PER+LVA tests PASS on the current Implementation HEAD.
